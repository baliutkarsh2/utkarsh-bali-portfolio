#!/usr/bin/env python3
"""
Bake the hero portrait: a colour halftone of him, printed once.

    python scripts/bake-hero.py                 # grids, lattice, stills
    python scripts/bake-hero.py --preview DIR   # also full-size renders to judge

ONE SOURCE OF TRUTH. This script writes everything the page draws:

  · public/portrait/hero-grid{,-sm}{,-dark}.webp -- one lossless image per size
    band and ground. Top half: the ink, one pixel per dot. Bottom half: the
    dot's diameter as a grey level, 0 meaning no dot. Opaque on purpose: a
    diameter in the alpha channel comes back from a premultiplied canvas with
    its colour crushed wherever the dot is small, which is every highlight.
  · src/components/interactive/hero-lattice.ts -- the numbers per band that
    place pixel (i, j) of a grid on the page, plus the grid's size so the
    renderer can refuse a grid that does not belong to them. Generated here in
    the same run as the grids, so the two cannot drift apart.
  · public/portrait/hero-dots{,-sm}{,-dark}@2x.{avif,webp} -- the stills for
    no JavaScript, print and forced colours. Drawn by `render()` from the
    ENCODED grids, decoded exactly as hero-dots.tsx decodes them and drawn in
    its order, so the still is the canvas.

THE SCREEN is a 45-degree square lattice laid out in log-polar space,
z = C + exp(u + iv). The map is conformal, so every cell stays square and
every dot stays round; the pitch grows in proportion to the distance from the
pole C, which sits off the frame to the left of his face. So the screen is
finest where the expression is (nose 3.4, mouth 3.8, eye 4.3 design px) and
coarsens toward the hair and the ear (5.1 to 5.5) and the dissolving shoulder
(6.6 at the corner). A uniform screen fine enough for the eye costs 14% more
dots and reads flatter.

THE PHOTOGRAPH NEEDS HELP. He is backlit: the face is in shadow, almost
without chroma, and the sunset is only on the rim. Printed straight it is one
field of equal brown dots with no eyes. So, in Lab: a bilateral denoise, a
base/detail split, clarity and a strong shadow-opening curve on the base, the
detail put back at 1.5x the curve's slope so the features keep their edges
after the lift, and a fine unsharp mask. Then an engraver's dodge and burn on
hand-placed soft ellipses: more local contrast on the eye, brow and mouth,
the teeth opened, the mouth corner deepened, the lid and brow line lifted.
Stubble is smoothed first -- at this screen it is noise, and at reading
distance it printed as dark blotches on the jaw.

COLOUR, by region, from hand-placed geometry (the face, the ear, the shirt)
rather than from colour thresholds, which is what let sun on the shirt turn
into rim light and sky between the hair strands into grey-blue patches:

  · skin: a living warm brown, C* 25, hue 57 in the light and 42 in the shade,
    with the lips a touch rosier;
  · hair: one warm near-black family, hue 58, its sheen capped to a slightly
    lighter brown. Nothing on his head is blue or green, as a hard clamp;
  · the low sun: vermilion-gold on the profile and a thin band inside the
    matte edge, on the sun side only and never on the shirt;
  · the shirt: squeezed toward one pale cool grey (paper) or one deep one
    (plate), keeping an eighth of its contrast, so it never competes with the
    face.

THE INK. For every dot the ink's lightness comes from the target's; the
coverage is then solved so ink over the ground averages to the target's
luminance in the gamma-encoded space a canvas blends in, and the ink's colour
so the average hits the target's colour. The inks are clustered to a palette
(k-means in Lab, nearest ink), and the coverage is solved AGAIN against the ink
each dot actually got, so quantising costs a little hue, never tone.

THE PLATE (the dark ground) is not the paper inverted: there, light is what
advances, so everything the photograph lights prints as big pale dots. It has
its own curve and its own amber skin, a floor so no dot is ever darker than
the plate, and four guards against what that does to a portrait:

  · no outline: the back of the head gets a soft lift four to six dots deep in
    the hair's own brown, never a one-dot band (a one-dot amber band there
    read as a badly masked cut-out);
  · hair with range: the floor that keeps it off the plate is applied to its
    local mean and the strands and sheen go back over it, so they still move
    the dot size (floored dot by dot it was a flat knit cap);
  · no glowing rim: the sun side's edge is capped at the lit skin a few dots
    in, so the jaw and chin keep a warm rim rather than a near-white outline;
  · no fused highlights: coverage stops at 0.74 (a dot 0.97 of a pitch across)
    and no ink is lighter than --bone, so the teeth stay dots, not a white
    blob brighter than the page's type.

NO FRAME EDGE IS EVER VISIBLE. The shoulder dissolves off the bottom and right
edges and a 26 px feather runs round all four sides, so no dot ever touches
the box (asserted below, on the decoded grids). In the dissolve the dots thin
as well as shrink, cells dropping out on a low-discrepancy sequence, so the
shoulder ends in sparse marks the way an edition print does rather than in a
fading grid.

DRAW ORDER is part of the picture: where two DMAX 1.5 discs overlap, the one
drawn last wins. The renderer draws inks from the least to the most contrast
with the ground (lightest first on paper, darkest first on the plate), and
`render()` here does the same.
"""
import argparse
import json
import math
import os
import time

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.cluster.vq import kmeans2
from scipy.interpolate import PchipInterpolator

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "assets", "portrait", "utkarsh-cutout.png")
OUT = os.path.join(ROOT, "public", "portrait")
LATTICE_TS = os.path.join(ROOT, "src", "components", "interactive", "hero-lattice.ts")

# The collar line, cut-out px, top to bottom: the edge between his neck and his
# shirt. The face and the shirt polygons both run along it, so they partition
# the figure there.
COLLAR = [(1085, 805), (1045, 905), (985, 1010), (915, 1090), (880, 1150), (870, 1300)]
# The face, the neck and the throat: the hairline, the sideburn, the jaw under
# the ear, then down the collar and back round outside the silhouette.
FACE = [(505, 440), (560, 425), (620, 412), (680, 398), (740, 384), (800, 374), (860, 390),
        (910, 418), (952, 448), (972, 505), (985, 580), (1002, 650), (1030, 720),
        (1070, 780)] + COLLAR + [(760, 1300), (420, 1000), (420, 450)]
