"""
Bake the dot-portrait fields from the segmented cutout.

Run by hand; every output is committed. Vercel never runs this.

    python scripts/bake-portrait.py            # writes src/content/portrait-field-*.ts (96, 64, about, contact),
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

# Tone curve, tuned by eye on the real photograph with scripts/tune-portrait.py.
#
# The photograph is backlit by a sunset, so the face sits in shadow: one global
# curve either crushes it to a dark mass, taking the eyes, brows, nose and lips
# with it, or blows out the rim and the tee. Three stages fix that.
#   1. Two unsharp passes. The broad one lifts the shadow side off the
#      background; the fine one, at about one cell, is what actually draws the
#      eyelid, the nostril, the lip line and the brow.
#   2. A local (CLAHE-like) normalisation weighted to the shadows, so the face
#      gets its own full range while the sunlit rim and the white tee keep the
#      global curve and the photograph stays backlit rather than going flat.
#   3. A toe lift, so shadow features stay above the renderer's unlit cut and
#      are drawn at full double density instead of dropping to the lattice.
BROAD = 1.2            # broad unsharp strength
BROAD_RADIUS_PX = 48   # in photograph pixels
FINE = 1.1             # fine unsharp strength: the features
FINE_RADIUS_CELLS = 1.1
ADAPT = 0.95           # local normalisation blend, before the shadow weight
ADAPT_RADIUS_PX = 62
ADAPT_SD = 0.23        # target local standard deviation
ADAPT_FLOOR = 0.045    # never divide by a smaller local sd than this
ADAPT_MAX = 3.4        # nor amplify by more than this
ADAPT_MID = 0.35       # 0 keeps the local mean, 1 recentres on 0.5
ADAPT_UPTO = 0.45      # local means above this keep the global curve
PLO, PHI = 2, 98       # normalisation percentiles
GAMMA = 0.82
CONTRAST = 1.18  # S-curve about the midtone
TOE = 0.06       # floor under every lit cell
EDGE_BAND_PX = 18      # silhouette band in photograph pixels
EDGE_FLOOR = 0.42  # silhouette cells are forced to at least this luminance
UNLIT = 0.05
# Share of lit cells that carry the sunset. Opening up the shadows raised the
# lit count by about 40%, and at a flat 2% the rim stopped reading as a light
# on an edge and started reading as orange blocks on the hand and the shoulder.
# 1.4% holds the sun to roughly the same number of dots it has always had.
RIM_FRACTION = 0.014


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


def blur(a: np.ndarray, radius: float) -> np.ndarray:
    """Gaussian blur of a float array. Pillow has no float kernel, so the array
    is carried through 8-bit on its own min/max, which is ample for the low
    frequencies every caller here wants."""
    if radius <= 0:
        return a.astype(np.float32).copy()
    lo, hi = float(a.min()), float(a.max())
    span = max(hi - lo, 1e-6)
    img = Image.fromarray(np.clip((a - lo) / span * 255.0, 0, 255).astype(np.uint8))
    out = np.asarray(img.filter(ImageFilter.GaussianBlur(radius=radius))).astype(np.float32) / 255.0
    return out * span + lo


def cell_mean(a: np.ndarray, cols: int, rows: int, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Average `a` over each cell, counting only masked-in pixels, and return
    the mask coverage alongside. Averaging the cell rather than sampling its
    centre pixel is most of what makes the face read: at 192 columns a cell is
    about six photograph pixels across, and one of them is not the face."""
    H, W = a.shape
    xs = (np.arange(cols + 1) * (W / cols)).astype(int)
    ys = (np.arange(rows + 1) * (H / rows)).astype(int)
    m = mask.astype(np.float32)
    am = a.astype(np.float32) * m
    out = np.zeros((rows, cols), np.float32)
    cov = np.zeros((rows, cols), np.float32)
    for j in range(rows):
        y0, y1 = ys[j], max(ys[j + 1], ys[j] + 1)
        rowa, rowm = am[y0:y1], m[y0:y1]
        for i in range(cols):
            x0, x1 = xs[i], max(xs[i + 1], xs[i] + 1)
            w = float(rowm[:, x0:x1].sum())
            cov[j, i] = w / max((y1 - y0) * (x1 - x0), 1)
            if w > 0:
                out[j, i] = float(rowa[:, x0:x1].sum()) / w
    return out, cov


