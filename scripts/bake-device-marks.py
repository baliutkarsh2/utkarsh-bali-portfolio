"""
The eight project devices as vector marks: public/portrait/device-*.svg.

Run by hand after any change to a drawing in scripts/bake-devices.py; the
outputs are committed.

    python scripts/bake-device-marks.py
    python scripts/bake-device-marks.py --preview DIR   # also a contact sheet

The devices used to reach the page only through the dot transfer: a 48 x 60
field of discs whose diameter carried the value, drawn at 128-272 CSS px. At
that size a cell is 2.7 px, under a 1x panel's own Nyquist limit, so every
mark antialiased into a mottled grey slab and the eight diagrams read as QR
noise beside the project names. Quantising the field to three dot sizes on
one grid (the first attempt at this file) made them sharper and no less
noisy: the noise is the grid, not the rounding.

So this does not read the baked field at all. It runs the SAME drawing
functions bake-devices.py runs -- one geometry, stated once -- against a
recorder instead of a raster, and writes the geometry out as what it always
was: rules, bars, discs and holes. The dot survives where it means something.
A connector that is secondary in the drawing (a route not taken, an empty
socket, a lane's rail) is set as a dotted rule, a row of round dots at one
pitch, which is the site's own device used as an engraver uses a dotted
leader. Everything primary is solid ink. So each mark has exactly two
weights, and at 128 px the eye gets the structure first and the texture
second, which is the order a diagram is read in.

Output is one SVG per device with no colour of its own: the page uses it as a
CSS mask over `currentColor`, so the mark takes the ink of whatever theme it
is drawn in. A hole in the plate (the five human checkpoints cut through the
Recurly chain) is an SVG <mask> in painter's order, so a shape drawn after a
hole is not cut by it.
"""
from __future__ import annotations

import argparse
import sys
from importlib import import_module
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
devices = import_module("bake-devices")

#: SVG user units per cell. Ten keeps every coordinate a short decimal.
U = 10
#: A value at or under this is ink; at or over ERASE it is bare paper; between
#: the two the drawing meant "secondary", which is set dotted.
INK = 0.12
ERASE = 0.9
#: A stroke or a bar narrower than this many cells is a rule, not a shape.
THIN = 0.45
#: The dotted rule: dot diameter and pitch, in cells. At the index size
#: (128 px across 48 cells) that is a 1.6 px dot every 3.5 px -- two dots
#: never merge, and one dot never falls under a device pixel.
DOT = 0.6
PITCH = 1.3
#: A mesh is the one place dots fail: seventy dotted rules crossing each other
#: read as static. Where a drawing's secondary rules are a mesh (CLIP-H's
#: paths through the five features), they are set as fine solid hairlines.
HAIRLINE = 0.28
MESH = {"device-clip-h"}


def recurly_spine(ops: list[tuple]) -> list[tuple]:
    """The Recurly chain's conduit is ten cells of solid ink in the raster
    drawing, because a hole cut in a hairline of dots is just a shorter
    hairline. In vector ink a ten-cell bar is a black totem that outweighs
    every other mark on the page, and the holes read as the gaps in a stack
    of bricks rather than as cuts in a chain. So here the conduit is a spine,
    and the five cuts go through a line, which is what a break in a chain
    looks like."""
    out = []
    for op in ops:
        if op[0] == "rect" and op[1:5] == (19.0, 12.0, 29.0, 52.6):
            op = ("rect", 23.0, 12.0, 25.0, 52.6, op[5])
        out.append(op)
    return out


#: Per-device adjustments for the vector medium, applied to the recorded
#: drawing before it is written. Each one says why in its docstring.
ADJUST = {"device-recurly": recurly_spine}


def f(n: float) -> str:
    """A coordinate in user units, as short as it can be written."""
    s = f"{n * U:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


class Recorder:
    """The drawing surface bake-devices.py draws on, recording instead of
    rasterising. Same signatures as `Sheet`, so the drawing functions run
    unchanged."""

    def __init__(self, cols: int = devices.COLS, rows: int = devices.ROWS):
        self.cols, self.rows = cols, rows
        self.ops: list[tuple] = []

    def rect(self, x0, y0, x1, y1, v=0.0):
        self.ops.append(("rect", x0, y0, x1, y1, v))

    def bar(self, cx, cy, w, h, v=0.0):
        self.rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, v)

    def disc(self, cx, cy, d, v=0.0):
        self.ops.append(("disc", cx, cy, d, v))

    def line(self, x0, y0, x1, y1, w=0.25, v=0.0):
        self.ops.append(("line", x0, y0, x1, y1, w, v))

    def elbow(self, x0, y0, x1, y1, turn, w=0.25, v=0.0):
        self.line(x0, y0, x0, turn, w, v)
        self.line(x0, turn, x1, turn, w, v)
        self.line(x1, turn, x1, y1, w, v)


def dotted(x0, y0, x1, y1) -> str:
    return f'M{f(x0)} {f(y0)}L{f(x1)} {f(y1)}'


