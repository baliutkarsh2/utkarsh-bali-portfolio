"use client";

import { useEffect, useRef } from "react";
import { motionAllowed, onMotionChange } from "@/lib/motion";
import { GROUND, onThemeChange, resolvedTheme } from "@/lib/theme";

/**
 * Sunglasses, put on by the scroll.
 *
 * At the top of the page a pair of black wayfarers hangs hooked on his
 * collar. As the page scrolls through the stretch where the portrait is on
 * screen they lift off, swing their near arm open, turn into the pose of his
 * head and slide back onto his nose, and they are on, arm over the ear, by
 * the time he leaves: on a desktop that is where the pinned portrait lets go
 * of the story's last line; on a phone, before his eyes pass under the
 * header. Scrolling back takes them off again. Every frame is a function of
 * the scroll position and nothing else, so there is no loop: a frame is drawn
 * when the page moves, and never while it rests.
 *
 * THEY ARE PRINTED LIKE HIM. The glasses are a small 3D model (a front in
 * two halves with a little face-form wrap, and the near temple on a hinge),
 * each part a flat texture of ink and coverage placed by the affine map a
 * weakly perspective camera gives a plane. The parts are drawn into an
 * offscreen raster, and the raster is screened: round dots on a 45-degree
 * lattice at about his face's pitch, carried along with the glasses so the
 * dots travel with them instead of crawling through them, each dot's area
 * the raster's coverage around it and its colour the raster's ink. Under the
 * dots the glasses' silhouette is filled with the page ground, so they hide
 * what they pass in front of, as glasses do. On paper the acetate and the
 * lenses are the darkest dots on the page; on the plate, where light is what
 * prints, the frame is bare plate and the lenses dim smoke, and the glare,
 * the rivets and the sun's streak are what come up.
 *
 * THE FIT is a head pose solved from landmarks on the print (the eyes, the
 * brow, the ear and the nose) against a generic head, by
 * scripts/fit-shades.py, with the turn held at 50 degrees to his right:
 * tilted up 17, at 20 design px to the centimetre. On that head the glasses
 * sit 3 mm off the bridge of his nose and a centimetre toward his near side,
 * with 8 degrees of pantoscopic tilt, at 92% of a real wayfarer, set by eye
 * with his eyes marked: both eyes behind the lenses, the top bar on the
 * brow, the near arm back over the top of his ear and gone behind it. As
 * they slide on, the sky's reflection runs up across the lenses and
 * settles: a glint as they seat.
 *
 * Reduced motion keeps them hooked on the collar. Without JavaScript, in
 * forced colours and in print there are none: the stills are him alone.
 */

const TAU = Math.PI * 2;
const DESIGN_W = 620;
const DESIGN_H = 775;

/* ── the head, from scripts/fit-shades.py ─────────────────────────────── */
const HEAD = { yaw: -50, pitch: -16.9, roll: 0.1, s: 20.06, tx: 123.8, ty: 264.1 };
/** Tuning, in development only: ?shades=1&yaw=-55&... overrides these. */
const TUNE: Record<string, number> = {};
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  for (const [k, v] of new URLSearchParams(window.location.search)) {
    if (k !== "shades" && v !== "" && !Number.isNaN(Number(v))) TUNE[k] = Number(v);
  }
}
const T = (k: string, v: number) => TUNE[k] ?? v;
/** Where his eyes are, as a fraction of the box's height: the phone's end. */
const EYE_Y = 258 / DESIGN_H;

/* ── the glasses, cm: x to his left, y up, z out of the face ──────────── */
/**
 * The near lens (his left), its outer side +x and y DOWN as drawn: a
 * wayfarer, wider at the top, its outer top corner swept up. The far lens is
 * its mirror. Smoothed by corner cutting.
 */
