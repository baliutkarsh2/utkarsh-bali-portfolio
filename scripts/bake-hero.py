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
finest where the expression is (nose 3.2, mouth 3.5, eye 3.8 design px) and
coarsens toward the hair and the ear (4.3 to 4.8), the neck (4.6) and the
shoulder (5.7, and 6.6 at the corner). A uniform screen fine enough for the
eye costs 14% more dots and reads flatter.

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
  · the teeth: ivory, near neutral, on a hand-traced outline. Taken as skin
    they had the skin's peach, and every dot on them printed in it: orange
    specks on the paper teeth, peach discs on the plate;
  · hair: one warm near-black family, hue 58, its sheen capped to a slightly
    lighter brown. Nothing on his head is blue or green, as a hard clamp;
  · the low sun: vermilion-gold on the profile and a thin band inside the
    matte edge, on the sun side only and never on the shirt;
  · the shirt: its own colours, the white, the navy stripe over the far
    shoulder, the heather blue and the green below it, on its own tone
    curve: the face's shadow-opening curve took the navy to a mid grey. Its
    chroma is kept at its own hue, lower in the whites so the white reads
    white, and the navy, with no chroma left in the photograph, is given
    back its hue. It was once squeezed to one pale grey so as never to
    compete with the face, and on the page he wore a blank white shirt.

THE INK. For every dot the ink's lightness comes from the target's; the
coverage is then solved so ink over the ground averages to the target's
luminance in the gamma-encoded space a canvas blends in, and the ink's colour
so the average hits the target's colour. The inks are clustered to a palette
(k-means in Lab, nearest ink), and the coverage is solved AGAIN against the ink
each dot actually got, so quantising costs a little hue, never tone.

THE PLATE (the dark ground) is not the paper inverted: there, light is what
advances, so everything the photograph lights prints as big pale dots. It has
its own curve and its own amber skin, a floor so no dot is ever darker than
the plate, and six guards against what that does to a portrait:

  · dark hair is printed by its light: on a dark ground it is mostly
    ground. The shadow prints only a small dark dot in every cell (coverage
    0.06, about a quarter of a pitch across), thickening toward the
    silhouette away from the sun (0.14, about 0.4 of a pitch), so the crown
    and the back of the head hold as a soft dark mass rather than a net of
    specks the plate swallows; the strands, the clumps and the sheen come up
    out of it as small-to-medium dots, sized by how much light they catch,
    and away from the sun only in clumps, never as lone specks (glitter).
    Every way of lifting the shadow off the plate as a whole printed a field
    of equal pale dots over the whole head: pale taupe blotches (grey hair),
    or one flat dim mass with a hard edge at the brow (a knit cap). No
    outline either: at the edge away from the sun the light fades in over the
    last dozen dots, so the sky caught in the last strands neither traces the
    head nor floats on the crown as stray patches, and the matte's own soft
    edge takes the thickened shadow down with it;
  · hair prints as hair: every dot in it, and the deep shade round the ear
    and under the head, takes an umber ink (L* 38 to 46, C* 18 to 26, hue
    62): darker than any skin, so a highlight in it is a bigger brown dot,
    never a paler one. A pale ink over the hair printed as grey hair, one in
    the skin's hue as ginger, and the exact solve left the ear's shade a ring
    of grey dots. It runs out to the silhouette, where the exact solve left
    a one-dot peach rim. And the hairline is where the skin starts: FACE's
    line runs under the real hairline above the brow, so on the plate a dot
    there that samples as light as skin is skin again, in the forehead's own
    ink, turning to the hair over a dot or two of mixed ink;
  · no glowing rim: the sun side's edge is capped at the lit skin six dots
    in, so the jaw and chin keep a warm rim rather than a near-white
    outline, and a highlight one or two dots wide on that side (brow to
    nose, lower lip to chin) falls to the skin around it, so it cannot
    print as a pale seam. No ink on that skin is paler than L* 86 or
    greyer than C* 21: it prints as lit skin, not as bone;
  · no fused highlights: coverage stops at 0.74 (a dot 0.97 of a pitch across)
    and no ink is lighter than --bone, so the teeth stay dots, not a white
    blob brighter than the page's type.

NO FRAME EDGE IS EVER VISIBLE. He is printed as a bust: the head, the neck,
the collar, both shoulders and the top of the chest in full, the chest
dissolving below. The shoulder dissolves off the bottom and right edges --
the photograph's own frame cuts it at x 1564, inside the box's right edge at
1579, so the right edge dissolves off that frame rather than the box
(asserted below) -- along a vignette rather than along the box: the corner
between them rounded off, the right side drawn in at the shoulder's height so
its line fades before the frame instead of meeting it in a corner, and the
whole edge wavering a little. The shirt's near edge, from the neckline down
the sleeve, dissolves the same way, narrow at the V and wider toward the
bottom, where it rounds into the bottom's dissolve, so it reads as a soft
sleeve running down from the V and not as a line cut by hand, and his arm
past it does not print at all: at the bottom of the frame it was a few stray
skin-coloured specks beside a grey shirt. A 26 px feather runs round all four
sides, so no dot ever touches the box (asserted below, on the decoded grids).
In the dissolve the dots thin as well as shrink, cells dropping out on a
low-discrepancy sequence, so the shoulder ends in sparse marks the way an
edition print does rather than in a fading grid.

