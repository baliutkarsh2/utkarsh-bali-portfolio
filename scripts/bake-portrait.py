"""
Bake the dot-portrait fields from the segmented cutout.

Run by hand; every output is committed. Vercel never runs this.

    python scripts/bake-portrait.py            # writes src/content/portrait-field-*.ts (96, 64, contact),
                                               # src/content/portrait-meta.ts,
                                               # src/content/portrait-og.ts,
                                               # public/portrait/dots-96@2x.webp, dots-64@2x.webp
    python scripts/bake-portrait.py --preview DIR   # also writes review PNGs

Input: src/assets/portrait/utkarsh-cutout.png (RGBA, lossless, produced by
scripts/segment.py from the original photograph at its full resolution, then
cropped to the subject's bounding box; the crop origin AND the source frame's
size are in CUTOUT_ORIGIN.txt, which is what lets the windows below stay in the
coordinates they were composed in whatever resolution the cutout is).

The mapping (one formula shared with the renderer and the OG image, `ink_dia`):
  byte 0        outside the mask, nothing is drawn
  byte 1..255   inside the mask: luminance x 255, floored at DEEP_FLOOR and run
                through the ink transfer. One ink, --ink, at full strength; the
                dot's AREA carries the value and a dot below CULL_DIA is not
                drawn at all, so a highlight is bare paper. The catchlight in
                his eye is the only --sun mark on the sheet.
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

try:
    from scipy.ndimage import gaussian_filter
except ImportError as exc:  # pragma: no cover - a hand-run script, not a build step
    raise SystemExit(
        "scipy is required for the float Gaussian in blur(): pip install scipy.\n"
        "It is already a transitive dependency of the segmenter (rembg's alpha\n"
        "matting goes through pymatting, which requires it)."
    ) from exc

ROOT = Path(__file__).resolve().parent.parent
CUTOUT = ROOT / "src/assets/portrait/utkarsh-cutout.png"
ORIGIN_FILE = ROOT / "src/assets/portrait/CUTOUT_ORIGIN.txt"
CONTENT = ROOT / "src/content"
PUBLIC = ROOT / "public/portrait"

# Windows in original-photograph coordinates, all 4:5.
#
# REFERENCE_FRAME is the coordinate system every window, every hint and every
# "photograph pixels" radius below is written in: the 1760 x 2374 frame they
# were composed on. The cutout is no longer that size -- it is segmented from
# the 2350 x 3170 original -- so it records its own frame size next to its
# origin and the bake divides the two to recover a scale, then multiplies at
# the point of use. `window()` maps a crop through it; `sample()` maps the
# three blur radii through it, so a radius given in photograph pixels still
# covers the same piece of his face at any source resolution.
#
# The alternative, restating the crops in whatever resolution the cutout
# happens to be, is the one that goes wrong silently: the numbers stop matching
# the composition they were chosen for, and re-segmenting from a different scan
# reframes the portrait with nothing failing to announce it. Pinning them to a
# fixed reference frame leaves exactly one thing that has to be right, a single
# ratio, and it is checkable -- downscale the new window onto the old one and
# correlate. That was measured at 0.9918 on MAIN_CROP
# when the source went from 1760 to 2350 wide.
REFERENCE_FRAME = (1760, 2374)
MAIN_CROP = (600, 300, 1760, 1750)   # head, shoulders, the top of the arm
# The eye catchlight in original coordinates, chosen once on a grid overlay of
# the photograph. The datum is a design mark (always --sun), not a measurement:
# in this side-lit photograph the eye itself is in shadow.
DATUM_HINT = (1162, 693)
CENTER_HINT = (1250, 800)

# The grid.
#
# Each field fills a box measured in PAGE-LATTICE cells, at DENSITY cells to
# the lattice step in each direction: the field is box x DENSITY, drawn with
# cells of pitch / DENSITY, and it covers exactly the same piece of the page at
# any density. Everything below derives from these, so raising the density is
# one number rather than a table of grids to keep in step.
#
# THIS NUMBER IS SHARED WITH THE PAGE. PORTRAIT_DENSITY in
# src/components/interactive/dot-board.tsx is the same quantity: the board
# sizes its cells as pitch / PORTRAIT_DENSITY while the box is sized in CSS
# from the lattice. If the two disagree the portrait is drawn at
# DENSITY / PORTRAIT_DENSITY times its box and overflows it, and no typecheck,
# lint or build says a word. `node scripts/check-density.mjs` is the lock for
# exactly that, and the two constants must move in the same commit.
DENSITY = 3
HERO_BOX = (96, 120)     # portrait-field-96,  home hero at >= 48rem
PHONE_BOX = (64, 80)     # portrait-field-64,  home below 48rem
CONTACT_BOX = (48, 60)   # portrait-field-contact, the afterimage

# Device pixels per PAGE cell in the committed stills. This is held fixed
# rather than the cell size, so a still keeps its pixel dimensions -- and so
# its size on the page -- when the density changes. The cell size is the
# quotient, and it gets smaller as the grid gets finer, which is the point.
HERO_STILL_PX = 12       # 96 x 12 = 1152 px wide, the @2x hero still
PHONE_STILL_PX = 10      # 64 x 10 = 640
PREVIEW_PX = 7           # the review PNGs, 1x and only ever looked at

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

# ── The ink transfer ──────────────────────────────────────────────────────
# One ink at full strength; value is carried by dot AREA alone. Every one of
# these five numbers was measured offline before it was written down, and they
# are the renderer's: src/lib/board.ts, src/lib/field/gl-board.ts and
# src/lib/og.tsx hold the same constants and the four copies must not drift.
#
#   DEEP_FLOOR  the 27% of mask cells that sit under UNLIT map to ~0.94
#               coverage taken at face value and go nearly solid. Flooring
#               their luminance at 0.16 is the single largest cause of mud
#               removed.
#   LIFT        straight inversion gives mean coverage 0.55 and crushes the
#               hair and the shadow side to a photocopy. The lift is not
#               optional; 0.55 holds the form where 0.42 loses presence.
#   INK_GAIN    press gain compensation.
#   1.128       2/sqrt(pi): the area-exact diameter for a disc of `coverage`.
#   INK_DIA_MAX sqrt(2), the diameter at which a cell closes to solid.
#   CULL_DIA    the most important line: a dot you cannot resolve is grey haze,
#               and the absence of a dot is a highlight.
LIFT, INK_GAIN, DEEP_FLOOR, CULL_DIA, INK_DIA_MAX = 0.55, 1.15, 0.16, 0.30, 1.42


# There is no jitter here, and there is none in either renderer.
#
# It was a stochastic screen meant to stop a ruled grid showing a screen door.
# Measured on the shipped About field, rendering the same bytes with only the
# jitter varied and regressing realised coverage against what the transfer
# asked for: cell-scale signal-to-noise runs 18.2 at 0.00, 7.3 at 0.10, 4.3 at
# 0.18 -- the direction's own figure -- and 2.5 at the 0.34 that shipped. The
# picture is in the last step, so there is no compromise value: 0.18 recovers
# only about 12% of what 0.34 threw away.
#
# The screen door is real and the answer to it is resolution rather than noise.
# Independently checked: unjittered, the high-frequency residual left after an
# observer's own blur is about a THIRD of what the jitter produces -- the
# jitter did not remove that energy, it only disorganised it into grain.

def ink_dia(L: float) -> float:
    """Dot diameter in cells for a cell of luminance L, or 0 if it is culled."""
    coverage = (1.0 - min(max(L, DEEP_FLOOR), 1.0) ** LIFT) ** INK_GAIN
    dia = min(1.128 * math.sqrt(coverage), INK_DIA_MAX)
    return dia if dia >= CULL_DIA else 0.0


# The OG card's own grid. It is not a free choice in either direction, and both
# ends were measured on the real bake.
#
# Coarser is lighter: sampling the window at 48 x 60 averages sixteen of the
# hero's cells into one, and because the transfer is convex that pulls realised
# mean coverage down to 0.297 — under the 0.30 floor the direction sets. 56 x 70
# lands at 0.306 and 64 x 80 at 0.311, against the hero's own 0.338 at 192 x 240.
#
# Finer is not free either. A share card is usually seen scaled to about 42% in
# a timeline, and the engraving only survives that as long as its marks are
# still marks; the card's 392px portrait puts a 70-row grid at 5.6px per cell,
# which is 2.4px in a thumbnail. Below that the halftone stops resolving and
# becomes the haze the cull exists to prevent. 56 x 70 is the finest grid that
# clears the coverage floor while keeping the dot count under the SVG budget
# in src/lib/og.tsx (1,666 drawn against 2,000).
OG_COLS, OG_ROWS = 56, 70

# ── Focal hierarchy ───────────────────────────────────────────────────────
# A uniform halftone has no subject. In this frame the white tee is the
# brightest, most detailed thing and the face is not, so the eye goes to his
# shoulder. A portrait photographer burns the shirt and dodges the face; this
# does the same, and then drives DENSITY by importance so flat ground falls
# back to the page lattice while the face keeps every cell.
#
# FOCAL_HOLD is a plateau, not a peak: everything inside it is the subject and
# is never thinned. A simple 1-d cone made the cheeks as sparse as the tee,
# which is prettier and less clear — the wrong trade for a portrait.
FOCAL_RX, FOCAL_RY = 0.72, 0.60   # ellipse radii, fractions of the window
FOCAL_HOLD = 0.42                 # inside this, importance is 1
FOCAL_GAMMA = 0.9
DODGE = 0.16      # lift local contrast inside the plateau
BURN = 0.48       # roll off highlights outside it
BURN_KNEE = 0.68
W_DETAIL = 0.80   # importance from local high-pass energy
W_FOCAL = 0.50    # importance from the focal map
IMP_CUT = 0.92    # importance at which a cell is certain to keep full density
# Share of lit cells that carry the sunset. Opening up the shadows raised the
# lit count by about 40%, and at a flat 2% the rim stopped reading as a light
# on an edge and started reading as orange blocks on the hand and the shoulder.
# 1.4% holds the sun to roughly the same number of dots it has always had.
RIM_FRACTION = 0.014


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


# Ink on paper. These must match the CSS tokens in src/app/globals.css.
PAPER = hex_rgb("#FAF8F4")
INK = hex_rgb("#14120E")
SUN = hex_rgb("#A8321B")  # vermilion, the second ink


def load_cutout() -> tuple[Image.Image, tuple[int, int], float]:
    """The cutout, its origin in its own source frame, and how many source
    pixels there are to one REFERENCE_FRAME pixel."""
    im = Image.open(CUTOUT).convert("RGBA")
    lines = ORIGIN_FILE.read_text().strip().splitlines()
    ox, oy = (int(v) for v in lines[0].split(","))
    # A cutout from before the frame size was recorded is, by definition, one
    # cut from the reference frame itself.
    fw, fh = (int(v) for v in lines[1].split(",")) if len(lines) > 1 else REFERENCE_FRAME
    scale = fw / REFERENCE_FRAME[0]
    assert abs(fh / REFERENCE_FRAME[1] - scale) < 0.005 * scale, (
        f"source frame {fw}x{fh} is not the reference frame's aspect: the windows would stretch"
    )
    return im, (ox, oy), scale


def window(im: Image.Image, origin: tuple[int, int], crop: tuple[int, int, int, int], scale: float) -> Image.Image:
    """Crop in REFERENCE_FRAME coordinates; areas outside the cutout are
    transparent. `scale` maps the crop into the cutout's own resolution, so the
    window frames the same region of the photograph whatever it was segmented
    at -- there are just more pixels inside it."""
    ox, oy = origin
    x0, y0, x1, y1 = (int(round(v * scale)) for v in crop)
    out = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    out.paste(im, (ox - x0, oy - y0))
    return out


def blur(a: np.ndarray, radius: float) -> np.ndarray:
    """Gaussian blur of a float array. `radius` is the standard deviation, in
    the array's own pixels -- the same thing Pillow's GaussianBlur means by it.

    This used to carry the array through an 8-bit image on its own min/max, on
    the argument that 256 levels are ample for the low frequencies every caller
    wants. Two callers are not low frequency and one of them is the point of
    the whole script: the FINE unsharp runs at about one cell and the detail
    map at a couple of cells, and the finer the grid the less low-frequency
    they get. Worse, the round trip quantises to 1/255 of whatever range the
    array happens to span, and `var` below spans almost nothing -- the local
    standard deviation that drives the shadow normalisation was being computed
    from a heavily quantised square.

    `mode="nearest"` replicates the edge, which is what Pillow's box passes did:
    zero-padding would drag every blur down toward black along the frame and
    put a dark band around the window.
    """
    if radius <= 0:
        return a.astype(np.float32).copy()
    return gaussian_filter(a.astype(np.float32), sigma=float(radius), mode="nearest")


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


def sample(
    win: Image.Image,
    cols: int,
    rows: int,
    crop: tuple[int, int, int, int] = MAIN_CROP,
    center_hint: tuple[int, int] = CENTER_HINT,
    focal_strength: float = 1.0,
    scale: float = 1.0,
) -> tuple[np.ndarray, np.ndarray]:
    """Return (bytes per the mapping above, per-cell warmth) as rows x cols arrays.

    `crop` and `center_hint` are in REFERENCE_FRAME coordinates; `win` is that
    crop at the cutout's own resolution, `scale` source pixels to the reference
    pixel. Radii written in cells need no conversion -- they ride on `pitch`.
    The three written in photograph pixels are scaled here, at the point of
    use, so their tuned values keep meaning the piece of the face they were
    tuned on rather than silently shrinking when the source grows."""
    W, H = win.size
    pitch = W / cols
    broad_radius = BROAD_RADIUS_PX * scale
    adapt_radius = ADAPT_RADIUS_PX * scale
    edge_band = max(3, int(EDGE_BAND_PX * scale))
    assert abs(H / rows - pitch) < 0.02 * pitch, "window aspect must match the grid"

    arr = np.asarray(win).astype(np.float32) / 255.0
    rgb, alpha = arr[..., :3], arr[..., 3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    inside = alpha > 0.5

    # 0. The focal map and the detail map: what this picture is about.
    # Fractions of the window, so they do not depend on how many pixels it has.
    fx = (center_hint[0] - crop[0]) / (crop[2] - crop[0])
    fy = (center_hint[1] - crop[1]) / (crop[3] - crop[1])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = np.sqrt(((xx / W - fx) / FOCAL_RX) ** 2 + ((yy / H - fy) / FOCAL_RY) ** 2)
    focal = np.clip((1.0 - dist) / max(1.0 - FOCAL_HOLD, 1e-6), 0.0, 1.0) ** FOCAL_GAMMA
    # A window that is already nothing but face has no hierarchy to impose:
    # every cell is the subject, so dodge, burn and thinning are all off and it
    # keeps the uniform density a close-up wants.
    focal = 1.0 - focal_strength * (1.0 - focal)
    detail = np.abs(lum - blur(lum, max(1.0, pitch * 1.6)))
    detail = blur(detail, max(1.5, pitch * 2.2))
    if inside.any():
        detail = np.clip(detail / max(float(np.percentile(detail[inside], 96)), 1e-6), 0, 1)

    # 1. Two unsharp passes: the shape, then the features.
    if BROAD > 0:
        lum = lum + BROAD * (lum - blur(lum, broad_radius))
    if FINE > 0:
        lum = lum + FINE * (lum - blur(lum, max(0.6, pitch * FINE_RADIUS_CELLS)))
    lum = np.clip(lum, 0, 1)

    # 2. Local normalisation, weighted to the shadows. The local mean and
    # standard deviation count masked-in pixels only, so the empty background
    # never drags the face's window down.
    if ADAPT > 0:
        cover = np.maximum(blur(inside.astype(np.float32), adapt_radius), 1e-3)
        mean = blur(np.where(inside, lum, 0.0), adapt_radius) / cover
        var = blur(np.where(inside, (lum - mean) ** 2, 0.0), adapt_radius) / cover
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
    # Dodge and burn. The face gets its local contrast lifted; everything
    # outside the plateau gives up its highlights, so the tee stops competing.
    if DODGE > 0 and focal_strength > 0:
        norm = np.clip(norm + DODGE * focal * (norm - blur(norm, max(2.0, pitch * 6.0))), 0, 1)
    if BURN > 0 and focal_strength > 0:
        over = np.clip(norm - BURN_KNEE, 0, 1)
        norm = np.where(norm > BURN_KNEE, BURN_KNEE + over * (1.0 - BURN * (1.0 - focal)), norm)

    if TOE > 0:
        norm = TOE + (1 - TOE) * norm

    # Silhouette: cells whose neighbourhood alpha is partial are on the outline.
    amask = Image.fromarray((alpha * 255).astype(np.uint8))
    eroded = np.asarray(amask.filter(ImageFilter.MinFilter(edge_band | 1))).astype(np.float32) / 255.0
    edge = inside & (eroded < 0.5)
    norm = np.where(edge, np.maximum(norm, EDGE_FLOOR), norm)

    # Warmth: how much redder than blue a cell is. The sunset rim light on the
    # face is strongly warm; the white tee and the sky are not.
    warmth_px = np.clip((rgb[..., 0] - rgb[..., 2]) * 3.0, 0, 1)

    values, cover = cell_mean(norm, cols, rows, inside)
    warmth, _ = cell_mean(warmth_px, cols, rows, inside)
    det_c, _ = cell_mean(detail, cols, rows, inside)
    foc_c, _ = cell_mean(focal, cols, rows, inside)
    edge_c, _ = cell_mean(edge.astype(np.float32), cols, rows, inside)
    keep = cover > 0.5
    out = np.zeros((rows, cols), np.uint8)
    out[keep] = np.maximum(1, np.round(np.clip(values[keep], 0, 1) * 255).astype(np.uint8))
    warmth = np.where(keep, warmth, 0.0).astype(np.float32)

    # Importance drives density, not tone. A cell that loses is demoted to
    # "inside but unlit" (bytes 1..12), which the renderer already draws only
    # where a page dot is — so the flat ground thins to the lattice and the
    # face keeps every cell. The face and the silhouette are never thinned.
    #
    # The demotion is dithered with interleaved gradient noise, not
    # thresholded: a hard cut flips whole regions at once and punches visible
    # holes in the hair and the tee, which reads as damage rather than air.
    imp = np.clip(W_DETAIL * det_c + W_FOCAL * foc_c, 0, 1)
    imp = np.maximum(imp, edge_c)
    imp = np.maximum(imp, foc_c)
    if focal_strength > 0:
        jj, ii = np.mgrid[0:rows, 0:cols].astype(np.float32)
        ign = np.modf(52.9829189 * np.modf(0.06711056 * ii + 0.00583715 * jj)[0])[0]
        thin = keep & (ign > np.clip(imp / IMP_CUT, 0, 1)) & (edge_c <= 0.15)
        out[thin] = np.minimum(out[thin], 12)
    # Feather the bottom eight rows so the figure sits on the sheet rather than
    # being cut by it.
    #
    # It used to feather toward UNLIT, because on a dark ground an unlit cell is
    # invisible. On paper the polarity is the opposite: the renderer maps low
    # luminance to HEAVY ink, so fading toward unlit printed a solid black bar
    # along the bottom edge -- the loudest thing on the page. The figure has to
    # fade toward the PAPER, which is maximum luminance.
    for k in range(8):
        j = rows - 1 - k
        f = k / 8  # 0 at the very bottom row, 1 at the eighth row up
        row = out[j]
        lit = row > 0
        v = row[lit].astype(np.float32)
        out[j][lit] = np.clip(v + (255.0 - v) * (1.0 - f), 1, 255).astype(np.uint8)
    return out, warmth


def find_datum(field: np.ndarray, hint_cell: tuple[int, int]) -> tuple[int, int]:
    """No datum, on any portrait.

    This used to return the hinted cell, and the renderers painted that one dot
    in vermilion -- the catchlight in his eye, and by the direction's own count
    one of the four places the second ink was licensed. It is gone at Utkarsh's
    call, and he is right: at the size a dot actually prints, a single saturated
    cell in a field of 51,747 does not read as a mark with a meaning. It reads
    as a stray red pixel on a photograph of a person.

    The hint is still validated, so the assertion that has caught a bad crop
    twice still fires; only the coordinate handed back changes. [-1, -1] is the
    same "off the field" convention bake-art.py uses for every plate, and it
    matches no cell in either renderer or in the still.
    """
    x, y = hint_cell
    assert field[y, x] > 0, "datum cell is outside the mask"
    return (-1, -1)


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


def render(
    field: np.ndarray,
    datum: tuple[int, int],
    rim: set[int],
    cell_px: float,
    transparent: bool,
    alpha_scale: float = 1.0,
    density: int = 2,
) -> Image.Image:
    """The settled frame, drawn the way the browser draws it.

    Ink on paper: one ink at full strength, value carried by dot AREA alone,
    through the shared `ink_dia` above — or the image a no-JS visitor sees is
    not the picture the board draws.

    The rim is no longer an accent. On a dark ground it was a light source and
    earned the second ink; on paper there is no light, so the rim prints in the
    same ink as everything else and the catchlight in his eye is the only mark
    on the sheet that is vermilion.
    """
    rows, cols = field.shape
    W, H = int(cols * cell_px), int(rows * cell_px)

    # AREA HAS TO BE EXACT HERE, and it was not.
    #
    # This still is what a visitor sees with JavaScript off, what the printer
    # prints, and what forced-colors shows. It is the bottom rung of the tier
    # ladder, and section 8.7 of the direction says every rung must agree --
    # which is precisely the kind of claim nothing checks, so it drifted. The
    # old renderer drew each dot with PIL's `ellipse`, whose bounding box is
    # ENDPOINT-INCLUSIVE: asking for a disc of diameter D paints D + 1 pixels
    # across. At these sizes that is not a rounding error. Measured against the
    # exact pi/4 * d^2, a dot came out 1.11x too large at 20px and 3.5x too
    # large at 1.2px, and the 2x supersample this used only halved it. The
    # stills were systematically darker than the board they stand in for --
    # about 20% at a 6px cell and 65% at 5px.
    #
    # So the mask is drawn at 8x with the endpoint corrected, then box-filtered
    # down. BOX is an exact area average, which is what coverage means; LANCZOS
    # rings and would put a pale halo around every dot. At 8x the smallest dot
    # the transfer can emit (CULL_DIA 0.30 cells, 5px cells) is 12 device px,
    # where the corrected box measures within 1% of exact.
    #
    # An "L" mask rather than RGBA: 8x of a 960 x 1200 field is 74 MB in one
    # channel and 295 MB in four.
    ss = 8
    k = cell_px * ss
    mask = Image.new("L", (W * ss, H * ss), 0)
    d = ImageDraw.Draw(mask)
    datum_dia = 0.0
    datum_xy = (0.0, 0.0)
    for j in range(rows):
        for i in range(cols):
            v = int(field[j, i])
            if v == 0:
                continue
            X, Y = (i + 0.5) * k, (j + 0.5) * k
            if (i, j) == datum:
                # The one vermilion mark on the sheet, composited afterwards so
                # it sits in its own ink rather than in the ink mask.
                datum_dia = 0.96 * density
                datum_xy = ((i + 0.5) * cell_px, (j + 0.5) * cell_px)
                continue
            dia = ink_dia(v / 255)
            if dia == 0.0:
                continue  # below resolution is haze; bare paper is a highlight
            r = dia * k / 2
            d.ellipse((X - r, Y - r, X + r - 1, Y + r - 1), fill=255)
    ink_cov = np.asarray(mask.resize((W, H), Image.BOX), dtype=np.float32) / 255.0
    del mask

    # The datum, drawn analytically at final resolution: one dot, and it is the
    # only mark allowed a second colour, so it must not go through the ink mask.
    sun_cov = np.zeros((H, W), np.float32)
    if datum_dia > 0.0:
        r = datum_dia * cell_px / 2
        cx, cy = datum_xy
        N = 8
        x0, x1 = max(0, int(cx - r - 1)), min(W, int(cx + r + 2))
        y0, y1 = max(0, int(cy - r - 1)), min(H, int(cy + r + 2))
        if x1 > x0 and y1 > y0:
            off = (np.arange(N) + 0.5) / N
            xs = (np.arange(x0, x1)[:, None] + off[None, :]).ravel()
            ys = (np.arange(y0, y1)[:, None] + off[None, :]).ravel()
            inside = ((ys[:, None] - cy) ** 2 + (xs[None, :] - cx) ** 2) <= r * r
            sun_cov[y0:y1, x0:x1] = inside.reshape(y1 - y0, N, x1 - x0, N).mean(axis=(1, 3))

    ink_cov = np.maximum(ink_cov - sun_cov, 0.0)
    alpha = np.clip((ink_cov + sun_cov) * alpha_scale, 0.0, 1.0)
    ink_rgb = np.array(INK, np.float32)
    sun_rgb = np.array(SUN, np.float32)
    total = ink_cov + sun_cov
    with np.errstate(invalid="ignore", divide="ignore"):
        wsun = np.where(total > 0, sun_cov / np.maximum(total, 1e-6), 0.0)[..., None]
    colour = ink_rgb * (1.0 - wsun) + sun_rgb * wsun

    if transparent:
        out = np.dstack([colour, alpha[..., None] * 255.0])
    else:
        paper = np.array(PAPER, np.float32)
        rgb = paper * (1.0 - alpha[..., None]) + colour * alpha[..., None]
        out = np.dstack([rgb, np.full((H, W, 1), 255.0, np.float32)])
    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), "RGBA")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--preview", help="directory for review PNGs")
    args = p.parse_args()

    im, origin, scale = load_cutout()
    CONTENT.mkdir(exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    main_win = window(im, origin, MAIN_CROP, scale)
    print(f"cutout {im.size[0]}x{im.size[1]} {im.mode}, {scale:.4f} source px per reference px; "
          f"main window {main_win.size[0]}x{main_win.size[1]}")

    # focal_strength 0 on every main-window field now, matching About. The
    # focal plateau dodges the head and burns everything outside it, which is a
    # hierarchy device for a wide frame; once the frame IS the head there is no
    # hierarchy left to impose and the burn only compresses the tonal range the
    # engraving needs.
    hero = (HERO_BOX[0] * DENSITY, HERO_BOX[1] * DENSITY)
    phone = (PHONE_BOX[0] * DENSITY, PHONE_BOX[1] * DENSITY)
    contact = (CONTACT_BOX[0] * DENSITY, CONTACT_BOX[1] * DENSITY)
    print(f"density {DENSITY}: hero {hero[0]}x{hero[1]}, phone {phone[0]}x{phone[1]}, "
          f"contact {contact[0]}x{contact[1]}; hero cell "
          f"{main_win.size[0] / hero[0]:.3f} source px "
          f"({main_win.size[0] / hero[0] / scale:.3f} photograph px)")
    f96, w96 = sample(main_win, *hero, focal_strength=0.0, scale=scale)
    f64, w64 = sample(main_win, *phone, focal_strength=0.0, scale=scale)
    fct, wct = sample(main_win, *contact, focal_strength=0.0, scale=scale)  # Contact afterimage
    fog, _ = sample(main_win, OG_COLS, OG_ROWS, focal_strength=0.0, scale=scale)

    # The name passes over the board's top-left corner at >= 80rem: it must be sky.
    # A quarter of the box on each axis, in whatever cells the density gives.
    q96, q64 = HERO_BOX[0] // 4 * DENSITY, PHONE_BOX[0] // 4 * DENSITY
    assert not f96[:q96, :q96].any(), "top-left quarter of the hero field must be empty sky (move MAIN_CROP)"
    assert not f64[:q64, :q64].any(), "top-left quarter of the phone field must be empty sky"

    d96 = find_datum(f96, to_cell(DATUM_HINT, MAIN_CROP, hero[0]))
    d64 = find_datum(f64, to_cell(DATUM_HINT, MAIN_CROP, phone[0]))
    dct = find_datum(fct, to_cell(DATUM_HINT, MAIN_CROP, contact[0]))
    dog = find_datum(fog, to_cell(DATUM_HINT, MAIN_CROP, OG_COLS))
    c96 = to_cell(CENTER_HINT, MAIN_CROP, hero[0])
    c64 = to_cell(CENTER_HINT, MAIN_CROP, phone[0])
    cct = to_cell(CENTER_HINT, MAIN_CROP, contact[0])

    # The OG field needs no rim set: on the card the sun is the datum alone.
    r96, r64 = rim_indices(f96, w96), rim_indices(f64, w64)
    rct = rim_indices(fct, wct)

    (CONTENT / "portrait-field-96.ts").write_text(ts_module("portraitField96", f96, d96, c96, r96, f"Hero at >= 48rem: a {HERO_BOX[0]} x {HERO_BOX[1]} lattice box at density {DENSITY}. Window MAIN_CROP of the photograph."))
    (CONTENT / "portrait-field-64.ts").write_text(ts_module("portraitField64", f64, d64, c64, r64, f"Hero below 48rem: a {PHONE_BOX[0]} x {PHONE_BOX[1]} box at density {DENSITY}."))
    (CONTENT / "portrait-field-contact.ts").write_text(ts_module("portraitFieldContact", fct, dct, cct, rct, f"The Contact afterimage: the hero window at half its size, a {CONTACT_BOX[0]} x {CONTACT_BOX[1]} box at density {DENSITY}."))

    count = int((f96 >= UNLIT * 255).sum())
    (CONTENT / "portrait-meta.ts").write_text(
        "/** GENERATED by scripts/bake-portrait.py. Do not edit. */\n"
        f"/** Lit cells of the hero field ({hero[0]} x {hero[1]}, a {HERO_BOX[0]} x {HERO_BOX[1]} box at density {DENSITY}). */\n"
        f"export const DOT_COUNT = {count};\n"
        "/** Cells per page-lattice step the fields were baked at. Must equal PORTRAIT_DENSITY in\n"
        " *  src/components/interactive/dot-board.tsx; scripts/check-density.mjs is the lock. */\n"
        f"export const PORTRAIT_FIELD_DENSITY = {DENSITY};\n"
    )

    # OG: [x, y, r, kind] in grid units; kind 1 = the datum, the one vermilion
    # mark. Radii come from `ink_dia`, the same transfer the board and the
    # no-JS still use, so the share card is the same engraving as the page.
    #
    # Two differences from the pre-Intaglio bake, both structural rather than
    # tuning. Sub-UNLIT cells are no longer skipped — they are the deepest
    # shadows, 27% of the mask, and DEEP_FLOOR is what turns them into large
    # dots instead of nothing. And the rim set no longer earns kind 1: on
    # paper there is no light to be warm, so the sun is the datum alone.
    og: list[list[float]] = []
    for j in range(OG_ROWS):
        for i in range(OG_COLS):
            v = int(fog[j, i])
            if v == 0:
                continue
            if (i, j) == dog:
                og.append([i, j, 0.48, 1])
                continue
            dia = ink_dia(v / 255)
            if dia == 0.0:
                continue
            og.append([i, j, round(dia / 2, 3), 0])
    (CONTENT / "portrait-og.ts").write_text(
        f"/** GENERATED by scripts/bake-portrait.py. Do not edit. {OG_COLS} x {OG_ROWS} downsample for the OG image: [x, y, r, kind] in grid units, kind 1 = the vermilion datum. */\n"
        "export const portraitOg: { w: number; h: number; dots: [number, number, number, number][] } = {\n"
        f"  w: {OG_COLS},\n  h: {OG_ROWS},\n  dots: {json.dumps(og, separators=(',', ':'))},\n}};\n"
    )

    render(f96, d96, set(r96), HERO_STILL_PX / DENSITY, True, density=DENSITY).save(PUBLIC / "dots-96@2x.webp", quality=90, method=6)
    render(f64, d64, set(r64), PHONE_STILL_PX / DENSITY, True, density=DENSITY).save(PUBLIC / "dots-64@2x.webp", quality=90, method=6)

    print(f"96 field: {count} lit, datum {d96}, center {c96}, rim {len(r96)}")
    print(f"64 field: {int((f64 >= UNLIT * 255).sum())} lit, datum {d64}")
    print(f"contact field: {int((fct >= UNLIT * 255).sum())} lit, datum {dct}")
    print(f"og dots: {len(og)}")
    for f in sorted(PUBLIC.glob("*.webp")):
        print(f"  {f.name}: {os.path.getsize(f) // 1024} KB")
    for f in sorted(CONTENT.glob("portrait-*.ts")):
        print(f"  {f.name}: {os.path.getsize(f) // 1024} KB")

    if args.preview:
        out = Path(args.preview)
        out.mkdir(parents=True, exist_ok=True)
        render(f96, d96, set(r96), PREVIEW_PX / DENSITY, False, density=DENSITY).save(out / "bake-96.png")
        render(f64, d64, set(r64), 9 / DENSITY, False, density=DENSITY).save(out / "bake-64.png")
        render(fct, dct, set(rct), 9 / DENSITY, False, density=DENSITY).save(out / "bake-contact.png")
        print("previews in", out)


if __name__ == "__main__":
    main()