EAR = (1115, 555, 52, 112)
SHIRT = [(1135, 755), (1205, 712), (1450, 700), (1450, 1300)] + COLLAR[::-1]

P = dict(
    # crop in cut-out px: left, top, width (height = width * 5/4)
    crop=(430, 10, 920),
    design_w=620.0,
    # the screen: pitch at the face centre and at the far (bottom-right) corner
    pitch_face=4.2,
    pitch_far=6.6,
    pole_angle=180.0,
    face=(760, 620),
    prefilter=0.40,        # gaussian sigma as a fraction of the local pitch
    dmax=1.5,              # largest diameter, in pitches
    # head: everything inside this ellipse (cut-out px) prints in full; the
    # dissolve starts at r0 and is gone by r1 (in ellipse radii)
    head=(840, 470, 470, 520, 1.0, 1.55),
    dissolve=(150.0, 170.0),
    edge_feather=26.0,
    # thinning in the dissolve: the keep-probability ramps from 0 to 1 over
    # this range of the vignette, and survivors take back this power of it
    thin=(0.04, 0.45, 0.25),
    # tone
    denoise=(6.0, 3.0),
    base=(7.0, 14.0),
    clarity=(0.45, 60.0),
    detail_gain=1.5,
    usm=(0.6, 2.0),
    curve=((0, 0), (8, 16), (16, 28), (26, 46), (33, 62), (40, 74), (48, 82), (58, 88), (75, 93), (100, 96)),
    # (cx, cy, rx, ry, gain): extra local contrast. The far eye, seen past the
    # bridge of the nose, takes less: at full strength it printed as a hard
    # black comma.
    features=((745, 480, 85, 34, 1.1), (740, 422, 100, 34, 1.1), (575, 535, 40, 40, 0.4),
              (665, 745, 95, 55, 1.1)),
    feature_sigma=6.0,
    # stubble: the jaw, the chin, the cheek above the jaw
    stubble=((835, 820, 185, 115), (665, 868, 70, 52), (780, 700, 90, 50)),
    stubble_sigma=7.0,
    teeth=(645, 750, 56, 20, 22.0, 1.0),
    # (cx, cy, rx, ry, dL): soft dodges (+) and burns (-)
    burn=((735, 712, 22, 34, -8.0), (880, 810, 120, 90, 6.0), (748, 451, 72, 8, 11.0),
          (742, 506, 62, 10, 7.0), (640, 832, 36, 24, 8.0), (1115, 560, 50, 100, -5.0)),
    # (cx, cy, rx, ry, L*): soft floors, so a deep mark stays a graded one
    floors=((575, 535, 46, 46, 26.0), (590, 672, 28, 18, 22.0), (640, 832, 40, 26, 30.0)),
    # skin: C*, hue in the light, hue in the shade
    skin=(25.0, 57.0, 42.0),
    # the lips: (cx, cy, rx, ry, extra C*, hue)
    lips=(652, 770, 60, 26, 2.5, 40.0),
    chroma_gain=2.0,
    chroma_cap=26.0,
    # hair: hue, C* at the darkest, C* at the cap, then the sheen's knee (L*),
    # its slope above the knee, and the cap (L*)
    hair=(58.0, 3.0, 10.0, 32.0, 0.4, 46.0),
    # rim: L* threshold, C*, hue, L* cap; then the sun-side band inside the matte
    rim=(60.0, 34.0, 50.0, 72.0),
    rim_band=16.0,
    band_amt=0.6,
    rim_side=(700, 950),
    rim_top=(180, 260),
    fringe_cap=30.0,
    # separation: ink lightness = clip(a * L_target + b, lo, hi)
    paper=dict(ground=(250, 248, 244), ink=(0.45, 11.0, 15.0, 54.0), cmax=0.94,
               shirt=(90.0, 0.12, 0.30), shirt_fade=0.3),
    plate=dict(ground=(22, 20, 15), ink=(0.55, 53.0, 56.0, 92.0), cmax=0.74, floor=0.10,
               # cmax 0.74 is a dot 0.97 of a pitch across, and no ink is lighter
               # than --bone (#efe9dc, L* 92.5): see THE PLATE and solve_ink
               ink_cap=92.0,
               curve=((0, 0), (20, 12), (35, 22), (50, 32), (60, 39), (70, 48), (80, 59),
                      (90, 74), (95, 83), (100, 90)),
               chroma=1.1,
               # amber skin: C*, hue in the light, hue in the shade
               skin=(32.0, 58.0, 46.0),
               # below this solved coverage the exact mix is a tiny ink asked
               # to carry a big colour difference, and it comes out magenta:
               # blend toward the target's own hue at the ink's lightness
               natural=(0.12, 0.3),
               # the hair's soft floor, L* = max(L*, a + b L*), on its local
               # mean, and the detail over it at this gain (the mean read at
               # this sigma, in lattice steps, the sheen capped at this L* and
               # the shadows eased onto the last): it keeps its modelling and
               # never sinks into the plate
               hair_floor=(6.0, 0.7),
               hair_detail=(4.0, 6.0, 38.0, 10.0),
               # and its own warmth, C* in the shadow, hue, C* at the sheen: at
               # plate coverage a hair dot is a small one, and a near-neutral
               # dot reads as grey hair
               hair=(11.0, 60.0, 16.0),
               # the far side of the head: the hair lifted to this L*, fading
               # to nothing this far in (cut-out px, 4 to 6 dots)
               far_fade=(22.0, 40.0),
               # the sun-side rim: its band (cut-out px), the sigma the lit
               # skin beside it is read at (lattice steps), and how far above
               # that skin it may print (L*)
               rim_cap=(24.0, 6.0, 2.0),
               shirt=(22.0, 0.12, 0.30), shirt_fade=0.45),
    shirt_hue=255.0,
    shirt_cmax=1.2,
    palette=160,
    ss=4,
    # the phone band: a coarser screen relative to the box, so the dots stay
    # dots at 350 px, and a narrower, quieter rim, which at that size read as
    # a colour fringe
    phone=dict(coarse=1.15, rim=(60.0, 22.0, 50.0, 72.0), rim_band=9.0, band_amt=0.35),
)


# ── colour ────────────────────────────────────────────────────────────────
def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


_M = np.array([[0.4124564, 0.3575761, 0.1804375],
               [0.2126729, 0.7151522, 0.0721750],
               [0.0193339, 0.1191920, 0.9503041]])
