"""
Raster the nine-dot mark for the clients that cannot read src/app/icon.svg.

Run by hand; the outputs are committed. Nothing in `npm run build` reads this.

    python scripts/draw-icons.py

Writes src/app/favicon.ico (16 and 32) and src/app/apple-icon.png (180).
Crawlers, feed readers and older browsers ask for /favicon.ico whatever the
page links, and without the file that request came back as the 42 KB 404
page. iOS wants a PNG for the home screen.

The geometry and colours are icon.svg's, one for one: a 32-unit square of
#0A0A0B, a 3 x 3 lattice at an 8-unit pitch (centres 8, 16, 24) of r = 2 dots
in #F2F1EC, the centre dot in #FF6A2B. Change icon.svg and re-run this. Each
size is drawn at 32x and reduced with a box filter, which is exact area
coverage, so a 16px dot is as grey as the SVG's would be at 16px and not a
resampled blur of the 32.
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
APP = os.path.join(ROOT, "src", "app")

GROUND = (0x0A, 0x0A, 0x0B, 255)
DOT = (0xF2, 0xF1, 0xEC, 255)
SUN = (0xFF, 0x6A, 0x2B, 255)
SUPERSAMPLE = 32


def mark(size: int) -> Image.Image:
    big = size * SUPERSAMPLE
    unit = big / 32  # one icon.svg user unit
    image = Image.new("RGBA", (big, big), GROUND)
    draw = ImageDraw.Draw(image)
    for cy in (8, 16, 24):
        for cx in (8, 16, 24):
            fill = SUN if (cx, cy) == (16, 16) else DOT
            draw.ellipse(
                [(cx - 2) * unit, (cy - 2) * unit, (cx + 2) * unit, (cy + 2) * unit],
                fill=fill,
            )
    return image.resize((size, size), Image.Resampling.BOX)


def main() -> None:
    mark(32).save(
        os.path.join(APP, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32)],
        append_images=[mark(16)],
    )
    mark(180).convert("RGB").save(os.path.join(APP, "apple-icon.png"), optimize=True)


if __name__ == "__main__":
    main()
