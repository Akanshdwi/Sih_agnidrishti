"""
ml/agents/pipeline.py — Multi-agent orchestrator

Full flow:
  1. Load hotspots (from DB or local parquet)
  2. Run ML predict → fills classification / risk_score
  3. Agent 1 (Detector)  → FLAGGED / SKIPPED
  4. Agent 2 (Skeptic)   → DEBUNKED / FLAGGED
  5. Agent 3 (Dispatcher)→ risk_score + threat_priority
  6. POST /api/incidents for each VALIDATED hotspot
  7. PATCH /api/hotspots/:id with classification + risk_score

Usage
  cd AgniDrishti
  source backend/venv/bin/activate
  python -m ml.agents.pipeline              # dry-run (parquet)
  python -m ml.agents.pipeline --write-back  # write to live backend
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

import pandas as pd

from ml.agents import detector, skeptic, dispatcher
from ml.feature_engineering import load_all_clusters, FEATURE_COLS
from ml.labeler import label_dataframe
from ml.predict import load_models, predict_dataframe

OUTPUT_DIR = Path(__file__).parent.parent / "output"
API_BASE   = "http://localhost:4000/api"


# ── API helpers ───────────────────────────────────────────────────────────────

def _api(method: str, path: str, payload: dict | None = None, timeout: int = 8) -> dict | None:
    url  = f"{API_BASE}{path}"
    data = json.dumps(payload).encode() if payload else None
    req  = urllib.request.Request(url, data=data, method=method,
                                   headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read()) if r.status not in (204,) else {}
    except Exception as e:
        print(f"    API {method} {path} → {e}")
        return None


def _patch_hotspot(hid: int, cls: str, conf: float, risk: float, expl: str):
    return _api("PATCH", f"/hotspots/{hid}", {
        "classification":   cls,
        "class_confidence": round(conf, 4),
        "risk_score":        round(risk, 1),
        "explanation":       expl,
    })


def _post_incident(payload: dict) -> int | None:
    resp = _api("POST", "/incidents", payload)
    return resp.get("id") if resp else None


# ── Pipeline ──────────────────────────────────────────────────────────────────

def run_pipeline(
    df: pd.DataFrame,
    write_back: bool = False,
    verbose: bool = True,
) -> dict:
    """
    Execute the 3-agent pipeline over a feature-engineered+predicted DataFrame.

    Returns summary stats dict.
    """
    t0 = time.time()

    rows = df.to_dict(orient="records")
    total = len(rows)
    if verbose:
        print(f"\n  Input hotspots: {total:,}")

    # ── Step 1: Agent 1 ───────────────────────────────────────────────────────
    flagged1, skipped1 = detector.run_batch(rows)
    if verbose:
        print(f"  Agent 1 → FLAGGED: {len(flagged1):,}  SKIPPED: {len(skipped1):,}")

    # ── Step 2: Agent 2 ───────────────────────────────────────────────────────
    flagged2, debunked2 = skeptic.run_batch(flagged1)
    if verbose:
        print(f"  Agent 2 → FLAGGED: {len(flagged2):,}  DEBUNKED: {len(debunked2):,}")

    # ── Step 3: Agent 3 ───────────────────────────────────────────────────────
    dispatched = dispatcher.run_batch(flagged2)

    priority_counts = {}
    for h in dispatched:
        p = h["agent3"]["threat_priority"]
        priority_counts[p] = priority_counts.get(p, 0) + 1

    if verbose:
        print(f"  Agent 3 → Risk distribution: {priority_counts}")

    # ── Step 4: Write-back ────────────────────────────────────────────────────
    patch_ok = patch_fail = 0
    incident_ok = incident_fail = 0

    if write_back:
        if verbose:
            print(f"\n  Writing {len(dispatched)} results to backend …")

        for h in dispatched:
            hid  = h.get("id")
            a3   = h["agent3"]
            expl = (
                f"{h.get('predicted_name','?')} "
                f"({h.get('class_confidence',0)*100:.0f}% confidence). "
                f"Risk={a3['risk_score']:.0f}/100 [{a3['threat_priority']}]. "
                f"Agent2: {h['agent2']['reason'][:60]}"
            )

            if hid:
                r = _patch_hotspot(
                    hid,
                    h.get("predicted_name", "False Positive"),
                    h.get("class_confidence", 0.5),
                    a3["risk_score"],
                    expl,
                )
                if r is not None:
                    patch_ok += 1
                else:
                    patch_fail += 1

            # Only create incidents for HIGH / CRITICAL
            if a3["threat_priority"] in ("HIGH", "CRITICAL"):
                inc_id = _post_incident(h["incident_payload"])
                if inc_id:
                    incident_ok += 1
                else:
                    incident_fail += 1

        if verbose:
            print(f"  PATCH hotspots: {patch_ok} ok / {patch_fail} fail")
            print(f"  POST incidents: {incident_ok} ok / {incident_fail} fail")

    # Save agent output
    agent_rows = []
    for h in dispatched:
        agent_rows.append({
            "id":              h.get("id"),
            "lat":             h.get("latitude") or h.get("lat"),
            "lon":             h.get("longitude") or h.get("lon"),
            "frp":             h.get("frp"),
            "classification":  h.get("predicted_name"),
            "class_confidence":h.get("class_confidence"),
            "risk_score":      h["agent3"]["risk_score"],
            "threat_priority": h["agent3"]["threat_priority"],
            "tier":            h["agent3"]["tier"],
            "a1_status":       h["agent1"]["status"],
            "a2_status":       h["agent2"]["status"],
            "a2_rule":         h["agent2"]["rule"],
        })

    out_df = pd.DataFrame(agent_rows)
    out_path = OUTPUT_DIR / "agent_results.parquet"
    OUTPUT_DIR.mkdir(exist_ok=True)
    out_df.to_parquet(out_path, index=False)

    elapsed = round(time.time() - t0, 1)
    summary = {
        "total":          total,
        "skipped":        len(skipped1),
        "debunked":       len(debunked2),
        "validated":      len(dispatched),
        "priority_counts":priority_counts,
        "patch_ok":       patch_ok,
        "incident_ok":    incident_ok,
        "elapsed_s":      elapsed,
        "output":         str(out_path),
    }

    if verbose:
        print(f"\n  Done in {elapsed}s → {out_path}")

    return summary


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AgniDrishti Multi-Agent Pipeline")
    parser.add_argument("--write-back", action="store_true",
                        help="PATCH hotspots + POST incidents to backend API")
    parser.add_argument("--input", default=None,
                        help="Path to parquet file (default: ml/output/labeled.parquet)")
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("  AgniDrishti — Multi-Agent Pipeline")
    print("=" * 60)

    # Load or engineer features
    lp = Path(args.input) if args.input else OUTPUT_DIR / "labeled.parquet"
    if lp.exists():
        print(f"\n[1/2] Loading features from {lp.name} …")
        df = pd.read_parquet(lp)
        if "id" not in df.columns:
            df["id"] = range(1, len(df) + 1)
    else:
        print("\n[1/2] No parquet found — loading from FIRMS CSVs …")
        df = load_all_clusters()
        df = label_dataframe(df)
        df["id"] = range(1, len(df) + 1)

    # Run ML predictions if not already present
    if "predicted_name" not in df.columns:
        print("[1b/2] Running ML inference …")
        xgb_model, lgb_model, _ = load_models()
        df = predict_dataframe(df, xgb_model, lgb_model)
    else:
        # Map existing label_name → predicted_name for compatibility
        if "label_name" in df.columns and "predicted_name" not in df.columns:
            df["predicted_name"]   = df["label_name"]
            df["class_confidence"] = df.get("label_conf", 0.7)
            df["risk_score"]       = df.get("risk_score", 0.0)

    print("\n[2/2] Running 3-agent pipeline …")
    summary = run_pipeline(df, write_back=args.write_back, verbose=True)

    print("\n" + "=" * 60)
    print(f"  Total:     {summary['total']:,}")
    print(f"  Skipped:   {summary['skipped']:,}  (Agent 1 — below threshold)")
    print(f"  Debunked:  {summary['debunked']:,}  (Agent 2 — false positive)")
    print(f"  Validated: {summary['validated']:,}  (Agent 3 — real events)")
    print(f"  Priority:  {summary['priority_counts']}")
    if args.write_back:
        print(f"  Patched:   {summary['patch_ok']} hotspots")
        print(f"  Incidents: {summary['incident_ok']} created")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
