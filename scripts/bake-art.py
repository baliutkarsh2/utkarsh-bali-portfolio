"""
A general plate baker: any raster in, a BoardField module and a still out.

Run by hand; every output is committed. Vercel never runs this. Nothing here
needs a model download, a network, or a Turbopack loader.

    python scripts/bake-art.py --profile ui --box 30x64 --module plate-clinical \\
        --plate clinicalVoice:public/projects/clinical-1.png
    python scripts/bake-art.py --selftest        # all four profiles, on synthetic input

Or as a library, which is how scripts/bake-devices.py, scripts/bake-clinical.py
and scripts/bake-rule.py use it:

    from importlib import import_module
    art = import_module("bake-art")
    art.bake_module("plate-devices", [art.Plate("deviceRecurly", raster, ...)])

── Why profiles ───────────────────────────────────────────────────────────
scripts/bake-portrait.py is not a general engraver and must not be used as
one. Its pipeline is three corrections to ONE photograph -- a man backlit by a
sunset -- and every one of them is actively wrong on another subject:

  * a shadow-weighted local normalisation, which treats a white page as a
    shadow that needs opening up and turns a line drawing into grey mud;
  * a focal ellipse that dodges the middle and burns everything outside it,
    which puts a vignette on a screenshot;
  * an EDGE_FLOOR that forces the silhouette dark, which draws a black frame
    around any raster whose mask is its whole rectangle;
  * a TOE that lifts the floor off zero, which stops white being white.

So the pipeline is a `Profile` and the subject picks one.

── The one thing every profile shares ─────────────────────────────────────
The renderer applies `L^LIFT` to the stored byte before it inverts, and LIFT
is 0.55 in four places (scripts/screen.py holds the Python copy and can prove
the four agree). A profile that wants a different lift therefore CANNOT change
the transfer -- that would need a renderer change, and this ships with none.
It pre-compensates instead: it stores `L^(lift/LIFT)`, and the renderer's own
lift undoes the exponent exactly, so `lineart` at lift 1.0 gets the straight
inversion a drawing wants while the board, the GPU path, the still and the
share card all keep running one formula. Section 8.7 of the direction says the
rungs of the tier ladder must agree; this is how a new plate agrees with them
without touching any of them.

── The mask ───────────────────────────────────────────────────────────────
Byte 0 is "outside the mask, nothing drawn"; 1..12 is "inside but unlit",
which the transfer floors at DEEP_FLOOR and prints as the WIDEST dot it can
emit; 13..255 is luminance. A plate is baked so its mask is exactly its ink:
any cell the transfer would cull is stored as 0, and any cell it would draw is
clamped to at least 13. Two things fall out. `count` becomes the number of
dots actually drawn, so a caption cannot lie about it. And a stray 1..12 --
which is the deepest shadow in this encoding, not the lightest -- can never be
produced by accident from a near-white raster.
"""
from __future__ import annotations

import argparse
import base64
import math
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import screen  # noqa: E402  (same directory; this file is run, not imported as a package)

try:
    from scipy.ndimage import gaussian_filter
except ImportError as exc:  # pragma: no cover - a hand-run script, not a build step
    raise SystemExit(
        "scipy is required for the float Gaussian in blur(): pip install scipy."
    ) from exc

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content"
PUBLIC = ROOT / "public/portrait"

#: Device pixels per PAGE cell in a committed still. Held fixed rather than the
#: cell size, so a still keeps its pixel dimensions -- and so its size on the
#: page -- when a plate's density changes. bake-portrait.py's HERO_STILL_PX.
STILL_PX = 12


