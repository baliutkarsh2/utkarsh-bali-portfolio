"""
Cut the subject out of a photograph for the dot portrait.

    python scripts/segment.py path/to/photo.jpg
    python scripts/segment.py path/to/photo.jpg --no-guide   # every salient object

Writes src/assets/portrait/utkarsh-cutout.png and
src/assets/portrait/CUTOUT_ORIGIN.txt.

Feed it the LARGEST original you have. The cutout is the bake's only source of
detail, so every pixel lost here is lost for good; nothing downstream can put
it back. Two rules follow from that, and both were learned by breaking them.

  Full resolution.  The first cutout was matted from a frame that had already
  been scaled to 1760 x 2374 from a 2350 x 3170 original -- 56% of the pixels
  thrown away before the matte was even cut, and the portrait read soft in the
  face because of it. Segment the original, not a proxy. A 1.78x-larger input
  also gives the matting model materially more to work with, and hair is where
  that shows.

  No quantisation.  This file used to be flattened to a 256-colour palette with
  no dither, to keep the committed artefact small. That put a comb into the
  luminance histogram -- and luminance is exactly what the bake's tone curve
  reads, so the banding landed in the picture. The cutout is written lossless.

RGBA, not grayscale+alpha, and that is deliberate. scripts/bake-portrait.py
reads three things out of this file: luminance (0.2126R + 0.7152G + 0.0722B),
alpha, and `warmth` -- (R - B), which is how the bake finds the sunset rim
light on the face and writes it into `field.rim`. Both renderers use that set
(src/lib/board.ts, src/lib/field/gl-board.ts): rim cells are held flat by the
relight instead of being shaded as if they faced the viewer. Drop the colour
and `rim` comes back empty, which is a renderer change wearing a file-format
costume. Chroma is cheap here anyway -- PNG's filters predict it well.

SUBJECT_GUIDE.png says WHICH FIGURE the portrait is, and it is not optional
housekeeping -- without it this script does not produce this portrait. There
are three people on that hillside: Utkarsh, a woman seated behind his shoulder,
and a silhouette photographing the sunset. The matting model is confident about
all three (the raw isnet mask scores the woman 254, at either resolution), and
she is adjacent to his shoulder, so no threshold, no connected-component rule
and no amount of erosion separates them -- measured: eroding the mask 48 px
never splits her off. Which figure is the subject is a human decision. It was
made once, by hand, on the first cutout; re-running this segmenter on the frame
that cutout came from does not reproduce it (IoU 0.81 -- the bystanders come
back). The guide is that decision written down instead of left as an accident
of a lost edit: a whole-frame mask in the reference coordinates below, generous
around the authored silhouette so the matte still owns its own boundary and
hair may grow past the old outline, but never growing into another person.

CUTOUT_ORIGIN.txt is two lines:

    x,y     the crop's top-left corner, in pixels of the frame below
    w,h     that frame's full size

The second line is what lets the windows in scripts/bake-portrait.py stay
written in the coordinates they were composed in (a 1760 x 2374 frame) no
matter what the source resolution is: the bake divides to recover the scale.
Re-segment from a bigger scan tomorrow and the crops still mean the same
region of the same photograph. If the line is missing the bake assumes the
legacy frame, so an old cutout still reads.

Needs rembg (pip install rembg onnxruntime); the first run downloads the
isnet-general-use model (~180 MB). Run by hand, outputs committed, never on
Vercel.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src/assets/portrait"
GUIDE = OUT_DIR / "SUBJECT_GUIDE.png"

# The frame the bake's windows and the guide are written in. The margin below
# was chosen on a frame that size, so it is scaled with the source rather than
# left in raw pixels -- otherwise a bigger scan silently gets a tighter
# surround.
REFERENCE_FRAME = (1760, 2374)
MARGIN_AT_REFERENCE = 40


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    use_guide = "--no-guide" not in sys.argv[1:]
    if not args:
        sys.exit("usage: python scripts/segment.py path/to/photo.jpg [--no-guide]")
    src = Path(args[0])
    im = Image.open(src).convert("RGB")

    from rembg import new_session, remove

    try:
        session = new_session("isnet-general-use")
        out = remove(
            im,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )
        print("segmented with isnet-general-use")
    except Exception as error:  # noqa: BLE001 - any model failure falls back to the default
        print("isnet failed, falling back to u2net:", error)
        out = remove(im)
    out = out.convert("RGBA")

    if use_guide and GUIDE.exists():
        ref_aspect = REFERENCE_FRAME[1] / REFERENCE_FRAME[0]
        assert abs(im.height / im.width - ref_aspect) < 0.005 * ref_aspect, (
            f"photo {im.width}x{im.height} is not the guide's frame aspect; "
            "re-author SUBJECT_GUIDE.png before segmenting this one"
        )
        mask = np.asarray(Image.open(GUIDE).convert("L").resize(im.size, Image.BILINEAR)) > 127
        px = np.asarray(out).copy()
        before = int((px[:, :, 3] > 128).sum())
        px[:, :, 3] = np.where(mask, px[:, :, 3], 0)
        out = Image.fromarray(px)
        after = int((px[:, :, 3] > 128).sum())
        print(f"subject guide: dropped {before - after} px ({1 - after / max(before, 1):.1%}) of matte outside the subject")
    elif use_guide:
        print(f"no {GUIDE.name}; keeping every salient object the model found")

    margin = max(1, round(im.width * MARGIN_AT_REFERENCE / REFERENCE_FRAME[0]))
    alpha = np.asarray(out)[:, :, 3]
    ys, xs = np.where(alpha > 8)
    box = (
        max(0, int(xs.min()) - margin),
        max(0, int(ys.min()) - margin),
        min(out.width, int(xs.max()) + margin + 1),
        min(out.height, int(ys.max()) + margin + 1),
    )
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cropped = out.crop(box)
    cropped.save(OUT_DIR / "utkarsh-cutout.png", optimize=True)
    (OUT_DIR / "CUTOUT_ORIGIN.txt").write_text(f"{box[0]},{box[1]}\n{im.width},{im.height}\n")

    size_mb = (OUT_DIR / "utkarsh-cutout.png").stat().st_size / 1e6
    print(f"frame {im.size[0]}x{im.size[1]}, margin {margin}px, subject bbox {box}, coverage {(alpha > 128).mean():.3f}")
    print(f"cutout {cropped.size[0]}x{cropped.size[1]} {cropped.mode}, {size_mb:.2f} MB")
    print(f"wrote {OUT_DIR / 'utkarsh-cutout.png'} and CUTOUT_ORIGIN.txt; now run scripts/bake-portrait.py")


if __name__ == "__main__":
    main()
