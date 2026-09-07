"""
The ink transfer, in one place.

INTAGLIO is one ink. Paper is bare, ink is full strength, and the grey between
them is an optical average of hard-edged marks whose AREA carries the value.
That is five constants and one formula, and there are currently FOUR copies of
them in this repository:

    scripts/bake-portrait.py   LIFT .. INK_DIA_MAX, ink_dia(), jitter_of()
    src/lib/board.ts           the 2D floor
    src/lib/field/gl-board.ts  the GPU path
    src/lib/og.tsx             the share card

Four copies of a number is four chances for a silent drift, and this direction
has already paid for one: the no-JS stills were 23-26% over-inked for a whole
session because PIL's ellipse box is endpoint-inclusive and only one of the
four renderers had that bug. Nothing failed. The picture was just wrong on the
rung nobody looks at.

This module is the Python copy, and the new bakers import it rather than
retyping it. **scripts/bake-portrait.py should import it too** -- it is
deliberately left alone here because another change is in flight in it, and a
constant is not worth a merge conflict. When that lands, delete its
`LIFT, INK_GAIN, ... = ...` line, its `ink_dia`, its `jitter_of` and its
`JITTER`, and `from screen import ...` instead. The numbers below were copied
from it character for character; `python scripts/screen.py --verify` proves
they still match by parsing that file.

    python scripts/screen.py --verify     # the four copies still agree
    python scripts/screen.py --table      # the transfer as a table, for reading
"""
from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent

# ── The transfer ──────────────────────────────────────────────────────────
# Every one of these five numbers was measured offline before it was written
# down (direction section 5.3a), and each records a failure it prevents.
#
#   DEEP_FLOOR  the 27% of portrait cells that sit under UNLIT map to ~0.94
#               coverage taken at face value and go nearly solid. Flooring
#               their luminance at 0.16 is the single largest cause of mud
#               removed. It is also a hard ceiling on ink: NO cell can print a
#               dot wider than ink_dia(DEEP_FLOOR) = 0.865 cells, which is why
#               a "solid black" line in a plate is a field of nearly-touching
#               dots rather than a black bar.
#   LIFT        straight inversion gives mean coverage 0.55 and crushes the
#               shadow side to a photocopy. 0.55 holds the form; 0.42 loses
#               presence.
#   INK_GAIN    press gain compensation.
#   1.128       2/sqrt(pi): the area-exact diameter for a disc of `coverage`.
#   INK_DIA_MAX sqrt(2), the diameter at which a cell closes to solid.
#   CULL_DIA    the most important line in the direction: a dot you cannot
#               resolve is grey haze, and the ABSENCE of a dot is a highlight.
LIFT, INK_GAIN, DEEP_FLOOR, CULL_DIA, INK_DIA_MAX = 0.55, 1.15, 0.16, 0.30, 1.42

#: 2/sqrt(pi). The diameter of the disc whose area is `coverage` of a unit cell.
AREA_EXACT = 1.128

#: byte >= UNLIT * 255 is a lit cell -- what BoardField.count counts.
UNLIT = 0.05

#: The stochastic screen, in the same numbers the two renderers use.
#:
#: Not decoration. A ruled orthogonal grid of marks is invisible on a dark
#: ground and unavoidable on white: it shows a screen door and it beats against
#: the display's own pixel grid. The board breaks the lattice for exactly that
#: reason and a still has to do it too, or the picture a no-JS visitor gets is a
#: moire of the picture everyone else gets.
JITTER = 0.34

# Ink on paper. These must match the CSS tokens in src/app/globals.css.
PAPER = (0xFA, 0xF8, 0xF4)
INK = (0x14, 0x12, 0x0E)


def jitter_of(i: int, j: int) -> tuple[float, float]:
    """The screen's offset for cell (i, j), in cells.

    The hash is the shaders' hash. Float64 here against float32 there means the
    two do not land on identical offsets, which does not matter: what has to
    match is the CHARACTER of the screen, not the seed.
    """
    a = math.modf(math.sin(i * 12.9898 + j * 78.233) * 43758.5453)[0] % 1.0
    b = math.modf(math.sin(i * 39.3468 + j * 11.135) * 24634.6345)[0] % 1.0
    return (a - 0.5) * 2.0 * JITTER, (b - 0.5) * 2.0 * JITTER


def coverage_of(L: float) -> float:
    """Ink coverage, 0..1, for a cell of stored luminance L."""
    return (1.0 - min(max(L, DEEP_FLOOR), 1.0) ** LIFT) ** INK_GAIN


def ink_dia(L: float, cull: float = CULL_DIA) -> float:
    """Dot diameter in cells for a cell of luminance L, or 0 if it is culled."""
    dia = min(AREA_EXACT * math.sqrt(coverage_of(L)), INK_DIA_MAX)
    return dia if dia >= cull else 0.0


