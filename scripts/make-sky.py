"""Draw the real sky over West Lafayette on the night the essay was published.

    python scripts/make-sky.py

Writes `src/assets/sky/west-lafayette-2025-07-11.png`, a square luminance
raster of the visible hemisphere, which `bake-art.py --profile map` turns into
a dot field. Run by hand, output committed, never on Vercel.

WHY THIS PICTURE. /writing carries one essay -- "What a Quiet Mind Taught Me
About God, Family, and Infinity" -- and the page around it is the emptiest
rectangle on the site. This is the sky that was actually over him at 23:00 on
11 July 2025, the day it was published: not a stock star field, not a texture,
the real one, computed from a catalogue for that place and that hour.

AND IT IS THE ONLY PLATE ON THE SITE MADE MOSTLY OF INK. The portrait is a
face emerging from bare paper; this is its negative -- a solid field of ink
with the stars punched out of it as holes of paper. Same screen, same transfer,
opposite polarity. That contrast is the reason to make it.

The Milky Way is not drawn. It appears on its own, because the sky's ink
THINS where the catalogue's faint stars crowd together, which is what the
Milky Way physically is: unresolved stars. Nothing here is decoration; every
mark is a position.

Catalogue: HYG v4.1 (astronexus/HYG-Database), CC BY-SA 2.0. Not committed --
33 MB for one picture -- so the script downloads it to a cache outside the
repo. The PNG it produces is what ships.
"""
import csv
import io
import math
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/assets/sky/west-lafayette-2025-07-11.png"
CACHE = Path(os.environ.get("TEMP", "/tmp")) / "hygdata_v41.csv"
URL = "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv"

# West Lafayette, Indiana. 23:00 local (EDT, UTC-4) on 2025-07-11.
LAT, LON = 40.4237, -86.9212
UTC = (2025, 7, 12, 3, 0, 0)

SIZE = 1536          # the raster is square; the sky disc inscribes it
NAKED_EYE = 6.0      # what an eye actually resolves as a point
FAINT = 10.0         # fainter than this contributes only to the glow
SKY_L = 0.20         # the ink floor: dense, but never closed -- a black
                     # rectangle is not a halftone, it is a mistake
MILKY = 0.22         # how far the crowded regions lift the sky toward paper


def julian(y, m, d, hh, mm, ss):
    if m <= 2:
        y, m = y - 1, m + 12
    a = y // 100
    b = 2 - a + a // 4
    day = d + (hh + mm / 60 + ss / 3600) / 24
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + day + b - 1524.5


def gmst_hours(jd):
    """Greenwich mean sidereal time, hours."""
    t = (jd - 2451545.0) / 36525.0
    g = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - t * t * t / 38710000.0
    return (g % 360.0) / 15.0


def altaz(ra_h, dec_deg, lst_h, lat_deg):
    """Right ascension (hours) and declination to altitude/azimuth, radians."""
    ha = math.radians((lst_h - ra_h) * 15.0)
    dec = math.radians(dec_deg)
    lat = math.radians(lat_deg)
    sin_alt = math.sin(dec) * math.sin(lat) + math.cos(dec) * math.cos(lat) * math.cos(ha)
    alt = math.asin(max(-1.0, min(1.0, sin_alt)))
    az = math.atan2(-math.cos(dec) * math.sin(ha),
                    math.sin(dec) - math.sin(lat) * math.sin(alt))
    return alt, az % (2 * math.pi)


def project(alt, az, size):
    """Stereographic from the zenith. North up, east left, as a sky chart is."""
    r = (size / 2) * math.tan((math.pi / 2 - alt) / 2) / math.tan(math.pi / 4)
    return size / 2 - r * math.sin(az), size / 2 - r * math.cos(az)


def fetch():
    if not CACHE.exists():
        print(f"downloading HYG v4.1 to {CACHE} …")
        urllib.request.urlretrieve(URL, CACHE)
    return CACHE


def main() -> None:
    jd = julian(*UTC)
    lst = (gmst_hours(jd) + LON / 15.0) % 24.0
    print(f"JD {jd:.5f}  LST {lst:.4f} h  at {LAT}, {LON}")

    bright, glow, named = [], [], {}
    with open(fetch(), newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            try:
                mag = float(row["mag"])
                ra = float(row["ra"])
                dec = float(row["dec"])
            except (TypeError, ValueError):
                continue
            if mag > FAINT:
                continue
            alt, az = altaz(ra, dec, lst, LAT)
            if alt <= 0.02:
                continue
            x, y = project(alt, az, SIZE)
            if mag <= NAKED_EYE:
                bright.append((x, y, mag))
                if row.get("proper"):
                    named[row["proper"]] = (math.degrees(alt), mag)
            else:
                glow.append((x, y))

    print(f"{len(bright)} stars to magnitude {NAKED_EYE}, {len(glow)} fainter for the glow")
    for n in ("Vega", "Deneb", "Altair", "Arcturus", "Polaris", "Antares"):
        if n in named:
            print(f"  {n:<9} altitude {named[n][0]:5.1f}°  mag {named[n][1]:.2f}")

    # The sky: ink everywhere, thinning where the faint stars crowd.
    dens = np.zeros((SIZE, SIZE), np.float32)
    for x, y in glow:
        xi, yi = int(x), int(y)
        if 0 <= xi < SIZE and 0 <= yi < SIZE:
            dens[yi, xi] += 1.0
    dens = np.asarray(Image.fromarray((np.clip(dens, 0, 8) / 8 * 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(radius=SIZE / 110)), np.float32) / 255.0
    dens /= max(dens.max(), 1e-6)
    lum = np.full((SIZE, SIZE), SKY_L, np.float32) + MILKY * dens

    # The stars: holes of bare paper, area by magnitude the way an eye sees them.
    stars = Image.new("F", (SIZE, SIZE), 0.0)
    sp = stars.load()
    for x, y, mag in bright:
        r = 0.9 + 2.9 * ((NAKED_EYE - mag) / (NAKED_EYE + 1.5)) ** 1.6
        x0, x1 = int(x - r - 2), int(x + r + 3)
        y0, y1 = int(y - r - 2), int(y + r + 3)
        for yy in range(max(0, y0), min(SIZE, y1)):
            for xx in range(max(0, x0), min(SIZE, x1)):
                d = math.hypot(xx + 0.5 - x, yy + 0.5 - y)
                v = max(0.0, min(1.0, r + 0.5 - d))
                if v > sp[xx, yy]:
                    sp[xx, yy] = v
    lum = np.clip(lum + np.asarray(stars, np.float32) * (1.0 - lum), 0.0, 1.0)

    # Outside the horizon there is no sky, so there is no plate: bare paper.
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    outside = ((xx - SIZE / 2) ** 2 + (yy - SIZE / 2) ** 2) > (SIZE / 2 - 1) ** 2
    lum[outside] = 1.0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((lum * 255).astype(np.uint8), "L").save(OUT, optimize=True)
    inside = ~outside
    print(f"wrote {OUT}  {SIZE}x{SIZE}  sky mean L {lum[inside].mean():.3f}  "
          f"min {lum[inside].min():.3f}  bytes {OUT.stat().st_size}")


if __name__ == "__main__":
    main()