_MI = np.linalg.inv(_M)
_WHITE = np.array([0.95047, 1.0, 1.08883])
LUMA = np.array([0.2126, 0.7152, 0.0722])


def lin2lab(lin):
    xyz = lin @ _M.T / _WHITE
    f = np.where(xyz > 216 / 24389, np.cbrt(np.maximum(xyz, 0)), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab2lin(lab):
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) / (24389 / 27)) * _WHITE
    return xyz @ _MI.T


def Y_of_L(L):
    L = np.asarray(L, float)
    return np.where(L > 8, ((L + 16) / 116) ** 3, L / (24389 / 27))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def set_chroma(ab, w, C, hue_deg):
    """Blend a/b toward chroma C at a hue (either may be per pixel) by w."""
    h = np.radians(hue_deg)
    ab[..., 0] = ab[..., 0] * (1 - w) + w * C * np.cos(h)
    ab[..., 1] = ab[..., 1] * (1 - w) + w * C * np.sin(h)


# ── the photograph → the graded target ───────────────────────────────────
def _bilateral(x, sc, ss):
    import cv2
    return cv2.bilateralFilter(x.astype(np.float32), 0, sc, ss).astype(np.float64)


def poly_mask(shape, origin, pts, feather):
    H, W = shape
    im = Image.new("L", (W, H), 0)
    ImageDraw.Draw(im).polygon([(x - origin[0], y - origin[1]) for x, y in pts], fill=255)
    m = np.asarray(im, float) / 255
    return ndi.gaussian_filter(m, feather) if feather else m


def target(p):
    """The graded target in Lab over the region the crop needs, its alpha, and
    the region masks the two grounds grade separately. Returns
    (lab, alpha, origin, masks)."""
    x0, y0, w = p["crop"]
    h = w * 5 / 4
    m = 60
    box = (max(0, int(x0 - m)), max(0, int(y0 - m)), min(1564, int(x0 + w + m)), min(2728, int(y0 + h + m)))
    im = np.asarray(Image.open(SRC).convert("RGBA").crop(box), float) / 255
    col, a = to_linear(im[..., :3]), im[..., 3]
    # push colour outward past the silhouette so blurs don't pull in matte black
    num = np.stack([ndi.gaussian_filter(col[..., c] * a, 6) for c in range(3)], -1)
    fill = num / np.maximum(ndi.gaussian_filter(a, 6), 1e-4)[..., None]
    col = col * a[..., None] + fill * (1 - a[..., None])
    lab = lin2lab(np.clip(col, 0, None))
    L0 = lab[..., 0]
    H, W = L0.shape
    yy, xx = np.mgrid[0:H, 0:W]
    X, Y = xx + box[0], yy + box[1]

    def ell(cx, cy, rx, ry, soft=0.35):
        r = np.hypot((X - cx) / rx, (Y - cy) / ry)
        return 1 - smoothstep(1 - soft, 1 + soft, r)

    def ells(items, soft=0.35):
        out = np.zeros_like(L0)
        for e in items:
            out = np.maximum(out, ell(*e[:4], soft))
        return out

    # ── where things are ──
    face = np.maximum(poly_mask((H, W), box, FACE, 6), ell(*EAR, 0.25))
    shirt = np.clip(poly_mask((H, W), box, SHIRT, 6) * (1 - 0.9 * face), 0, 1)
    hairz = np.clip((1 - face) * (1 - shirt), 0, 1) * smoothstep(0.05, 0.5, a)

    # ── tone ──
    Ld = _bilateral(L0, *p["denoise"])
    base = _bilateral(Ld, *p["base"])
    detail = Ld - base
    # stubble is noise at this screen: smooth it before anything amplifies it
    stub = ells(p["stubble"], 0.5)
    ssg = p["stubble_sigma"]
    base = base * (1 - stub) + ndi.gaussian_filter(base, ssg * 0.6) * stub
    detail = detail * (1 - stub) + ndi.gaussian_filter(detail, ssg) * stub
    amt, sig = p["clarity"]
    base = base + amt * (base - ndi.gaussian_filter(base, sig))
    kx, ky = np.array(p["curve"], float).T
    curve = PchipInterpolator(kx, ky)
    Lb = curve(np.clip(base, 0, 100))
    slope = np.clip((curve(np.clip(base + 1, 0, 100)) - curve(np.clip(base - 1, 0, 100))) / 2, 0.6, 3.0)
    Lc = Lb + p["detail_gain"] * slope * detail
    amt, sig = p["usm"]
    Lc = Lc + amt * (Lc - ndi.gaussian_filter(Lc, sig))

    # the engraver's dodge and burn
    hp = Lc - ndi.gaussian_filter(Lc, p["feature_sigma"])
    gain = np.zeros_like(Lc)
    for (cx, cy, rx, ry, g) in p["features"]:
        gain = np.maximum(gain, ell(cx, cy, rx, ry) * g)
    Lc = Lc + gain * hp
    tx, ty, trx, try_, tgain, tthr = p["teeth"]
    loc = L0 - ndi.gaussian_filter(L0, 8)
    tm = ell(tx, ty, trx, try_, 0.3) * smoothstep(tthr, tthr + 5, ndi.gaussian_filter(loc, 1.2))
    tm = ndi.gaussian_filter(tm, 1.0)
    Lc = Lc + tgain * tm
    for (cx, cy, rx, ry, dl) in p["burn"]:
        Lc = Lc + dl * ell(cx, cy, rx, ry, 0.6)
    for (cx, cy, rx, ry, fl) in p["floors"]:
        e = ell(cx, cy, rx, ry, 0.6)
        Lc = Lc * (1 - e) + np.maximum(Lc, fl) * e

    skin = ndi.gaussian_filter(face * smoothstep(8, 16, L0), 3) * (1 - shirt)

    # the low sun, on the sun side and below the crown only: the bright patch
    # of sky on top of his head is not rim light
    rl, rc, rh, rcap = p["rim"]
    sun = (1 - smoothstep(*p["rim_side"], X)) * smoothstep(*p["rim_top"], Y) * (1 - shirt)
    rim = smoothstep(rl - 6, rl + 6, ndi.gaussian_filter(L0, 1.5)) * a * sun
    inside = ndi.distance_transform_edt(a > 0.5)
    band = (1 - smoothstep(4, p["rim_band"], inside)) * sun
    # the far side: hair against sky, and the sky between the strands takes the
    # hair's darkness, not the sky's
    far = smoothstep(*p["rim_side"], X) * (1 - shirt)
    shade = ndi.gaussian_filter((1 - smoothstep(4, 22, inside)) * far * (1 - skin), 2)
    Lc = Lc * (1 - shade) + np.minimum(Lc, p["fringe_cap"]) * shade
    rim_c = np.maximum(rim, p["band_amt"] * band * smoothstep(20, 40, ndi.gaussian_filter(L0, 2)))
    rim = ndi.gaussian_filter(rim, 1.5)
    rim_c = ndi.gaussian_filter(rim_c, 1.5)
    Lc = Lc * (1 - rim) + np.minimum(Lc, rcap) * rim

    # hair: a warm near-black mass. Sheen survives as a slightly lighter
    # brown -- a knee, then a cap -- never as a pale patch
    hh, hc0, hc1, knee, kslope, cap = p["hair"]
    hz = ndi.gaussian_filter(hairz, 2)
    Lh = np.minimum(np.where(Lc > knee, knee + (Lc - knee) * kslope, Lc), cap)
    Lc = Lc * (1 - hz) + Lh * hz

    # ── chroma ──
    ab = np.stack([ndi.gaussian_filter(lab[..., 1], 3), ndi.gaussian_filter(lab[..., 2], 3)], -1)
    ab *= p["chroma_gain"]
    cg = np.hypot(ab[..., 0], ab[..., 1])
    ab *= np.minimum(1, p["chroma_cap"] / np.maximum(cg, 1e-6))[..., None]
    C_s, h_l, h_s = p["skin"]
    Cs = C_s * smoothstep(15, 55, Lc) * (1 - 0.4 * smoothstep(82, 96, Lc))
    set_chroma(ab, skin, Cs, h_s + (h_l - h_s) * smoothstep(30, 70, Lc))
    lx, ly, lrx, lry, ldc, lh = p["lips"]
    lip = ell(lx, ly, lrx, lry, 0.5) * (1 - np.clip(tm * 3, 0, 1)) * skin
    set_chroma(ab, lip, np.hypot(ab[..., 0], ab[..., 1]) + ldc, lh)
    # hair and the deep shadows: warm near-black, never navy
    dark = (1 - smoothstep(18, 32, ndi.gaussian_filter(L0, 2))) * (1 - shirt)
    hair = np.maximum(hz, np.maximum(dark, np.clip(shade * 1.5, 0, 1)))
    set_chroma(ab, hair, hc0 + (hc1 - hc0) * smoothstep(12, cap, Lc), hh)
    set_chroma(ab, rim_c, rc, rh)
    # the hard clamp: nothing on his head is blue or green. A cool hue left
    # anywhere off the shirt turns to the hair's hue at low chroma
    hue = np.degrees(np.arctan2(ab[..., 1], ab[..., 0]))
    C = np.hypot(ab[..., 0], ab[..., 1])
    warm = (1 - smoothstep(95, 115, hue)) * smoothstep(-25, -5, hue)
    set_chroma(ab, (1 - shirt) * (1 - warm), np.minimum(C, 8.0), hh)

    out = np.stack([np.clip(Lc, 0, 100), ab[..., 0], ab[..., 1]], -1)
    masks = dict(shirt=shirt, skin=skin * (1 - rim_c), hair=hz, far=far * (1 - 0.7 * skin), rim=rim_c,
                 sun=sun, inside=inside)
    return out, a, box[:2], masks


