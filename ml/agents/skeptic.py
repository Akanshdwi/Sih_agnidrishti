"""
ml/agents/skeptic.py — Agent 2: False-Positive Suppressor

Takes FLAGGED hotspots from Agent 1 and applies suppression rules.
Returns DEBUNKED (FP confirmed) or keeps FLAGGED for Agent 3.

Suppression rules
─────────────────
S1: ML classifier says "False Positive" with confidence >= 0.75
S2: FRP z-score < 0.5 AND classification == "Industrial Thermal Source"
    (normal operating activity, not an emergency)
S3: Confidence < 25% AND FRP < 3 MW  (weak signal from low-quality obs)
S4: Hotspot is a known persistent gas flare cell with stable FRP
    (frp_zscore < 1.0 AND classification == "Gas Flare" AND is_night)
    → still FLAGGED but with lower priority

Anything that survives → stays FLAGGED (passes to Agent 3).
"""
from __future__ import annotations

DEBUNK_FP_CONF_THRESHOLD = 0.75   # ML must be this confident it's FP
NORMAL_OPS_Z_THRESHOLD   = 0.5    # below this z-score = normal ops
LOW_SIGNAL_CONF          = 25     # confidence %
LOW_SIGNAL_FRP           = 3.0    # MW
STABLE_FLARE_Z           = 1.0    # z-score for "stable" gas flare


def run(hotspot: dict) -> dict:
    """
    Evaluate a single FLAGGED hotspot.

    Expects hotspot to have:
      - agent1            dict  (from detector.py)
      - classification    str   (from ML model via DB or predict.py)
      - class_confidence  float
      - risk_score        float
      - frp               float
      - frp_zscore        float  (if available in raw/DB)

    Returns hotspot with 'agent2' key:
    {
      "status": "DEBUNKED" | "FLAGGED",
      "rule":   str,
      "reason": str,
    }
    """
    cls      = str(hotspot.get("classification") or "").strip()
    cls_conf = float(hotspot.get("class_confidence") or 0.0)
    frp      = float(hotspot.get("frp") or 0.0)
    conf_num = int((hotspot.get("agent1") or {}).get("confidence_num") or 50)

    # Pull z-score from 'raw' JSONB field if present
    raw      = hotspot.get("raw") or {}
    zscore   = float(raw.get("frp_zscore") or hotspot.get("frp_zscore") or 0.0)
    is_night = str(raw.get("daynight") or hotspot.get("daynight") or "D").upper() == "N"

    # ── S1: ML model says FP with high confidence ────────────────────────────
    if cls == "False Positive" and cls_conf >= DEBUNK_FP_CONF_THRESHOLD:
        return {**hotspot, "agent2": {
            "status": "DEBUNKED",
            "rule":   "S1",
            "reason": f"ML model classified as False Positive ({cls_conf*100:.0f}% confidence).",
        }}

    # ── S2: Normal facility operations (within baseline) ─────────────────────
    if cls == "Industrial Thermal Source" and zscore < NORMAL_OPS_Z_THRESHOLD:
        return {**hotspot, "agent2": {
            "status": "DEBUNKED",
            "rule":   "S2",
            "reason": (
                f"Industrial Thermal Source within normal operating range "
                f"(z-score={zscore:.2f} < {NORMAL_OPS_Z_THRESHOLD}) — routine activity."
            ),
        }}

    # ── S3: Weak, low-confidence signal ──────────────────────────────────────
    if conf_num < LOW_SIGNAL_CONF and frp < LOW_SIGNAL_FRP:
        return {**hotspot, "agent2": {
            "status": "DEBUNKED",
            "rule":   "S3",
            "reason": (
                f"Low-confidence ({conf_num}%) + low FRP ({frp:.1f} MW) — "
                "insufficient signal to confirm."
            ),
        }}

    # ── S4: Known stable gas flare (flag but downgrade priority) ─────────────
    if cls == "Gas Flare" and is_night and zscore < STABLE_FLARE_Z:
        return {**hotspot, "agent2": {
            "status": "FLAGGED",
            "rule":   "S4",
            "reason": (
                f"Stable gas flare (z={zscore:.2f} < {STABLE_FLARE_Z}) — "
                "known industrial flare, monitoring only."
            ),
        }}

    # ── Default: keep FLAGGED ─────────────────────────────────────────────────
    return {**hotspot, "agent2": {
        "status": "FLAGGED",
        "rule":   "PASS",
        "reason": f"Passed all suppression checks. FRP={frp:.1f} MW, cls={cls}.",
    }}


def run_batch(hotspots: list[dict]) -> tuple[list[dict], list[dict]]:
    """Run Agent 2. Returns (still_flagged, debunked) lists."""
    flagged, debunked = [], []
    for h in hotspots:
        result = run(h)
        if result["agent2"]["status"] == "FLAGGED":
            flagged.append(result)
        else:
            debunked.append(result)
    return flagged, debunked