DRAW ORDER is part of the picture: where two DMAX 1.5 discs overlap, the one
drawn last wins. The renderer draws inks from the least to the most contrast
with the ground (lightest first on paper, darkest first on the plate), and
`render()` here does the same.
"""
import argparse
import functools
import hashlib
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
# The cut-out the plate's brow zone was placed on: its size and the sha256 of
# its RGBA pixels. The zone and its threshold are read off this one photograph;
# on another crop or exposure they would quietly mislabel the forehead, so the
# bake refuses to run until they are placed again (see forehead).
BROW_SRC = ((1564, 2728), "94710abb86d261fa5bc762e47fd894df4beb436c223bc4453c48537636a743fd")
# The photograph's own frame: the cut-out's size in px. Its right edge cuts
# the far shoulder straight, so the right dissolve runs off it wherever the
# crop reaches past it (weights), and no dot may reach it (main).
FRAME = (1564, 2728)

# The collar line, cut-out px, top to bottom: the edge between his neck and his
# shirt, down to the neckline's V. The face and the shirt polygons both run
# along it, so they partition the figure there.
COLLAR = [(1085, 805), (1045, 905), (985, 1010), (915, 1090), (894, 1096)]
# The shirt's near edge, top to bottom: from the V down the near sleeve's
# silhouette, then between the shirt and his arm, which reaches forward out of
# the frame at the bottom left. Everything past it dissolves (see weights).
NEAR = [(894, 1092), (888, 1125), (884, 1160), (875, 1195), (866, 1225), (853, 1252), (843, 1288),
        (830, 1322), (850, 1400), (866, 1500), (880, 1900)]
# The face, the neck and the throat: the hairline, the sideburn, the jaw under
# the ear, then down the collar to the V and back round outside the
# silhouette. It stops at the V: below it everything is shirt, the sleeve and
# the arm included, so no dot at the shirt's edge is skin-coloured. Taken as
# skin, the sleeve printed a sunlit orange seam down the shirt's edge and the
# arm olive and brown specks beside it.
FACE = [(505, 440), (560, 425), (620, 412), (680, 398), (740, 384), (800, 374), (860, 390),
        (910, 418), (952, 448), (972, 505), (985, 580), (1002, 650), (1030, 720),
        (1070, 780)] + COLLAR + [(860, 1110), (420, 1110), (420, 450)]
# The whole ear: the helix, the concha and the tragus, and the skin in front
# of it down toward the jaw. Covering only the helix left the concha between
# this and the face, in the hair, and on the plate it printed in the hair's
# grey-taupe ink, a grey patch with a hard seam against the peach helix.
EAR = (1100, 560, 75, 120)
# The teeth, the band of them his smile shows, traced on the graded target
# (cut-out px): from the corner by his profile along under the upper lip, and
# back along the top of the lower one.
TEETH = [(591, 750), (600, 746), (620, 744), (640, 743), (660, 743), (680, 741), (690, 740),
         (698, 745), (692, 751), (680, 752), (671, 754), (663, 757), (655, 761), (647, 766),
         (638, 769), (627, 768), (617, 764), (608, 758), (598, 754)]
# And his front tooth, by the profile, which the low sun lights (L* 98 at
# hue 106 in the photograph, where his lit skin is hue 47 to 58): a lasso
# round it, taken where the photograph is that bright. The sun rule took it
# for the rim -- any bright pixel on the sun side is -- and capped it to the
# rim's vermilion, a patch of orange dots at the corner of his smile.
TOOTH_LASSO = [(598, 752), (622, 752), (626, 770), (622, 790), (598, 791), (596, 770)]
# The whole shirt, the far shoulder out past the photograph's own edge (x 1564)
# and the chest down past the crop: any of it left out prints as hair.
SHIRT = [(1135, 755), (1205, 712), (1450, 700), (1700, 700), (1700, 1900), (420, 1900),
         (420, 1110), (860, 1110)] + COLLAR[::-1]

P = dict(
    # crop in cut-out px: left, top, width (height = width * 5/4). At 1100
    # wide the V sat 157 design px off the frame's bottom and the dissolve
    # left him a face on a collar; 1170 prints the top of the chest. The left
    # edge keeps the face where it sat on the page, and the top keeps the hair
    crop=(409, 0, 1170),
    design_w=620.0,
    # the screen: pitch at the face centre and at the far (bottom-right) corner
    pitch_face=3.8,
    pitch_far=6.6,
    pole_angle=180.0,
    face=(760, 620),
    prefilter=0.40,        # gaussian sigma as a fraction of the local pitch
    dmax=1.5,              # largest diameter, in pitches
    # the dissolve off the right and the bottom edges (design px)
    dissolve=(90.0, 95.0),
    # the bottom-right corner's radius, in dissolve widths, and how far the
    # edge wavers (dissolve widths): at 0.25 it made a lump on the right edge
    # at the stripe's height, and on a phone a torn edge
    corner=2.2,
    waver=0.13,
    # and how far in (design px) the right edge's dissolve starts at the
    # shoulder's height, easing out to the frame between these heights, so
    # the shoulder's line fades before the frame instead of meeting it
    bow=(60.0, 404.27, 639.32),
    # the shirt's near edge (NEAR): its dissolve's width (design px) at the V
    # and at the frame's bottom; the heights below the V (cut-out px) it comes
    # in over, so the neckline itself stays whole; and how much of it lies
    # outside the edge along the sleeve (dissolve widths), gone between these
    # heights, above the arm
    near=((40.0, 90.0), (1095.0, 1200.0), (0.75, (1180.0, 1350.0))),
    edge_feather=26.0,
    # thinning in the dissolve: the keep-probability ramps from 0 to 1 over
    # this range of the vignette, and survivors take back this power of it
    thin=(0.03, 0.7, 0.25),
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
    # the near eye's white and catchlight: a highlight that is a feature
    catchlight=(754, 483, 30, 16),
    # (cx, cy, rx, ry, dL): soft dodges (+) and burns (-)
    burn=((735, 712, 22, 34, -8.0), (880, 810, 120, 90, 6.0), (748, 451, 72, 8, 11.0),
          (742, 506, 62, 10, 7.0), (640, 832, 36, 24, 8.0), (1115, 560, 50, 100, -5.0)),
    # (cx, cy, rx, ry, L*): soft floors, so a deep mark stays a graded one
    floors=((575, 535, 46, 46, 26.0), (590, 672, 28, 18, 22.0), (640, 832, 40, 26, 30.0)),
    # skin: C*, hue in the light, hue in the shade
    skin=(25.0, 57.0, 42.0),
    # the lips: (cx, cy, rx, ry, extra C*, hue)
    lips=(652, 770, 60, 26, 2.5, 40.0),
    # the teeth's ink: C* and hue (see TEETH), and their feather (cut-out px)
    teeth_ink=(6.0, 82.0, 1.5),
    # the front tooth: the photograph's L* over which the lasso takes it
    tooth_L=(62.0, 76.0),
    # the teeth's own inks (see palette)
    teeth_inks=6,
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
    rim_bottom=(1095, 1150),
    fringe_cap=30.0,
    # separation: ink lightness = clip(a * L_target + b, lo, hi)
    paper=dict(ground=(250, 248, 244), ink=(0.45, 11.0, 15.0, 54.0), cmax=0.94,
               # the teeth's ink no darker than this L*: their shading prints
               # as soft ivory dots, not as sparse dark specks (grubby teeth)
               teeth_L=74.0,
               # the shirt as the target has it, a little lighter in the dots
               shirt=dict(chroma=1.0, cmax=26.0), shirt_fade=0.1),
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
               # the forehead FACE's hairline leaves in the hair: the zone
               # (cut-out px, placed on BROW_SRC), the L* (as sampled) over
               # which a dot in it turns from hair to skin, read at this sigma
               # (lattice steps), and the wider L* ramp its masks move over
               brow=((740.0, 345.0, 165.0, 68.0), (36.0, 42.0), 1.0, (38.0, 46.0)),
               # and that forehead's ink: C* at most, hue at least
               brow_ink=(45.0, 48.0),
               # the hair printed by its light (see THE PLATE): the L* over
               # which it comes up from nothing to its sheen, the strands put
               # back over their local mean at this gain (the strands read at
               # the first sigma, the mean at the second, in lattice steps),
               # the power on the rise, the target L* at the sheen, and how
               # deep inside the matte (cut-out px) the light comes up away
               # from the sun, so the crown's edge is no outline and carries no
               # stray clumps of sheen
               hair_light=(11.0, 27.0, 5.5, (0.8, 2.5), 1.0, 23.0, (30.0, 100.0)),
               # away from the sun, a lit dot keeps its light only with lit
               # neighbours: read at this sigma (lattice steps), their share
               # of its own light over which it goes from none to all of it
               hair_clump=(1.0, 0.45, 0.6),
               # the coverage the shadowed hair keeps, so the head holds its
               # shape against the plate, and away from the sun the coverage
               # it thickens to toward the silhouette, full this far inside the
               # matte and gone this far (cut-out px)
               hair_cov=0.06,
               hair_edge=(0.14, (20.0, 220.0)),
               # the far side's deep shade takes the hair's ink below this
               # target L* (from and to)
               shade=(16.0, 24.0),
               # the target's warmth in the hair, C* in the shadow, hue, C* at
               # the sheen
               hair=(4.0, 62.0, 9.0),
               # the sun-side rim: its band (cut-out px, about six dots; the
               # lit skin is read from there to half as far again), the sigma
               # it is read at (lattice steps), and how far above that skin
               # it may print (L*)
               rim_cap=(48.0, 6.0, 2.0),
               # a thin highlight on the sun side's skin: how far round it
               # the skin is read (lattice steps), and how far above that it
               # may print (L*)
               ridge_cap=(3.0, 3.0),
               # the hair's own ink, an umber, from the shadow's specks to the
               # sheen: L* from and to, C* from and to, hue
               hair_ink=(38.0, 46.0, 18.0, 26.0, 62.0),
               # the sun side's skin: no ink paler than this L*, none greyer
               # than this C*
               face_ink=(85.5, 21.0),
               # the shirt on its own curve, from the target's L*: its whites
               # well under the lit skin, the navy a speck over the plate
               shirt=dict(curve=((0, 0), (30, 16), (40, 22), (52, 30), (67, 38), (85, 46),
                                 (92, 50), (100, 54)), chroma=1.0, cmax=15.0),
               shirt_fade=0.25),
    # the shirt's own tone, photograph L* to target L*: the navy stripe (L* 5)
    # to 30, the heather (35) to 52, the white in the sky's shade (50 to 70)
    # to 67 to 85. The navy at 20 was the heaviest thing in the frame, and in
    # the dissolve it broke up into lone black dots
    shirt_tone=((0, 26), (6, 30), (20, 40), (35, 52), (55, 72), (70, 85), (85, 92), (100, 96)),
    # its chroma: the gain, the cap in the stripes and the cap in the whites,
    # between these target L*. Uncapped, the sky's shade turned the white
    # shoulder light blue and the sun turned the front cream
    shirt_chroma=(1.4, 24.0, 4.0, (48.0, 70.0)),
    # the navy stripe: its hue, and the C* it takes below the first target L*,
    # none above the second
    shirt_navy=(268.0, 16.0, (34.0, 46.0)),
    # the shirt's inks, apart from the face's and the hair's (see palette)
    shirt_inks=40,
    # the extra power of the dissolve on the shirt's coverage (see separate)
    shirt_edge=1.0,
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
    assert src_print()[0] == FRAME, f"the cut-out is {src_print()[0]}, not the frame {FRAME}"
    box = (max(0, int(x0 - m)), max(0, int(y0 - m)), min(FRAME[0], int(x0 + w + m)), min(FRAME[1], int(y0 + h + m)))
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
    tc, th_, tf = p["teeth_ink"]
    t0, t1 = p["tooth_L"]
    front = poly_mask((H, W), box, TOOTH_LASSO, 0) * smoothstep(t0, t1, ndi.gaussian_filter(L0, 1.0))
    teeth = np.maximum(poly_mask((H, W), box, TEETH, tf), ndi.gaussian_filter(front, tf))
    shirt = np.clip(poly_mask((H, W), box, SHIRT, 6) * (1 - 0.9 * face), 0, 1)
    hairz = np.clip((1 - face) * (1 - shirt), 0, 1) * smoothstep(0.05, 0.5, a)
    # and the hair gives way faster across the ear's soft edge, so its ink
    # stops outside the ellipse rather than on it
    hairz *= 1 - ell(*EAR, 0.25)

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

    # the shirt on its own curve: the one above opens the face's shadows, and
    # on the shirt it took the navy stripe to a mid grey
    kx, ky = np.array(p["shirt_tone"], float).T
    Ls = PchipInterpolator(kx, ky)(np.clip(Ld, 0, 100))
    Lc = Lc * (1 - shirt) + Ls * shirt

    skin = ndi.gaussian_filter(face * smoothstep(8, 16, L0), 3) * (1 - shirt)

    # the low sun, on the sun side and below the crown only: the bright patch
    # of sky on top of his head is not rim light
    rl, rc, rh, rcap = p["rim"]
    sun = (1 - smoothstep(*p["rim_side"], X)) * smoothstep(*p["rim_top"], Y) * (1 - shirt)
    # and down to the neckline's V: below it the sun catches the shirt's edge
    # and his arm, and rim-lit they printed as an orange tail off the throat
    sun = sun * (1 - smoothstep(*p["rim_bottom"], Y))
    # (never the teeth: a sunlit tooth is a tooth, not rim)
    rim = smoothstep(rl - 6, rl + 6, ndi.gaussian_filter(L0, 1.5)) * a * sun * (1 - teeth)
    inside = ndi.distance_transform_edt(a > 0.5)
    band = (1 - smoothstep(4, p["rim_band"], inside)) * sun
    # the far side: hair against sky, and the sky between the strands takes the
    # hair's darkness, not the sky's
    far = smoothstep(*p["rim_side"], X) * (1 - shirt)
    shade = ndi.gaussian_filter((1 - smoothstep(4, 22, inside)) * far * (1 - skin), 2)
    Lc = Lc * (1 - shade) + np.minimum(Lc, p["fringe_cap"]) * shade
    rim_c = np.maximum(rim, p["band_amt"] * band * smoothstep(20, 40, ndi.gaussian_filter(L0, 2))) * (1 - teeth)
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
    # the shirt's colour, at its own gain and cap, less of it in the whites,
    # and the navy stripe given back its hue
    gs, cs, cw, (w0, w1) = p["shirt_chroma"]
    abs_ = ab * gs
    cg = np.hypot(abs_[..., 0], abs_[..., 1])
    abs_ *= np.minimum(1, (cs + (cw - cs) * smoothstep(w0, w1, Ls)) / np.maximum(cg, 1e-6))[..., None]
    nh, nc, (n0, n1) = p["shirt_navy"]
    set_chroma(abs_, 1 - smoothstep(n0, n1, Ls), nc, nh)
    ab *= p["chroma_gain"]
    cg = np.hypot(ab[..., 0], ab[..., 1])
    ab *= np.minimum(1, p["chroma_cap"] / np.maximum(cg, 1e-6))[..., None]
    C_s, h_l, h_s = p["skin"]
    Cs = C_s * smoothstep(15, 55, Lc) * (1 - 0.4 * smoothstep(82, 96, Lc))
    set_chroma(ab, skin, Cs, h_s + (h_l - h_s) * smoothstep(30, 70, Lc))
    lx, ly, lrx, lry, ldc, lh = p["lips"]
    lip = ell(lx, ly, lrx, lry, 0.5) * (1 - np.clip(tm * 3, 0, 1)) * skin * (1 - teeth)
    set_chroma(ab, lip, np.hypot(ab[..., 0], ab[..., 1]) + ldc, lh)
    # the teeth: ivory, not skin
    set_chroma(ab, teeth, tc, th_)
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
    ab = ab * (1 - shirt)[..., None] + abs_ * shirt[..., None]

    out = np.stack([np.clip(Lc, 0, 100), ab[..., 0], ab[..., 1]], -1)
    masks = dict(shirt=shirt, skin=skin * (1 - rim_c), hair=hz, far=far * (1 - 0.7 * skin), rim=rim_c,
                 sun=sun, teeth=teeth, inside=inside)
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
MASKS = ("shirt", "skin", "hair", "far", "rim", "sun", "teeth")


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


def across(line, x, y):
    """Each point's distance from a polyline that runs down the page: positive
    on its right, negative on its left."""
    P = np.asarray(line, float)
    d = np.full(np.shape(x), np.inf)
    left = np.zeros(np.shape(x), bool)
    for (ax, ay), (bx, by) in zip(P[:-1], P[1:]):
        ex, ey = bx - ax, by - ay
        t = np.clip(((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey), 0, 1)
        d = np.minimum(d, np.hypot(x - ax - t * ex, y - ay - t * ey))
        if ey:
            left ^= ((ay > y) != (by > y)) & (x < ax + (y - ay) * ex / ey)
    return np.where(left, -d, d)


def weights(p, X, Y, a):
    """(silhouette x vignette, the vignette alone). The vignette is the
    dissolve off the bottom and right, the one along the shirt's near edge,
    and the thin feather on all four sides."""
    x0, y0, w = p["crop"]
    s = p["design_w"] / w
    W, H = p["design_w"], frame_h(p)
    # the edge wavers a little, the same field on every edge that dissolves
    waver = p["waver"] * (np.sin(X / 37.0 + Y / 61.0 + 1.3) * 0.5 + np.sin(Y / 23.0 - X / 71.0 + 0.4) * 0.3
                          + np.sin((X + Y) / 13.0 + 2.1) * 0.2)
    # the right and bottom edges, in dissolve widths from each, with the
    # corner between them rounded off, so the shoulder ends in an irregular
    # vignette rather than along the box
    dr, db = p["dissolve"]
    rc = p["corner"]
    bow, y1, y2 = p["bow"]
    # the right edge is the box's, or the photograph's own frame where the
    # crop runs past it: the shoulder is gone before its straight cut
    Wr = min(W, (FRAME[0] - x0) * s)
    u, v = (Wr - X - bow * (1 - smoothstep(y1, y2, Y))) / dr, (H - Y) / db
    cu, cv = np.maximum(rc - u, 0), np.maximum(rc - v, 0)
    t = np.where((cu > 0) & (cv > 0), rc - np.hypot(cu, cv), np.minimum(u, v))
    fade = smoothstep(0, 1, t + waver) ** 1.2
    # the shirt's near edge, in its own dissolve widths into the shirt, and
    # nothing past it: the arm does not print. Narrow at the V and wider
    # toward the frame's bottom, where it rounds into the bottom's dissolve.
    # Down the sleeve, where only sky lies past the edge, most of it lies
    # outside: the silhouette prints as shrinking dots and the full ones
    # follow the sleeve's slant down from the V. All inside, it pushed them in
    # under the V faster than the sleeve slants away, and back out below: a
    # bite out of the chest. By the arm it is all inside again
    (n0, n1), (g0, g1), (c0, (h0, h1)) = p["near"]
    sy = Y / s + y0
    dn = n0 + (n1 - n0) * smoothstep(g0, y0 + w * 5 / 4, sy)
    tn = across(NEAR, X / s + x0, sy) * s / dn + c0 * (1 - smoothstep(h0, h1, sy))
    fade = fade * (1 - smoothstep(g0, g1, sy) * (1 - smoothstep(0, 1, tn + waver) ** 1.2))
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


def solid_hair(mk):
    """Where a dot takes the hair's own ink on the plate: the hair out to the
    silhouette, short of its edge with the skin, and the far side's deep
    shade (see separate). Read as the hair's share of what is there, not as
    the mask itself: at the matte's edge the mask thins with the matte while
    nothing else is there, and taken short of it the last dot or two kept the
    exact solve's peach, a one-dot orange rim from the fringe to the crown."""
    hz = mk["hair"]
    share = hz / np.maximum(hz + mk["skin"] + mk["shirt"], 1e-3) * smoothstep(0.05, 0.3, hz)
    return smoothstep(0.3, 0.7, np.maximum(share, mk.get("shade", 0)))