# ── the screen ───────────────────────────────────────────────────────────
def frame_h(p):
    return p["design_w"] * 5 / 4


def to_design(p, cx, cy):
    x0, y0, w = p["crop"]
    s = p["design_w"] / w
    return (cx - x0) * s, (cy - y0) * s


def screen(p):
    """A 45-degree square lattice in log-polar space, z = C + exp(u + iv).
    C sits off the frame on the line through the face at `pole_angle`, at the
    distance that makes the pitch `pitch_face` at the face and `pitch_far` at
    the bottom-right corner."""
    W, H = p["design_w"], frame_h(p)
    fx, fy = to_design(p, *p["face"])
    ratio = p["pitch_far"] / p["pitch_face"]
    th = math.radians(p["pole_angle"])
    d = np.array([math.cos(th), math.sin(th)])
    lo, hi = 1.0, 1e5
    for _ in range(80):
        D = (lo + hi) / 2
        c = np.array([fx, fy]) + D * d
        if np.hypot(W - c[0], H - c[1]) / D > ratio:
            lo = D
        else:
            hi = D
    cx, cy = fx + D * d[0], fy + D * d[1]
    h = p["pitch_face"] / D      # lattice step in log-polar units
    u0 = math.log(D)
    v0 = math.atan2(fy - cy, fx - cx)
    xs = np.linspace(0, W, 64)
    ys = np.linspace(0, H, 80)
    gx, gy = np.meshgrid(xs, ys)
    r = np.hypot(gx - cx, gy - cy)
    t = np.arctan2(gy - cy, gx - cx)
    umin, umax = np.log(r.min()) - 3 * h, np.log(r.max()) + 3 * h
    vmin, vmax = t.min() - 3 * h, t.max() + 3 * h
    k = h / math.sqrt(2)
    a_lo, a_hi = math.floor((umin - u0) / k), math.ceil((umax - u0) / k)
    b_lo, b_hi = math.floor((vmin - v0) / k), math.ceil((vmax - v0) / k)
    A, B = np.mgrid[a_lo:a_hi + 1, b_lo:b_hi + 1]
    keep = ((A + B) & 1) == 0
    A, B = A[keep], B[keep]
    rr = np.exp(u0 + k * A)
    v = v0 + k * B
    X = cx + rr * np.cos(v)
    Y = cy + rr * np.sin(v)
    pitch = h * rr
    m = (X > -pitch) & (X < W + pitch) & (Y > -pitch) & (Y < H + pitch)
    meta = dict(cx=cx, cy=cy, k=k, u0=u0, v0=v0, A=A[m], B=B[m])
    return X[m], Y[m], pitch[m], meta


# ── sampling ─────────────────────────────────────────────────────────────
MASKS = ("shirt", "skin", "hair", "far", "rim", "sun")