def to_svg(rec: Recorder, mesh: bool = False) -> str:
    """Painter's order. Solid shapes and solid rules go in as they come; the
    dotted rules are collected into one path per run so the markup stays
    small; a hole wraps everything drawn so far in a mask."""
    body: list[str] = []
    masks: list[str] = []
    solid_d: list[str] = []  # heavy rules, one path, round caps
    dots_d: list[str] = []  # dotted rules, one path
    hair_d: list[str] = []  # a mesh's hairlines, one path
    fills: list[str] = []  # rects and discs

    def flush() -> None:
        if fills:
            body.append(f'<path d="{"".join(fills)}"/>')
            fills.clear()
        for d, w in solid_d:
            body.append(
                f'<path d="{d}" fill="none" stroke="#000" stroke-width="{f(w)}" '
                'stroke-linecap="round" stroke-linejoin="round"/>'
            )
        solid_d.clear()
        if hair_d:
            body.append(
                f'<path d="{"".join(hair_d)}" fill="none" stroke="#000" '
                f'stroke-width="{f(HAIRLINE)}" stroke-linecap="round" stroke-opacity=".75"/>'
            )
            hair_d.clear()
        if dots_d:
            body.append(
                f'<path d="{"".join(dots_d)}" fill="none" stroke="#000" '
                f'stroke-width="{f(DOT)}" stroke-linecap="round" '
                f'stroke-dasharray="0 {f(PITCH)}"/>'
            )
            dots_d.clear()

    def rect_d(x0, y0, x1, y1) -> str:
        return f"M{f(x0)} {f(y0)}H{f(x1)}V{f(y1)}H{f(x0)}Z"

    def disc_d(cx, cy, d) -> str:
        r = d / 2
        return (
            f"M{f(cx - r)} {f(cy)}a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0"
            f"a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0"
        )

    pending_holes: list[str] = []

    def cut() -> None:
        if not pending_holes:
            return
        flush()
        mid = f"h{len(masks)}"
        w, h = rec.cols * U, rec.rows * U
        masks.append(
            f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" '
            f'width="{w}" height="{h}"><rect width="{w}" height="{h}" fill="#fff"/>'
            f'<path d="{"".join(pending_holes)}"/></mask>'
        )
        inner = "".join(body)
        body.clear()
        body.append(f'<g mask="url(#{mid})">{inner}</g>')
        pending_holes.clear()

    for op in rec.ops:
        kind = op[0]
        v = op[-1]
        if kind == "rect" and v >= ERASE:
            _, x0, y0, x1, y1, _ = op
            pending_holes.append(rect_d(x0, y0, x1, y1))
            continue
        cut()
        if kind == "rect":
            _, x0, y0, x1, y1, _ = op
            w, h = x1 - x0, y1 - y0
            if v <= INK:
                fills.append(rect_d(x0, y0, x1, y1))
            elif min(w, h) <= THIN:
                # A rule drawn as a thin rect: dotted along its long axis.
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
                if w >= h:
                    dots_d.append(dotted(x0, cy, x1, cy))
                else:
                    dots_d.append(dotted(cx, y0, cx, y1))
            else:
                # A secondary block (an unused tool, an empty socket): one dot.
                fills.append(disc_d((x0 + x1) / 2, (y0 + y1) / 2, max(DOT * 1.5, min(w, h) * 0.8)))
        elif kind == "disc":
            _, cx, cy, d, _ = op
            fills.append(disc_d(cx, cy, d if v <= INK else d * 0.85))
        elif kind == "line":
            _, x0, y0, x1, y1, w, _ = op
            if v <= INK and w >= THIN:
                solid_d.append((dotted(x0, y0, x1, y1), w))
            elif mesh and x0 != x1 and y0 != y1:
                hair_d.append(dotted(x0, y0, x1, y1))
            else:
                dots_d.append(dotted(x0, y0, x1, y1))
    cut()
    flush()

    w, h = rec.cols * U, rec.rows * U
    defs = f"<defs>{''.join(masks)}</defs>" if masks else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}">{defs}{"".join(body)}</svg>\n'
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="directory for a contact sheet (HTML)")
    args = ap.parse_args()

    devices.Sheet = Recorder  # the drawing functions look it up at call time
    out_dir = ROOT / "public/portrait"
    written = []
    for _export, slug, fn, title in devices.DEVICES:
        rec = fn()
        if slug in ADJUST:
            rec.ops = ADJUST[slug](rec.ops)
        svg = to_svg(rec, mesh=slug in MESH)
        (out_dir / f"{slug}.svg").write_text(svg, encoding="utf-8", newline="\n")
        written.append(slug)
        print(f"{slug}: {len(rec.ops)} ops, {len(svg) / 1024:.1f} KB  ({title})")

    if args.preview:
        out = Path(args.preview)
        out.mkdir(parents=True, exist_ok=True)
        cells = "".join(
            f'<div style="width:{{S}}px;aspect-ratio:4/5;background:currentColor;'
            f'-webkit-mask:url(/portrait/{s}.svg) center/contain no-repeat;'
            f'mask:url(/portrait/{s}.svg) center/contain no-repeat"></div>'
            for s in written
        )
        (out / "marks.html").write_text(cells, encoding="utf-8")
        print("preview cells in", out / "marks.html")


if __name__ == "__main__":
    main()
