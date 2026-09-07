"""
Build the static font instances the OpenGraph card is typeset in.

Run by hand; the .ttf outputs are committed. Vercel never runs this, and
nothing in `npm run build` reads it — the card loads the committed binaries
from src/app/_fonts at render time.

    python scripts/fetch-og-fonts.py

Two things force this script to exist rather than a `curl` line in a comment.

**Satori cannot parse a variable font.** Its TTF reader walks a static glyph
table and throws on an undefined read when the outlines live in `gvar`. Every
file in src/app/_fonts must therefore be a static instance, and Bodoni Moda is
shipped by google/fonts as a variable font only — so the instances have to be
cut locally, by fontTools' varLib.instancer, from `BodoniModa[opsz,wght].ttf`.

**`opsz` is structural for a Didone, not a finish.** Bodoni's hairlines are what
make it Bodoni and they are the first thing to disappear when the design size
and the rendered size disagree; optical sizing is the eighteenth-century fix for
exactly that. So the card ships four cuts rather than one compromise, each
instantiated at the `opsz` of the size it is actually set at, and the card picks
between them by family name. Below 21px Bodoni is not used at all — that is
IBM Plex Mono's job, and Plex ships real statics so it is copied straight
through.
"""
from __future__ import annotations

import os
import tempfile
import urllib.request
from pathlib import Path

from fontTools import ttLib
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/app/_fonts"

RAW = "https://raw.githubusercontent.com/google/fonts/main/ofl"
BODONI_ROMAN = f"{RAW}/bodonimoda/BodoniModa%5Bopsz,wght%5D.ttf"
BODONI_ITALIC = f"{RAW}/bodonimoda/BodoniModa-Italic%5Bopsz,wght%5D.ttf"
PLEX_MONO_MEDIUM = f"{RAW}/ibmplexmono/IBMPlexMono-Medium.ttf"

# (output file, source, opsz, wght) — one row per family name the card asks for.
# The opsz column is the only reason there are four: it is read off the size the
# text is actually set at in src/lib/og.tsx, and it must be updated with it.
INSTANCES = [
    # "Bodoni" 500: the name at 104px and every title from 56px up.
    ("BodoniModa-Display.ttf", BODONI_ROMAN, 96, 500),
    # "Bodoni" 700: the one-number plate, 96–168px lining figures.
    ("BodoniModa-Numeral.ttf", BODONI_ROMAN, 96, 700),
    # "BodoniSmall" 600: the eyebrow at 22px — Bodoni's hard floor, so the
    # heaviest cut of the four and the smallest optical size that carries it.
    ("BodoniModa-Small.ttf", BODONI_ROMAN, 32, 600),
    # "BodoniItalic": the standfirst at 26–28px. A tagline is display type, not
    # running text, which is why it is Bodoni and not a reading face.
    ("BodoniModa-Italic.ttf", BODONI_ITALIC, 32, 500),
]


def fetch(url: str, dest: Path) -> Path:
    """Download unless the file is already there."""
    if not dest.exists():
        print(f"  fetching {url}")
        with urllib.request.urlopen(url) as r, dest.open("wb") as f:
            f.write(r.read())
    return dest


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # The two variable sources are cut four ways but never shipped, so they are
    # cached outside the repo: only the instances belong in src/app/_fonts.
    cache = Path(tempfile.gettempdir()) / "ubali-og-fonts"
    cache.mkdir(exist_ok=True)

    # Plex ships static instances, so there is nothing to cut.
    plex = OUT / "IBMPlexMono-Medium.ttf"
    fetch(PLEX_MONO_MEDIUM, plex)

    sources: dict[str, Path] = {}
    for name, url, opsz, wght in INSTANCES:
        if url not in sources:
            sources[url] = fetch(url, cache / url.rsplit("/", 1)[-1].replace("%5B", "[").replace("%5D", "]"))
        # recalcTimestamp=False, or this script is not reproducible: fontTools
        # stamps head.modified with the current time on save, which moves three
        # bytes and the head checksum, and every re-run would then be a diff on
        # four committed binaries whose outlines had not changed. The upstream's
        # own timestamp is carried through instead — the glyph data is theirs.
        font = ttLib.TTFont(sources[url], recalcTimestamp=False)
        # inplace=False so one download can be cut four ways in one process.
        static = instancer.instantiateVariableFont(font, {"opsz": opsz, "wght": wght}, inplace=False)
        static.save(OUT / name)
        print(f"  {name}: opsz {opsz} wght {wght}")

    for f in sorted(OUT.glob("*.ttf")):
        print(f"  {f.name}: {os.path.getsize(f):,} bytes")


if __name__ == "__main__":
    main()
