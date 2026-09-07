"""
Tuning harness for the portrait. Renders the head at large cells so the eyes,
brows, nose and lips can be judged, for several candidate pipelines side by side.
Not part of the build; scripts/bake-portrait.py is the real bake.

    python scripts/tune-portrait.py OUTDIR

The question this harness exists to answer: the portrait is a uniform halftone,
and a uniform halftone has no focal hierarchy — the white t-shirt is the
brightest, most detailed thing in frame and the face is not. A portrait
photographer burns the shirt and dodges the face. These candidates do that, and
they drive DENSITY by local detail rather than by darkness, so flat ground falls
back to the page lattice and the face keeps every cell.
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
CENTER_HINT = (1250, 800)
DATUM_HINT = (1162, 693)
COLS, ROWS = 192, 240
UNLIT = 0.05
INK = (0xF2, 0xF1, 0xEC)
SUN = (0xFF, 0x6A, 0x2B)
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
        return a.astype(np.float32).copy()
    lo, hi = float(a.min()), float(a.max())
    span = max(hi - lo, 1e-6)
    img = Image.fromarray(np.clip((a - lo) / span * 255.0, 0, 255).astype(np.uint8))
    out = np.asarray(img.filter(ImageFilter.GaussianBlur(radius=r))).astype(np.float32) / 255.0
    return out * span + lo


def cell_mean(a: np.ndarray, cols: int, rows: int, mask: np.ndarray):
    H, W = a.shape
    xs = (np.arange(cols + 1) * (W / cols)).astype(int)
    ys = (np.arange(rows + 1) * (H / rows)).astype(int)
    m = mask.astype(np.float32)
    am = a.astype(np.float32) * m
    out = np.zeros((rows, cols), np.float32)
    cov = np.zeros((rows, cols), np.float32)
    for j in range(rows):
        y0, y1 = ys[j], max(ys[j + 1], ys[j] + 1)
        ra, rm = am[y0:y1], m[y0:y1]
        for i in range(cols):
            x0, x1 = xs[i], max(xs[i + 1], xs[i] + 1)
            w = float(rm[:, x0:x1].sum())
            cov[j, i] = w / max((y1 - y0) * (x1 - x0), 1)
            if w > 0:
                out[j, i] = float(ra[:, x0:x1].sum()) / w
    return out, cov


def build(win: Image.Image, p: dict) -> tuple[np.ndarray, np.ndarray]:
    """Returns (field bytes, importance per cell)."""
    W, H = win.size
    pitch = W / COLS
    arr = np.asarray(win).astype(np.float32) / 255.0
    rgb, alpha = arr[..., :3], arr[..., 3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    inside = alpha > 0.5

    # ── the focal map: how far from the face, in window coordinates ──────────
    fx = (CENTER_HINT[0] - MAIN_CROP[0]) / W
    fy = (CENTER_HINT[1] - MAIN_CROP[1]) / H
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # Elliptical distance, taller than wide: a head is taller than it is wide.
    d = np.sqrt(((xx / W - fx) / p["focal_rx"]) ** 2 + ((yy / H - fy) / p["focal_ry"]) ** 2)
    # A PLATEAU, not a peak. Everything inside `focal_hold` is the subject and
    # keeps every cell; beyond it the density falls away. A 1-d cone made the
    # cheeks as sparse as the tee, which is more beautiful and less clear —
    # exactly the wrong trade for a portrait.
    focal = np.clip((1.0 - d) / max(1.0 - p["focal_hold"], 1e-6), 0.0, 1.0)
    focal = focal ** p["focal_gamma"]

    # ── detail: local high-pass energy, the thing that deserves density ──────
    detail = np.abs(lum - blur(lum, max(1.0, pitch * 1.6)))
    detail = blur(detail, max(1.5, pitch * 2.2))
    if inside.any():
        hi = np.percentile(detail[inside], 96)
        detail = np.clip(detail / max(hi, 1e-6), 0, 1)

    # ── tone, as before ─────────────────────────────────────────────────────
    lum2 = lum + p["broad"] * (lum - blur(lum, p["broad_r"]))
    lum2 = lum2 + p["fine"] * (lum2 - blur(lum2, max(0.6, pitch * p["fine_r"])))
    lum2 = np.clip(lum2, 0, 1)
    cover = np.maximum(blur(inside.astype(np.float32), p["adapt_r"]), 1e-3)
    mean = blur(np.where(inside, lum2, 0.0), p["adapt_r"]) / cover
    var = blur(np.where(inside, (lum2 - mean) ** 2, 0.0), p["adapt_r"]) / cover
    sd = np.sqrt(np.maximum(var, 0))
    gain = np.minimum(p["adapt_sd"] / np.maximum(sd, p["adapt_floor"]), p["adapt_max"])
    target = p["adapt_mid"] * 0.5 + (1 - p["adapt_mid"]) * mean
    adapted = np.clip(target + (lum2 - mean) * gain, 0, 1)
    t = np.clip((p["adapt_upto"] - mean) / p["adapt_upto"], 0, 1)
    w = p["adapt"] * (t * t * (3 - 2 * t))
    lum2 = (1 - w) * lum2 + w * adapted

    lo, hi = np.percentile(lum2[inside], p["plo"]), np.percentile(lum2[inside], p["phi"])
    norm = np.clip((lum2 - lo) / max(hi - lo, 1e-6), 0, 1)
    norm = np.power(norm, p["gamma"])
    norm = np.clip(0.5 + (norm - 0.5) * p["contrast"], 0, 1)

    # ── burn the shirt: compress highlights AWAY from the face ───────────────
    # The tee is the brightest thing in frame and it is not the subject. Roll
    # off the top end everywhere the focal map is weak, so the face keeps the
    # highlights and the body gives them up.
    if p["burn"] > 0:
        knee = p["burn_knee"]
        over = np.clip(norm - knee, 0, 1)
        rolled = knee + over * (1.0 - p["burn"] * (1.0 - focal))
        norm = np.where(norm > knee, rolled, norm)

    if p["toe"] > 0:
        norm = p["toe"] + (1 - p["toe"]) * norm

    # silhouette floor
    amask = Image.fromarray((alpha * 255).astype(np.uint8))
    eroded = np.asarray(amask.filter(ImageFilter.MinFilter(19))).astype(np.float32) / 255.0
    edge = inside & (eroded < 0.5)
    norm = np.where(edge, np.maximum(norm, p["edge_floor"]), norm)

    values, cov = cell_mean(norm, COLS, ROWS, inside)
    det_c, _ = cell_mean(detail, COLS, ROWS, inside)
    foc_c, _ = cell_mean(focal, COLS, ROWS, inside)
    edge_c, _ = cell_mean(edge.astype(np.float32), COLS, ROWS, inside)
    keep = cov > 0.5

    # ── importance drives DENSITY, not tone ─────────────────────────────────
    imp = np.clip(p["w_detail"] * det_c + p["w_focal"] * foc_c, 0, 1)
    imp = np.maximum(imp, edge_c)   # the silhouette is always worth a dot
    imp = np.maximum(imp, foc_c)    # the face is never thinned

    out = np.zeros((ROWS, COLS), np.uint8)
    out[keep] = np.maximum(1, np.round(np.clip(values[keep], 0, 1) * 255).astype(np.uint8))

    # Cells are demoted to "inside but unlit" (bytes 1..12), which the renderer
    # already draws at lattice density only. That is the stipple hierarchy, for
    # free, in the existing format.
    #
    # The demotion is DITHERED, not thresholded. A hard cut flips whole regions
    # at once and punches visible holes in the hair and the tee; it reads as
    # damage. Interleaved gradient noise gives every cell its own threshold, so
    # density falls off smoothly and the eye reads it as air rather than error.
    if p["imp_cut"] > 0:
        jj, ii = np.mgrid[0:ROWS, 0:COLS].astype(np.float32)
        ign = np.modf(52.9829189 * np.modf(0.06711056 * ii + 0.00583715 * jj)[0])[0]
        # keep probability rises with importance; 1.0 keeps everything
        pk = np.clip(imp / max(p["imp_cut"], 1e-6), 0, 1)
        demote = keep & (ign > pk) & (~(edge_c > 0.15))
        out[demote] = np.minimum(out[demote], 12)

    for k in range(8):
        j = ROWS - 1 - k
        f = k / 8
        lit = out[j] > 0
        out[j][lit] = np.maximum(1, (out[j][lit].astype(np.float32) * f).astype(np.uint8))
    return out, imp


def render(field: np.ndarray, cell_px: float, crop=None, density=2) -> Image.Image:
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
                # the renderer only draws these where a page dot is
                if density > 1 and (i % density or j % density):
                    continue
                dia, col = 0.18 * density, DOT_OFF
            else:
                dia, col = 0.18 + 0.78 * L, INK
            r = dia * k / 2
            X, Y = (i - i0 + 0.5) * k, (j - j0 + 0.5) * k
            d.ellipse((X - r, Y - r, X + r, Y + r), fill=col)
    return img.resize((W, H), Image.LANCZOS)


SHIP = dict(
    broad=1.2, broad_r=48, fine=1.1, fine_r=1.1,
    adapt=0.95, adapt_r=62, adapt_sd=0.23, adapt_floor=0.045, adapt_max=3.4,
    adapt_mid=0.35, adapt_upto=0.45, plo=2, phi=98, gamma=0.82, contrast=1.18,
    toe=0.06, edge_floor=0.42,
    # new, all off so "a-ship" reproduces what is live today
    focal_rx=1.0, focal_ry=1.0, focal_gamma=1.0, focal_hold=0.0,
    burn=0.0, burn_knee=0.72, w_detail=0.0, w_focal=0.0, imp_cut=0.0,
)

FOCAL = dict(focal_rx=0.72, focal_ry=0.60, focal_gamma=0.9, focal_hold=0.42)

CANDIDATES = {
    "a-ship": SHIP,
    "h-hold": {**SHIP, **FOCAL, "burn": 0.40, "burn_knee": 0.70,
               "w_detail": 0.75, "w_focal": 0.50, "imp_cut": 0.72},
    "i-airier": {**SHIP, **FOCAL, "burn": 0.48, "burn_knee": 0.68,
                 "w_detail": 0.80, "w_focal": 0.50, "imp_cut": 0.92},
    "j-tight": {**SHIP, "focal_rx": 0.60, "focal_ry": 0.50, "focal_gamma": 0.9,
                "focal_hold": 0.50, "burn": 0.52, "burn_knee": 0.66,
                "w_detail": 0.80, "w_focal": 0.55, "imp_cut": 1.0},
}

HEAD = (22, 100, 58, 148)

if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    win = load_window()
    for name, p in CANDIDATES.items():
        f, imp = build(win, p)
        lit = int((f >= UNLIT * 255).sum())
        demoted = int(((f > 0) & (f < UNLIT * 255)).sum())
        render(f, 9, HEAD).save(out / f"head-{name}.png")
        render(f, 3.2).save(out / f"full-{name}.png")
        print(f"{name:16} {lit:6d} lit  {demoted:6d} demoted to lattice  mean {f[f>0].mean():.1f}")