def sun_skin(mk):
    """The sun side's skin, rim included, where a highlight has to stay skin:
    not the hair, and not the lips, the teeth or the eye's catchlight, which
    are highlights that ARE the feature."""
    face = np.clip(mk["skin"] + mk["rim"], 0, 1) * (1 - mk["hair"])
    return smoothstep(0.35, 0.65, mk["sun"] * face * (1 - mk["spare"]))


def grade(p, look, colour_lin, mk, meta):
    """Each ground's own grade of the target: the plate's curve, amber skin,
    hair and the two edges of the head; the shirt squeezed on both. Returns
    the target in gamma-encoded sRGB and its L*."""
    lab = lin2lab(np.clip(colour_lin, 0, None))
    L = lab[:, 0]
    ab = lab[:, 1:].copy()
    L0, ab0 = L.copy(), ab.copy()
    if "curve" in look:
        kx, ky = np.array(look["curve"], float).T
        L = PchipInterpolator(kx, ky)(np.clip(L, 0, 100))
    if "chroma" in look:
        ab *= look["chroma"]
    if "skin" in look:
        C_s, h_l, h_s = look["skin"]
        set_chroma(ab, mk["skin"], C_s * smoothstep(6, 42, L) * (1 - 0.35 * smoothstep(78, 94, L)),
                   h_s + (h_l - h_s) * smoothstep(22, 58, L))
    # the teeth stay ivory on both grounds: the plate's amber skin is not theirs
    set_chroma(ab, mk["teeth"], p["teeth_ink"][0], p["teeth_ink"][1])
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
    if "ridge_cap" in look:
        # A thin highlight on the sun side. The light that grazes the brow,
        # the bridge of the nose, the lower lip and the chin is a line one or
        # two dots wide, and on the plate a line of the biggest, palest dots
        # is a seam: from the brow onto the nose and from the lip down the
        # chin it read as scars across a grin that paper prints as a smile.
        # So a dot there may print only a little above the skin around it,
        # read over the lattice. A broad highlight (the cheek) IS the skin
        # around it and keeps its level; the lips, the teeth and the eye's
        # catchlight are left alone.
        sig, margin = look["ridge_cap"]
        face = np.clip(mk["skin"] + mk["rim"], 0, 1) * (1 - mk["hair"])
        near = lattice_blur(meta, L, face + 1e-9, sig)
        ss = sun_skin(mk)
        L = L * (1 - ss) + np.minimum(L, near + margin) * ss
    # the shirt in its own colours: the target's tone on the ground's own
    # shirt curve (not the ground's curve, which is the face's), its chroma
    # at its own hue up to a cap
    shl, sh = look["shirt"], mk["shirt"]
    Ls = PchipInterpolator(*np.array(shl["curve"], float).T)(np.clip(L0, 0, 100)) if "curve" in shl else L0
    L = L * (1 - sh) + Ls * sh
    C0 = np.maximum(np.hypot(ab0[:, 0], ab0[:, 1]), 1e-6)
    abs_ = ab0 * (np.minimum(C0 * shl["chroma"], shl["cmax"]) / C0)[:, None]
    ab = ab * (1 - sh)[:, None] + abs_ * sh[:, None]
    if "hair_light" in look:
        # THE HAIR ON THE PLATE, printed by its light. On a dark ground dark
        # hair is mostly ground: every way of lifting its shadows off the
        # plate printed a field of equal pale dots over the whole head, grey
        # taupe or a knit cap. So the shadow prints nothing here (the floor
        # in separate() keeps a speck in every cell, which holds the head's
        # shape) and only the light comes up: the strands over their local
        # mean at `gain`, then a rise from `lo` to `hi` onto the sheen's
        # target, `top`, a mid-sized umber dot (see solve_ink). Not at the
        # crown's edge on the far side of the light, though: the sky caught
        # in the last strands up there printed as a line of the biggest dots
        # tracing the head, an outline. The sun side keeps its lit fringe.
        lo, hi, gain, (fine, sig), gma, top, (e0, e1) = look["hair_light"]
        hz = mk["hair"]
        Lg = lin2lab(to_linear(np.array(look["ground"], float) / 255))[0]
        base = lattice_blur(meta, L, hz + 1e-9, sig)
        g = 1 + (gain - 1) * smoothstep(0.7, 1.0, hz)
        # the strands read a little soft, so the light gathers in clumps of
        # a few dots: read one dot at a time, the grain of the photograph
        # came up as lone specks over the shadow, glitter rather than hair
        Ls = lattice_blur(meta, L, hz + 1e-9, fine) if fine else L
        lit = smoothstep(lo, hi, base + g * (Ls - base)) ** gma
        away = 1 - mk["sun"]
        if "hair_clump" in look:
            # Away from the sun the light comes up only where its neighbours
            # catch some too. A lone lit dot over the shadow's specks is the
            # photograph's grain, and at 1x it glittered on the back of the
            # head like dandruff; a clump of two or three is a strand.
            csig, r0, r1 = look["hair_clump"]
            around = lattice_blur(meta, lit, hz + 1e-9, csig) / np.maximum(lit, 1e-3)
            lit *= 1 - away * (1 - smoothstep(r0, r1, around))
        lit *= 1 - (1 - smoothstep(e0, e1, mk["inside"])) * away
        L = L * (1 - hz) + (Lg + (top - Lg) * lit) * hz
    if "hair" in look:
        # warmer as it lightens: a big near-neutral dot is grey hair
        Ch, hh = look["hair"][:2]
        if len(look["hair"]) > 2:
            Ch = Ch + (look["hair"][2] - Ch) * smoothstep(8, 24, L)
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


