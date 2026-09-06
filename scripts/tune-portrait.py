"""
Tuning harness for the portrait tone curve. Renders the head at large cells so
the eyes, brows, nose and lips can be judged, for several candidate pipelines
side by side. Not part of the build; scripts/bake-portrait.py is the real bake.

    python scripts/tune-portrait.py OUTDIR
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CUTOUT = ROOT / "src/assets/portrait/utkarsh-cutout.png"
ORIGIN_FILE = ROOT / "src/assets/portrait/CUTOUT_ORIGIN.txt"

MAIN_CROP = (600, 300, 1760, 1750)
COLS, ROWS = 192, 240
UNLIT = 0.05
INK = (0xF2, 0xF1, 0xEC)
DOT_OFF = (0x23, 0x23, 0x26)


def load_window():
    im = Image.open(CUTOUT).convert("RGBA")
    ox, oy = (int(v) for v in ORIGIN_FILE.read_text().strip().split(","))
    x0, y0, x1, y1 = MAIN_CROP
    out = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    out.paste(im, (ox - x0, oy - y0))
    return out


def blur(a: np.ndarray, r: float) -> np.ndarray:
    if r <= 0:
        return a.copy()
    lo, hi = float(a.min()), float(a.max())
    span = max(hi - lo, 1e-6)
    img = Image.fromarray(((a - lo) / span * 255).astype(np.uint8))
    out = np.asarray(img.filter(ImageFilter.GaussianBlur(radius=r))).astype(np.float32) / 255.0
    return out * span + lo


def cell_mean(a: np.ndarray, cols: int, rows: int, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Average `a` over each cell, counting only masked-in pixels."""
    H, W = a.shape
    xs = (np.arange(cols + 1) * (W / cols)).astype(int)
    ys = (np.arange(rows + 1) * (H / rows)).astype(int)
    out = np.zeros((rows, cols), np.float32)
    cov = np.zeros((rows, cols), np.float32)
    m = mask.astype(np.float32)
    am = a * m
    for j in range(rows):
        y0, y1 = ys[j], max(ys[j + 1], ys[j] + 1)
        rowa = am[y0:y1]
        rowm = m[y0:y1]
        for i in range(cols):
            x0, x1 = xs[i], max(xs[i + 1], xs[i] + 1)
            w = rowm[:, x0:x1].sum()
            cov[j, i] = w / max((y1 - y0) * (x1 - x0), 1)
            out[j, i] = rowa[:, x0:x1].sum() / w if w > 0 else 0.0
    return out, cov


