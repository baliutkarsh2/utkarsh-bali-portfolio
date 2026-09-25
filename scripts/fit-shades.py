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

THE TURN IS HELD, not solved. Free, the generic head settles at 43 degrees,
which put the far lens standing well off his profile and the near lens left
of his eye: his far eye sits almost on the silhouette, so the head is turned
further than a generic nose and ear say. At 50 the lenses sit over both eyes.
The glasses' own seat on that head (their offset from the bridge, their tilt
and their size) is in the component as WORN, set by eye on renders with the
landmarks marked.
"""
import numpy as np
from scipy.optimize import least_squares

# (on the head, cm), (on the print, design px), weight: the glasses hang on
# the eyes, the brow and the ear, so those count most
LANDMARKS = {
    "near eye": ((3.1, -0.2, -0.8), (180, 258), 2.0),
    "far eye": ((-3.1, -0.2, -0.8), (84, 287), 1.0),
    "near brow": ((3.2, 1.2, 0.0), (175, 228), 0.7),
    "tragus": ((7.3, -2.5, -8.7), (342, 310), 1.0),
    "top of the ear": ((7.0, 0.0, -8.0), (348, 248), 0.6),
    "tip of the nose": ((0.0, -4.4, 2.2), (72, 338), 0.4),
}
YAW = -50.0


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
        return ((project(YAW, *q, X) - U) * w[:, None]).ravel()

    q = least_squares(residual, [-15.0, 0.0, 20.0, 120.0, 260.0]).x
    pitch, roll, s, tx, ty = q
    print(f"HEAD = {{ yaw: {YAW:g}, pitch: {pitch:.1f}, roll: {roll:.1f}, s: {s:.2f}, "
          f"tx: {tx:.1f}, ty: {ty:.1f} }}")
    for (name, (_, u, _)), p in zip(LANDMARKS.items(), project(YAW, *q, X)):
        print(f"  {name:16s} at {u}, fits ({p[0]:.0f}, {p[1]:.0f}), off by {np.hypot(*(p - u)):.0f} px")


if __name__ == "__main__":
    main()