def solve_ink(look, dark, T, Lt, mk=None):
    """The ink each dot wants before quantising: its lightness from the
    target's, its colour so that ink over ground averages to the target."""
    G = np.array(look["ground"], float) / 255
    a_, b_, lo, hi = look["ink"]
    Li = np.clip(a_ * Lt + b_, lo, hi)
    Li = np.maximum(Li, Lt) if dark else np.minimum(Li, Lt)
    if mk is not None and "teeth_L" in look:
        tw = mk["teeth"]
        Li = Li * (1 - tw) + np.minimum(np.maximum(Li, look["teeth_L"]), Lt - 1.0) * tw
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
    if "face_ink" in look:
        # The sun side's skin prints as lit skin at its lightest: no paler
        # than L* 86 and no greyer than C* 21, in the target's own hue.
        # Past that the solve ran a highlight to cream, rgb(255,225,208).
        cap, cmin = look["face_ink"]
        lab = lin2lab(to_linear(I))
        own = lin2lab(to_linear(T))
        C = np.hypot(lab[:, 1], lab[:, 2])
        Co = np.maximum(np.hypot(own[:, 1], own[:, 2]), 1e-6)
        ab = np.where((C < cmin)[:, None], own[:, 1:] * (np.maximum(Co, cmin) / Co)[:, None], lab[:, 1:])
        face = np.concatenate([np.minimum(lab[:, :1], cap), ab], 1)
        face = to_srgb(np.clip(lab2lin(face), 0, 1))
        w = sun_skin(mk)[:, None]
        I = I * (1 - w) + face * w
    if "brow_ink" in look and "brow" in mk:
        # The forehead given back to the skin (see forehead) keeps the
        # forehead's own ink. Its top rows are the darkest skin on it, in the
        # hair's shadow, and the exact solve took them redder and more
        # saturated than the rest (C* 50 at hue 44 against C* 45 at 49):
        # a thin orange line along the new hairline.
        cmax, hmin = look["brow_ink"]
        lab = lin2lab(to_linear(I))
        C = np.minimum(np.hypot(lab[:, 1], lab[:, 2]), cmax)
        h = np.radians(np.maximum(np.degrees(np.arctan2(lab[:, 2], lab[:, 1])), hmin))
        held = to_srgb(np.clip(lab2lin(np.stack([lab[:, 0], C * np.cos(h), C * np.sin(h)], 1)), 0, 1))
        w = mk["brow"][:, None]
        I = I * (1 - w) + held * w
    if "hair_ink" in look:
        # The hair's own ink: an umber, never the skin's peach and never a
        # grey. Its lightness follows the hair's light, from a deep brown for
        # the shadow's specks to a warm mid brown for the sheen, and stops
        # well short of the skin's (L* 70 and up), so the sheen prints as
        # bigger brown dots, never as paler ones: a pale ink over the hair
        # printed as grey hair, and one in the skin's hue as ginger. The
        # coverage is solved again against the ink (separate), so the tone
        # is the target's.
        l0, l1, c0, c1, hue = look["hair_ink"]
        Lg = lin2lab(to_linear(np.array(look["ground"], float) / 255))[0]
        t = smoothstep(Lg, look["hair_light"][5], Lt)
        C = c0 + (c1 - c0) * t
        h = np.radians(hue)
        hair = np.stack([l0 + (l1 - l0) * t, C * np.cos(h), C * np.sin(h)], 1)
        hair = to_srgb(np.clip(lab2lin(hair), 0, 1))
        w = solid_hair(mk)[:, None]
        I = I * (1 - w) + hair * w
    return I


