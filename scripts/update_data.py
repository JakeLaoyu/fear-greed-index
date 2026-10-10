#!/usr/bin/env python3
"""Fetch the upstream CNN Fear & Greed CSV and build data/fear-greed.json.

Source: https://github.com/whit3rabbit/fear-greed-data (MIT)

Output format (compact, for the static front-end):
{
  "source": "...",
  "generated_at": "2026-10-10T00:00:00Z",
  "ratings": ["extreme fear", "fear", "neutral", "greed", "extreme greed"],
  "data": [["2011-01-03", 68.0, 3], ...]   # [date, score, rating index]
}

Safety checks (the script exits non-zero and writes nothing if any fail):
  * the CSV parses and every row has a valid date / score / rating
  * dates are strictly increasing (no duplicates)
  * the new dataset is not shorter than the existing one
  * the latest date does not move backwards
"""
from __future__ import annotations

import csv
import io
import json
import sys
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

SOURCE_URL = (
    "https://raw.githubusercontent.com/whit3rabbit/fear-greed-data/main/fear-greed.csv"
)
RATINGS = ["extreme fear", "fear", "neutral", "greed", "extreme greed"]
# CNN band cutoffs, used only when a row has no rating.
CUTOFFS = [(25, 0), (45, 1), (55, 2), (75, 3)]

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "fear-greed.json"


def rating_from_score(score: float) -> int:
    for limit, idx in CUTOFFS:
        if score < limit:
            return idx
    return 4


def fetch_csv(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "fear-greed-index-updater"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def parse(text: str) -> list[list]:
    rows: list[list] = []
    reader = csv.DictReader(io.StringIO(text))
    for i, r in enumerate(reader, start=2):
        try:
            d = date.fromisoformat(r["Date"].strip())
            score = float(r["Fear Greed"])
        except (KeyError, ValueError) as e:
            raise ValueError(f"line {i}: bad row {r!r}: {e}") from e
        if not 0 <= score <= 100:
            raise ValueError(f"line {i}: score out of range: {score}")
        label = (r.get("Rating") or "").strip().lower()
        idx = RATINGS.index(label) if label in RATINGS else rating_from_score(score)
        rows.append([d.isoformat(), round(score, 1), idx])
    return rows


def validate(rows: list[list]) -> None:
    if len(rows) < 1000:
        raise ValueError(f"too few rows: {len(rows)}")
    for a, b in zip(rows, rows[1:]):
        if b[0] <= a[0]:
            raise ValueError(f"dates not strictly increasing: {a[0]} -> {b[0]}")
    if OUT.exists():
        old = json.loads(OUT.read_text())["data"]
        if len(rows) < len(old):
            raise ValueError(f"new data shorter than existing ({len(rows)} < {len(old)})")
        if rows[-1][0] < old[-1][0]:
            raise ValueError(f"latest date moved backwards ({rows[-1][0]} < {old[-1][0]})")


def main() -> int:
    url = sys.argv[1] if len(sys.argv) > 1 else SOURCE_URL
    rows = parse(fetch_csv(url))
    validate(rows)

    if OUT.exists() and json.loads(OUT.read_text())["data"] == rows:
        print(f"No change (latest {rows[-1][0]}).")
        return 0

    payload = {
        "source": "https://github.com/whit3rabbit/fear-greed-data",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ratings": RATINGS,
        "data": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"Wrote {len(rows)} rows ({rows[0][0]} -> {rows[-1][0]}) to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
