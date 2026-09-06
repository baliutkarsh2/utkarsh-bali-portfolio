"""
Cut the subject out of a photograph for the dot portrait.

    python scripts/segment.py path/to/photo.jpg

Writes src/assets/portrait/utkarsh-cutout.png (RGBA, cropped to the subject's
bounding box with a 40px margin, quantised to a 256-colour palette so the
committed file stays small) and src/assets/portrait/CUTOUT_ORIGIN.txt (the
crop's top-left corner in the original frame, "x,y"), which is what lets the
windows in scripts/bake-portrait.py stay in photograph coordinates.

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
MARGIN = 40


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: python scripts/segment.py path/to/photo.jpg")
    src = Path(sys.argv[1])
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

    alpha = np.asarray(out)[:, :, 3]
    ys, xs = np.where(alpha > 8)
    box = (
        max(0, int(xs.min()) - MARGIN),
        max(0, int(ys.min()) - MARGIN),
        min(out.width, int(xs.max()) + MARGIN + 1),
        min(out.height, int(ys.max()) + MARGIN + 1),
    )
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cropped = out.crop(box).quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    cropped.save(OUT_DIR / "utkarsh-cutout.png", optimize=True)
    (OUT_DIR / "CUTOUT_ORIGIN.txt").write_text(f"{box[0]},{box[1]}\n")

    print(f"frame {im.size[0]}x{im.size[1]}, subject bbox {box}, coverage {(alpha > 128).mean():.3f}")
    print(f"wrote {OUT_DIR / 'utkarsh-cutout.png'} and CUTOUT_ORIGIN.txt; now run scripts/bake-portrait.py")


if __name__ == "__main__":
    main()