def gamut(I):
    """Pull toward the ink's own grey until every channel fits."""
    g = (I @ LUMA)[:, None]
    ch = I - g
    lo_ = np.where(ch < 0, (0 - g) / np.minimum(ch, -1e-6), np.inf).min(1)
    hi_ = np.where(ch > 0, (1 - g) / np.maximum(ch, 1e-6), np.inf).min(1)
    t = np.clip(np.minimum(np.minimum(lo_, hi_), 1.0), 0, 1)
    return np.clip(g + ch * t[:, None], 0, 1)


def palette(ink, live, n, seed=7, groups=None):
    """k-means in Lab over the inks of the dots that print, nearest ink each.

    `groups` quantises regions apart: a list of (member mask, rule), each
    with its share of the n inks, the rest taking what is left; or (member
    mask, rule, k), with k inks of its own on top of the n. A shared
    palette snapped a hair dot to the nearest skin ink; apart, a region's
    inks are averages of its own, and `rule` (Lab centroids in, Lab out)
    holds them to the region's limits after rounding error."""
    if not groups:
        lab = lin2lab(to_linear(ink[live]))
        cent, idx = kmeans2(lab, n, iter=40, minit="++", rng=np.random.default_rng(seed))
        rgb = np.round(to_srgb(np.clip(lab2lin(cent), 0, 1)) * 255) / 255
        out = np.zeros_like(ink)
        out[live] = rgb[idx]
        return out
    out = np.zeros_like(ink)
    rest = live.copy()
    parts = []
    for member, rule, *own in groups:
        sel = live & member & rest
        rest &= ~sel
        parts.append((sel, rule, own[0] if own else None))
    total = live.sum()
    sizes = [own or max(8, int(round(n * sel.sum() / total))) for sel, _, own in parts]
    sizes.append(n - sum(k for k, (_, _, own) in zip(sizes, parts) if not own))
    parts.append((rest, None, None))
    for (sel, rule, _), k in zip(parts, sizes):
        if not sel.any():
            continue
        lab = lin2lab(to_linear(ink[sel]))
        cent, idx = kmeans2(lab, min(k, int(sel.sum())), iter=40, minit="++",
                            rng=np.random.default_rng(seed))
        if rule is not None:
            cent = rule(cent)
        rgb = np.round(to_srgb(np.clip(lab2lin(cent), 0, 1)) * 255) / 255
        out[sel] = rgb[idx]
    return out