def ink_dia_np(L: np.ndarray, cull: float = CULL_DIA) -> np.ndarray:
    """`ink_dia` over an array. Same formula, same numbers, no loop.

    float64, unconditionally, and that is not tidiness. Handed a float32 array
    this returned 0.86878616 where the scalar path returns 0.8687861191 -- the
    vector answer LARGER by 4e-9 -- and a caller that took a percentile of
    these diameters and fed it back as a cull got a threshold no scalar dot
    could clear. The verso plate rendered as a blank sheet, silently, which
    looks exactly like a plate that has not been placed yet. Two copies of one
    formula have to agree to the bit or one of them is a different formula.
    """
    L = np.asarray(L, dtype=np.float64)
    lifted = np.clip(L, DEEP_FLOOR, 1.0) ** LIFT
    coverage = np.power(np.maximum(1.0 - lifted, 0.0), INK_GAIN)
    dia = np.minimum(AREA_EXACT * np.sqrt(coverage), INK_DIA_MAX)
    return np.where(dia >= cull, dia, 0.0)


def cull_luminance(cull: float = CULL_DIA) -> float:
    """The luminance above which nothing is printed at all: bare paper.

    Solved rather than swept, because it is the number that decides what a
    plate's mask IS. Above it the transfer emits no mark, so a cell that stores
    a value above it and a cell that stores nothing are the same picture -- and
    the honest field stores nothing, so `count` is the number of dots the
    renderer actually draws and a caption cannot lie about it.
    """
    coverage = (cull / AREA_EXACT) ** 2
    lifted = 1.0 - coverage ** (1.0 / INK_GAIN)
    return float(min(1.0, max(0.0, lifted ** (1.0 / LIFT))))


def max_dia() -> float:
    """The widest dot the transfer can emit, at L = DEEP_FLOOR."""
    return AREA_EXACT * math.sqrt(coverage_of(0.0))


def render(
    field: np.ndarray,
    cell_px: float,
    *,
    transparent: bool = True,
    alpha_scale: float = 1.0,
    cull: float = CULL_DIA,
    ss: int = 8,
) -> Image.Image:
    """The settled frame, drawn the way the browser draws it.

    One ink at full strength through the shared `ink_dia` above, or the image a
    no-JS visitor sees is not the picture the board draws. No second ink: the
    vermilion datum is licensed to four places site-wide and a plate is not one
    of them, so this renderer cannot emit it at all.

    AREA HAS TO BE EXACT HERE, and once it was not.

    A still is what a visitor sees with JavaScript off, what the printer prints,
    and what forced-colors shows -- the bottom rung of the tier ladder, which
    section 8.7 of the direction says must agree with every other rung, which is
    precisely the kind of claim nothing checks, so it drifted. Drawing each dot
    with PIL's `ellipse` is wrong: its bounding box is ENDPOINT-INCLUSIVE, so
    asking for a disc of diameter D paints D + 1 pixels across. At these sizes
    that is not a rounding error -- measured against the exact pi/4 * d^2 a dot
    came out 1.11x too large at 20px and 3.5x too large at 1.2px, and the stills
    were 20-65% darker than the board they stand in for.

    So the mask is drawn at `ss`x with the endpoint corrected, then box-filtered
    down. BOX is an exact area average, which is what coverage means; LANCZOS
    rings and would put a pale halo around every dot. An "L" mask rather than
    RGBA: 8x of a 960 x 1200 field is 74 MB in one channel and 295 MB in four.
    """
    rows, cols = field.shape
    W, H = int(round(cols * cell_px)), int(round(rows * cell_px))
    k = cell_px * ss
    mask = Image.new("L", (W * ss, H * ss), 0)
    d = ImageDraw.Draw(mask)
    drawn = 0
    for j in range(rows):
        for i in range(cols):
            v = int(field[j, i])
            if v == 0:
                continue
            dia = ink_dia(v / 255, cull)
            if dia == 0.0:
                continue  # below resolution is haze; bare paper is a highlight
            jx, jy = jitter_of(i, j)
            X, Y = (i + 0.5 + jx) * k, (j + 0.5 + jy) * k
            r = dia * k / 2
            d.ellipse((X - r, Y - r, X + r - 1, Y + r - 1), fill=255)
            drawn += 1
    cov = np.asarray(mask.resize((W, H), Image.BOX), dtype=np.float32) / 255.0
    del mask

    alpha = np.clip(cov * alpha_scale, 0.0, 1.0)[..., None]
    ink = np.array(INK, np.float32)
    if transparent:
        out = np.dstack([np.broadcast_to(ink, (H, W, 3)), alpha * 255.0])
    else:
        paper = np.array(PAPER, np.float32)
        out = np.dstack([paper * (1.0 - alpha) + ink * alpha, np.full((H, W, 1), 255.0, np.float32)])
    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), "RGBA")