# ── Profiles ──────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Profile:
    """One subject's tone pipeline. Radii are in CELLS, so a profile means the
    same thing at any source resolution and any grid."""

    name: str
    #: The EFFECTIVE luminance lift this subject wants, before inversion.
    #: Pre-compensated into the stored byte; see the module docstring.
    lift: float
    broad: float = 0.0
    broad_radius_cells: float = 11.9
    fine: float = 0.0
    fine_radius_cells: float = 1.1
    #: Local (CLAHE-like) normalisation, weighted to the shadows.
    adapt: float = 0.0
    adapt_radius_cells: float = 15.4
    adapt_sd: float = 0.23
    adapt_floor: float = 0.045
    adapt_max: float = 3.4
    adapt_mid: float = 0.35
    adapt_upto: float = 0.45
    #: Percentile window, or None to take the raster's values as given.
    stretch: tuple[float, float] | None = None
    gamma: float = 1.0
    contrast: float = 1.0
    toe: float = 0.0
    #: Force the silhouette to at least this luminance, or None.
    edge_floor: float | None = None
    edge_band_cells: float = 4.5
    #: The focal ellipse: dodge the subject, burn everything else.
    focal: bool = False
    focal_rx: float = 0.72
    focal_ry: float = 0.60
    focal_hold: float = 0.42
    focal_gamma: float = 0.9
    dodge: float = 0.16
    burn: float = 0.48
    burn_knee: float = 0.68


PROFILES: dict[str, Profile] = {
    # The existing behaviour, for photographs of people. A port of
    # bake-portrait.py's sample(), with its three radii converted from
    # photograph pixels to cells at the hero grid (4.03 reference px per cell:
    # BROAD 48px -> 11.9c, ADAPT 62px -> 15.4c, EDGE_BAND 18px -> 4.5c), so the
    # profile means the same piece of a face at any grid.
    #
    # scripts/bake-portrait.py remains the canonical portrait bake -- it also
    # carries the crops, the datum, the rim and the likeness gate, which are
    # properties of that one photograph and not of a pipeline. This is here so
    # a SECOND photograph can be plated without editing that script.
    "portrait": Profile(
        name="portrait",
        lift=screen.LIFT,
        broad=1.2,
        fine=1.1,
        adapt=0.95,
        stretch=(2, 98),
        gamma=0.82,
        contrast=1.18,
        toe=0.06,
        edge_floor=0.42,
        focal=True,
    ),
    # Drawings on white. Straight inversion: a drawing has already made its
    # tonal decisions and a lift only lightens them. No local normalisation
    # (a white page is not a shadow), no dodge or burn (there is no subject to
    # separate from a ground), no EDGE_FLOOR (the mask is the whole rectangle,
    # so its "silhouette" is the frame and flooring it draws a black border),
    # TOE 0 (white must stay white or the paper fills with haze).
    #
    # The one thing kept is a full-range stretch, so a drawing that was made in
    # greys still reaches the deepest dot the transfer can emit.
    "lineart": Profile(name="lineart", lift=1.0, stretch=(0, 100)),
    # Screenshots. A UI is mostly one flat bright value with type on it, so a
    # lift near the portrait's would drag the background down into haze and a
    # straight inversion loses the mid-greys of a control. 0.70 splits them.
    #
    # No CLAHE and no focal hierarchy for the same reasons as lineart. One fine
    # unsharp is kept and is the only thing that survives type at this grid: a
    # 15px label sampled into a 6px cell is a 12% modulation, and without it a
    # screenshot bakes as a blank sheet.
    "ui": Profile(name="ui", lift=0.70, fine=0.6, fine_radius_cells=1.0),
    # Continuous data fields: spectrograms, star fields, histograms. The
    # identity profile -- the byte IS the datum. Nothing is stretched,
    # sharpened, floored, curved or pre-compensated, so two plates of the same
    # quantity are comparable and the only thing between the measurement and
    # the paper is the site's one transfer. Every other profile makes a
    # picture look right; this one makes a measurement stay a measurement.
    #
    # It was drafted at lift 1.0, on the argument that a straight inversion
    # makes ink area linear in the value. Measured on the first real data plate
    # -- the 192 x 192 sky over West Lafayette, whose disc has a mean luminance
    # of 0.328 -- that argument closes the picture: pre-compensating stores
    # 0.328^1.818 = 0.132, which is UNDER DEEP_FLOOR, so 78.6% of the sky's
    # cells pin at the widest dot the transfer can emit and the plate bakes as
    # a black disc. Stored as-is it is 0.0% at the ceiling, mean diameter 0.743
    # cells: dense, and every dot still separate. A data plate that saturates
    # is not a halftone, and linearity is not worth a rectangle.
    "map": Profile(name="map", lift=screen.LIFT),
}


