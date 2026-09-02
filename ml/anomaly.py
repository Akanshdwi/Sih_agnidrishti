"""
ml/anomaly.py — Per-facility FRP anomaly detector

Computes a rolling FRP baseline (mean + std) for each facility (grouped
by facility_id from the DB) and flags hotspots whose FRP is more than
`z_threshold` standard deviations above the mean.

Two modes
─────────
  1. In-memory: given a DataFrame with facility_id + frp columns
  2. DB-backed: queries PostgreSQL directly (needs psycopg2 or psycopg)

Usage
  cd AgniDrishti
  source backend/venv/bin/activate
  python -m ml.anomaly --mode=memory   # demo on local parquet
  python -m ml.anomaly --mode=db       # needs DB running
"""
from __future__ import annotations

import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

OUTPUT_DIR = Path(__file__).parent / "output"


# ──────────────────────────────────────────────────────────────────────────────
# Core anomaly functions
# ──────────────────────────────────────────────────────────────────────────────

def compute_facility_baseline(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute per-facility FRP baseline (mean, std, count) and Z-score for each row.

    Parameters
    ----------
    df : DataFrame with columns [facility_id, frp]
         facility_id may be NaN for unlinked hotspots — those use global baseline.

    Returns
    -------
    df with additional columns:
      facility_frp_mean, facility_frp_std, facility_frp_count,
      facility_frp_zscore, is_anomaly
    """
    df = df.copy()

    # Global baseline fallback
    global_mean = df["frp"].mean()
    global_std  = max(df["frp"].std(), 0.01)

    # Per-facility stats
    stats = (
        df[df["facility_id"].notna()]
        .groupby("facility_id")["frp"]
        .agg(
            facility_frp_mean="mean",
            facility_frp_std="std",
            facility_frp_count="count",
        )
        .reset_index()
    )
    stats["facility_frp_std"] = stats["facility_frp_std"].fillna(global_std).clip(lower=0.01)

    df = df.merge(stats, on="facility_id", how="left")

    # Fill unlinked hotspots with global baseline
    df["facility_frp_mean"]  = df["facility_frp_mean"].fillna(global_mean)
    df["facility_frp_std"]   = df["facility_frp_std"].fillna(global_std)
    df["facility_frp_count"] = df["facility_frp_count"].fillna(0).astype(int)

    # Z-score
    df["facility_frp_zscore"] = (
        (df["frp"] - df["facility_frp_mean"]) / df["facility_frp_std"]
    ).clip(-5, 15).fillna(0.0)

    return df


def flag_anomalies(
    df: pd.DataFrame,
    z_threshold: float = 2.5,
    min_count: int = 3,
) -> pd.DataFrame:
    """
    Add boolean `is_anomaly` column.

    A hotspot is anomalous if:
      - its facility has at least min_count historical observations, AND
      - its facility_frp_zscore >= z_threshold
    Single-observation facilities are not flagged (no baseline to compare to).
    """
    df = df.copy()
    df["is_anomaly"] = (
        (df["facility_frp_count"] >= min_count)
        & (df["facility_frp_zscore"] >= z_threshold)
    )
    return df


def compute_anomaly_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute a 0–100 anomaly score blending z-score + absolute FRP magnitude.

    Formula:
      raw_score = (zscore / 10) * 60 + (frp / max_frp) * 40
      anomaly_score = clip(raw_score * 100, 0, 100)
    """
    df = df.copy()
    max_frp = max(df["frp"].max(), 1.0)
    df["anomaly_score"] = (
        (df["facility_frp_zscore"].clip(0, 10) / 10) * 60
        + (df["frp"] / max_frp) * 40
    ).clip(0, 100).round(1)
    return df


# ──────────────────────────────────────────────────────────────────────────────
# DB-backed mode
# ──────────────────────────────────────────────────────────────────────────────

def load_hotspots_from_db(database_url: str) -> pd.DataFrame:
    """
    Pull all hotspots from the PostgreSQL DB.
    Requires psycopg2: pip install psycopg2-binary
    """
    try:
        import psycopg2
        conn = psycopg2.connect(database_url)
        df = pd.read_sql(
            "SELECT id, facility_id, frp, acq_date FROM hotspots",
            conn,
        )
        conn.close()
        return df
    except ImportError:
        raise ImportError(
            "psycopg2 not installed. Run: pip install psycopg2-binary"
        )


def push_anomaly_scores_to_db(df: pd.DataFrame, database_url: str) -> int:
    """
    Write anomaly_score back to hotspots table via PATCH /api/hotspots/:id.
    Uses the REST API so no DB credentials needed from ML side in production.

    Returns count of updated rows.
    """
    import urllib.request, json as _json

    anomalous = df[df["is_anomaly"]].copy()
    updated = 0

    for _, row in anomalous.iterrows():
        payload = _json.dumps({
            "risk_score": float(row["anomaly_score"]),
        }).encode()
        req = urllib.request.Request(
            f"http://localhost:4000/api/hotspots/{int(row['id'])}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PATCH",
        )
        try:
            with urllib.request.urlopen(req, timeout=10):
                updated += 1
        except Exception as e:
            print(f"  WARN: PATCH hotspot {row['id']} failed: {e}")

    return updated


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────

def _demo_memory():
    labeled_path = OUTPUT_DIR / "labeled.parquet"
    if not labeled_path.exists():
        print("No labeled.parquet found. Run ml/train.py first.")
        return

    df = pd.read_parquet(labeled_path)

    # Fake facility_id assignment for demo (real data comes from DB join)
    if "facility_id" not in df.columns:
        rng = np.random.default_rng(42)
        df["facility_id"] = rng.integers(1, 15, size=len(df)).astype(float)
        df.loc[rng.random(size=len(df)) < 0.2, "facility_id"] = np.nan

    df = compute_facility_baseline(df)
    df = flag_anomalies(df, z_threshold=2.5, min_count=3)
    df = compute_anomaly_score(df)

    n_anom = df["is_anomaly"].sum()
    print(f"\nAnomalies detected: {n_anom:,} / {len(df):,} "
          f"({n_anom/len(df)*100:.1f}%)")
    print("\nTop-10 anomalous hotspots:")
    cols = ["facility_id", "frp", "facility_frp_mean",
            "facility_frp_zscore", "anomaly_score"]
    print(df[df["is_anomaly"]].nlargest(10, "anomaly_score")[cols].to_string(index=False))

    out = OUTPUT_DIR / "anomalies.parquet"
    df.to_parquet(out, index=False)
    print(f"\nSaved → {out}")


if __name__ == "__main__":
    import argparse, os
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=["memory", "db"], default="memory")
    args = p.parse_args()

    print("=== AgniDrishti Anomaly Detector ===")
    if args.mode == "memory":
        _demo_memory()
    else:
        db_url = os.environ.get(
            "DATABASE_URL", "postgresql://sih:sih@localhost:5432/firewatch"
        )
        print(f"Loading from DB: {db_url}")
        df = load_hotspots_from_db(db_url)
        df = compute_facility_baseline(df)
        df = flag_anomalies(df)
        df = compute_anomaly_score(df)
        n = push_anomaly_scores_to_db(df, db_url)
        print(f"Updated {n} hotspots in DB.")