def sample(p, lab, alpha, origin, masks, X, Y, pitch):
    """Prefilter the target at each dot's own pitch (a gaussian pyramid, read
    between levels) and read the colour, the coverage and every mask there."""
    x0, y0, w = p["crop"]
    s = p["design_w"] / w
    lin = np.clip(lab2lin(lab), 0, None)
    pre = np.concatenate([lin * alpha[..., None], alpha[..., None]] + [masks[n][..., None] for n in MASKS], -1)
    sig_design = p["prefilter"] * pitch
    levels = np.geomspace(max(sig_design.min(), 0.5), sig_design.max() + 1e-3, 6)
    cx = X / s + x0 - origin[0]
    cy = Y / s + y0 - origin[1]
    samples = []
    for lv in levels:
        sg = lv / s
        st = [ndi.map_coordinates(ndi.gaussian_filter(pre[..., c], sg), [cy, cx], order=1, mode="nearest")
              for c in range(pre.shape[-1])]
        samples.append(np.stack(st, -1))
    samples = np.stack(samples, 0)
    li = np.interp(np.log(sig_design), np.log(levels), np.arange(len(levels)))
    lo = np.floor(li).astype(int).clip(0, len(levels) - 1)
    hi = (lo + 1).clip(0, len(levels) - 1)
    f = (li - lo)[:, None]
    idx = np.arange(len(X))
    v = samples[lo, idx] * (1 - f) + samples[hi, idx] * f
    a = np.clip(v[:, 3], 0, 1)
    colour = v[:, :3] / np.maximum(a, 1e-4)[:, None]
    mk = {n: np.clip(v[:, 4 + i], 0, 1) for i, n in enumerate(MASKS)}
    # the distance inside the matte is read at the dot's centre, unblurred
    mk["inside"] = ndi.map_coordinates(masks["inside"], [cy, cx], order=1, mode="nearest")
    return colour, a, mk


def weights(p, X, Y, a):
    """(silhouette x vignette, the vignette alone). The vignette is the head
    ellipse's dissolve, the dissolve off the bottom and right, and the thin
    feather on all four sides."""
    x0, y0, w = p["crop"]
    s = p["design_w"] / w
    W, H = p["design_w"], frame_h(p)
    cx, cy, rx, ry, r0, r1 = p["head"]
    sx = X / s + x0
    sy = Y / s + y0
    r = np.hypot((sx - cx) / rx, (sy - cy) / ry)
    fade = 1 - smoothstep(r0, r1, r)
    dr, db = p["dissolve"]
    fade = fade * smoothstep(0, 1, (W - X) / dr) ** 1.2 * smoothstep(0, 1, (H - Y) / db) ** 1.2
    fe = p["edge_feather"]
    for dist in (X, W - X, Y, H - Y):
        fade = fade * smoothstep(0, fe, dist)
    edge = smoothstep(0.12, 0.95, a)
    return edge * fade, fade


# ── separation ───────────────────────────────────────────────────────────
_TAB = None


def coverage_to_d(c, dmax):
    """Diameter (pitches) covering fraction c of a square lattice, overlap included."""
    global _TAB
    if _TAB is None:
        g = (np.arange(200) + 0.5) / 200
        Xg, Yg = np.meshgrid(g, g)
        d = np.minimum.reduce([np.hypot(Xg - i, Yg - j) for i in (0, 1) for j in (0, 1)])
        ds = np.linspace(0, 1.6, 321)
        _TAB = (ds, np.array([(d <= r / 2).mean() for r in ds]))
    ds, cov = _TAB
    m = ds <= dmax
    return np.interp(c, cov[m], ds[m])


def lattice_blur(meta, v, wt, sigma):
    """A weighted gaussian blur of one value per dot, over the lattice: the
    neighbours are the dots next to it on the screen, whatever the local
    pitch. `sigma` is in lattice steps (a pitch is sqrt(2) of them). Dots with
    no weight near them read whatever weight is nearest, so it also carries a
    region's value a little way past its edge."""
    A, B = meta["A"], meta["B"]
    a, b = A - A.min(), B - B.min()
    num = np.zeros((a.max() + 1, b.max() + 1))
    den = np.zeros_like(num)
    num[a, b] = v * wt
    den[a, b] = wt
    num = ndi.gaussian_filter(num, sigma)
    den = ndi.gaussian_filter(den, sigma)
    return num[a, b] / np.maximum(den[a, b], 1e-9)