const LENS: [number, number][] = [
  [-2.3, -1.72], [0.3, -1.95], [2.62, -2.18], [2.52, -0.9], [2.22, 0.55], [1.75, 1.55],
  [0.4, 1.92], [-1.45, 1.8], [-2.12, 1.05], [-2.3, -0.2],
];
/** Lens centre from the bridge, cm. */
const LENS_X = 3.3;
const LENS_Y = -0.2;
/** The frame round the lens: an affine growth of its outline (cm). */
const FRAME = { sx: 1.138, bx: -0.023, sy: 1.2244, by: -0.131 };
/** Face-form wrap of each half, degrees. */
const WRAP = 5;
/** The hinge, on the near half, cm (x out from the bridge, y up, z back). */
const HINGE = { x: 6.15, y: 1.75, z: -0.45 };
/** The near temple: visible length (it goes behind the ear), depth, droop. */
const TEMPLE = { len: 10.8, h0: 0.62, h1: 0.36, droop: -4 };
const TEX = 40; // texture px per cm

/* ── the path, in design px and degrees ───────────────────────────────── */
/** Hooked on the collar at the top of the page. */
const START = { x: 376, y: 600, s: 0.8, roll: -14, yaw: -26, pitch: 6, fold: 90 };
/**
 * The scroll's shares: the flight runs over [FLIGHT], the putting on from its
 * end to ON, and from ON they are worn.
 */
const FLIGHT = [0.04, 0.5] as const;
const ON = 0.95;
/**
 * Where they hover before going on (design px from the worn place), how much
 * of the turn is done by then, how much larger they are there, and how far
 * toward the camera they come mid-flight.
 */
const HOVER = { dx: -34, dy: 24, turn: 0.85, scale: 1.06, near: 0.1 };
/** Worn: the bridge's place in front of his nose, and its tilt. */
const WORN = { at: [1.0, -0.2, 0.3] as const, tilt: 8, scale: 0.92 };

/** Dot pitch, design px: his face is 3.8; a touch finer holds the rivets. */
const PITCH = 3.4;
/** Largest dot, in pitches, as the portrait's. */
const DMAX = 1.5;

type V3 = [number, number, number];
type M3 = number[]; // row-major 3x3