def hold_hair(look):
    """The hair's inks after quantising: in its lightness and chroma range,
    with half a unit to spare for rounding."""
    lo_, hi_, cmin, cmax = look["hair_ink"][:4]
    cmin, cmax = cmin + 0.5, cmax - 0.5

    def rule(lab):
        lab = lab.copy()
        lab[:, 0] = np.clip(lab[:, 0], lo_, hi_)
        C = np.maximum(np.hypot(lab[:, 1], lab[:, 2]), 1e-6)
        lab[:, 1:] *= (np.clip(C, cmin, cmax) / C)[:, None]
        return lab
    return rule


def hold_face(look):
    """The sun side's skin inks after quantising: no paler than its cap, and
    half a unit clear of its chroma floor."""
    cap, cmin = look["face_ink"]

    def rule(lab):
        lab = lab.copy()
        lab[:, 0] = np.minimum(lab[:, 0], cap)
        C = np.maximum(np.hypot(lab[:, 1], lab[:, 2]), 1e-6)
        lab[:, 1:] *= np.maximum(1, (cmin + 0.5) / C)[:, None]
        return lab
    return rule


def lowdisc(A, B):
    """A threshold in [0, 1) per lattice cell from a rank-1 lattice on the
    plastic number: evenly spread, never a visible grid."""
    return np.mod(0.5 + A * 0.7548776662466927 + B * 0.5698402909980532, 1.0)