def grade(p, look, colour_lin, mk, meta):
    """Each ground's own grade of the target: the plate's curve, amber skin,
    hair and the two edges of the head; the shirt squeezed on both. Returns
    the target in gamma-encoded sRGB and its L*."""
    lab = lin2lab(np.clip(colour_lin, 0, None))
    L = lab[:, 0]
    ab = lab[:, 1:].copy()
    if "curve" in look:
        kx, ky = np.array(look["curve"], float).T
        L = PchipInterpolator(kx, ky)(np.clip(L, 0, 100))
    if "chroma" in look:
        ab *= look["chroma"]
    if "skin" in look:
        C_s, h_l, h_s = look["skin"]
        set_chroma(ab, mk["skin"], C_s * smoothstep(6, 42, L) * (1 - 0.35 * smoothstep(78, 94, L)),
                   h_s + (h_l - h_s) * smoothstep(22, 58, L))
    if "rim_cap" in look:
        # The sun side's edge, on the plate. The photograph's backlit rim is
        # the lightest skin on him, and on a dark ground lightest means the
        # biggest, palest dots: along the profile, the jaw and the chin they
        # printed as a near-white outline, where paper prints the same band as
        # small vermilion dots that sink into the page. So the band is capped
        # at the lit skin a few dots in (read over the lattice), and keeps its
        # sunset chroma: a warm rim, not a pale one.
        width, sig, margin = look["rim_cap"]
        ins = mk["inside"]
        band = mk["sun"] * (1 - smoothstep(width * 0.6, width, ins))
        near = lattice_blur(meta, L, mk["skin"] * smoothstep(width, width * 1.5, ins) + 1e-9, sig)
        L = L * (1 - band) + np.minimum(L, near + margin) * band
    # the shirt: one hue family, an eighth of its contrast
    to, contrast, keep = look["shirt"]
    sh = mk["shirt"]
    ref = np.average(L, weights=sh + 1e-9)
    L = L * (1 - sh) + (to + contrast * (L - ref)) * sh
    set_chroma(ab, sh, np.minimum(np.hypot(ab[:, 0], ab[:, 1]) * keep, p["shirt_cmax"]), p["shirt_hue"])
    if "hair_floor" in look:
        # The hair's floor, L* = max(L*, a + b L*), keeps it off the plate.
        # On the plate it is applied to the hair's local mean and the detail
        # goes back on top, so the sheen and the strands still move the dot
        # size: floored dot by dot, the hair was one flat dim mass.
        fa, fs = look["hair_floor"]
        hz = mk["hair"]
        if "hair_detail" in look:
            # The gain only inside the hair: where the mask is partial the
            # "detail" is the step to the skin or the ear beside it, and
            # amplified it printed as a pale rim round both. The sheen stops
            # at `cap`, the far side of a hair highlight, never skin. Nor at
            # the silhouette: the light on the crown amplified there traced
            # the head's edge again. The shadows ease onto `lo`: the plate
            # cannot print darker than itself, and a target below about L* 8
            # solves to an ink darker than the ground, which drops the dot and
            # leaves a hole.
            gain, sig, cap, lo = look["hair_detail"]
            base = lattice_blur(meta, L, hz + 1e-9, sig)
            g = 1 + (gain - 1) * smoothstep(0.7, 1.0, hz) * smoothstep(8, 32, mk["inside"])
            Lh = np.maximum(base, fa + fs * base) + g * (L - base)
            Lh = lo + 2.0 * np.logaddexp(0, (Lh - lo) / 2.0)
            Lh = np.minimum(Lh, np.maximum(L, cap))
        else:
            Lh = np.maximum(L, fa + fs * L)
        L = L * (1 - hz) + Lh * hz
    if "far_fade" in look:
        # The far side of the head, on the plate: dark hair against a dark
        # ground. A soft lift a few dots deep, in the hair's own warm brown
        # (the chroma below), so its tone carries the silhouette -- never a
        # one-dot amber outline, which is the look of a badly masked cut-out.
        Lf, wf = look["far_fade"]
        ins = mk["inside"]
        ff = mk["far"] * mk["hair"] * (1 - smoothstep(0, wf, ins)) * (ins > 0)
        L = L * (1 - ff) + np.maximum(L, Lf) * ff
    if "hair" in look:
        # warmer as it lightens: a big near-neutral dot is grey hair
        Ch, hh = look["hair"][:2]
        if len(look["hair"]) > 2:
            Ch = Ch + (look["hair"][2] - Ch) * smoothstep(16, 40, L)
        set_chroma(ab, mk["hair"] * (1 - mk["rim"]), Ch, hh)
    lab = np.concatenate([L[:, None], ab], 1)
    return to_srgb(np.clip(lab2lin(lab), 0, 1)), L


def coverage(look, dark, T, Ip):
    """The coverage that makes ink of luma Ip over the ground average to T's
    luma, in the space a canvas blends in."""
    G = np.array(look["ground"], float) / 255
    Tp, Gp = T @ LUMA, G @ LUMA
    if dark:
        c = (Tp - Gp) / np.maximum(Ip - Gp, 1e-4)
    else:
        c = (Gp - Tp) / np.maximum(Gp - Ip, 1e-4)
    return np.clip(c, 0, look["cmax"])


def solve_ink(look, dark, T, Lt):
    """The ink each dot wants before quantising: its lightness from the
    target's, its colour so that ink over ground averages to the target."""
    G = np.array(look["ground"], float) / 255
    a_, b_, lo, hi = look["ink"]
    Li = np.clip(a_ * Lt + b_, lo, hi)
    Li = np.maximum(Li, Lt) if dark else np.minimum(Li, Lt)
    c = coverage(look, dark, T, to_srgb(Y_of_L(Li)))
    I = (T - (1 - c)[:, None] * G) / np.maximum(c, 0.02)[:, None]
    if "natural" in look:
        lab = lin2lab(to_linear(T))
        nat = to_srgb(np.clip(lab2lin(np.concatenate([Li[:, None], lab[:, 1:]], 1)), 0, 1))
        wn = 1 - smoothstep(*look["natural"], c)
        I = I * (1 - wn[:, None]) + nat * wn[:, None]
    I = gamut(I)
    if "ink_cap" in look:
        # Where the coverage is clipped at cmax, the solve asks the ink to make
        # up the rest and it runs to white: the teeth printed near-white discs
        # at the largest size, fused into one blob, brighter than the page's
        # own type. No ink on the plate is lighter than --bone; a highlight
        # prints a little darker than the photograph instead, in the target's
        # own hue -- past white the solve has no hue left, and a capped white
        # is a cold grey.
        cap = look["ink_cap"]
        lab = lin2lab(to_linear(I))
        over = lab[:, 0] > cap
        own = lin2lab(to_linear(T))
        own[:, 0] = cap
        I = np.where(over[:, None], gamut(to_srgb(np.clip(lab2lin(own), 0, 1))), I)
    return I


def gamut(I):
    """Pull toward the ink's own grey until every channel fits."""
    g = (I @ LUMA)[:, None]
    ch = I - g
    lo_ = np.where(ch < 0, (0 - g) / np.minimum(ch, -1e-6), np.inf).min(1)
    hi_ = np.where(ch > 0, (1 - g) / np.maximum(ch, 1e-6), np.inf).min(1)
    t = np.clip(np.minimum(np.minimum(lo_, hi_), 1.0), 0, 1)
    return np.clip(g + ch * t[:, None], 0, 1)


def palette(ink, live, n, seed=7):
    """k-means in Lab over the inks of the dots that print, nearest ink each."""
    lab = lin2lab(to_linear(ink[live]))
    cent, idx = kmeans2(lab, n, iter=40, minit="++", rng=np.random.default_rng(seed))
    rgb = np.round(to_srgb(np.clip(lab2lin(cent), 0, 1)) * 255) / 255
    out = np.zeros_like(ink)
    out[live] = rgb[idx]
    return out


def lowdisc(A, B):
    """A threshold in [0, 1) per lattice cell from a rank-1 lattice on the
    plastic number: evenly spread, never a visible grid."""
    return np.mod(0.5 + A * 0.7548776662466927 + B * 0.5698402909980532, 1.0)


