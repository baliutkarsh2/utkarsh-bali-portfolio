#!/usr/bin/env python3
"""
Bake the hero portrait: a COLOUR dot field of the subject.

The hero is a field of discs, one per grid cell, each carrying the mean colour
of the photograph under it. Diameter carries luminance, so the ground shows
between the marks and the thing reads as a screen rather than as a picture:
on paper a dark cell closes up and a light one opens, and on the plate that
inverts, because there the ground is what a highlight is made of.

This script writes two things per size:

  · the GRID itself, as a tiny image at one pixel per cell. The renderer
    (src/components/interactive/hero-dots.tsx) loads it, reads the pixels
    once and draws the discs. A 155 x 190 WebP is about 20 KB, against the
    120 KB a base64 module of the same bytes would inline.
  · a rendered STILL, for no JavaScript, for print, and for forced colours.

Two sizes, as the old dot portrait had: a 155-column field for the hero
column and a 96-column one for a phone, where 155 columns at 350 CSS px is a
2.3 px cell and the screen stops being visible at all.

    python scripts/bake-hero.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The cut-out, not the photograph. The field is HIM: the ridge, the sunset and
# the other people on it are not part of the portrait, so the bake reads the
# alpha channel `scripts/segment.py` wrote and a cell outside the subject gets
# no mark at all. That is also what makes the figure sit ON the page rather
# than in a window cut into it, in either theme.
SRC = os.path.join(ROOT, "src", "assets", "portrait", "utkarsh-cutout.png")
# Head, shoulders, the striped shirt. The full cut-out runs to his shins at a
# 0.573 ratio, taller than the hero column can hold, and a crop that keeps his
# hands leaves the whole top-left corner of the frame empty.
CROP = (300, 0, 1564, 1550)
# Below this mean coverage a cell is outside the subject and prints nothing.
ALPHA_FLOOR = 0.35
OUT = os.path.join(ROOT, "public", "portrait")

# The transfer. A cell is never bare and never quite closed: below DIA_MIN the
# disc stops being resolvable and turns to haze, and at DIA_MAX a touch of
# ground still separates neighbours, which is what keeps it a screen.
DIA_MIN, DIA_MAX, GAMMA = 0.72, 0.98, 0.85
# THE FIELD HANGS ON A PLATE, in both themes, and that is not decoration.
#
# He is backlit: the sun is behind him, so his face is in shadow and only the
# rim is bright. On paper his skin sits a few percent off the sheet, and every
# curve that darkens him enough to separate the two takes his face with it --
# measured at gamma 1.1 / 1.2 / 1.3 against contrast 1.0 / 1.3 / 1.45 / 1.6,
# and by the second step the eye and the brow are gone and he is a silhouette.
# On the plate the same marks read immediately, warm against near-black, with
# the rim light doing what it did in the photograph.
#
# So the ground is the plate in both themes, no tone curve is applied at all,
# and the colours are the photograph's own.
PLATE = (22, 20, 15)
SS = 4  # supersample for the still, so its disc edges match the canvas's


def grid(im, cols):
    """One RGBA pixel per cell: the mean colour under it, and how much of the
    cell the subject covers.

    Averaged in PREMULTIPLIED space and then un-premultiplied. Resize an
    ordinary RGBA image and the transparent pixels outside the silhouette --
    which carry whatever colour happened to be under the matte, usually black
    -- are averaged into the colour of every edge cell, and his outline comes
    out rimmed in dirt. Premultiplying weights each pixel's colour by its own
    coverage, which is the only average that means anything here."""
    rows = round(cols * im.size[1] / im.size[0])
    src = np.asarray(im, dtype=np.float64) / 255.0
    rgb, alpha = src[:, :, :3], src[:, :, 3:4]
    pre = Image.fromarray(np.uint8(np.round(np.concatenate([rgb * alpha, alpha], 2) * 255)))
    small = np.asarray(pre.resize((cols, rows), Image.BOX), dtype=np.float64) / 255.0
    a = small[:, :, 3:4]
    flat = np.clip(np.divide(small[:, :, :3], np.maximum(a, 1e-6)), 0, 1)
    out = np.concatenate([flat, a], 2)
    return Image.fromarray(np.uint8(np.round(out * 255)), "RGBA")


def still(g, cell, ground):
    """The rendered field, for the readers that cannot run the renderer.
    Kept in step with the draw loop in hero-dots.tsx by hand; the two must
    agree or a visitor without JavaScript gets a different picture."""
    cols, rows = g.size
    px = g.load()
    W, H = cols * cell, rows * cell
    canvas = Image.new("RGB", (W * SS, H * SS), ground)
    d = ImageDraw.Draw(canvas)
    for j in range(rows):
        for i in range(cols):
            r, gr, b, a = px[i, j]
            cover = a / 255
            if cover < ALPHA_FLOOR:
                continue
            lum = (0.2126 * r + 0.7152 * gr + 0.0722 * b) / 255
            dia = DIA_MIN + (DIA_MAX - DIA_MIN) * (1 - lum) ** GAMMA
            # The silhouette thins rather than steps: a half-covered cell
            # prints a half-sized mark, which is what an edge looks like.
            dia *= cover
            rad = dia * cell * SS / 2
            cx, cy = (i + 0.5) * cell * SS, (j + 0.5) * cell * SS
            d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(r, gr, b))
    return canvas.resize((W, H), Image.LANCZOS)


def main():
    im = Image.open(SRC).convert("RGBA").crop(CROP)
    print(f"source {im.size[0]} x {im.size[1]}  ratio {im.size[0] / im.size[1]:.3f}")
    # The still is a lossy WebP of a dot field, which is the worst thing you
    # can hand that codec: every disc edge is an edge. At a 6 px cell it came
    # to 487 KB for a picture only a reader without JavaScript ever sees. One
    # cell to four CSS px is the box's own size, and it is 5x smaller.
    for cols, cell, tag in ((155, 4, ""), (96, 4, "-sm")):
        g = grid(im, cols)
        gp = os.path.join(OUT, f"hero-grid{tag}.webp")
        g.save(gp, lossless=True, method=6, exact=True)
        sp = os.path.join(OUT, f"hero-dots{tag}@2x.webp")
        still(g, cell, PLATE).save(sp, quality=82, method=6)
        print(
            f"  {cols} x {g.size[1]} cells"
            f"  grid {os.path.getsize(gp) / 1024:5.1f} KB"
            f"  still {os.path.getsize(sp) / 1024:6.1f} KB"
        )


if __name__ == "__main__":
    main()
