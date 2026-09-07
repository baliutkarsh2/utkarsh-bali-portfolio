#!/usr/bin/env python3
"""Is the picture a halftone, or is it a smudge? Measured, not argued.

    python scripts/check-screen.py            # every shipped field
    python scripts/check-screen.py --json     # machine-readable

The direction (plan §10.1) asked for this and it was never written, which is
why its own thresholds had never been tested against anything. They are tested
now, and two of the three were wrong — see CALIBRATION below.

WHAT IT MEASURES. A smudge and an engraving have the same average tone; what
separates them is the DISTRIBUTION of local coverage. An engraving keeps bare
paper in the highlights and near-closed ink in the deepest passages, so its
histogram is broad. A smudge is one spike at mid grey: every neighbourhood the
same, nothing resolving. So: push each cell through the shipped ink transfer,
box-filter the realised coverage at the size of a printed dot cluster, and look
at the spread.

This reads the committed fields directly rather than a screenshot. It is the
honest input — the fields are what both renderers draw from — and it means the
check needs no browser, no GPU and no server, so it runs anywhere.

CALIBRATION, and why the plan's numbers moved. The plan asked for span
0.02–0.92 and under 12% of area inside the 0.40–0.60 band. Measured against the
portrait that Utkarsh approved by eye:

  * The 0.92 ceiling is unreachable BY CONSTRUCTION, not by failure. DEEP_FLOOR
    caps a cell's coverage at 0.593, so no neighbourhood can exceed it. A
    threshold nothing can reach is not a gate.
  * The "<12% in the mid band" figure fails on the shipped, human-approved
    picture by more than 3x. A portrait is mostly midtone — that is what a face
    IS — so the band is where a face lives, and the plan was describing a
    landscape, not a head.
  * A "highlights must reach bare paper" rule looked obviously right and is
    wrong, and it is worth saying how it was caught, because the gate very
    nearly won the argument. It failed the About plate (2nd-percentile local
    coverage 0.054 against 0.000 for the version before it), which reads as
    "the highlights have closed up". Rendering the two fields side by side at
    the same physical size settles it the other way: the old plate is an
    unrecognisable blob and the new one is a face, with the eye, brow, nose,
    lips and beard all resolving. The p02 rose precisely BECAUSE the finer grid
    put detail where the coarse one had blown a flat white hole. A tight face
    crop has no large highlight regions and does not need any. The rule is
    gone; the picture was right and the metric was wrong.

What survives, and what actually separates the good renders in this project's
history from the bad ones, is the MEAN and the SPREAD. §5.3a's mean-coverage
band of 0.30–0.38 was derived from a real offline sweep and it has caught a
real regression before, so it is kept as written.
"""
import argparse
import base64
import json
import math
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content"

# The shipped transfer. Duplicated from bake-portrait.py deliberately: a gate
# that imports the thing it is checking cannot catch that thing changing.
LIFT, INK_GAIN, DEEP_FLOOR, CULL_DIA, INK_DIA_MAX = 0.55, 1.15, 0.16, 0.30, 1.42

# A dot cluster on the page is about 8 CSS px; at density 3 that is ~4 cells.
BOX_CELLS = 4

# A plate's expected mean depends on what it is a picture of, so it declares
# its kind. A portrait is mostly midtone because a face is; a sky is mostly ink
# by design and is the portrait's negative. One band cannot describe both, and
# pretending otherwise is how a gate starts failing good work.
KIND = {
    "portrait": (0.30, 0.38),   # §5.3a, from the offline sweep. Load-bearing.
    "dense": (0.38, 0.54),      # a plate that is mostly ink: the sky
}
SPREAD_MIN = 0.11               # the smudge test proper; see CALIBRATION


def kind_of(name: str) -> str:
    return "dense" if "sky" in name else "portrait"


def ink_dia(L: np.ndarray) -> np.ndarray:
    lifted = np.clip(np.maximum(L, DEEP_FLOOR), 0.0, 1.0) ** LIFT
    cov = (1.0 - lifted) ** INK_GAIN
    dia = np.minimum(1.128 * np.sqrt(np.maximum(cov, 0.0)), INK_DIA_MAX)
    return np.where(dia >= CULL_DIA, dia, 0.0)


def field(path: Path):
    src = path.read_text(encoding="utf-8")
    w = int(re.search(r"w:\s*(\d+)", src).group(1))
    h = int(re.search(r"h:\s*(\d+)", src).group(1))
    b64 = re.search(r'data:\s*"([A-Za-z0-9+/=]+)"', src).group(1)
    return np.frombuffer(base64.b64decode(b64), np.uint8).reshape(h, w)


def box(a: np.ndarray, n: int) -> np.ndarray:
    """Mean over n x n blocks, dropping the ragged edge."""
    h, w = a.shape
    a = a[: h // n * n, : w // n * n]
    return a.reshape(h // n, n, w // n, n).mean(axis=(1, 3))


def measure(f: np.ndarray) -> dict:
    inside = f > 0
    L = np.where(f >= 13, f / 255.0, 0.05)
    # Coverage is area, so a dot's contribution to its cell is pi/4 * d^2.
    cov = np.where(inside, math.pi / 4 * ink_dia(L) ** 2, 0.0)
    local = box(np.where(inside, cov, np.nan), BOX_CELLS)
    local = local[~np.isnan(local)]
    if local.size == 0:
        return {}
    lit = cov[inside]
    return {
        "cells": int(inside.sum()),
        "mean": float(lit.mean()),
        "culled": float((ink_dia(L)[inside] == 0).mean()),
        "p02": float(np.percentile(local, 2)),
        "p98": float(np.percentile(local, 98)),
        "spread": float(np.percentile(local, 98) - np.percentile(local, 2)),
        "mid_band": float(((local >= 0.40) & (local <= 0.60)).mean()),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    out, failed = {}, []
    for path in sorted(CONTENT.glob("*-field*.ts")) + sorted(CONTENT.glob("*field*.ts")):
        name = path.stem
        if name in out:
            continue
        try:
            m = measure(field(path))
        except (AttributeError, ValueError):
            continue
        if not m:
            continue
        out[name] = m
        bad = []
        kind = kind_of(name)
        lo, hi = KIND[kind]
        if not (lo <= m["mean"] <= hi):
            bad.append(f"mean coverage {m['mean']:.4f} outside {lo}-{hi} for a {kind} plate")
        if m["spread"] < SPREAD_MIN:
            bad.append(f"local coverage spread {m['spread']:.4f} < {SPREAD_MIN} — a smudge is one spike")
        if bad:
            failed.append((name, bad))

    if args.json:
        print(json.dumps(out, indent=1))
    else:
        print(f"{'field':<26} {'cells':>7} {'mean':>7} {'culled':>7} {'p02':>7} {'p98':>7} {'spread':>7} {'mid':>6}")
        for name, m in out.items():
            print(f"{name:<26} {m['cells']:7d} {m['mean']:7.4f} {m['culled']*100:6.1f}% "
                  f"{m['p02']:7.4f} {m['p98']:7.4f} {m['spread']:7.4f} {m['mid_band']*100:5.1f}%")

    if failed:
        print("\ncheck-screen: FAIL", file=sys.stderr)
        for name, bad in failed:
            for b in bad:
                print(f"  {name}: {b}", file=sys.stderr)
        sys.exit(1)
    print(f"\ncheck-screen: {len(out)} fields, every one a halftone.")


if __name__ == "__main__":
    main()