def coverage_stats(image: Image.Image, block: int = 8) -> dict[str, float]:
    """The direction's content gate (section 10.1), as numbers.

    Box-filter the ink at `block` CSS pixels and histogram the local coverage.
    A smudge is a single spike at 0.5, so the gate wants SPAN (0.02..0.92) and
    a thin waist (under 12% of area in the 0.40..0.60 band) -- plus a mean
    band, because the histogram on its own PASSED the over-inked render: it
    measures range, and crushing the shadows increases range. A numeric gate
    that passes the ugly version is not a gate, which is why every caller also
    writes the picture out and looks at it.
    """
    a = np.asarray(image, dtype=np.float32)[..., 3] / 255.0
    H, W = a.shape
    h, w = H // block, W // block
    if h < 1 or w < 1:
        local = a.reshape(1, -1).mean(axis=1)
    else:
        local = a[: h * block, : w * block].reshape(h, block, w, block).mean(axis=(1, 3)).ravel()
    return {
        "mean": float(a.mean()),
        "lo": float(np.percentile(local, 1)),
        "hi": float(np.percentile(local, 99)),
        "waist": float(((local >= 0.40) & (local <= 0.60)).mean()),
        "paper": float((local < 0.02).mean()),
    }


# ── The lock ──────────────────────────────────────────────────────────────
#: name -> the value this module holds. Every other copy is matched against it.
_MINE = {
    "LIFT": LIFT,
    "INK_GAIN": INK_GAIN,
    "DEEP_FLOOR": DEEP_FLOOR,
    "CULL_DIA": CULL_DIA,
    "INK_DIA_MAX": INK_DIA_MAX,
}
#: file -> how that language spells `NAME = value`. Matched one constant at a
#: time rather than as one regex over the block: the copies interleave them
#: with paragraphs of reasoning, and a single pattern spanning the block goes
#: stale the moment somebody adds a sentence -- which is a check that fails for
#: the wrong reason, and those get deleted.
_SOURCES = {
    "scripts/bake-portrait.py": r"\b{name}\b[^\n]*?=\s*.*?(?<![\w.])({num})(?![\w.])",
    "src/lib/board.ts": r"const {name} = ({num});",
    # The GPU copy lives inside a GLSL string literal, so it is `const float`.
    "src/lib/field/gl-board.ts": r"const float {name} = ({num});",
}
_NUM = r"\d+(?:\.\d+)?"


def verify() -> int:
    """Parse the other copies of the transfer and compare. Returns an exit code."""
    bad = 0
    for rel, spelling in _SOURCES.items():
        path = ROOT / rel
        if not path.exists():
            print(f"  {rel}: MISSING")
            bad += 1
            continue
        text = path.read_text(encoding="utf-8")
        if rel.endswith(".py"):
            # The tuple assignment, in source order.
            m = re.search(
                r"LIFT,\s*INK_GAIN,\s*DEEP_FLOOR,\s*CULL_DIA,\s*INK_DIA_MAX\s*=\s*"
                + r",\s*".join([f"({_NUM})"] * 5),
                text,
            )
            found = dict(zip(_MINE, (float(g) for g in m.groups()))) if m else {}
        else:
            found = {}
            for name in _MINE:
                m = re.search(spelling.format(name=name, num=_NUM), text)
                if m:
                    found[name] = float(m.group(1))
        drift = [
            f"{k}={found.get(k)}" for k, v in _MINE.items() if k not in found or abs(found[k] - v) > 1e-9
        ]
        if drift:
            print(f"  {rel}: DRIFTED -- {', '.join(drift)}")
            bad += 1
        else:
            print(f"  {rel}: ok")
    print(f"  scripts/screen.py: {tuple(_MINE.values())}")
    # The fifth copy is inside this file: the vectorised transfer. It has to
    # agree with the scalar one to the bit, because callers mix them -- take a
    # percentile with one and use it as a threshold in the other -- and a
    # disagreement of 4e-9 empties a plate without an error.
    bytes_ = np.arange(256, dtype=np.float64) / 255.0
    vec = ink_dia_np(bytes_, cull=0.0)
    sca = np.array([ink_dia(float(L), cull=0.0) for L in bytes_])
    if not np.array_equal(vec, sca):
        worst = int(np.argmax(np.abs(vec - sca)))
        print(f"  ink_dia_np: DRIFTED from ink_dia at byte {worst}: {vec[worst]!r} vs {sca[worst]!r}")
        bad += 1
    else:
        print("  ink_dia_np: bit-identical to ink_dia over all 256 bytes")
    return 1 if bad else 0


def main() -> None:
    import argparse
    import sys

    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--verify", action="store_true", help="the other copies still agree")
    p.add_argument("--table", action="store_true", help="print the transfer as a table")
    args = p.parse_args()
    if args.table or not args.verify:
        print(f"cull above L = {cull_luminance():.4f}   widest dot = {max_dia():.4f} cells")
        print("    L      coverage    dia (cells)")
        for n in range(0, 21):
            L = n / 20
            print(f"  {L:5.2f}   {coverage_of(L):8.4f}   {ink_dia(L):8.4f}")
    if args.verify:
        sys.exit(verify())


if __name__ == "__main__":
    main()
