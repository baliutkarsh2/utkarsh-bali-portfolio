#!/usr/bin/env python3
"""
Fit his head's pose, for the sunglasses the scroll puts on him.

    python scripts/fit-shades.py

src/components/interactive/hero-shades.tsx places a 3D pair of glasses on
the portrait with a weakly perspective camera: design px = s * (R X).xy + t,
y down, for X in cm on his head (origin at the bridge of the nose, x to his
left, y up, z out of the face). This solves R, s and t from landmarks read
off the baked print (design px, the 620 x 775 box of scripts/bake-hero.py's
crop), against a generic head, and prints the numbers the component's HEAD
holds. Move the crop and these move with it: read the landmarks again.

The glasses take this pose (with their own pantoscopic tilt, and turned 5
degrees on the page so their front runs with his eye line). Where they sit is
set by eye in the component (SEAT), with his eyes and the root of his ear
marked: seated on the generic head's own nose they landed 40 px forward and
20 px high, off his eyes, because his eyes sit further forward of the bridge
of his nose than a generic head's.
"""
import numpy as np
from scipy.optimize import least_squares

# (on the head, cm), (on the print, design px), weight: the glasses hang on
# the eyes, so those count most
LANDMARKS = {
    "near eye": ((3.2, -0.4, -1.3), (179, 257), 2.0),
    "far eye": ((-3.2, -0.4, -1.3), (88, 286), 2.0),
    "tip of the nose": ((0.0, -4.4, 2.1), (60, 340), 1.0),
    "near brow": ((3.3, 1.2, -0.3), (180, 224), 1.0),
    "root of the ear": ((6.9, 0.3, -7.6), (335, 240), 1.2),
    "tragus": ((6.6, -2.6, -7.8), (318, 318), 0.8),
    "chin": ((0.0, -11.2, -0.3), (105, 488), 0.7),
}


def rotation(yaw, pitch, roll):
    """Rz(roll) Rx(pitch) Ry(yaw), degrees: the component's `pose`."""
    y, p, r = np.radians([yaw, pitch, roll])
    Ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    Rx = np.array([[1, 0, 0], [0, np.cos(p), -np.sin(p)], [0, np.sin(p), np.cos(p)]])
    Rz = np.array([[np.cos(r), -np.sin(r), 0], [np.sin(r), np.cos(r), 0], [0, 0, 1]])
    return Rz @ Rx @ Ry


def project(yaw, pitch, roll, s, tx, ty, X):
    C = (rotation(yaw, pitch, roll) @ np.asarray(X, float).T).T
    return np.stack([s * C[:, 0] + tx, -s * C[:, 1] + ty], 1)


def main():
    X = np.array([v[0] for v in LANDMARKS.values()])
    U = np.array([v[1] for v in LANDMARKS.values()], float)
    w = np.array([v[2] for v in LANDMARKS.values()])

    def residual(q):
        return ((project(*q, X) - U) * w[:, None]).ravel()

    q = min((least_squares(residual, [y0, p0, 0.0, 20.0, 110.0, 260.0]) for y0 in (-40, -55, -70)
             for p0 in (-10, -25)), key=lambda r: r.cost).x
    yaw, pitch, roll, s, tx, ty = q
    print(f"HEAD = {{ yaw: {yaw:.1f}, pitch: {pitch:.1f}, roll: {roll:.1f}, s: {s:.2f}, "
          f"tx: {tx:.1f}, ty: {ty:.1f} }}")
    for (name, (_, u, _)), p in zip(LANDMARKS.items(), project(*q, X)):
        print(f"  {name:16s} at {u}, fits ({p[0]:.0f}, {p[1]:.0f}), off by {np.hypot(*(p - u)):.0f} px")


if __name__ == "__main__":
    main()