def build(win: Image.Image, p: dict) -> np.ndarray:
    W, H = win.size
    pitch = W / COLS
    arr = np.asarray(win).astype(np.float32) / 255.0
    rgb, alpha = arr[..., :3], arr[..., 3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    inside = alpha > 0.5

    # Broad unsharp: lifts the shadow side off the background.
    if p["broad"] > 0:
        lum = lum + p["broad"] * (lum - blur(lum, p["broad_r"]))
    # Fine unsharp at about one cell: the eyelid, nostril and lip line.
    if p["fine"] > 0:
        lum = lum + p["fine"] * (lum - blur(lum, pitch * p["fine_r"]))
    lum = np.clip(lum, 0, 1)

    # Adaptive normalisation: give the shadowed face its own full range instead
    # of letting the bright sky and shirt set the window for the whole frame.
    if p["adapt"] > 0:
        r = p["adapt_r"]
        m = blur(np.where(inside, lum, 0.0), r) / np.maximum(blur(inside.astype(np.float32), r), 1e-3)
        sd = np.sqrt(np.maximum(blur(np.where(inside, (lum - m) ** 2, 0.0), r) / np.maximum(blur(inside.astype(np.float32), r), 1e-3), 0))
        gain = p["adapt_sd"] / np.maximum(sd, p["adapt_floor"])
        gain = np.minimum(gain, p["adapt_max"])
        # Re-centre toward the local mean rather than a flat 0.5, so a dark
        # region opens up without being pushed to the same grey as a bright one.
        target = p["adapt_mid"] * 0.5 + (1 - p["adapt_mid"]) * m
        adapted = np.clip(target + (lum - m) * gain, 0, 1)
        # Shadows only: the sunlit rim and the white tee keep the global curve,
        # so the photograph stays backlit instead of going flat.
        t = np.clip((p["adapt_upto"] - m) / max(p["adapt_upto"], 1e-6), 0, 1)
        w = p["adapt"] * (t * t * (3 - 2 * t))
        lum = (1 - w) * lum + w * adapted

    lo, hi = np.percentile(lum[inside], p["plo"]), np.percentile(lum[inside], p["phi"])
    norm = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
    norm = np.power(norm, p["gamma"])
    norm = np.clip(0.5 + (norm - 0.5) * p["contrast"], 0, 1)
    if p["toe"] > 0:  # lift the very darkest so shadow features still draw
        norm = p["toe"] + (1 - p["toe"]) * norm

    field, cov = cell_mean(norm, COLS, ROWS, inside)
    _, covr = cell_mean(np.ones_like(norm), COLS, ROWS, inside)
    keep = cov > 0.5

    # Silhouette floor.
    edge = keep & (blur(keep.astype(np.float32), 1.0) < 0.97)
    field = np.where(edge, np.maximum(field, p["edge_floor"]), field)

    out = np.zeros((ROWS, COLS), np.uint8)
    out[keep] = np.maximum(1, (np.clip(field[keep], 0, 1) * 255).astype(np.uint8))
    for k in range(8):
        j = ROWS - 1 - k
        f = k / 8
        lit = out[j] > 0
        out[j][lit] = np.maximum(1, (out[j][lit].astype(np.float32) * f).astype(np.uint8))
    return out


def render(field: np.ndarray, cell_px: float, crop=None) -> Image.Image:
    rows, cols = field.shape
    j0, j1, i0, i1 = crop if crop else (0, rows, 0, cols)
    ss = 2
    W, H = int((i1 - i0) * cell_px), int((j1 - j0) * cell_px)
    img = Image.new("RGB", (W * ss, H * ss), (10, 10, 11))
    d = ImageDraw.Draw(img)
    k = cell_px * ss
    for j in range(j0, j1):
        for i in range(i0, i1):
            v = int(field[j, i])
            if v == 0:
                continue
            L = v / 255
            if L < UNLIT:
                dia, col = 0.18, DOT_OFF
            else:
                dia, col = 0.18 + 0.78 * L, INK
            r = dia * k / 2
            X, Y = (i - i0 + 0.5) * k, (j - j0 + 0.5) * k
            d.ellipse((X - r, Y - r, X + r, Y + r), fill=col)
    return img.resize((W, H), Image.LANCZOS)


CURRENT = dict(broad=1.4, broad_r=48, fine=0.0, fine_r=1.5, adapt=0.0, adapt_r=90,
               adapt_sd=0.18, adapt_floor=0.05, adapt_max=3.0, adapt_mid=1.0,
               adapt_upto=1.0, plo=2, phi=98, gamma=0.92, contrast=1.3, toe=0.0,
               edge_floor=0.42)

SHADOW = dict(adapt_mid=0.35, adapt_upto=0.45, adapt_floor=0.045, adapt_max=3.4)

CANDIDATES = {
    "a-current": CURRENT,
    "f-soft": {**CURRENT, **SHADOW, "fine": 0.8, "fine_r": 1.3, "adapt": 0.75,
               "adapt_r": 80, "adapt_sd": 0.19, "gamma": 0.88, "contrast": 1.22, "toe": 0.03},
    "g-mid": {**CURRENT, **SHADOW, "broad": 1.25, "fine": 0.95, "fine_r": 1.2, "adapt": 0.85,
              "adapt_r": 70, "adapt_sd": 0.21, "gamma": 0.85, "contrast": 1.20, "toe": 0.05},
    "h-defined": {**CURRENT, **SHADOW, "broad": 1.2, "fine": 1.1, "fine_r": 1.1, "adapt": 0.95,
                  "adapt_r": 62, "adapt_sd": 0.23, "gamma": 0.82, "contrast": 1.18, "toe": 0.06},
    "d-strong": {**CURRENT, "broad": 1.1, "fine": 1.0, "adapt": 0.7, "adapt_r": 70,
                 "adapt_sd": 0.22, "gamma": 0.82, "contrast": 1.18, "toe": 0.06},
}

# The face, in cells at 192 x 240: brow, eye, nose, lips, jaw.
HEAD = (22, 100, 58, 148)

if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    win = load_window()
    for name, p in CANDIDATES.items():
        f = build(win, p)
        lit = int((f >= UNLIT * 255).sum())
        render(f, 9, HEAD).save(out / f"head-{name}.png")
        render(f, 3.2).save(out / f"full-{name}.png")
        print(f"{name}: {lit} lit, mean {f[f > 0].mean():.1f}")
