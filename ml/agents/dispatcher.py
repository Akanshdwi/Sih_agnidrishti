"""
ml/agents/dispatcher.py — Agent 3: Risk Scorer & Incident Creator

Computes a final 0–100 risk score and maps it to a threat priority tier.
Produces a structured incident record for the DB.

Risk formula
─────────────
  risk = (class_weight × 0.45)
       + (frp_zscore_component × 0.30)
       + (ml_confidence × 0.15)
       + (population_proxy × 0.10)
  score = clip(risk × 100, 0, 100)

Threat priorities
  0–30    → LOW       (Tier 1 — facility monitoring)
  31–55   → MODERATE  (Tier 1 — increased monitoring)
  56–75   → HIGH      (Tier 2 — district alert)
  76–100  → CRITICAL  (Tier 3 — state alert + SMS)
"""
from __future__ import annotations
import math

# Class-based base weights (0–1)
CLASS_WEIGHTS = {
    "False Positive":              0.00,
    "Gas Flare":                   0.25,
    "Industrial Thermal Source":   0.35,
    "Industrial Fire / Accident":  0.90,
    "Agricultural Burning":        0.20,
    "Wildfire / Forest Fire":      0.60,
    "Mining Thermal Activity":     0.30,
}

# Tier thresholds
TIERS = [
    (76, "CRITICAL"),
    (56, "HIGH"),
    (31, "MODERATE"),
    (0,  "LOW"),
]


def _zscore_component(zscore: float) -> float:
    """Map z-score (0–15+) to 0–1 component."""
    return min(1.0, max(0.0, zscore / 10.0))


def _population_proxy(dist_to_cluster_km: float) -> float:
    """
    Closer to industrial cluster → higher population/asset exposure.
    Returns 0–1: 1.0 at 0 km, 0.0 at 80+ km.
    """
    return max(0.0, 1.0 - dist_to_cluster_km / 80.0)


def compute_risk(hotspot: dict) -> float:
    """Return risk score 0–100."""
    cls      = str(hotspot.get("classification") or "False Positive").strip()
    cls_conf = float(hotspot.get("class_confidence") or 0.5)
    frp      = float(hotspot.get("frp") or 0.0)

    raw      = hotspot.get("raw") or {}
    zscore   = float(raw.get("frp_zscore") or hotspot.get("frp_zscore") or 0.0)
    # Default dist = 20 km (realistic for Gujarat industrial belt); was 40 km
    dist_km  = float(raw.get("dist_to_cluster_km") or hotspot.get("dist_to_cluster_km") or 20.0)

    # FRP boost: reference point = 50 MW (regional average for large industrial fire)
    # log(50)/log(51) ≈ 0.97 so even moderate FRP (10–30 MW) gets 0.6–0.8
    frp_boost = math.log1p(frp) / math.log1p(50)
    effective_z = max(zscore, frp_boost * 10)

    w_class = CLASS_WEIGHTS.get(cls, 0.20)
    w_z     = _zscore_component(effective_z)
    w_conf  = cls_conf
    w_pop   = _population_proxy(dist_km)

    # Weights: class 45% | FRP/anomaly 25% | confidence 20% | proximity 10%
    raw_score = (w_class * 0.45
                 + w_z    * 0.25
                 + w_conf * 0.20
                 + w_pop  * 0.10)

    return round(min(100.0, max(0.0, raw_score * 100)), 1)


def threat_priority(risk_score: float) -> tuple[str, int]:
    """Return (priority_string, tier_int)."""
    for threshold, name in TIERS:
        if risk_score >= threshold:
            tier = {
                "CRITICAL": 3,
                "HIGH":     2,
                "MODERATE": 1,
                "LOW":      1,
            }[name]
            return name, tier
    return "LOW", 1


def run(hotspot: dict) -> dict:
    """
    Build final incident record for one hotspot.

    Returns hotspot with 'agent3' key:
    {
      "risk_score":       float,
      "threat_priority":  str,
      "tier":             int,
      "status":           "VALIDATED",
      "incident_payload": dict   ← ready to POST /api/incidents
    }
    """
    score    = compute_risk(hotspot)
    priority, tier = threat_priority(score)

    agent3 = {
        "risk_score":      score,
        "threat_priority": priority,
        "tier":            tier,
        "status":          "VALIDATED",
    }

    # Build the incident payload for the backend
    incident_payload = {
        "hotspot_id":       hotspot.get("id"),
        "agent1":           hotspot.get("agent1"),
        "agent2":           hotspot.get("agent2"),
        "agent3":           agent3,
        "status":           "VALIDATED",
        "threat_priority":  priority,
    }

    return {
        **hotspot,
        "agent3":           agent3,
        "incident_payload": incident_payload,
    }


def run_batch(hotspots: list[dict]) -> list[dict]:
    """Run Agent 3 over all surviving FLAGGED hotspots."""
    return [run(h) for h in hotspots]