def sample(win: Image.Image, cols: int, rows: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (bytes per the mapping above, per-cell warmth) as rows x cols arrays."""
    W, H = win.size
    pitch = W / cols
    assert abs(H / rows - pitch) < 0.02 * pitch, "window aspect must match the grid"

    arr = np.asarray(win).astype(np.float32) / 255.0
    rgb, alpha = arr[..., :3], arr[..., 3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    inside = alpha > 0.5

    # 1. Two unsharp passes: the shape, then the features.
    if BROAD > 0:
        lum = lum + BROAD * (lum - blur(lum, BROAD_RADIUS_PX))
    if FINE > 0:
        lum = lum + FINE * (lum - blur(lum, max(0.6, pitch * FINE_RADIUS_CELLS)))
    lum = np.clip(lum, 0, 1)

    # 2. Local normalisation, weighted to the shadows. The local mean and
    # standard deviation count masked-in pixels only, so the empty background
    # never drags the face's window down.
    if ADAPT > 0:
        cover = np.maximum(blur(inside.astype(np.float32), ADAPT_RADIUS_PX), 1e-3)
        mean = blur(np.where(inside, lum, 0.0), ADAPT_RADIUS_PX) / cover
        var = blur(np.where(inside, (lum - mean) ** 2, 0.0), ADAPT_RADIUS_PX) / cover
        sd = np.sqrt(np.maximum(var, 0.0))
        gain = np.minimum(ADAPT_SD / np.maximum(sd, ADAPT_FLOOR), ADAPT_MAX)
        target = ADAPT_MID * 0.5 + (1 - ADAPT_MID) * mean
        adapted = np.clip(target + (lum - mean) * gain, 0, 1)
        t = np.clip((ADAPT_UPTO - mean) / ADAPT_UPTO, 0, 1)
        weight = ADAPT * (t * t * (3 - 2 * t))  # smoothstep: shadows only
        lum = (1 - weight) * lum + weight * adapted

    # 3. Global window, gamma, S-curve, then the toe that keeps shadow detail
    # above the renderer's unlit cut.
    lo, hi = np.percentile(lum[inside], PLO), np.percentile(lum[inside], PHI)
    norm = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
    norm = np.power(norm, GAMMA)
    if CONTRAST != 1.0:
        norm = np.clip(0.5 + (norm - 0.5) * CONTRAST, 0, 1)
    if TOE > 0:
        norm = TOE + (1 - TOE) * norm

    # Silhouette: cells whose neighbourhood alpha is partial are on the outline.
    amask = Image.fromarray((alpha * 255).astype(np.uint8))
    eroded = np.asarray(amask.filter(ImageFilter.MinFilter(int(EDGE_BAND_PX) | 1))).astype(np.float32) / 255.0
    edge = inside & (eroded < 0.5)
    norm = np.where(edge, np.maximum(norm, EDGE_FLOOR), norm)

    # Warmth: how much redder than blue a cell is. The sunset rim light on the
    # face is strongly warm; the white tee and the sky are not.
    warmth_px = np.clip((rgb[..., 0] - rgb[..., 2]) * 3.0, 0, 1)

    values, cover = cell_mean(norm, cols, rows, inside)
    warmth, _ = cell_mean(warmth_px, cols, rows, inside)
    keep = cover > 0.5
    out = np.zeros((rows, cols), np.uint8)
    out[keep] = np.maximum(1, np.round(np.clip(values[keep], 0, 1) * 255).astype(np.uint8))
    warmth = np.where(keep, warmth, 0.0).astype(np.float32)
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
    """The brightest RIM_FRACTION of lit cells ranked by luminance x warmth: the sun on the face."""
    lit_mask = field >= UNLIT * 255
    score = (field.astype(np.float32) / 255.0) * warmth
    score[~lit_mask] = -1
    n = int(round(lit_mask.sum() * RIM_FRACTION))
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
    fct, wct = sample(main_win, 96, 120)  # the Contact afterimage: a 48 x 60 box
    f48, w48 = sample(main_win, 48, 60)

    # The name passes over the board's top-left corner at >= 80rem: it must be sky.
    assert not f96[:48, :48].any(), "top-left quarter of the hero field must be empty sky (move MAIN_CROP)"
    assert not f64[:32, :32].any(), "top-left quarter of the phone field must be empty sky"

    d96 = find_datum(f96, to_cell(DATUM_HINT, MAIN_CROP, 192))
    d64 = find_datum(f64, to_cell(DATUM_HINT, MAIN_CROP, 128))
    dab = find_datum(fab, to_cell(DATUM_HINT, ABOUT_CROP, 128))
    dct = find_datum(fct, to_cell(DATUM_HINT, MAIN_CROP, 96))
    d48 = find_datum(f48, to_cell(DATUM_HINT, MAIN_CROP, 48))
    c96 = to_cell(CENTER_HINT, MAIN_CROP, 192)
    c64 = to_cell(CENTER_HINT, MAIN_CROP, 128)
    cab = to_cell(CENTER_HINT, ABOUT_CROP, 128)
    cct = to_cell(CENTER_HINT, MAIN_CROP, 96)

    r96, r64, rab, r48 = rim_indices(f96, w96), rim_indices(f64, w64), rim_indices(fab, wab), rim_indices(f48, w48)
    rct = rim_indices(fct, wct)

    (CONTENT / "portrait-field-96.ts").write_text(ts_module("portraitField96", f96, d96, c96, r96, "Hero at >= 48rem: a 96 x 120 lattice box at double density. Window MAIN_CROP of the photograph."))
    (CONTENT / "portrait-field-64.ts").write_text(ts_module("portraitField64", f64, d64, c64, r64, "Hero below 48rem: a 64 x 80 box at double density."))
    (CONTENT / "portrait-field-contact.ts").write_text(ts_module("portraitFieldContact", fct, dct, cct, rct, "The Contact afterimage: the hero window at half its size, a 48 x 60 box at double density."))
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
    print(f"contact field: {int((fct >= UNLIT * 255).sum())} lit, datum {dct}")
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
        render(fct, dct, set(rct), 4.5, False).save(out / "bake-contact.png")
        print("previews in", out)


if __name__ == "__main__":
    main()