@functools.lru_cache(maxsize=None)
def src_print():
    """The cut-out's size and the sha256 of its RGBA pixels."""
    im = Image.open(SRC).convert("RGBA")
    return im.size, hashlib.sha256(np.asarray(im).tobytes()).hexdigest()


def cutout_xy(b):
    """Each dot's centre in cut-out px."""
    x0, y0, cw = b["q"]["crop"]
    s = cw / b["q"]["design_w"]
    return b["X"] * s + x0, b["Y"] * s + y0


def forehead(p, look, b):
    """The plate's own colour and masks where FACE's hairline runs low.

    Above the brow FACE's line runs under the real hairline, so a strip of
    forehead reads as hair, pressed under the hair's knee in target(). Paper
    prints it as the hair's lower edge and it passes; on the plate, where the
    hair prints by its light, the strip is the lightest "hair" on him: a
    brown headband, or, held down to the rest of the hair, the brim of a cap
    at the brow. So in a hand-placed zone over it, a dot that samples as
    light as skin is skin again: the knee undone (never past the forehead's
    own level just below) and the masks moved from the hair to the skin. The
    dark lock that crosses it, and the hair above it, stay hair."""
    colour, mk = b["colour"], dict(b["masks"])
    if "brow" not in look:
        return colour, mk
    assert src_print() == BROW_SRC, (
        f"the cut-out is {src_print()}, not the one the plate's brow zone was placed on: move "
        "plate.brow back onto the strip of forehead above FACE's hairline, check its L* ramps, "
        "then update BROW_SRC")
    (cx, cy, rx, ry), (l0, l1), sig, (m0, m1) = look["brow"]
    meta = b["meta"]
    sx, sy = cutout_xy(b)
    zone = 1 - smoothstep(0.75, 1.25, np.hypot((sx - cx) / rx, (sy - cy) / ry))
    lab = lin2lab(np.clip(colour, 0, None))
    L = lab[:, 0]
    Lb = lattice_blur(meta, L, np.ones_like(L), sig)
    s = zone * smoothstep(l0, l1, Lb)
    # The masks move over a wider ramp than the tone, so the new hairline
    # turns from the hair's umber to the skin over a dot or two of mixed ink,
    # as FACE's feathered line does along the rest of it, rather than
    # stepping from the one straight onto the other.
    w = mk["hair"] * zone * smoothstep(m0, m1, Lb)
    knee, kslope = p["hair"][3:5]
    near = lattice_blur(meta, L, mk["skin"] * (1 - mk["hair"]) + 1e-9, 3.0)
    Lu = np.maximum(L, np.minimum(np.where(L > knee, knee + (L - knee) / kslope, L), near))
    lab[:, 0] = L * (1 - s) + Lu * s
    mk["skin"] = np.clip(mk["skin"] + w, 0, 1)
    mk["brow"] = b["masks"]["hair"] * s
    mk["hair"] = mk["hair"] - w
    return lab2lin(lab), mk


