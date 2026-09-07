"""
The quarterly rule: projects per quarter, as a register strip.

Run by hand; every output is committed. Vercel never runs this.

    python scripts/bake-rule.py                 # src/content/plate-rule.ts
                                                # public/portrait/rule-quarters@2x.webp
    python scripts/bake-rule.py --preview DIR

Section 6 of the direction gives /projects "one 40px register strip whose
coverage across its width is projects-per-quarter -- a histogram that looks
like a printed rule, in the same material as his face". This is that strip,
and it is not a bake: there is no raster anywhere in it. The dates are read
out of src/content/projects.ts, counted into quarters, and each quarter's
count is turned into the luminance whose dot AREA is proportional to it. The
strip is therefore a measurement printed in the site's own ink, and a project
added to projects.ts changes the plate the next time this is run.

── What the data actually says ────────────────────────────────────────────
The eight sortDates span **seven** quarters, Q4 2024 to Q2 2026 -- not the ten
the plan's note assumed, and not the six that "Q4 2024 to Q1 2026" describes.
The quarters are read off the dates rather than written down, so the plate
cannot be wrong about them:

    Q4 2024  1   WalleX
    Q1 2025  0   -- and this is the best mark on the strip
    Q2 2025  1   Clinical AI Assistant
    Q3 2025  1   LLM Multi-Agent QA
    Q4 2025  2   App Crawler, QualGent AI Assistant
    Q1 2026  2   CLIP-H, Checkpoint
    Q2 2026  1   Recurly Agent Platform

The empty quarter is the reason this is worth printing. A bar chart draws
nothing there and the eye slides over it; a rule with a HOLE in it is a broken
rule, and a broken rule is the loudest thing a printed page can do with a
hairline. The gap is January to March 2025 and it is real.

── The mapping ────────────────────────────────────────────────────────────
Coverage, not height. A bar chart encodes a count as a length and would need
an axis; this encodes it as ink area, which is the only channel this site has
and needs no axis at all. So the deepest quarter is given a dot of 0.80 cells
(coverage 0.503, comfortably under the transfer's 0.869 ceiling so that even
the densest band is still separate dots), every other quarter gets that
coverage times its share of the maximum, and the luminance that produces each
coverage is solved backwards through the shipped transfer.
"""
from __future__ import annotations

import argparse
import re
import sys
from importlib import import_module
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
art = import_module("bake-art")
import screen  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "src/content/projects.ts"

COLS, ROWS = 240, 8
BOX = (120, 4)
DENSITY = 2
#: The dot the busiest quarter prints. Under the transfer's 0.869 ceiling on
#: purpose: a band that saturates stops being a measurement and becomes a bar.
PEAK_DIA = 0.80


def quarters() -> list[tuple[str, int]]:
    """Every quarter from the first project to the last, counted. Quarters with
    nothing in them are included -- they are the point."""
    src = PROJECTS.read_text(encoding="utf-8")
    dates = [(int(y), int(m)) for y, m, _ in re.findall(r'sortDate: "(\d{4})-(\d{2})-(\d{2})"', src)]
    if not dates:
        raise SystemExit("no sortDate in src/content/projects.ts -- this script has gone stale")
    key = lambda ym: ym[0] * 4 + (ym[1] - 1) // 3
    lo, hi = min(key(d) for d in dates), max(key(d) for d in dates)
    counts = {q: 0 for q in range(lo, hi + 1)}
    for d in dates:
        counts[key(d)] += 1
    return [(f"Q{q % 4 + 1} {q // 4}", counts[q]) for q in range(lo, hi + 1)]


def luminance_for(coverage: float) -> float:
    """The stored luminance whose dot area is `coverage`, solved backwards
    through the shipped transfer rather than tuned by eye. Inverting the
    formula the renderer runs forwards is the only way the strip means the same
    thing as every other plate on the site."""
    if coverage <= 0:
        return 1.0
    lifted = 1.0 - coverage ** (1.0 / screen.INK_GAIN)
    return float(min(1.0, max(0.0, lifted ** (1.0 / screen.LIFT))))


def build() -> tuple[np.ndarray, list[tuple[str, int]]]:
    qs = quarters()
    peak = max(c for _, c in qs) or 1
    peak_cov = (PEAK_DIA / screen.AREA_EXACT) ** 2
    field = np.zeros((ROWS, COLS), np.uint8)
    edges = [round(i * COLS / len(qs)) for i in range(len(qs) + 1)]
    for i, (_, count) in enumerate(qs):
        if count == 0:
            continue  # bare paper: the hole in the rule
        L = luminance_for(peak_cov * count / peak)
        byte = int(np.clip(round(L * 255), 13, 255))
        if screen.ink_dia(byte / 255) == 0.0:
            raise SystemExit(f"a count of {count} maps under the cull -- the strip would lie")
        field[:, edges[i] : edges[i + 1]] = byte
    return field, qs


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="directory for a 1x review PNG, on paper")
    args = ap.parse_args()

    field, qs = build()
    for name, count in qs:
        v = int(field[0, round(qs.index((name, count)) * COLS / len(qs))]) if count else 0
        print(f"  {name}  {count}  byte {v:3d}  dia {screen.ink_dia(v / 255) if v else 0.0:.3f}")

    measured = art.bake_module(
        "plate-rule",
        [
            art.Plate(
                export="quarterlyRule",
                cols=COLS,
                rows=ROWS,
                profile=art.PROFILES["map"],
                still="rule-quarters@2x.webp",
                note="Projects per quarter, "
                + ", ".join(f"{n} {c}" for n, c in qs)
                + f". A {BOX[0]} x {BOX[1]} lattice box at density {DENSITY}.",
                density=DENSITY,
                field=field,
            )
        ],
        "scripts/bake-rule.py",
        "The quarterly register strip. Counted from src/content/projects.ts, not\n"
        "drawn: each quarter's band carries a dot area proportional to its count,\n"
        "and a quarter with no projects in it is bare paper.",
    )
    art.check_manifest(measured)

    if args.preview:
        out = Path(args.preview)
        out.mkdir(parents=True, exist_ok=True)
        screen.render(field, 3, transparent=False).convert("RGB").save(out / "quarterlyRule.png")
        print("preview in", out)


if __name__ == "__main__":
    main()