def separate(p, b, look, dark):
    T, Lt = grade(p, look, b["colour"], b["masks"], b["meta"])
    ink = solve_ink(look, dark, T, Lt)
    live = b["w"] * coverage(look, dark, T, ink @ LUMA) > 0.006
    ink = palette(ink, live, p["palette"])
    # solve the coverage again against the ink each dot actually got
    Ip = ink @ LUMA
    c = coverage(look, dark, T, Ip)
    if dark and "floor" in look:
        c = np.maximum(c, look["floor"] * smoothstep(0.0, 0.3, b["w"]))
    if "shirt_fade" in look:
        c = c * (1 - look["shirt_fade"] * b["masks"]["shirt"])
    cov = c * b["w"]
    # thin in the dissolve: fewer cells as well as smaller ones
    t0, t1, gma = p["thin"]
    q = smoothstep(t0, t1, b["fade"])
    keep = lowdisc(b["meta"]["A"], b["meta"]["B"]) < q
    cov = np.where(keep, np.minimum(c * b["edge"], cov / np.maximum(q, 1e-3) ** gma), 0)
    d = coverage_to_d(cov, p["dmax"])
    d[cov < 0.006] = 0
    # no dot may print on the wrong side of the ground: on the plate a dot
    # darker than it is a hole, on paper one lighter than it is nothing
    Gp = np.array(look["ground"], float) @ LUMA / 255
    d[(Ip < Gp + 0.035) if dark else (Ip > Gp - 0.035)] = 0
    return dict(ink=ink, d=d, ground=look["ground"])


# ── the rasteriser: what the canvas does ─────────────────────────────────
def draw_order(ink, dark):
    """Inks from the least to the most contrast with the ground, ties by
    colour: exactly the order hero-dots.tsx sorts them in."""
    col = np.round(ink * 255).astype(np.int64)
    key = col[:, 0] << 16 | col[:, 1] << 8 | col[:, 2]
    lum = 0.2126 * col[:, 0] + 0.7152 * col[:, 1] + 0.0722 * col[:, 2]
    return np.lexsort((key, lum if dark else -lum))


