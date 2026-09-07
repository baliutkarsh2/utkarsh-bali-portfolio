"""
The verso showthrough: the portrait, from the back of the sheet.

Run by hand; every output is committed. Vercel never runs this.

    python scripts/bake-verso.py                 # public/portrait/verso-*.webp
    python scripts/bake-verso.py --preview DIR

Hold a printed sheet up and the plate on the other side comes through it:
reversed, faint, and only its deepest passages -- the highlights never show
at all, because there is not enough ink there to reach the far side of the
paper. That is exactly three operations on a field this repository already
has, so this reads the COMMITTED portrait modules rather than the photograph.
It cannot drift from the portrait, because it is the portrait.

  1. flip on x            the sheet is turned over
  2. keep only the deepest cells
  3. render at alpha 0.12 what is left is a ghost, not a picture

It ships as a plain lazy <img aria-hidden>, not a board: there is no field
module and no `SOURCES` entry, because a showthrough is a mark on the paper
and not a thing the renderer should ever animate, assemble or relight.

── The cull, and why it is not 0.95 ───────────────────────────────────────
The brief for this said "raise the cull to ~0.95 so only the deepest cells
survive". It cannot be 0.95, and the arithmetic is short: DEEP_FLOOR clamps
every luminance at 0.16 before the transfer sees it, so the widest dot the
transfer can emit at all is `ink_dia(0)` = 0.8688 cells. A cull of 0.95 keeps
NOTHING -- it renders a blank sheet, silently, and a blank verso looks
exactly like a verso that has not been placed yet.

So the cull is a PERCENTILE of the realised diameters instead, which is what
"only the deepest cells" means and is also how section 5.3a of the direction
had to fix the burin threshold for precisely the same reason: an absolute
threshold against a distribution nobody had measured fired zero strokes and
the feature quietly did nothing. Each field prints its own number below.
"""
from __future__ import annotations

import argparse
import base64
import os
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import screen  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content"
PUBLIC = ROOT / "public/portrait"

#: Keep the deepest 5% of realised dots. See the note above: a percentile,
#: not an absolute diameter.
KEEP = 0.05
#: How much of the ink reaches the far side of the sheet.
ALPHA = 0.12
#: Device pixels per PAGE cell, matching every other still on the site.
STILL_PX = 12

#: The committed fields this reads, and the still each one stands behind.
FIELDS = [
    ("portrait-field-96", "verso-96.webp"),
    ("portrait-field-64", "verso-64.webp"),
    ("portrait-field-about", "verso-about.webp"),
]


def read_field(module: str) -> tuple[np.ndarray, int]:
    """A committed portrait module's bytes and the density it was baked at."""
    src = (CONTENT / f"{module}.ts").read_text(encoding="utf-8")
    w = int(re.search(r"\n  w: (\d+),", src).group(1))
    h = int(re.search(r"\n  h: (\d+),", src).group(1))
    data = re.search(r'data:\s*\n\s*"([^"]+)"', src).group(1)
    field = np.frombuffer(base64.b64decode(data), np.uint8).reshape(h, w)
    meta = (CONTENT / "portrait-meta.ts").read_text(encoding="utf-8")
    density = int(re.search(r"PORTRAIT_FIELD_DENSITY = (\d+);", meta).group(1))
    return field, density


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="directory for review PNGs, on paper")
    args = ap.parse_args()
    PUBLIC.mkdir(parents=True, exist_ok=True)

    for module, out_name in FIELDS:
        field, density = read_field(module)
        # The sheet is turned over.
        flipped = np.ascontiguousarray(field[:, ::-1])

        # Only the deepest passages come through.
        lit = flipped > 0
        dia = screen.ink_dia_np(flipped[lit].astype(np.float32) / 255.0)
        dia = dia[dia > 0]
        cull = float(np.percentile(dia, 100 * (1 - KEEP)))
        kept = int((dia >= cull).sum())

        img = screen.render(flipped, STILL_PX / density, transparent=True, alpha_scale=ALPHA, cull=cull)
        img.save(PUBLIC / out_name, quality=90, method=6)
        print(
            f"  {out_name:18} {flipped.shape[1]}x{flipped.shape[0]} at density {density}: "
            f"cull {cull:.4f} cells (p{100 * (1 - KEEP):.0f} of {len(dia)} dots), "
            f"{kept} through, alpha {ALPHA}, "
            f"{os.path.getsize(PUBLIC / out_name) // 1024} KB"
        )
        if args.preview:
            p = Path(args.preview)
            p.mkdir(parents=True, exist_ok=True)
            # On paper, at the size it will actually sit at, or a ghost that is
            # invisible at 12% and a ghost that is too loud look identical in a
            # transparent PNG.
            screen.render(
                flipped, 6 / density, transparent=False, alpha_scale=ALPHA, cull=cull
            ).convert("RGB").save(p / f"{out_name.replace('.webp', '')}.png")
    if args.preview:
        print("previews in", args.preview)


if __name__ == "__main__":
    main()