def separate(p, b, look, dark):
    colour, mk = forehead(p, look, b)
    T, Lt = grade(p, look, colour, mk, b["meta"])
    if "shade" in look:
        # The far side's deep shade, round the ear and under the head: skin
        # too dark for the skin's chroma, which fades out toward black, so
        # the exact solve printed it as a ring of small grey dots round the
        # ear, grey hair beside the umber. It takes the hair's ink instead.
        s0, s1 = look["shade"]
        far = smoothstep(*p["rim_side"], cutout_xy(b)[0])
        mk["shade"] = far * (1 - smoothstep(s0, s1, Lt)) * np.clip(1 - mk["shirt"] - mk["rim"], 0, 1)
    ink = solve_ink(look, dark, T, Lt, mk)
    live = b["w"] * coverage(look, dark, T, ink @ LUMA) > 0.006
    if "hair_cov" in look:
        # The hair's own floor, a speck in every cell: the shape of the head.
        # Toward the silhouette away from the sun it thickens to a small dot,
        # as the light fades out there (grade), so the crown and the back of
        # the head read as a soft dark mass against the plate rather than a
        # net of specks that the plate swallowed. It thickens over several
        # dots and the matte's own soft edge takes the last one or two down,
        # so it draws no line round him.
        hc = look["hair_cov"]
        if "hair_edge" in look:
            ec, (r0, r1) = look["hair_edge"]
            hc = hc + (ec - hc) * (1 - smoothstep(r0, r1, mk["inside"])) * (1 - mk["sun"])
        # the shadow targets the plate itself and solves to no dot, but its
        # floor prints: it takes the hair's ink
        live |= (b["w"] * hc > 0.006) & (mk["hair"] > 0.7)
    groups = []
    if "hair_ink" in look:
        groups.append((solid_hair(mk) >= 0.5, hold_hair(look)))
    if "face_ink" in look:
        groups.append((sun_skin(mk) >= 0.5, hold_face(look)))
    # the shirt's colours are a family of their own: shared, they took inks
    # from the face
    groups.append((mk["shirt"] >= 0.5, None, p["shirt_inks"]))
    # and the teeth's: shared, a pale tooth dot snapped to the nearest skin ink
    groups.append((mk["teeth"] >= 0.5, None, p["teeth_inks"]))
    ink = palette(ink, live, p["palette"], groups=groups)
    # solve the coverage again against the ink each dot actually got
    Ip = ink @ LUMA
    c = coverage(look, dark, T, Ip)
    if dark and "floor" in look:
        fl = look["floor"]
        if "hair_cov" in look:
            fl = fl + (hc - fl) * mk["hair"]
        c = np.maximum(c, fl * smoothstep(0.0, 0.3, b["w"]))
    if "shirt_fade" in look:
        c = c * (1 - look["shirt_fade"] * mk["shirt"])
    cov = c * b["w"]
    # the shirt's dark stripes shrink faster into the dissolve: at the size
    # the thinning leaves the survivors, the navy ended in lone black dots
    cov = cov * b["fade"] ** (p["shirt_edge"] * mk["shirt"])
    # thin in the dissolve: fewer cells as well as smaller ones
    t0, t1, gma = p["thin"]
    q = smoothstep(t0, t1, b["fade"])
    keep = lowdisc(b["meta"]["A"], b["meta"]["B"]) < q
    cov = np.where(keep, np.minimum(c * b["edge"], cov / np.maximum(q, 1e-3) ** gma), 0)
    d = coverage_to_d(cov, p["dmax"])
    d[cov < 0.006] = 0
    # and a cell the solve left empty stays empty: in the dissolve the
    # survivors' boost could lift one over the threshold, in the palette's
    # filler for an empty cell, black -- a speck in the pale shirt
    d[~live & (b["fade"] < 1)] = 0
    # no dot may print on the wrong side of the ground: on the plate a dot
    # darker than it is a hole, on paper one lighter than it is nothing
    Gp = np.array(look["ground"], float) @ LUMA / 255
    d[(Ip < Gp + 0.035) if dark else (Ip > Gp - 0.035)] = 0
    return dict(ink=ink, d=d, ground=look["ground"], masks=mk)


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
    # the highlights that are features (the lips, the teeth, the catchlight),
    # read at the dot's centre
    x0, y0, cw = q["crop"]
    sx = X * cw / q["design_w"] + x0
    sy = Y * cw / q["design_w"] + y0
    spare = np.zeros_like(X)
    for (cx, cy, rx, ry) in (q["lips"][:4], q["teeth"][:4], q["catchlight"]):
        r = np.hypot((sx - cx) / rx, (sy - cy) / ry)
        spare = np.maximum(spare, 1 - smoothstep(0.75, 1.25, r))
    # and the teeth, all of them: the plate's caps on sunlit skin are not theirs
    mk["spare"] = np.maximum(spare, mk["teeth"])
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


def at_dots(b, grid, c):
    """For each dot `decode` returns, in its order, that dot's index in the
    build: the masks at the place the page draws it."""
    code = np.asarray(grid)[c["rows"]:, :, 0]
    j, i = np.nonzero(code)
    A = c["a0"] + 2 * i + (j & 1)
    B = c["b0"] + j
    MA, MB = b["meta"]["A"], b["meta"]["B"]
    look = {(int(x), int(y)): k for k, (x, y) in enumerate(zip(MA, MB))}
    return np.array([look[(int(x), int(y))] for x, y in zip(A, B)])


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
            # nor the photograph's own frame, where the far shoulder is cut
            x0, _, cw = p["crop"]
            assert ((X + R) * cw / W + x0).max() < FRAME[0], "a dot reaches the photograph's frame"
            if name == "dark":
                # the plate's guards: no ink lighter than --bone, so nothing on
                # him outshines the page's type, and no dot past a pitch, so
                # the highlights stay dots rather than fusing into a blob
                inkL = lin2lab(to_linear(ink))[:, 0]
                assert inkL.max() <= 92.5, f"plate ink at L* {inkL.max():.1f} is lighter than --bone"
                dmax = np.asarray(back)[consts["rows"]:, :, 0].max() / 255 * consts["dmax"]
                assert dmax <= 0.99, f"a plate dot is {dmax:.2f} of a pitch across"
                # the hair prints in its own umber, and the sun side's skin
                # as skin: read at each decoded dot's own place on the screen
                n = at_dots(b, back, consts)
                lab = lin2lab(to_linear(ink))
                C = np.hypot(lab[:, 1], lab[:, 2])
                mk = lk["masks"]
                hair = mk["hair"][n] > 0.9
                l0, l1, c0, c1, hue = p["plate"]["hair_ink"]
                hh = np.degrees(np.arctan2(lab[hair, 2], lab[hair, 1]))
                assert lab[hair, 0].max() <= l1 + 0.5, f"a plate hair ink is L* {lab[hair, 0].max():.1f}"
                assert C[hair].min() >= c0 - 0.5, f"a plate hair ink is C* {C[hair].min():.1f}, a grey"
                assert C[hair].max() <= c1 + 0.5, f"a plate hair ink is C* {C[hair].max():.1f}"
                assert np.abs(hh - hue).max() <= 4, f"a plate hair ink is at hue {hh.min():.0f}-{hh.max():.0f}"
                face = sun_skin(mk)[n] >= 1
                assert lab[face, 0].max() <= 86, f"a sun-side skin ink is L* {lab[face, 0].max():.1f}"
                assert C[face].min() >= 20, f"a sun-side skin ink is C* {C[face].min():.1f}"
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
