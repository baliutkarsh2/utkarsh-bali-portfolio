"""
Bake the dot-portrait fields from the segmented cutout.

Run by hand; every output is committed. Vercel never runs this.

    python scripts/bake-portrait.py            # writes src/content/portrait-field-*.ts,
                                               # src/content/portrait-meta.ts,
                                               # src/content/portrait-og.ts,
                                               # public/portrait/dots-96@2x.webp, dots-64@2x.webp, dots-about@2x.webp
    python scripts/bake-portrait.py --preview DIR   # also writes review PNGs

Input: src/assets/portrait/utkarsh-cutout.png (RGBA, produced by scripts/segment.py
from the original photograph, then cropped to the subject's bounding box; the
crop origin in the original frame is in CUTOUT_ORIGIN.txt so the windows below
can stay in original-photo coordinates).

The mapping (one formula shared with the renderer and the OG image):
  byte 0        outside the mask, nothing is drawn
  byte 1..12    inside the mask but unlit (L < 0.05): drawn at 0.18 x pitch in --dot-off
  byte 13..255  lit: diameter = pitch x (0.18 + 0.78 x L), --ink; the rim set is --sun
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CUTOUT = ROOT / "src/assets/portrait/utkarsh-cutout.png"
ORIGIN_FILE = ROOT / "src/assets/portrait/CUTOUT_ORIGIN.txt"
CONTENT = ROOT / "src/content"
PUBLIC = ROOT / "public/portrait"

# Windows in original-photograph coordinates (1760 x 2374), all 4:5.
MAIN_CROP = (600, 300, 1760, 1750)   # head, shoulders, the top of the arm
ABOUT_CROP = (760, 340, 1400, 1140)  # the face, second angle for About
# The eye catchlight in original coordinates, chosen once on a grid overlay of
# the photograph. The datum is a design mark (always --sun), not a measurement:
# in this side-lit photograph the eye itself is in shadow.
DATUM_HINT = (1162, 693)
CENTER_HINT = (1250, 800)

# Tone curve, tuned by eye on the real photograph.
LOCAL = 1.4      # local contrast strength
LOCAL_RADIUS_PX = 48   # unsharp radius in photograph pixels (was 4 cells at 96 columns)
EDGE_BAND_PX = 18      # silhouette band in photograph pixels (was 1.5 cells at 96 columns)
GAMMA = 0.92
CONTRAST = 1.3   # S-curve about the midtone
EDGE_FLOOR = 0.42  # silhouette cells are forced to at least this luminance
UNLIT = 0.05


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


INK = hex_rgb("#F2F1EC")
SUN = hex_rgb("#FF6A2B")
DOT_OFF = hex_rgb("#232326")


def load_cutout() -> tuple[Image.Image, tuple[int, int]]:
    im = Image.open(CUTOUT).convert("RGBA")
    ox, oy = (int(v) for v in ORIGIN_FILE.read_text().strip().split(","))
    return im, (ox, oy)


def window(im: Image.Image, origin: tuple[int, int], crop: tuple[int, int, int, int]) -> Image.Image:
    """Crop in original coordinates; areas outside the cutout are transparent."""
    ox, oy = origin
    x0, y0, x1, y1 = crop
    out = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    out.paste(im, (ox - x0, oy - y0))
    return out


def sample(win: Image.Image, cols: int, rows: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (bytes per the mapping above, per-cell warmth) as rows x cols arrays."""
    W, H = win.size
    pitch = W / cols
    assert abs(H / rows - pitch) < 0.02 * pitch, "window aspect must match the grid"

    blurred = win.filter(ImageFilter.GaussianBlur(radius=max(0.5, pitch / 3)))
    arr = np.asarray(blurred).astype(np.float32) / 255.0
    rgb, alpha = arr[..., :3], arr[..., 3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

    if LOCAL > 0:
        wide = Image.fromarray((lum * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(radius=LOCAL_RADIUS_PX)
        )
        wide = np.asarray(wide).astype(np.float32) / 255.0
        lum = np.clip(lum + LOCAL * (lum - wide), 0, 1)

    inside = alpha > 0.5
    lo, hi = np.percentile(lum[inside], 2), np.percentile(lum[inside], 98)
    norm = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
    norm = np.power(norm, GAMMA)
    if CONTRAST != 1.0:
        norm = np.clip(0.5 + (norm - 0.5) * CONTRAST, 0, 1)

    # Silhouette: cells whose neighbourhood alpha is partial are on the outline.
    amask = Image.fromarray((alpha * 255).astype(np.uint8))
    eroded = np.asarray(amask.filter(ImageFilter.MinFilter(int(EDGE_BAND_PX) | 1))).astype(np.float32) / 255.0
    edge = inside & (eroded < 0.5)
    norm = np.where(edge, np.maximum(norm, EDGE_FLOOR), norm)

    # Warmth: how much redder than blue a cell is. The sunset rim light on the
    # face is strongly warm; the white tee and the sky are not.
    warmth_px = np.clip((rgb[..., 0] - rgb[..., 2]) * 3.0, 0, 1)

    out = np.zeros((rows, cols), np.uint8)
    warmth = np.zeros((rows, cols), np.float32)
    for j in range(rows):
        cy = min(int((j + 0.5) * pitch), H - 1)
        for i in range(cols):
            cx = min(int((i + 0.5) * pitch), W - 1)
            if alpha[cy, cx] < 0.5:
                continue
            out[j, i] = max(1, int(round(float(norm[cy, cx]) * 255)))
            warmth[j, i] = float(warmth_px[cy, cx])
    # Feather the bottom eight rows to unlit so the figure sits on the board
    # rather than being cut by it.
    for k in range(8):
        j = rows - 1 - k
        f = k / 8
        row = out[j]
        lit = row > 0
        out[j][lit] = np.maximum(1, (row[lit].astype(np.float32) * f).astype(np.uint8))
    return out, warmth


def find_datum(field: np.ndarray, hint_cell: tuple[int, int]) -> tuple[int, int]:
    x, y = hint_cell
    assert field[y, x] > 0, "datum cell is outside the mask"
    return (x, y)


def rim_indices(field: np.ndarray, warmth: np.ndarray) -> list[int]:
    """The brightest 2% of lit cells ranked by luminance x warmth: the sun on the face."""
    lit_mask = field >= UNLIT * 255
    score = (field.astype(np.float32) / 255.0) * warmth
    score[~lit_mask] = -1
    n = int(round(lit_mask.sum() * 0.02))
    flat = np.argsort(score, axis=None)[::-1][:n]
    return sorted(int(i) for i in flat if score.flat[i] > 0)


def to_cell(point: tuple[int, int], crop: tuple[int, int, int, int], cols: int) -> tuple[int, int]:
    pitch = (crop[2] - crop[0]) / cols
    return (int((point[0] - crop[0]) / pitch), int((point[1] - crop[1]) / pitch))


def ts_module(name: str, field: np.ndarray, datum: tuple[int, int], center: tuple[int, int], rim: list[int], note: str) -> str:
    rows, cols = field.shape
    count = int((field >= UNLIT * 255).sum())
    data = base64.b64encode(field.tobytes()).decode()
    return (
        "/**\n"
        " * GENERATED by scripts/bake-portrait.py. Do not edit.\n"
        f" * {note}\n"
        f" * {cols} x {rows} cells, {count} lit.\n"
        " */\n"
        'import type { BoardField } from "./portrait-types";\n\n'
        f"export const {name}: BoardField = {{\n"
        f"  w: {cols},\n  h: {rows},\n  count: {count},\n"
        f"  datum: [{datum[0]}, {datum[1]}],\n  center: [{center[0]}, {center[1]}],\n"
        f"  rim: {json.dumps(rim)},\n"
        f'  data:\n    "{data}",\n'
        "};\n"
    )


def render(field: np.ndarray, datum: tuple[int, int], rim: set[int], cell_px: float, transparent: bool, alpha_scale: float = 1.0) -> Image.Image:
    rows, cols = field.shape
    ss = 2
    W, H = int(cols * cell_px), int(rows * cell_px)
    img = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0) if transparent else (10, 10, 11, 255))
    d = ImageDraw.Draw(img)
    k = cell_px * ss
    for j in range(rows):
        for i in range(cols):
            v = int(field[j, i])
            if v == 0:
                continue
            L = v / 255
            if (i, j) == datum:
                dia, col = 0.96, SUN
            elif L < UNLIT:
                dia, col = 0.18, DOT_OFF
            else:
                dia = 0.18 + 0.78 * L
                col = SUN if (j * cols + i) in rim else INK
            r = dia * k / 2
            X, Y = (i + 0.5) * k, (j + 0.5) * k
            a = int(255 * alpha_scale)
            d.ellipse((X - r, Y - r, X + r, Y + r), fill=(*col, a))
    return img.resize((W, H), Image.LANCZOS)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--preview", help="directory for review PNGs")
    args = p.parse_args()

    im, origin = load_cutout()
    CONTENT.mkdir(exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    main_win = window(im, origin, MAIN_CROP)
    about_win = window(im, origin, ABOUT_CROP)

    # Portrait grids are twice the page pitch in each direction (cells of
    # pitch / 2): 192 x 240 fills the same 96 x 120 box on the page lattice.
    f96, w96 = sample(main_win, 192, 240)
    f64, w64 = sample(main_win, 128, 160)
    fab, wab = sample(about_win, 128, 160)
    f48, w48 = sample(main_win, 48, 60)

    # The name passes over the board's top-left corner at >= 80rem: it must be sky.
    assert not f96[:48, :48].any(), "top-left quarter of the hero field must be empty sky (move MAIN_CROP)"
    assert not f64[:32, :32].any(), "top-left quarter of the phone field must be empty sky"

    d96 = find_datum(f96, to_cell(DATUM_HINT, MAIN_CROP, 192))
    d64 = find_datum(f64, to_cell(DATUM_HINT, MAIN_CROP, 128))
    dab = find_datum(fab, to_cell(DATUM_HINT, ABOUT_CROP, 128))
    d48 = find_datum(f48, to_cell(DATUM_HINT, MAIN_CROP, 48))
    c96 = to_cell(CENTER_HINT, MAIN_CROP, 192)
    c64 = to_cell(CENTER_HINT, MAIN_CROP, 128)
    cab = to_cell(CENTER_HINT, ABOUT_CROP, 128)

    r96, r64, rab, r48 = rim_indices(f96, w96), rim_indices(f64, w64), rim_indices(fab, wab), rim_indices(f48, w48)

    (CONTENT / "portrait-field-96.ts").write_text(ts_module("portraitField96", f96, d96, c96, r96, "Hero at >= 48rem: a 96 x 120 lattice box at double density. Window MAIN_CROP of the photograph."))
    (CONTENT / "portrait-field-64.ts").write_text(ts_module("portraitField64", f64, d64, c64, r64, "Hero below 48rem and the Contact afterimage: a 64 x 80 box at double density."))
    (CONTENT / "portrait-field-about.ts").write_text(ts_module("portraitFieldAbout", fab, dab, cab, rab, "About: the face only, second angle. Window ABOUT_CROP, a 64 x 80 box at double density."))

    count = int((f96 >= UNLIT * 255).sum())
    (CONTENT / "portrait-meta.ts").write_text(
        "/** GENERATED by scripts/bake-portrait.py. Do not edit. Lit cells of the hero field (192 x 240, a 96 x 120 box at double density). */\n"
        f"export const DOT_COUNT = {count};\n"
    )

    # OG: [x, y, r, kind] in grid units; kind 1 = sun. Lit cells only.
    og: list[list[float]] = []
    rim48 = set(r48)
    for j in range(60):
        for i in range(48):
            v = int(f48[j, i])
            if v == 0 or v / 255 < UNLIT:
                continue
            L = v / 255
            kind = 1 if ((i, j) == d48 or (j * 48 + i) in rim48) else 0
            r = 0.48 if (i, j) == d48 else (0.18 + 0.78 * L) / 2
            og.append([i, j, round(r, 3), kind])
    (CONTENT / "portrait-og.ts").write_text(
        "/** GENERATED by scripts/bake-portrait.py. Do not edit. 48 x 60 downsample for the OG image: [x, y, r, kind] in grid units, kind 1 = sun. */\n"
        "export const portraitOg: { w: number; h: number; dots: [number, number, number, number][] } = {\n"
        f"  w: 48,\n  h: 60,\n  dots: {json.dumps(og, separators=(',', ':'))},\n}};\n"
    )

    render(f96, d96, set(r96), 6, True).save(PUBLIC / "dots-96@2x.webp", quality=90, method=6)
    render(f64, d64, set(r64), 5, True).save(PUBLIC / "dots-64@2x.webp", quality=90, method=6)
    render(fab, dab, set(rab), 5, True).save(PUBLIC / "dots-about@2x.webp", quality=90, method=6)

    print(f"96 field: {count} lit, datum {d96}, center {c96}, rim {len(r96)}")
    print(f"64 field: {int((f64 >= UNLIT * 255).sum())} lit, datum {d64}")
    print(f"about field: {int((fab >= UNLIT * 255).sum())} lit, datum {dab}")
    print(f"og dots: {len(og)}")
    for f in sorted(PUBLIC.glob("*.webp")):
        print(f"  {f.name}: {os.path.getsize(f) // 1024} KB")
    for f in sorted(CONTENT.glob("portrait-*.ts")):
        print(f"  {f.name}: {os.path.getsize(f) // 1024} KB")

    if args.preview:
        out = Path(args.preview)
        out.mkdir(parents=True, exist_ok=True)
        render(f96, d96, set(r96), 3.5, False).save(out / "bake-96.png")
        render(f64, d64, set(r64), 4.5, False).save(out / "bake-64.png")
        render(fab, dab, set(rab), 4.5, False).save(out / "bake-about.png")
        print("previews in", out)


if __name__ == "__main__":
    main()