def render(X, Y, R, ink, width_css, dpr, ground, dark, ss=4, design_w=620.0):
    """Filled discs, supersampled then box-filtered in sRGB, which is how a
    2D canvas antialiases."""
    k = width_css / design_w * dpr * ss
    Wp, Hp = round(width_css * dpr) * ss, round(width_css * 5 / 4 * dpr) * ss
    canvas = np.empty((Hp, Wp, 3), np.uint8)
    canvas[:] = ground
    col = np.uint8(np.round(ink * 255))
    for n in draw_order(ink, dark):
        r = R[n] * k
        if r <= 0:
            continue
        cx, cy = X[n] * k, Y[n] * k
        xa, xb = max(0, int(cx - r - 1)), min(Wp, int(cx + r + 2))
        ya, yb = max(0, int(cy - r - 1)), min(Hp, int(cy + r + 2))
        if xa >= xb or ya >= yb:
            continue
        xs = np.arange(xa, xb) + 0.5 - cx
        ys = np.arange(ya, yb) + 0.5 - cy
        m = (xs[None, :] ** 2 + ys[:, None] ** 2) <= r * r
        canvas[ya:yb, xa:xb][m] = col[n]
    c = canvas.reshape(Hp // ss, ss, Wp // ss, ss, 3).astype(np.float32).mean((1, 3))
    return Image.fromarray(np.uint8(np.round(c)), "RGB")


# ── pipeline ─────────────────────────────────────────────────────────────
def band_params(p, phone):
    q = dict(p)
    if phone:
        ph = p["phone"]
        q["pitch_face"] = p["pitch_face"] * ph["coarse"]
        q["pitch_far"] = p["pitch_far"] * ph["coarse"]
        for key in ("rim", "rim_band", "band_amt"):
            q[key] = ph[key]
    return q


def build(p, phone=False):
    q = band_params(p, phone)
    lab, alpha, origin, masks = target(q)
    X, Y, pitch, meta = screen(q)
    colour, a, mk = sample(q, lab, alpha, origin, masks, X, Y, pitch)
    w, fade = weights(q, X, Y, a)
    return dict(X=X, Y=Y, colour=colour, w=w, fade=fade, edge=smoothstep(0.12, 0.95, a),
                masks=mk, meta=meta, q=q)


def encode(b, lk, union):
    """The grid: offset rows of the lattice. Row j is B = b0 + j; in it,
    column i is A = a0 + 2i + (j & 1). Both grounds share one span."""
    meta = b["meta"]
    A, B = meta["A"], meta["B"]
    code = np.clip(np.round(lk["d"] / b["q"]["dmax"] * 255).astype(int), 0, 255)
    b0 = int(B[union].min())
    par = (B - b0) & 1
    a0 = int((A - par)[union].min())
    j = B - b0
    i = (A - a0 - par) // 2
    rows = int(j[union].max()) + 1
    cols = int(i[union].max()) + 1
    grid = np.zeros((rows * 2, cols, 3), np.uint8)
    ok = (code > 0) & (i >= 0) & (i < cols) & (j >= 0) & (j < rows)
    ink = np.uint8(np.round(lk["ink"] * 255))
    grid[j[ok], i[ok]] = ink[ok]
    grid[rows + j[ok], i[ok]] = code[ok][:, None]
    consts = dict(cols=cols, rows=rows, designW=b["q"]["design_w"], dmax=b["q"]["dmax"],
                  cx=round(meta["cx"], 6), cy=round(meta["cy"], 6), k=round(meta["k"], 10),
                  u0=round(meta["u0"], 10), v0=round(meta["v0"], 10), a0=a0, b0=b0)
    return Image.fromarray(grid, "RGB"), consts


def decode(grid, c):
    """What hero-dots.tsx does: positions and radii from the grid alone."""
    g = np.asarray(grid)
    rows = g.shape[0] // 2
    assert g.shape[1] == c["cols"] and rows == c["rows"], "grid and lattice disagree"
    ink, code = g[:rows], g[rows:, :, 0].astype(float)
    j, i = np.nonzero(code)
    A = c["a0"] + 2 * i + (j & 1)
    B = c["b0"] + j
    r = np.exp(c["u0"] + c["k"] * A)
    v = c["v0"] + c["k"] * B
    X = c["cx"] + r * np.cos(v)
    Y = c["cy"] + r * np.sin(v)
    R = code[j, i] / 255 * c["dmax"] * (c["k"] * math.sqrt(2) * r) / 2
    return X, Y, R, ink[j, i] / 255


def write_lattice(lattice):
    lines = [
        "/**",
        " * GENERATED by scripts/bake-hero.py in the same run as the grids in",
        " * public/portrait/. Do not edit it: change the bake and run it again.",
        " *",
        " * The screen is a 45-degree square lattice in log-polar space. Pixel (i, j)",
        " * of a grid is the lattice point A = a0 + 2i + (j & 1), B = b0 + j, at",
        " *   r = exp(u0 + k A),  th = v0 + k B,  (x, y) = (cx, cy) + r (cos th, sin th)",
        " * in design px (designW wide, 4:5), where the pitch is k * sqrt(2) * r.",
        " * `cols` and `rows` are the grid's own size, so a grid that does not belong",
        " * to these numbers is refused rather than drawn wrong.",
        " */",
        "export type Lattice = {",
    ]
    keys = ("cols", "rows", "designW", "dmax", "cx", "cy", "k", "u0", "v0", "a0", "b0")
    lines += [f"  {key}: number;" for key in keys] + ["};", ""]
    def num(v):
        v = float(v) + 0.0          # no -0.0
        return str(int(v)) if v == int(v) else repr(v)

    for name, c in lattice.items():
        lines.append(f"export const {name}: Lattice = {{")
        lines += [f"  {key}: {num(c[key])}," for key in keys]
        lines += ["};", ""]
    with open(LATTICE_TS, "w", newline="\n") as fh:
        fh.write("\n".join(lines))


def face_count(p, b, d):
    x0, y0, w = p["crop"]
    s = p["design_w"] / w
    sx, sy = b["X"] / s + x0, b["Y"] / s + y0
    inside = (((sx - 800) / 300) ** 2 + ((sy - 660) / 270) ** 2) <= 1
    return int(((d > 0) & inside).sum())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="also write full-size renders to judge into this directory")
    ap.add_argument("--set", action="append", default=[], help="key=json, to try a parameter")
    ap.add_argument("--dry", action="store_true", help="write nothing into the repo (needs --preview)")
    args = ap.parse_args()
    p = dict(P)
    for kv in args.set:
        key, v = kv.split("=", 1)
        p[key] = json.loads(v)
    t0 = time.time()
    out = os.path.join(args.preview, "data") if args.dry else OUT
    os.makedirs(out, exist_ok=True)
    report, lattice, drawn = {}, {}, {}
    for band, phone in (("", False), ("-sm", True)):
        b = build(p, phone)
        looks = {"light": separate(p, b, p["paper"], False), "dark": separate(p, b, p["plate"], True)}
        union = (looks["light"]["d"] > 0) | (looks["dark"]["d"] > 0)
        for name, lk in looks.items():
            grid, consts = encode(b, lk, union)
            suffix = "" if name == "light" else "-dark"
            gp = os.path.join(out, f"hero-grid{band}{suffix}.webp")
            grid.save(gp, lossless=True, method=6, quality=100)
            back = Image.open(gp).convert("RGB")
            assert np.array_equal(np.asarray(back), np.asarray(grid)), "lossless round trip"
            X, Y, R, ink = decode(back, consts)
            # nothing may touch the box: the feather guarantees it, this proves it
            W, H = consts["designW"], consts["designW"] * 5 / 4
            assert (X - R).min() > 0 and (X + R).max() < W and (Y - R).min() > 0 and (Y + R).max() < H
            if name == "dark":
                # the plate's guards: no ink lighter than --bone, so nothing on
                # him outshines the page's type, and no dot past a pitch, so
                # the highlights stay dots rather than fusing into a blob
                inkL = lin2lab(to_linear(ink))[:, 0]
                assert inkL.max() <= 92.5, f"plate ink at L* {inkL.max():.1f} is lighter than --bone"
                dmax = np.asarray(back)[consts["rows"]:, :, 0].max() / 255 * consts["dmax"]
                assert dmax <= 0.99, f"a plate dot is {dmax:.2f} of a pitch across"
            inks = np.unique(np.round(ink * 255).astype(int), axis=0)
            report[f"hero-grid{band}{suffix}.webp"] = dict(
                bytes=os.path.getsize(gp), size=list(grid.size), dots=int(len(X)), inks=int(len(inks)))
            lattice["SM" if phone else "DESK"] = consts
            drawn[(band, name)] = (X, Y, R, ink, lk["ground"], name == "dark")
        if not phone:
            report["face_dots"] = face_count(p, b, looks["light"]["d"])
    if not args.dry:
        write_lattice(lattice)
    # the stills, from the encoded grids, as the canvas draws them
    for (band, name), (X, Y, R, ink, G, dark) in drawn.items():
        im = render(X, Y, R, ink, 620 if band == "" else 350, 2, G, dark, ss=p["ss"])
        stem = os.path.join(out, f"hero-dots{band}{'' if name == 'light' else '-dark'}@2x")
        im.save(stem + ".webp", quality=62, method=6)
        im.save(stem + ".avif", quality=48, speed=2)
        report[os.path.basename(stem)] = [os.path.getsize(stem + ".webp"), os.path.getsize(stem + ".avif")]
    if args.preview:
        pv = args.preview
        os.makedirs(pv, exist_ok=True)
        for name in ("light", "dark"):
            X, Y, R, ink, G, dk = drawn[("", name)]
            render(X, Y, R, ink, 620, 2, G, dk).save(os.path.join(pv, f"{name}-2x.png"))
            render(X, Y, R, ink, 588, 1, G, dk).save(os.path.join(pv, f"{name}-1x-588.png"))
            Xs, Ys, Rs, inks, Gs, dks = drawn[("-sm", name)]
            render(Xs, Ys, Rs, inks, 358, 3, Gs, dks).save(os.path.join(pv, f"phone-{name}-3x.png"))
            x0, y0, w = p["crop"]
            s = p["design_w"] / w * 2
            box = [round((500 - x0) * s), round((385 - y0) * s), round((1150 - x0) * s), round((945 - y0) * s)]
            fc = Image.open(os.path.join(pv, f"{name}-2x.png")).crop(box)
            fc.resize((fc.size[0] * 2, fc.size[1] * 2), Image.NEAREST).save(os.path.join(pv, f"face-{name}-2x.png"))
    report["seconds"] = round(time.time() - t0, 1)
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