# ── The pipeline ──────────────────────────────────────────────────────────
def blur(a: np.ndarray, radius: float) -> np.ndarray:
    """Gaussian blur of a float array, `radius` the standard deviation in the
    array's own pixels. `mode="nearest"` replicates the edge: zero padding would
    drag every blur toward black along the frame and put a dark band round it."""
    if radius <= 0:
        return a.astype(np.float32).copy()
    return gaussian_filter(a.astype(np.float32), sigma=float(radius), mode="nearest")


def cell_mean(a: np.ndarray, cols: int, rows: int, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Average `a` over each cell counting only masked-in pixels, with the mask
    coverage alongside. Averaging the cell rather than sampling its centre is
    most of what makes a plate read: at these grids a cell is a dozen source
    pixels across and one of them is not the drawing."""
    H, W = a.shape
    if H % rows == 0 and W % cols == 0:
        sy, sx = H // rows, W // cols
        m = mask.astype(np.float32).reshape(rows, sy, cols, sx)
        am = (a.astype(np.float32) * mask).reshape(rows, sy, cols, sx)
        w = m.sum(axis=(1, 3))
        cov = w / (sy * sx)
        out = np.divide(am.sum(axis=(1, 3)), w, out=np.zeros_like(w), where=w > 0)
        return out.astype(np.float32), cov.astype(np.float32)
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


def tone(lum: np.ndarray, inside: np.ndarray, cols: int, rows: int, p: Profile) -> np.ndarray:
    """The profile's tone pipeline, at the working resolution. In, and out, is
    luminance 0..1 with 1 the paper."""
    H, W = lum.shape
    pitch = W / cols

    if p.broad > 0:
        lum = lum + p.broad * (lum - blur(lum, p.broad_radius_cells * pitch))
    if p.fine > 0:
        lum = lum + p.fine * (lum - blur(lum, max(0.6, p.fine_radius_cells * pitch)))
    lum = np.clip(lum, 0, 1)

    if p.adapt > 0:
        r = p.adapt_radius_cells * pitch
        cover = np.maximum(blur(inside.astype(np.float32), r), 1e-3)
        mean = blur(np.where(inside, lum, 0.0), r) / cover
        var = blur(np.where(inside, (lum - mean) ** 2, 0.0), r) / cover
        sd = np.sqrt(np.maximum(var, 0.0))
        gain = np.minimum(p.adapt_sd / np.maximum(sd, p.adapt_floor), p.adapt_max)
        target = p.adapt_mid * 0.5 + (1 - p.adapt_mid) * mean
        adapted = np.clip(target + (lum - mean) * gain, 0, 1)
        t = np.clip((p.adapt_upto - mean) / p.adapt_upto, 0, 1)
        weight = p.adapt * (t * t * (3 - 2 * t))  # smoothstep: shadows only
        lum = (1 - weight) * lum + weight * adapted

    if p.stretch is not None and inside.any():
        lo, hi = (float(np.percentile(lum[inside], q)) for q in p.stretch)
        lum = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
    if p.gamma != 1.0:
        lum = np.power(np.clip(lum, 0, 1), p.gamma)
    if p.contrast != 1.0:
        lum = np.clip(0.5 + (lum - 0.5) * p.contrast, 0, 1)

    if p.focal:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        dist = np.sqrt(((xx / W - 0.5) / p.focal_rx) ** 2 + ((yy / H - 0.5) / p.focal_ry) ** 2)
        focal = np.clip((1.0 - dist) / max(1.0 - p.focal_hold, 1e-6), 0.0, 1.0) ** p.focal_gamma
        if p.dodge > 0:
            lum = np.clip(lum + p.dodge * focal * (lum - blur(lum, max(2.0, pitch * 6.0))), 0, 1)
        if p.burn > 0:
            over = np.clip(lum - p.burn_knee, 0, 1)
            lum = np.where(lum > p.burn_knee, p.burn_knee + over * (1.0 - p.burn * (1.0 - focal)), lum)

    if p.toe > 0:
        lum = p.toe + (1 - p.toe) * lum
    return np.clip(lum, 0, 1)


def field_from_raster(
    lum: np.ndarray,
    cols: int,
    rows: int,
    profile: Profile,
    *,
    inside: np.ndarray | None = None,
) -> np.ndarray:
    """A raster (float 0..1, 1 = paper) becomes `rows x cols` bytes per BoardField.

    The mask ends up being exactly the ink: the transfer decides, on the byte
    that will actually ship, whether a cell prints, and a cell that does not is
    stored as 0. So the field, the 2D board, the GPU path and the still all draw
    the same set of dots, and `count` is that set's size.
    """
    if inside is None:
        inside = np.ones_like(lum, dtype=bool)
    lum = tone(lum, inside, cols, rows, profile)

    if profile.edge_floor is not None:
        band = max(3, int(round(profile.edge_band_cells * (lum.shape[1] / cols))))
        eroded = (
            np.asarray(
                Image.fromarray((inside * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(band | 1))
            ).astype(np.float32)
            / 255.0
        )
        lum = np.where(inside & (eroded < 0.5), np.minimum(lum, profile.edge_floor), lum)

    values, cover = cell_mean(lum, cols, rows, inside)
    keep = cover > 0.5

    # The lift pre-compensation. The renderer will raise the stored byte to
    # LIFT before it inverts, so storing L^(lift/LIFT) makes the EFFECTIVE lift
    # this profile's, with no renderer change anywhere.
    stored = np.power(np.clip(values, 0.0, 1.0), profile.lift / screen.LIFT)
    out = np.zeros((rows, cols), np.uint8)
    out[keep] = np.clip(np.round(stored[keep] * 255), 13, 255).astype(np.uint8)
    # Cull on the shipped byte, not on the float behind it: rounding can carry a
    # cell across the threshold, and a field that disagrees with its own
    # renderer by one dot is a field that will disagree by a thousand later.
    out[screen.ink_dia_np(out.astype(np.float32) / 255.0) == 0.0] = 0
    return out


# ── Emission ──────────────────────────────────────────────────────────────
@dataclass
class Plate:
    """One plate: a name, a raster, and what it is a picture of."""

    export: str
    cols: int
    rows: int
    profile: Profile
    still: str
    note: str
    #: float 0..1, 1 = paper, at the working resolution. None where the plate
    #: is computed rather than drawn and arrives as `field` already.
    raster: np.ndarray | None = None
    inside: np.ndarray | None = None
    #: Cells per page-lattice step. The board draws the field at pitch/density.
    density: int = 2
    field: np.ndarray | None = None


def load_raster(path: Path, cols: int, rows: int, *, over_paper: bool = True) -> np.ndarray:
    """A file on disk becomes a working raster: luminance 0..1, 1 = paper, at an
    exact multiple of the grid so the cell average is a reshape rather than a
    resample. The multiple is chosen to be at least the source resolution, so
    nothing is thrown away before the tone pipeline runs."""
    im = Image.open(path).convert("RGBA")
    s = int(min(16, max(4, math.ceil(max(im.width / cols, im.height / rows)))))
    im = im.resize((cols * s, rows * s), Image.BOX)
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    if over_paper:
        lum = lum * alpha + 1.0 * (1.0 - alpha)  # composite onto the sheet
    return np.clip(lum, 0, 1)


def centroid(field: np.ndarray) -> tuple[int, int]:
    ys, xs = np.nonzero(field)
    if len(xs) == 0:
        return (field.shape[1] // 2, field.shape[0] // 2)
    return (int(round(xs.mean())), int(round(ys.mean())))


def ts_field(export: str, field: np.ndarray, note: str) -> str:
    rows, cols = field.shape
    count = int((field >= round(screen.UNLIT * 255)).sum())
    cx, cy = centroid(field)
    data = base64.b64encode(field.tobytes()).decode()
    return (
        f"/**\n * {note}\n * {cols} x {rows} cells, {count} dots.\n */\n"
        f"export const {export}: BoardField = {{\n"
        f"  w: {cols},\n  h: {rows},\n  count: {count},\n"
        # No datum. The vermilion second ink is licensed to four places
        # site-wide and a plate is not one of them, so the datum is off the
        # grid and the renderer's `i === dx && j === dy` can never match.
        f"  datum: [-1, -1],\n  center: [{cx}, {cy}],\n"
        f"  rim: [],\n"
        f'  data:\n    "{data}",\n'
        "};\n"
    )


def slug(export: str) -> str:
    """`skyField` -> `sky-field`. A still is a file on a URL, and a URL is
    kebab-case everywhere else in public/."""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", export).lower()


def bake_module(module: str, plates: list[Plate], generator: str, header: str) -> list[dict]:
    """Bake every plate, write one TS module and one still each, and return what
    was measured so the caller can check it against src/content/plates.ts."""
    CONTENT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    parts = [
        f"/**\n * GENERATED by {generator}. Do not edit.\n *\n"
        + "".join(f" * {line}\n" for line in header.splitlines())
        + " */\n"
        'import type { BoardField } from "./portrait-types";\n'
    ]
    measured = []
    for p in plates:
        if p.field is None:
            assert p.raster is not None, f"{p.export}: a plate needs a raster or a field"
            p.field = field_from_raster(p.raster, p.cols, p.rows, p.profile, inside=p.inside)
        field = p.field
        p.field = field
        parts.append(ts_field(p.export, field, p.note))
        still = screen.render(field, STILL_PX / p.density, transparent=True)
        out = PUBLIC / p.still
        still.save(out, quality=90, method=6)
        stats = screen.coverage_stats(still)
        count = int((field >= round(screen.UNLIT * 255)).sum())
        measured.append(
            {
                "export": p.export,
                "w": int(field.shape[1]),
                "h": int(field.shape[0]),
                "count": count,
                "density": p.density,
                "still": f"/portrait/{p.still}",
                "bytes": len(base64.b64encode(field.tobytes())),
                "kb": os.path.getsize(out) // 1024,
                **stats,
            }
        )
    (CONTENT / f"{module}.ts").write_text("\n".join(parts), encoding="utf-8")
    print(f"\n{module}.ts  {os.path.getsize(CONTENT / f'{module}.ts') // 1024} KB")
    print(f"{'export':22} {'grid':>9} {'dots':>6} {'b64':>7} {'KB':>4} "
          f"{'mean':>6} {'p1':>6} {'p99':>6} {'waist':>6} {'paper':>6}")
    for m in measured:
        print(
            f"{m['export']:22} {m['w']:>4}x{m['h']:<4} {m['count']:>6} {m['bytes']:>7} {m['kb']:>4} "
            f"{m['mean']:>6.3f} {m['lo']:>6.3f} {m['hi']:>6.3f} {m['waist']:>6.3f} {m['paper']:>6.3f}"
        )
    return measured


def check_manifest(measured: list[dict]) -> int:
    """Every plate's numbers, against the ones src/content/plates.ts states.

    The manifest exists so a caption cannot drift from its plate, which is only
    true if something compares them. Pure text, so it needs neither a TS
    toolchain nor an import of 90 KB of base64.
    """
    path = CONTENT / "plates.ts"
    if not path.exists():
        print("\ncheck: src/content/plates.ts does not exist yet")
        return 0
    src = path.read_text(encoding="utf-8")
    bad = 0
    for m in measured:
        block = None
        for chunk in src.split("  {")[1:]:
            if f'source: "{m["export"]}"' in chunk or f'field: "{m["export"]}"' in chunk:
                block = chunk
                break
        if block is None:
            print(f"  plates.ts: no entry for {m['export']}")
            bad += 1
            continue
        for key in ("w", "h", "count"):
            found = re.search(rf"\b{key}: (\d+)", block)
            if not found or int(found.group(1)) != m[key]:
                print(
                    f"  plates.ts: {m['export']}.{key} says "
                    f"{found.group(1) if found else 'nothing'}, the bake made {m[key]}"
                )
                bad += 1
    print("check: plates.ts agrees with the bake" if not bad else f"check: {bad} disagreement(s)")
    return bad


# ── CLI ───────────────────────────────────────────────────────────────────
def selftest() -> None:
    """Every profile, on synthetic input, so none of them is code that has
    never run. Prints the coverage gate for each."""
    cols, rows, s = 48, 60, 8
    yy, xx = np.mgrid[0 : rows * s, 0 : cols * s].astype(np.float32)
    ramp = np.clip(xx / (cols * s), 0, 1)
    disc = np.hypot(xx / s - cols / 2, yy / s - rows / 2) < rows / 3
    rasters = {
        "portrait": np.where(disc, ramp * 0.7 + 0.1, 1.0),
        "lineart": np.where((np.abs(xx / s - cols / 2) < 0.5) | (np.abs(yy / s - rows / 2) < 0.5), 0.0, 1.0),
        "ui": np.where(yy / s % 6 < 1.2, 0.25, 0.97),
        "map": ramp,
    }
    for name, raster in rasters.items():
        p = PROFILES[name]
        inside = disc if name == "portrait" else None
        field = field_from_raster(raster, cols, rows, p, inside=inside)
        img = screen.render(field, 4)
        stats = screen.coverage_stats(img)
        print(
            f"  {name:9} {int((field > 0).sum()):>5} dots  "
            f"mean {stats['mean']:.3f}  p1 {stats['lo']:.3f}  p99 {stats['hi']:.3f}  "
            f"waist {stats['waist']:.3f}  paper {stats['paper']:.3f}"
        )
        assert field.max() > 0, f"{name} baked an empty plate"
        assert not ((field > 0) & (field < 13)).any(), f"{name} emitted a 1..12 byte"
    print("selftest: four profiles, four plates, no stray unlit bytes.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Bake a raster into a dot plate.")
    ap.add_argument("--profile", choices=sorted(PROFILES), default="lineart")
    ap.add_argument("--box", default="24x30", help="lattice cells, e.g. 24x30")
    ap.add_argument("--density", type=int, default=2, help="cells per lattice step")
    ap.add_argument("--module", default="plate-art", help="src/content/<module>.ts")
    ap.add_argument("--plate", action="append", default=[], help="exportName:path/to.png")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return
    if not args.plate:
        ap.error("nothing to bake: pass --plate name:path, or --selftest")

    command = "python " + " ".join(
        [f"scripts/{Path(__file__).name}"] + [a if " " not in a else f'"{a}"' for a in sys.argv[1:]]
    )
    bw, bh = (int(v) for v in args.box.lower().split("x"))
    cols, rows = bw * args.density, bh * args.density
    profile = PROFILES[args.profile]
    plates = []
    for spec in args.plate:
        export, _, src = spec.partition(":")
        path = ROOT / src
        plates.append(
            Plate(
                export=export,
                raster=load_raster(path, cols, rows),
                cols=cols,
                rows=rows,
                profile=profile,
                still=f"{slug(export)}@2x.webp",
                note=f"{src}, {args.profile} profile: a {bw} x {bh} box at density {args.density}.",
                density=args.density,
            )
        )
    measured = bake_module(
        args.module,
        plates,
        "scripts/bake-art.py",
        f"Profile {args.profile}; a {bw} x {bh} lattice box at density {args.density}.\n"
        f"Re-bake with:\n  {command}",
    )
    check_manifest(measured)


if __name__ == "__main__":
    main()