const rad = (d: number) => (d * Math.PI) / 180;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function mul(a: M3, b: M3): M3 {
  const o = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
}
const rx = (d: number): M3 => {
  const c = Math.cos(rad(d)), s = Math.sin(rad(d));
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
const ry = (d: number): M3 => {
  const c = Math.cos(rad(d)), s = Math.sin(rad(d));
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
const rz = (d: number): M3 => {
  const c = Math.cos(rad(d)), s = Math.sin(rad(d));
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
const apply = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
/** Pose angles (degrees) to a rotation, in the fit's own order. */
const pose = (yaw: number, pitch: number, roll: number) => mul(rz(roll), mul(rx(pitch), ry(yaw)));

/* Rotations are blended as quaternions, so the turn takes the short way. */
type Q = [number, number, number, number];
function quat(m: M3): Q {
  const t = m[0] + m[4] + m[8];
  let w, x, y, z;
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    w = s / 4; x = (m[7] - m[5]) / s; y = (m[2] - m[6]) / s; z = (m[3] - m[1]) / s;
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    w = (m[7] - m[5]) / s; x = s / 4; y = (m[1] + m[3]) / s; z = (m[2] + m[6]) / s;
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    w = (m[2] - m[6]) / s; x = (m[1] + m[3]) / s; y = s / 4; z = (m[5] + m[7]) / s;
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    w = (m[3] - m[1]) / s; x = (m[2] + m[6]) / s; y = (m[5] + m[7]) / s; z = s / 4;
  }
  return [w, x, y, z];
}
function slerp(a: Q, b: Q, t: number): Q {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb: Q = d < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  d = Math.abs(d);
  if (d > 0.9995) {
    const o = a.map((v, i) => v + (bb[i] - v) * t) as Q;
    const n = Math.hypot(...o);
    return o.map((v) => v / n) as Q;
  }
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + bb[i] * wb) as Q;
}
function mat([w, x, y, z]: Q): M3 {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

function chaikin(pts: [number, number][], n = 4): [number, number][] {
  let p = pts;
  for (let k = 0; k < n; k++) {
    const o: [number, number][] = [];
    for (let i = 0; i < p.length; i++) {
      const [ax, ay] = p[i];
      const [bx, by] = p[(i + 1) % p.length];
      o.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    p = o;
  }
  return p;
}
const OUTLINE = chaikin(LENS);

/* ── the textures ─────────────────────────────────────────────────────── */
/**
 * One part of the glasses as a flat picture: `cov` carries the ink in its
 * colour and the coverage in its alpha, `occ` the silhouette in the ground's
 * colour. `u0`, `v1` place texture px (0, 0) in the part's own cm: u runs
 * across, v up.
 */
type Part = {
  cov: HTMLCanvasElement;
  occ: HTMLCanvasElement;
  u0: number;
  v1: number;
  /** Origin and unit axes in glasses cm. */
  o: V3;
  u: V3;
  v: V3;
};

type Inks = {
  ground: string;
  frame: string; // acetate, with its coverage
  edge: string; // the light along its top
  lensTop: string;
  lensBot: string;
  glare: string; // "r, g, b"
  glareA: number; // its strength where it adds light (the plate)
  glareCut: number; // how much coverage it takes out (paper)
  rivet: string;
  rivetCut: number;
  streak: string;
  streakCut: number;
};

const PAPER: Inks = {
  ground: GROUND.light,
  frame: "rgba(20, 18, 15, 0.94)",
  edge: "rgba(120, 118, 112, 1)",
  lensTop: "rgba(34, 38, 36, 0.9)",
  lensBot: "rgba(48, 52, 50, 0.7)",
  glare: "96, 108, 124",
  glareA: 0.6,
  glareCut: 0.62,
  rivet: "rgba(150, 148, 142, 1)",
  rivetCut: 0.7,
  streak: "rgba(168, 50, 27, 1)",
  streakCut: 0.45,
};
const PLATE: Inks = {
  ground: GROUND.dark,
  frame: "rgba(239, 233, 220, 0.0)",
  edge: "rgba(239, 233, 220, 0.34)",
  lensTop: "rgba(120, 124, 120, 0.2)",
  lensBot: "rgba(132, 136, 132, 0.3)",
  glare: "239, 233, 220",
  glareA: 0.5,
  glareCut: 0,
  rivet: "rgba(239, 233, 220, 0.7)",
  rivetCut: 0,
  streak: "rgba(226, 103, 60, 0.62)",
  streakCut: 0,
};

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

/** Trace an outline given in cm onto a texture: x across, y down from the lens centre. */
function lensPath(c: CanvasRenderingContext2D, cx: number, cy: number, mirror: number, grow = false) {
  c.beginPath();
  OUTLINE.forEach(([x, y], i) => {
    const gx = grow ? x * FRAME.sx + FRAME.bx : x;
    const gy = grow ? y * FRAME.sy + FRAME.by : y;
    const px = (cx + mirror * gx) * TEX;
    const py = (cy + gy) * TEX;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  });
  c.closePath();
}

/**
 * Paint `cut` out of the coverage and lay `ink` over what is left, inside the
 * current clip: how a highlight prints on paper (fewer, lighter dots) and on
 * the plate (more light).
 */
function lift(c: CanvasRenderingContext2D, paint: () => void, cut: number, ink: string) {
  if (cut > 0) {
    c.globalCompositeOperation = "destination-out";
    c.globalAlpha = cut;
    paint();
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = 1;
    c.fillStyle = ink;
    paint();
  } else {
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.fillStyle = ink;
    paint();
  }
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1;
}

/**
 * A half of the front: one lens in its frame, and half the bridge. `near`
 * is his left; the far half carries the sun's streak.
 */
function frontHalf(ink: Inks, near: boolean, sweep = 0): Part {
  // texture space: u from -0.3 (past the bridge) to 7.0 cm out, v from -3.1 to 3.1
  const u0 = -0.3, u1 = 7.0, v0 = -3.1, v1 = 3.1;
  const W = (u1 - u0) * TEX, H = (v1 - v0) * TEX;
  const cov = canvas(W, H), occ = canvas(W, H);
  const cx = LENS_X - u0; // lens centre in texture cm (x across)
  const cy = v1 - LENS_Y; // and down
  // near lens: outer side +u, as LENS is drawn; the far half is drawn with u
  // outward too, so it is the same outline
  const mirror = 1;
  for (const [cv, isOcc] of [[cov, false], [occ, true]] as const) {
    const c = cv.getContext("2d")!;
    c.fillStyle = isOcc ? ink.ground : ink.frame;
    // the frame, and the bridge running to the middle as the wayfarer's
    // thick top bar
    lensPath(c, cx, cy, mirror, true);
    c.fill();
    c.beginPath();
    const bt = cy - 2.55, bh = 0.62;
    c.roundRect((0 - u0 - 0.05) * TEX, bt * TEX, (cx - 1.9) * TEX, bh * TEX, 0.2 * TEX);
    c.fill();
    if (isOcc) continue;
    // the lens: dark smoke, a touch lighter toward the bottom
    const g = c.createLinearGradient(0, (cy - 2.2) * TEX, 0, (cy + 1.9) * TEX);
    g.addColorStop(0, ink.lensTop);
    g.addColorStop(1, ink.lensBot);
    lensPath(c, cx, cy, mirror);
    c.save();
    c.clip();
    c.clearRect(0, 0, W, H);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // the sky across it, a soft band and a thin line, dimmer on the far lens
    const band = (w: number, off: number, rgb: string, a: number) => {
      c.save();
      c.translate(cx * TEX, cy * TEX);
      c.rotate(rad(-33));
      const gg = c.createLinearGradient(0, (off - w) * TEX, 0, (off + w) * TEX);
      gg.addColorStop(0, `rgba(${rgb}, 0)`);
      gg.addColorStop(0.5, `rgba(${rgb}, ${a})`);
      gg.addColorStop(1, `rgba(${rgb}, 0)`);
      c.fillStyle = gg;
      c.fillRect(-4 * TEX, (off - w) * TEX, 8 * TEX, 2 * w * TEX);
      c.restore();
    };
    const k = near ? 1 : 0.6;
    const glare = (w: number, off: number, a: number) => {
      if (ink.glareCut > 0) {
        c.globalCompositeOperation = "destination-out";
        band(w, off, "0, 0, 0", a * ink.glareCut * k);
        c.globalCompositeOperation = "source-atop";
        c.globalAlpha = ink.glareA * k;
        band(w, off, ink.glare, 1);
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
      } else {
        band(w, off, ink.glare, ink.glareA * a * k);
      }
    };
    glare(0.55, -0.55 + sweep, 1);
    glare(0.12, 0.55 + sweep, 0.8);
    if (!near) {
      // the sun, low on his left, as one thin warm streak on the far lens
      const streak = () => {
        c.save();
        c.translate(cx * TEX, cy * TEX);
        c.rotate(rad(-33));
        c.beginPath();
        c.ellipse(0.2 * TEX, -1.25 * TEX, 1.25 * TEX, 0.1 * TEX, 0, 0, TAU);
        c.fill();
        c.restore();
      };
      lift(c, streak, ink.streakCut, ink.streak);
    }
    c.restore();
    // light along the top edge of the acetate, and the two rivets by the hinge
    const edge = () => {
      c.save();
      lensPath(c, cx, cy, mirror, true);
      c.clip();
      c.fillRect(0, (cy - 2.86) * TEX, W, 0.16 * TEX);
      c.restore();
    };
    lift(c, edge, 0.35, ink.edge);
    const rivets = () => {
      c.beginPath();
      for (const dx of [2.2, 2.56]) {
        c.moveTo((cx + dx + 0.11) * TEX, (cy - 2.5) * TEX);
        c.arc((cx + dx) * TEX, (cy - 2.5) * TEX, 0.11 * TEX, 0, TAU);
      }
      c.fill();
    };
    lift(c, rivets, ink.rivetCut, ink.rivet);
  }
  const sgn = near ? 1 : -1;
  const w = rad(WRAP);
  return {
    cov, occ, u0, v1,
    o: [0, 0, 0],
    u: [sgn * Math.cos(w), 0, -Math.sin(w)],
    v: [0, 1, 0],
  };
}

/** The near temple, along its own length u, depth v; its end tapers away behind the ear. */
function temple(ink: Inks): Omit<Part, "o" | "u" | "v"> {
  const u0 = 0, u1 = TEMPLE.len, v0 = -0.4, v1 = 0.4;
  const W = (u1 - u0) * TEX, H = (v1 - v0) * TEX;
  const cov = canvas(W, H), occ = canvas(W, H);
  const shape = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(0, (v1 - TEMPLE.h0 / 2) * TEX);
    c.lineTo(W, (v1 - TEMPLE.h1 / 2) * TEX);
    c.lineTo(W, (v1 + TEMPLE.h1 / 2) * TEX);
    c.lineTo(0, (v1 + TEMPLE.h0 / 2) * TEX);
    c.closePath();
  };
  for (const [cv, isOcc] of [[cov, false], [occ, true]] as const) {
    const c = cv.getContext("2d")!;
    c.fillStyle = isOcc ? ink.ground : ink.frame;
    shape(c);
    c.fill();
    if (!isOcc) {
      lift(c, () => {
        c.save();
        shape(c);
        c.clip();
        c.fillRect(0, (v1 - TEMPLE.h0 / 2) * TEX, W, 0.12 * TEX);
        c.restore();
      }, 0.3, ink.edge);
    }
    // it goes behind his ear: the last centimetre fades out
    c.globalCompositeOperation = "destination-out";
    const g = c.createLinearGradient(W - 1.3 * TEX, 0, W, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    c.fillStyle = g;
    c.fillRect(W - 1.3 * TEX, 0, 1.3 * TEX, H);
    c.globalCompositeOperation = "source-over";
  }
  return { cov, occ, u0, v1 };
}

/** Coverage (fraction of a pitch cell) to a diameter in pitches, dots overlapping past 0.785. */
const D_OF_C = (() => {
  const n = 48, tab: number[] = [];
  const ds: number[] = [];
  for (let k = 0; k <= 60; k++) ds.push((k / 60) * DMAX);
  for (const d of ds) {
    let hit = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = (i + 0.5) / n, y = (j + 0.5) / n;
        const m = Math.min(Math.hypot(x, y), Math.hypot(1 - x, y), Math.hypot(x, 1 - y), Math.hypot(1 - x, 1 - y));
        if (m <= d / 2) hit++;
      }
    tab.push(hit / (n * n));
  }
  return (c: number) => {
    if (c <= 0) return 0;
    for (let k = 1; k < tab.length; k++)
      if (tab[k] >= c) {
        const f = (c - tab[k - 1]) / Math.max(tab[k] - tab[k - 1], 1e-9);
        return ds[k - 1] + (ds[k] - ds[k - 1]) * f;
      }
    return DMAX;
  };
})();

/* ── where the glasses are at progress p ─────────────────────────────── */
type Placed = { R: M3; s: number; x: number; y: number; fold: number };

const HS = T("s", HEAD.s);
const HEAD_R = pose(T("yaw", HEAD.yaw), T("pitch", HEAD.pitch), T("roll", HEAD.roll));
const WORN_R = mul(HEAD_R, rx(T("tilt", WORN.tilt)));
const WORN_AT = (() => {
  const c = apply(HEAD_R, [T("ax", WORN.at[0]), T("ay", WORN.at[1]), T("az", WORN.at[2])]);
  return { x: HS * c[0] + T("tx", HEAD.tx), y: -HS * c[1] + T("ty", HEAD.ty) };
})();
const START_R = pose(START.yaw, START.pitch, START.roll);
const QS = quat(START_R);
const QW = quat(WORN_R);

function bez(a: number, b: number, c: number, d: number, t: number) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

export function placed(p: number): Placed {
  // Three movements. The flight (a): off the collar, up past his mouth
  // quickly, held a little out toward the camera (larger) as the near arm
  // swings open, to hover just in front of his face, turned almost into its
  // pose. The putting on (b): a long, slow slide back and up onto the nose,
  // the way glasses go on, taking the most scroll, so a page left at rest
  // mid-way is most likely showing him about to wear them. Then a hold: on,
  // for the last of the stretch.
  const a = smooth(FLIGHT[0], FLIGHT[1], p);
  const b = smooth(FLIGHT[1], ON, p);
  const hx = WORN_AT.x + HOVER.dx, hy = WORN_AT.y + HOVER.dy;
  const x = bez(START.x, START.x - 10, hx - 30, hx, a) + (WORN_AT.x - hx) * b;
  const y = bez(START.y, START.y - 150, hy + 70, hy, a) + (WORN_AT.y - hy) * b;
  const R = mat(slerp(QS, QW, HOVER.turn * a + (1 - HOVER.turn) * b));
  const lift = 1 + HOVER.near * Math.sin(Math.PI * a) * (1 - a * 0.5);
  const grow = START.s + (1 - START.s) * a;
  const s = HS * T("gs", WORN.scale) * grow * lift * (1 + (HOVER.scale - 1) * a * (1 - b));
  const fold = START.fold * (1 - smooth(FLIGHT[0] + 0.12, FLIGHT[1] - 0.04, p));
  return { R, s, x, y, fold };
}

/* ── the renderer ─────────────────────────────────────────────────────── */
type Kit = {
  near: Part;
  far: Part;
  temple: Omit<Part, "o" | "u" | "v">;
  dark: boolean;
  sweep: number;
};

function kit(dark: boolean): Kit {
  const ink = dark ? PLATE : PAPER;
  return { near: frontHalf(ink, true), far: frontHalf(ink, false), temple: temple(ink), dark, sweep: 0 };
}

/**
 * The fronts with the sky's reflection `sweep` cm down the lens, redrawn
 * only when it has moved: as they go on, the glare runs up across both
 * lenses and settles, a glint at the moment they seat.
 */
function swept(k: Kit, sweep: number): Kit {
  const q = Math.round(sweep * 20) / 20;
  if (q === k.sweep) return k;
  const ink = k.dark ? PLATE : PAPER;
  k.near = frontHalf(ink, true, q);
  k.far = frontHalf(ink, false, q);
  k.sweep = q;
  return k;
}
/** Where the glare is at progress p: low on the lens in flight, home once on. */
const sweepAt = (p: number) => 1.5 * (1 - smooth(FLIGHT[1] + 0.1, ON, p));

/** A part's texture px to design px, as a canvas transform. */
function affine(part: Part, at: Placed): [number, number, number, number, number, number] {
  const { R, s, x, y } = at;
  const U = apply(R, part.u), V = apply(R, part.v);
  const O = apply(R, [
    part.o[0] + part.u[0] * part.u0 + part.v[0] * part.v1,
    part.o[1] + part.u[1] * part.u0 + part.v[1] * part.v1,
    part.o[2] + part.u[2] * part.u0 + part.v[2] * part.v1,
  ]);
  return [
    (s * U[0]) / TEX, (-s * U[1]) / TEX,
    (-s * V[0]) / TEX, (s * V[1]) / TEX,
    s * O[0] + x, -s * O[1] + y,
  ];
}

function depth(part: Part, at: Placed) {
  const c = apply(at.R, [
    part.o[0] + part.u[0] * 3,
    part.o[1] + part.u[1] * 3,
    part.o[2] + part.u[2] * 3,
  ]);
  return c[2];
}

/** The near temple on its hinge, folded by `fold` degrees toward the far side. */
function templePart(k: Kit, fold: number): Part {
  const f = rad(fold);
  const dr = rad(TEMPLE.droop);
  // open, it runs straight back (-z) and a little down; folded, across (-x)
  const dir: V3 = [-Math.sin(f) * Math.cos(dr), Math.sin(dr), -Math.cos(f) * Math.cos(dr)];
  return { ...k.temple, o: [HINGE.x, HINGE.y, HINGE.z], u: dir, v: [0, 1, 0] };
}

type Scratch = { cov: HTMLCanvasElement; occ: HTMLCanvasElement };

function paint(
  ctx: CanvasRenderingContext2D,
  scale: number, // device px per design px
  k: Kit,
  at: Placed,
  scratch: Scratch,
) {
  const parts: Part[] = [k.far, k.near, templePart(k, at.fold)];
  // far to near: the camera looks down -z, so the smallest z is furthest
  parts.sort((a, b) => depth(a, at) - depth(b, at));

  // the glasses' footprint, design px
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const part of parts) {
    const [a, b, c, d, e, f] = affine(part, at);
    const w = part.cov.width, h = part.cov.height;
    for (const [i, j] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      const X = a * i + c * j + e, Y = b * i + d * j + f;
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
  }
  const pad = PITCH * 2;
  x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
  x1 = Math.ceil(x1 + pad); y1 = Math.ceil(y1 + pad);
  // the raster at 2 px per design px: enough to average a cell from
  const R = 2;
  const W = Math.max(1, (x1 - x0) * R), H = Math.max(1, (y1 - y0) * R);
  for (const cv of [scratch.cov, scratch.occ]) {
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    } else cv.getContext("2d")!.clearRect(0, 0, W, H);
  }
  const cc = scratch.cov.getContext("2d", { willReadFrequently: true })!;
  const oc = scratch.occ.getContext("2d")!;
  for (const part of parts) {
    const [a, b, c, d, e, f] = affine(part, at);
    for (const [g, img] of [[cc, part.cov], [oc, part.occ]] as const) {
      g.setTransform(a * R, b * R, c * R, d * R, (e - x0) * R, (f - y0) * R);
      g.imageSmoothingQuality = "high";
      g.drawImage(img, 0, 0);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // the silhouette in the ground's colour: they hide what they pass in front of
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(scratch.occ, x0, y0, x1 - x0, y1 - y0);

  // the screen, carried with the glasses: its origin at the bridge and its
  // axes at 45 degrees to the front's own horizontal on the page
  const px = apply(at.R, [1, 0, 0]);
  const th = Math.atan2(-px[1], px[0]) + Math.PI / 4;
  const ex = [Math.cos(th) * PITCH, Math.sin(th) * PITCH];
  const ey = [-Math.sin(th) * PITCH, Math.cos(th) * PITCH];
  const data = cc.getImageData(0, 0, W, H).data;
  const read = (X: number, Y: number) => {
    const i = Math.round((X - x0) * R), j = Math.round((Y - y0) * R);
    if (i < 0 || j < 0 || i >= W || j >= H) return null;
    return (j * W + i) * 4;
  };
  const off = PITCH * 0.3;
  const byInk = new Map<number, number[]>();
  const span = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / PITCH / 2) + 2;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // lattice index of the cell nearest the footprint's centre, from the bridge
  const det = ex[0] * ey[1] - ex[1] * ey[0];
  const rx0 = cx - at.x, ry0 = cy - at.y;
  const ic = Math.round((rx0 * ey[1] - ry0 * ey[0]) / det);
  const jc = Math.round((ex[0] * ry0 - ex[1] * rx0) / det);
  for (let i = ic - span; i <= ic + span; i++)
    for (let j = jc - span; j <= jc + span; j++) {
      const X = at.x + i * ex[0] + j * ey[0];
      const Y = at.y + i * ex[1] + j * ey[1];
      if (X < x0 || Y < y0 || X > x1 || Y > y1) continue;
      // the cell's coverage and ink: five reads across it
      let a = 0, r = 0, g = 0, b = 0;
      for (const [dx, dy] of [[0, 0], [off, 0], [-off, 0], [0, off], [0, -off]]) {
        const o = read(X + dx, Y + dy);
        if (o === null) continue;
        const al = data[o + 3] / 255;
        a += al;
        r += data[o] * al; g += data[o + 1] * al; b += data[o + 2] * al;
      }
      a /= 5;
      if (a < 0.012) continue;
      const w = a * 5;
      // quantised, so dots of one ink go down in one path
      const key = (Math.round(r / w / 8) << 10) | (Math.round(g / w / 8) << 5) | Math.round(b / w / 8);
      const d = D_OF_C(a) * PITCH;
      let list = byInk.get(key);
      if (!list) byInk.set(key, (list = []));
      list.push(X, Y, d / 2);
    }
  // lightest first on paper, darkest first on the plate, as the portrait
  const lum = (key: number) => 0.2126 * (key >> 10) + 0.7152 * ((key >> 5) & 31) + 0.0722 * (key & 31);
  const keys = [...byInk.keys()].sort((a, b) => (k.dark ? lum(a) - lum(b) : lum(b) - lum(a)));
  const grow = 0.045 / scale;
  for (const key of keys) {
    const dots = byInk.get(key)!;
    ctx.fillStyle = `rgb(${Math.min(255, (key >> 10) * 8)}, ${Math.min(255, ((key >> 5) & 31) * 8)}, ${Math.min(255, (key & 31) * 8)})`;
    ctx.beginPath();
    for (let n = 0; n < dots.length; n += 3) {
      const r = dots[n + 2] + grow;
      ctx.moveTo(dots[n] + r, dots[n + 1]);
      ctx.arc(dots[n], dots[n + 1], r, 0, TAU);
    }
    ctx.fill();
  }
}

/* ── the scroll ───────────────────────────────────────────────────────── */
/**
 * Where the scroll must be for them to be on, in px from the top: pinned
 * (from 56rem, or 48rem in landscape), a little before the pin lets go, so
 * he wears them for the last of it; in the flow (a phone), when his eyes are
 * a twentieth of the window under the header.
 */
function endOfScroll(box: HTMLElement): number {
  const st = getComputedStyle(box);
  const rect = box.getBoundingClientRect();
  const y = window.scrollY;
  if (st.position === "sticky") {
    const hero = box.parentElement;
    if (hero) {
      const hr = hero.getBoundingClientRect();
      const pb = parseFloat(getComputedStyle(hero).paddingBottom) || 0;
      const top = parseFloat(st.top) || 0;
      const pinEnd = hr.bottom + y - pb - rect.height - top;
      return Math.max(1, pinEnd * 0.94);
    }
  }
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const eye = rect.top + y + rect.height * EYE_Y;
  return Math.max(1, eye - (3.5 * rem + window.innerHeight * 0.05));
}

export function HeroShades() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const box = canvas?.parentElement;
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // A preview hook for tuning the fit: ?shades=0.8 holds that progress.
    const held = (() => {
      const v = new URLSearchParams(window.location.search).get("shades");
      return v === null || process.env.NODE_ENV === "production" ? null : clamp01(Number(v));
    })();

    let kits: { light?: Kit; dark?: Kit } = {};
    const scratch: Scratch = { cov: document.createElement("canvas"), occ: document.createElement("canvas") };
    let end = 1;
    let raf = 0;
    let last = -1;
    let moving = motionAllowed();

    const draw = (force = false) => {
      raf = 0;
      if (box.dataset.state !== "static") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        last = -1;
        return;
      }
      const p = held ?? (moving ? clamp01(window.scrollY / end) : 0);
      if (!force && Math.abs(p - last) < 1e-4) return;
      last = p;
      const rect = box.getBoundingClientRect();
      if (rect.width < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
      }
      const dark = resolvedTheme() === "dark";
      const k = (dark ? kits.dark : kits.light) ?? (kits[dark ? "dark" : "light"] = kit(dark));
      paint(ctx, w / DESIGN_W, swept(k, sweepAt(p)), placed(p), scratch);
    };
    const frame = () => {
      if (!raf) raf = requestAnimationFrame(() => draw());
    };
    const relayout = () => {
      end = endOfScroll(box);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => draw(true));
    };

    const ro = new ResizeObserver(relayout);
    ro.observe(box);
    // the portrait draws itself asynchronously; the glasses wait for it
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => draw(true));
    });
    mo.observe(box, { attributes: true, attributeFilter: ["data-state"] });
    window.addEventListener("scroll", frame, { passive: true });
    window.addEventListener("resize", relayout);
    const offTheme = onThemeChange(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => draw(true));
    });
    const offMotion = onMotionChange(() => {
      moving = motionAllowed();
      relayout();
    });
    relayout();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", frame);
      window.removeEventListener("resize", relayout);
      offTheme();
      offMotion();
      kits = {};
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="portrait-shades" />;
}
