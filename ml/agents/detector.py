"""
ml/agents/detector.py — Agent 1: High-recall Detector

Flags every hotspot that passes minimum signal thresholds as FLAGGED.
Deliberately high recall (low threshold) — Agent 2 will suppress FPs.

Input:  list[dict] of raw hotspot rows from DB
Output: list[dict] with 'agent1' key added, status=FLAGGED or SKIPPED
"""
from __future__ import annotations

# Minimum signal to even consider flagging
MIN_FRP      = 0.5    # MW — below this it's noise
MIN_CONF_NUM = 20     # VIIRS confidence % (numeric); "l"/"n"/"h" mapped below
CONF_MAP     = {"l": 15, "n": 50, "h": 80}


def _conf_num(conf_str: str) -> int:
    """Convert VIIRS confidence string to numeric estimate."""
    try:
        return int(conf_str)
    except (ValueError, TypeError):
        return CONF_MAP.get(str(conf_str).strip().lower(), 50)


def run(hotspot: dict) -> dict:
    """
    Evaluate a single hotspot.

    Returns the hotspot dict with an 'agent1' key:
    {
      "status": "FLAGGED" | "SKIPPED",
      "reason": str,
      "frp": float,
      "confidence_num": int,
    }
    """
    frp  = float(hotspot.get("frp") or 0.0)
    conf = _conf_num(str(hotspot.get("confidence") or "n"))

    if frp < MIN_FRP:
        verdict = {
            "status": "SKIPPED",
            "reason": f"FRP={frp:.2f} MW below noise floor ({MIN_FRP} MW).",
            "frp": frp,
            "confidence_num": conf,
        }
    elif conf < MIN_CONF_NUM:
        verdict = {
            "status": "SKIPPED",
            "reason": f"Confidence {conf}% below minimum ({MIN_CONF_NUM}%).",
            "frp": frp,
            "confidence_num": conf,
        }
    else:
        verdict = {
            "status": "FLAGGED",
            "reason": f"FRP={frp:.1f} MW, confidence={conf}% — passes detection threshold.",
            "frp": frp,
            "confidence_num": conf,
        }

    return {**hotspot, "agent1": verdict}


def run_batch(hotspots: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Run Agent 1 over a list of hotspots.

    Returns (flagged, skipped) lists.
    """
    flagged, skipped = [], []
    for h in hotspots:
        result = run(h)
        if result["agent1"]["status"] == "FLAGGED":
            flagged.append(result)
        else:
            skipped.append(result)
    return flagged, skipped
