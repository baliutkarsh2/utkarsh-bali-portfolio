"use client";

import { useEffect, useRef } from "react";
import { motionAllowed, onMotionChange } from "@/lib/motion";
import { GROUND, onThemeChange, resolvedTheme } from "@/lib/theme";

/**
 * Sunglasses, put on by the scroll.
 *
 * At the top of the page the portrait is him alone. As the page scrolls
 * through the stretch where he is on screen, a pair of black wayfarers rises
 * out of the bottom of the print, in the empty paper under his chin, folded,
 * printing in dot by dot the way his shoulder prints out; turns over as it
 * climbs, comes round into the pose of his head a little in front of his
 * face, opens one arm and then the other, and slides back onto his nose. They
 * are on, arms over his ears, by the time he leaves: on a desktop just before
 * the pinned portrait lets go of the story's last line, on a phone before his
 * eyes pass under the header. Scrolling back takes them off. Every frame is a
 * function of the scroll position and nothing else: a frame is drawn when the
 * page moves, and never while it rests.
 *
 * THEY ARE A SOLID, drawn fresh each frame from its corners. The front is two
 * halves of acetate 5.5 mm thick with 15 degrees of face-form wrap, each a
 * ring round a lens set into it, with its outer and inner walls, a bevel
 * catching the sky along its top, and the two rivets; a keyhole bridge; end
 * pieces; and two arms on hinges, wide at the hinge and bent down at the ear.
 * Every face is projected corner by corner and painted far to near, walls
 * that face away are skipped, and a wall's shade is its normal against the
 * sky. The lenses are curved (base 6), so they reflect the world: the sky's
 * horizon crosses each lens where its surface turns from facing the ground
 * to facing the sky, and the sun is a glint where the surface bisects the
 * sun and the eye. Both are solved from the lens's orientation each frame,
 * so as the glasses turn the horizon rolls and the glint slides across them.
 *
 * THEY ARE PRINTED LIKE HIM. The solid is painted into an offscreen raster of
 * ink and coverage, and the raster is screened: round dots on a 45-degree
 * lattice carried with the glasses (so the dots travel with them rather than
 * crawl through them), each dot's area the coverage round it, its colour the
 * ink. Under the dots their silhouette is filled with the page ground, so
 * they hide what they pass in front of. On paper the acetate is the darkest
 * ink on the page; on the plate, where light is what prints, it is bare plate
 * and only its lit walls, bevel, rivets and the lenses' reflections come up.
 *
 * THE FIT. His head's pose is solved from landmarks on the print by
 * scripts/fit-shades.py (turned 51 degrees to his right, tilted up 17), and
 * the glasses take it, with 8 degrees of pantoscopic tilt: the near lens the
 * wider, the far one foreshortened and out a little past his profile, as in
 * any three-quarter view, turned 5 degrees clockwise on the page so the front
 * runs with his eye line, the near arm back to the root of his ear and gone
 * behind it, the far arm behind his head -- hidden by an ellipsoid standing
 * in for it. Where they sit is set by eye (SEAT).
 *
 * Reduced motion: they fade in where they are worn, over the same stretch,
 * without moving. Without JavaScript, in forced colours and in print there
 * are none: the stills are him alone.
 */

const TAU = Math.PI * 2;
const DESIGN_W = 620;
const DESIGN_H = 775;
/**
 * The glasses' canvas reaches this far (design px) left of the portrait's
 * box, into the empty column gap, so held out in front of his face they are
 * not cut off by the box's edge (board.css sizes it to match).
 */
const OVER = 124;

/** Development only: ?shades=0.6 holds that progress, and pose knobs override. */
const TUNE: Record<string, number> = {};
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  for (const [k, v] of new URLSearchParams(window.location.search)) {
    if (v !== "" && !Number.isNaN(Number(v))) TUNE[k] = Number(v);
  }
}
const T = (k: string, v: number) => TUNE[k] ?? v;

/* ── maths ────────────────────────────────────────────────────────────── */
type V3 = [number, number, number];
type M3 = number[]; // row-major 3x3

const rad = (d: number) => (d * Math.PI) / 180;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function mul(a: M3, b: M3): M3 {
  const o = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
}
const tr = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
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
const ap = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V3): V3 => scl(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
/** Pose angles (degrees) to a rotation, in the fit's own order. */
const pose = (yaw: number, pitch: number, roll: number) => mul(rz(roll), mul(rx(pitch), ry(yaw)));

/* Rotations run on the path's spline as quaternions. */
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
function mat([w, x, y, z]: Q): M3 {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/* ── his head, from scripts/fit-shades.py ─────────────────────────────── */
/**
 * Design px = s * (R X).xy + t, y down, for X in cm on his head: origin at
 * the bridge of the nose, x to his left, y up, z out of the face.
 */
const HEAD = { yaw: -50.8, pitch: -16.8, roll: -1.4, s: 21.77, tx: 111.1, ty: 256.3 };
/**
 * How the glasses sit on it: where the middle of their front lands on the
 * print (design px), their pantoscopic tilt against his head, and their size
 * against a real pair. Set by eye, with his eyes and the root of his ear
 * marked: both eyes behind the lenses, the top bar on his brow, the near arm
 * over the ear. Seated on the generic head's own nose they landed 40 px
 * forward and 20 px high, off his eyes: his eyes sit further forward of the
 * bridge of his nose than a generic head's.
 */
const SEAT = { x: 126, y: 274, tilt: 8, size: 0.94, turn: 5 };
/** His head, for hiding the far arm: an ellipsoid in worn-glasses cm. */
const SKULL = { c: [0, -2.2, -9.2] as V3, r: [6.35, 9.0, 10.0] as V3 };

/* ── the glasses, cm: x to his left, y up, z out of the front ─────────── */
/**
 * The near lens (his left), its outer side +u and v DOWN as drawn: a
 * wayfarer, wider at the top, its outer top corner swept up. The far lens is
 * its mirror. Smoothed by corner cutting.
 */
const LENS: [number, number][] = [
  [-2.3, -1.72], [0.3, -1.95], [2.62, -2.18], [2.52, -0.9], [2.22, 0.55], [1.75, 1.55],
  [0.4, 1.92], [-1.45, 1.8], [-2.12, 1.05], [-2.3, -0.2],
];
/** Lens centre from the middle of the front. */
const LENS_X = 3.3;
/** Face-form wrap of each half (degrees), about this x. */
const WRAP = T("wrap", 15);
const PIVOT = 0.9;
/** Acetate thickness, and how far the lens sits back in it. */
const DEPTH = 0.55;
const SET = 0.2;
/** The rim round the lens: at the top, the sides, the bottom. */
const RIM = { top: 0.6, side: 0.34, bottom: 0.35 };
/**
 * An arm: its length, its height at the hinge and after `taper`, its
 * thickness, how far along it bends down over the ear and by how much, its
 * droop and splay (degrees), and where it goes behind his ear when worn.
 */
const ARM = { len: 13.2, h0: 0.95, h1: 0.44, taper: 5, th: 0.3, bend: 10.4, bendBy: 28, droop: T("droop", -14.5), splay: 3, ear: T("ear", 8.4) };
/** The lens's base curve, as a radius (cm). */
const CURVE = 8.7;

/** Toward the sky (the walls' light) and toward the sun (the lenses' glint), in camera space. */
const SKY: V3 = unit([-0.3, 0.85, 0.45]);
const SUN: V3 = unit([T("sunx", -0.42), T("suny", 0.5), T("sunz", 0.76)]);

/** Dot pitch, design px, and the largest dot in pitches, as the portrait's. */
const PITCH = 3.3;
const DMAX = 1.5;

/* ── the model, built once ───────────────────────────────────────────── */
type P2 = [number, number];

function chaikin(pts: P2[], n: number): P2[] {
  let p = pts;
  for (let k = 0; k < n; k++) {
    const o: P2[] = [];
    for (let i = 0; i < p.length; i++) {
      const [ax, ay] = p[i];
      const [bx, by] = p[(i + 1) % p.length];
      o.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    p = o;
  }
  return p;
}

/** Outward unit normals of a closed outline (counter-clockwise, v up). */
function normals(p: P2[]): P2[] {
  return p.map((_, i) => {
    const [ax, ay] = p[(i - 1 + p.length) % p.length];
    const [bx, by] = p[(i + 1) % p.length];
    const dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1;
    return [dy / n, -dx / n];
  });
}

/** The lens outline, v up, counter-clockwise. */
const LENS_UV: P2[] = (() => {
  const p = chaikin(LENS.map(([u, v]) => [u, -v] as P2), 3);
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return a < 0 ? p.reverse() : p;
})();
const LENS_N = normals(LENS_UV);
/** The frame's outline: the lens grown by the rim, wider along the top. */
const FRAME_UV: P2[] = LENS_UV.map(([u, v], i) => {
  const [nx, ny] = LENS_N[i];
  const w = RIM.side + (RIM.top - RIM.side) * smooth(0.25, 0.85, ny) + (RIM.bottom - RIM.side) * smooth(0.25, 0.85, -ny);
  return [u + nx * w, v + ny * w];
});
const FRAME_N = normals(FRAME_UV);
const TOP_OUT = Math.max(...FRAME_UV.filter(([u]) => u > 1.5).map(([, v]) => v));
const TOP_IN = Math.max(...FRAME_UV.filter(([u]) => u < -1.5).map(([, v]) => v));
const U_OUT = Math.max(...FRAME_UV.map(([u]) => u));
const U_IN = Math.min(...FRAME_UV.map(([u]) => u));

/** A half's own rotation: the wrap, its outer end swung back, about its pivot. */
const halfRot = (h: number) => ry(h * WRAP);
/** A point on half h (lens-local u outward, v up, z out) in glasses cm. */
function onHalf(h: number, u: number, v: number, z: number): V3 {
  const x = h * (LENS_X + u);
  const r = ap(halfRot(h), [x - h * PIVOT, v, z]);
  return [r[0] + h * PIVOT, r[1], r[2]];
}
/** A point in glasses cm, wrapped with whichever half it is on. */
function wrapped(p: V3): V3 {
  const h = p[0] < 0 ? -1 : 1;
  const r = ap(halfRot(h), [p[0] - h * PIVOT, p[1], p[2]]);
  return [r[0] + h * PIVOT, r[1], r[2]];
}
const onHalfN = (h: number, nu: number, nv: number, nz: number): V3 => ap(halfRot(h), [h * nu, nv, nz]);

/** The hinge of half h, in glasses cm. */
const hinge = (h: number) => onHalf(h, U_OUT - 0.2, TOP_OUT - 0.5, -1.0);

/* ── looks ────────────────────────────────────────────────────────────── */
type Ink = [number, number, number];
type Look = {
  ground: string;
  dark: boolean;
  acetate: [Ink, number];
  wall: (b: number) => [Ink, number];
  lensTop: [Ink, number];
  lensBottom: [Ink, number];
  sky: [Ink, number, number]; // ink, strength at the horizon, above it
  skyCut: number; // on paper the sky takes ink away
  glint: [Ink, number];
  glintCut: number;
  bevel: [Ink, number];
  rivet: [Ink, number];
};
const BLACK: Ink = [17, 16, 14];
const BONE: Ink = [239, 233, 220];
const PAPER: Look = {
  ground: GROUND.light,
  dark: false,
  acetate: [BLACK, 0.96],
  wall: (b) => {
    const k = Math.pow(b, 1.6) * 0.75;
    return [[mix(17, 124, k), mix(16, 121, k), mix(14, 116, k)], 0.95];
  },
  lensTop: [[24, 30, 27], 0.93],
  lensBottom: [[42, 49, 45], 0.84],
  sky: [[98, 108, 122], 0.95, 0.4],
  skyCut: 0.3,
  glint: [[250, 248, 244], 0],
  glintCut: 0.95,
  bevel: [[104, 102, 98], 0.9],
  rivet: [[196, 193, 186], 0.95],
};
const PLATE: Look = {
  ground: GROUND.dark,
  dark: true,
  acetate: [BONE, 0],
  wall: (b) => [BONE, 0.09 + 0.62 * b * b],
  lensTop: [[120, 128, 124], 0.12],
  lensBottom: [[134, 142, 138], 0.22],
  sky: [[206, 214, 224], 0.5, 0.12],
  skyCut: 0,
  glint: [BONE, 0.95],
  glintCut: 0,
  bevel: [BONE, 0.5],
  rivet: [BONE, 0.85],
};
const rgba = ([r, g, b]: Ink, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

/* ── the arms ─────────────────────────────────────────────────────────── */
function armFrame(h: number, fold: number) {
  const open: V3 = unit([h * Math.sin(rad(ARM.splay)), Math.sin(rad(ARM.droop)), -Math.cos(rad(ARM.splay))]);
  // folding swings it in behind the front, about the hinge's vertical axis
  const dir = ap(ry(h * fold * 96), open);
  let up: V3 = unit(cross(cross(dir, [0, 1, 0]), dir));
  if (dot(up, [0, 1, 0]) < 0) up = scl(up, -1);
  const side = unit(cross(dir, up));
  return { dir, up, side };
}

/**
 * A point on arm h at distance `sLen` from its hinge, folded by `fold`,
 * `dy` up from its top edge's line and `dz` out to the side.
 */
function armPoint(h: number, fold: number, sLen: number, dy = 0, dz = 0): V3 {
  const { dir, up, side } = armFrame(h, fold);
  const straight = Math.min(sLen, ARM.bend);
  const over = Math.max(0, sLen - ARM.bend);
  const bend = rad(ARM.bendBy);
  let p = add(hinge(h), scl(dir, straight));
  if (over > 0) p = add(p, add(scl(dir, over * Math.cos(bend)), scl(up, -over * Math.sin(bend))));
  return add(add(p, scl(up, dy)), scl(side, dz));
}

/** Visibility of an arm's stations when worn: his head hides the far arm, his ear the near one's end. */
const ARM_K = 24;
const WORN_VIS: Record<number, number[]> = (() => {
  const Rw = mul(pose(HEAD.yaw, HEAD.pitch, HEAD.roll), rx(SEAT.tilt));
  const view = ap(tr(Rw), [0, 0, 1]); // toward the camera, in glasses cm
  const out: Record<number, number[]> = {};
  for (const h of [-1, 1]) {
    const vis: number[] = [];
    for (let k = 0; k <= ARM_K; k++) {
      const sLen = (ARM.len * k) / ARM_K;
      const p = armPoint(h, 0, sLen);
      // the ray toward the camera, against the ellipsoid in its unit space
      const q = [0, 1, 2].map((i) => (p[i] - SKULL.c[i]) / SKULL.r[i]) as V3;
      const d = unit([0, 1, 2].map((i) => view[i] / SKULL.r[i]) as V3);
      const t = -dot(q, d);
      const miss = t > 0 ? Math.sqrt(Math.max(0, dot(q, q) - t * t)) : Math.hypot(q[0], q[1], q[2]);
      void miss;
      vis.push(h > 0 ? 1 - smooth(ARM.ear, ARM.ear + 1.0, sLen) : 1);
    }
    out[h] = vis;
  }
  return out;
})();

/**
 * How much of a point on the glasses (glasses cm) shows past his head in state
 * `st`: the head is an ellipsoid fixed where the worn glasses put it, and the
 * glasses' depth follows their size, as a weak-perspective camera's does
 * (bigger is nearer).
 */
const NEAR_CM = 45;
function shown(p: V3, st: State) {
  const k = st.s / WORN_S;
  const c = ap(st.R, p);
  const P: V3 = [
    c[0] * k + (st.x - WORN_AT.x) / WORN_S,
    c[1] * k - (st.y - WORN_AT.y) / WORN_S,
    c[2] * k + NEAR_CM * (1 - 1 / k),
  ];
  // into the ellipsoid's unit space, with the ray toward the eye
  const L = ap(tr(WORN_R), P);
  const q = [0, 1, 2].map((i) => (L[i] - SKULL.c[i]) / SKULL.r[i]) as V3;
  const dl = ap(tr(WORN_R), [0, 0, 1]);
  const d = unit([0, 1, 2].map((i) => dl[i] / SKULL.r[i]) as V3);
  const qq = dot(q, q);
  if (qq < 1) return 0;
  const t = -dot(q, d);
  if (t <= 0) return 1;
  return smooth(0.97, 1.05, Math.sqrt(Math.max(0, qq - t * t)));
}

/**
 * How much of arm segment k shows, `worn` being how much of it shows when
 * they are on: the segments that go behind him go one after another from the
 * tip, each over a twentieth of the way.
 */
function hidden(worn: number, k: number, hide: number) {
  if (worn >= 0.999) return 1;
  const at = 0.9 * (1 - k / ARM_K);
  return mix(1, worn, smooth(at, at + 0.1, hide));
}

/* ── drawing ──────────────────────────────────────────────────────────── */
/** Where the glasses are: their rotation, px per cm, where their origin lands, and their arms. */
type State = {
  R: M3;
  s: number;
  x: number;
  y: number;
  /** Far arm, near arm: 0 open, 1 folded. */
  fold: [number, number];
  /**
   * How far the arms have gone behind his head and ear: a segment that is
   * hidden when worn goes, tip first, as this runs 0 to 1. Each goes quickly
   * rather than fading: half-hidden, an arm over his face printed as a pale
   * ghost of itself.
   */
  hide: number;
  /** Overall strength (the reduced-motion fade). */
  alpha: number;
};

type Draw = (c: CanvasRenderingContext2D, path: Path2D) => void;
type Face = {
  pts: P2[];
  z: number;
  draw: Draw;
  /** 0..1, how much of it shows (the arms, hidden by his head). */
  vis: number;
  /** Erase what is under it before drawing (an opaque face). */
  solid: boolean;
};
type Scratch = { cov: HTMLCanvasElement; occ: HTMLCanvasElement };

function polyPath(pts: P2[]) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}
const flat = (ink: Ink, a: number): Draw => (c, path) => {
  if (a <= 0) return;
  c.fillStyle = rgba(ink, a);
  c.fill(path);
};

/** Paint `ink` over a region, taking `cut` of the coverage out first: a highlight. */
function lift(c: CanvasRenderingContext2D, path: Path2D, cut: number, [ink, a]: [Ink, number]) {
  if (cut > 0 && a > 0 && ink[0] > 100) {
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = `rgba(0,0,0,${cut})`;
    c.fill(path);
    c.globalCompositeOperation = "source-over";
  }
  if (a > 0) {
    c.fillStyle = rgba(ink, a);
    c.fill(path);
  }
}

function paint(ctx: CanvasRenderingContext2D, scale: number, look: Look, st: State, scratch: Scratch) {
  const { R, s } = st;
  const cam = (p: V3): V3 => ap(R, p);
  const px = (c: V3): P2 => [s * c[0] + st.x, -s * c[1] + st.y];
  const at = (p: V3): P2 => px(cam(p));
  const faces: Face[] = [];
  /** A face from glasses-cm corners, culled if it faces away (unless `normal` is null). */
  const face = (corners: V3[], normal: V3 | null, draw: Draw, bias = 0, vis = 1, solid = true) => {
    if (normal && ap(R, normal)[2] <= 0.01) return;
    const cc = corners.map(cam);
    const z = cc.reduce((a, c) => a + c[2], 0) / cc.length + bias;
    faces.push({ pts: cc.map(px), z, draw, vis, solid });
  };
  const shade = (N: V3, k = 1) => look.wall(Math.max(0, dot(ap(R, N), SKY)) * k);

  for (const h of [-1, 1]) {
    // walls round the outside of the frame
    const n = FRAME_UV.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [ua, va] = FRAME_UV[i], [ub, vb] = FRAME_UV[j];
      const N = onHalfN(h, (FRAME_N[i][0] + FRAME_N[j][0]) / 2, (FRAME_N[i][1] + FRAME_N[j][1]) / 2, 0);
      face(
        [onHalf(h, ua, va, 0), onHalf(h, ub, vb, 0), onHalf(h, ub, vb, -DEPTH), onHalf(h, ua, va, -DEPTH)],
        N, flat(...shade(N)), -0.05,
      );
    }
    // walls round the lens, inside the rim, down to the lens
    const m = LENS_UV.length;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      const [ua, va] = LENS_UV[i], [ub, vb] = LENS_UV[j];
      const N = onHalfN(h, -(LENS_N[i][0] + LENS_N[j][0]) / 2, -(LENS_N[i][1] + LENS_N[j][1]) / 2, 0);
      face(
        [onHalf(h, ua, va, 0), onHalf(h, ub, vb, 0), onHalf(h, ub, vb, -SET), onHalf(h, ua, va, -SET)],
        N, flat(...shade(N, 0.8)), 0.02,
      );
    }
    // the lens, with the world in it
    const RL = mul(R, halfRot(h));
    face(LENS_UV.map(([u, v]) => onHalf(h, u, v, -SET)), null, (c, path) => lensPaint(c, path, look, h, RL, at), 0.04);
    // the front: the ring round the lens, the bevel along its top, the rivets
    const inner = LENS_UV.map(([u, v]) => at(onHalf(h, u, v, 0)));
    const bevel: V3[] = [];
    const bevelIn: V3[] = [];
    FRAME_UV.forEach(([u, v], i) => {
      if (FRAME_N[i][1] > 0.3 && u > U_IN + 0.15) {
        bevel.push(onHalf(h, u, v, 0));
        bevelIn.push(onHalf(h, u - FRAME_N[i][0] * 0.07, v - FRAME_N[i][1] * 0.07, 0));
      }
    });
    const bev = [...bevel, ...bevelIn.reverse()].map(at);
    const rivets = [
      [U_OUT - 0.62, TOP_OUT - 0.34],
      [U_OUT - 1.0, TOP_OUT - 0.36],
    ].map(([u, v]) => {
      const ring: P2[] = [];
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU;
        ring.push(at(onHalf(h, u + 0.1 * Math.cos(a), v + 0.1 * Math.sin(a), 0.01)));
      }
      return ring;
    });
    const front = FRAME_UV.map(([u, v]) => onHalf(h, u, v, 0));
    face(front, onHalfN(h, 0, 0, 1), (c, path) => {
      const ring = new Path2D(path);
      inner.forEach(([x, y], i) => (i ? ring.lineTo(x, y) : ring.moveTo(x, y)));
      ring.closePath();
      c.save();
      c.clip(ring, "evenodd");
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = "#000";
      c.fill(ring, "evenodd");
      c.globalCompositeOperation = "source-over";
      flat(...look.acetate)(c, ring);
      if (bev.length > 3) lift(c, polyPath(bev), 0.3, look.bevel);
      for (const r of rivets) lift(c, polyPath(r), 0.5, look.rivet);
      c.restore();
    }, 0.1, 1, false);
    // the back of the front, seen only from behind
    face(FRAME_UV.map(([u, v]) => onHalf(h, u, v, -DEPTH)).reverse(), onHalfN(h, 0, 0, -1), flat(...look.acetate), -0.2);
    // the end piece, back to the hinge
    const e0 = U_OUT - 0.34, e1 = U_OUT, v0 = TOP_OUT - 0.95, v1 = TOP_OUT - 0.08;
    const box = (u: number, v: number, z: number) => onHalf(h, u, v, z);
    const zf = -DEPTH * 0.6, zb = -1.08;
    const sides: [V3[], V3][] = [
      [[box(e1, v0, zf), box(e1, v1, zf), box(e1, v1, zb), box(e1, v0, zb)], onHalfN(h, 1, 0, 0)],
      [[box(e0, v1, zf), box(e1, v1, zf), box(e1, v1, zb), box(e0, v1, zb)], onHalfN(h, 0, 1, 0)],
      [[box(e0, v0, zf), box(e1, v0, zf), box(e1, v0, zb), box(e0, v0, zb)], onHalfN(h, 0, -1, 0)],
      [[box(e0, v0, zb), box(e1, v0, zb), box(e1, v1, zb), box(e0, v1, zb)], onHalfN(h, 0, 0, -1)],
    ];
    for (const [c4, N] of sides) face(c4, N, flat(...shade(N)), 0);
    // the arm, hidden where his head is between it and the eye
    const fold = st.fold[h < 0 ? 0 : 1];
    const vis = WORN_VIS[h].map((w, k) => {
      const behind = shown(armPoint(h, fold, (ARM.len * k) / ARM_K), st);
      // and the near arm's end goes behind his ear as they seat
      return h > 0 && w < 0.999 ? Math.min(behind, hidden(w, k, st.hide)) : behind;
    });
    const height = (sLen: number) => mix(ARM.h0, ARM.h1, smooth(0, ARM.taper, sLen));
    const { up, side } = armFrame(h, fold);
    const P = (sl: number, hh: number, top: boolean, out: boolean) =>
      armPoint(h, fold, sl, top ? 0.42 : 0.42 - hh, (out ? 1 : -1) * ARM.th * 0.5 * h);
    for (let k = 0; k < ARM_K; k++) {
      const sa = (ARM.len * k) / ARM_K, sb = (ARM.len * (k + 1)) / ARM_K;
      const ha = height(sa), hb = height(sb);
      const v = Math.min(vis[k], vis[k + 1]);
      if (v < 0.01) continue;
      const quads: [V3[], V3][] = [
        [[P(sa, ha, true, true), P(sb, hb, true, true), P(sb, hb, false, true), P(sa, ha, false, true)], scl(side, h)],
        [[P(sa, ha, true, false), P(sb, hb, true, false), P(sb, hb, false, false), P(sa, ha, false, false)], scl(side, -h)],
        [[P(sa, ha, true, true), P(sb, hb, true, true), P(sb, hb, true, false), P(sa, ha, true, false)], up],
        [[P(sa, ha, false, true), P(sb, hb, false, true), P(sb, hb, false, false), P(sa, ha, false, false)], scl(up, -1)],
      ];
      for (const [c4, N] of quads) face(c4, N, flat(...shade(N)), 0, v);
    }
    for (const sl of [0.9, 1.3]) {
      const ring: V3[] = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        ring.push(armPoint(h, fold, sl + 0.09 * Math.cos(a), 0.1 + 0.09 * Math.sin(a), ARM.th * 0.52 * h));
      }
      face(ring, scl(side, h), flat(...look.rivet), 0.01, vis[2]);
    }
  }
  // the bridge, a keyhole across the top
  {
    const xr = LENS_X + U_IN + 0.28;
    const top = TOP_IN - 0.04, low = TOP_IN - 0.85;
    const K = 12;
    const upper: V3[] = [], lower: V3[] = [];
    for (let k = 0; k <= K; k++) {
      const x = mix(-xr, xr, k / K);
      upper.push(wrapped([x, top, 0]));
      lower.push(wrapped([x, low + 0.26 * (1 - (x / xr) ** 2), 0]));
    }
    face([...upper, ...[...lower].reverse()], [0, 0, 1], flat(...look.acetate), 0.08);
    for (let k = 0; k < K; k++) {
      const a = upper[k], b = upper[k + 1];
      const N: V3 = [0, 1, 0];
      face([a, b, add(b, [0, 0, -DEPTH]), add(a, [0, 0, -DEPTH])], N, flat(...shade(N)), -0.05);
    }
  }

  // far to near
  faces.sort((a, b) => a.z - b.z);

  // the footprint, within the box
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of faces)
    for (const [x, y] of f.pts) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  // whole design px: the raster's rows are read back by index
  const pad = Math.ceil(PITCH * 2);
  x0 = Math.max(-OVER, Math.floor(x0 - pad));
  y0 = Math.max(-pad, Math.floor(y0 - pad));
  x1 = Math.min(DESIGN_W + pad, Math.ceil(x1 + pad));
  y1 = Math.min(DESIGN_H + pad, Math.ceil(y1 + pad));
  if (x1 <= x0 || y1 <= y0) return;
  const RS = 2;
  const W = (x1 - x0) * RS, H = (y1 - y0) * RS;
  for (const cv of [scratch.cov, scratch.occ]) {
    if (cv.width < W || cv.height < H) {
      cv.width = Math.max(cv.width, W);
      cv.height = Math.max(cv.height, H);
    }
  }
  const cc = scratch.cov.getContext("2d", { willReadFrequently: true })!;
  const oc = scratch.occ.getContext("2d")!;
  for (const g of [cc, oc]) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, scratch.cov.width, scratch.cov.height);
    g.setTransform(RS, 0, 0, RS, -x0 * RS, -y0 * RS);
  }
  for (const f of faces) {
    const path = polyPath(f.pts);
    cc.globalAlpha = f.vis;
    if (f.solid) {
      cc.globalCompositeOperation = "destination-out";
      cc.fillStyle = "#000";
      cc.fill(path);
      cc.globalCompositeOperation = "source-over";
    }
    f.draw(cc, path);
    cc.globalAlpha = 1;
    oc.globalAlpha = f.vis;
    oc.fillStyle = look.ground;
    oc.fill(path);
    oc.globalAlpha = 1;
  }
  // printing in out of the bottom of the print, as his shoulder prints out
  const fade = (y: number) =>
    st.alpha * Math.pow(smooth(0, 1, (DESIGN_H - y) / 95), 1.2) * smooth(0, 26, DESIGN_H - y);
  oc.setTransform(1, 0, 0, 1, 0, 0);
  const g = oc.createLinearGradient(0, 0, 0, H);
  for (let k = 0; k <= 12; k++) g.addColorStop(k / 12, `rgba(0,0,0,${fade(y0 + ((y1 - y0) * k) / 12)})`);
  oc.globalCompositeOperation = "destination-in";
  oc.fillStyle = g;
  oc.fillRect(0, 0, W, H);
  oc.globalCompositeOperation = "source-over";

  // the ground under them, then the dots
  ctx.setTransform(scale, 0, 0, scale, OVER * scale, 0);
  ctx.drawImage(scratch.occ, 0, 0, W, H, x0, y0, x1 - x0, y1 - y0);
  screen(ctx, scale, cc, W, H, x0, y0, RS, st, look.dark, fade);
}

/** The lens: its tint, darker at the top; the sky above the horizon; the sun. */
function lensPaint(c: CanvasRenderingContext2D, path: Path2D, look: Look, h: number, RL: M3, at: (p: V3) => P2) {
  const on = (u: number, v: number) => at(onHalf(h, u, v, -SET));
  const [tx, ty] = on(0, 2.1), [bx, by] = on(0, -1.9);
  const g = c.createLinearGradient(tx, ty, bx, by);
  g.addColorStop(0, rgba(...look.lensTop));
  g.addColorStop(1, rgba(...look.lensBottom));
  c.save();
  c.clip(path);
  c.fillStyle = g;
  c.fill(path);
  // The horizon: where the curved surface turns from the ground to the sky.
  // A lens point (u, v) has the normal (h u, v, CURVE) / |..| in its half,
  // and it shows the sky where that normal points up in camera space.
  const r10 = RL[3], r11 = RL[4], r12 = RL[5];
  if (Math.abs(r11) > 1e-3) {
    // (the horizon sits a little low: his chin is up, and more sky reads as sunglasses)
    const vh = (u: number) => -(r12 * CURVE + r10 * h * u) / r11 - T("skyv", 0.55);
    const up = r11 > 0 ? 1 : -1;
    const E = 3.4;
    const sky = polyPath([on(-E, vh(-E)), on(E, vh(E)), on(E, vh(E) + up * 2 * E), on(-E, vh(-E) + up * 2 * E)]);
    const [ax, ay] = on(0, vh(0)), [zx, zy] = on(0, vh(0) + up * 1.6);
    const [ink, a0, a1] = look.sky;
    if (look.skyCut > 0) {
      const cg = c.createLinearGradient(ax, ay, zx, zy);
      cg.addColorStop(0, `rgba(0,0,0,${look.skyCut})`);
      cg.addColorStop(1, `rgba(0,0,0,${look.skyCut * 0.3})`);
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = cg;
      c.fill(sky);
      c.globalCompositeOperation = "source-over";
    }
    const sg = c.createLinearGradient(ax, ay, zx, zy);
    sg.addColorStop(0, rgba(ink, a0));
    sg.addColorStop(0.18, rgba(ink, a0 * 0.8));
    sg.addColorStop(1, rgba(ink, a1));
    c.fillStyle = sg;
    c.fill(sky);
  }
  // The sun: where the surface bisects the sun and the eye.
  const hl = ap(tr(RL), unit(add(SUN, [0, 0, 1])));
  if (hl[2] > 0.2) {
    const u = (h * CURVE * hl[0]) / hl[2], v = (CURVE * hl[1]) / hl[2];
    const [gx, gy] = on(u, v);
    const [ex, ey] = on(u + 0.55, v + 0.3);
    const rr = Math.max(1, Math.hypot(ex - gx, ey - gy));
    const gg = c.createRadialGradient(gx, gy, 0, gx, gy, rr);
    if (look.glintCut > 0) {
      gg.addColorStop(0, `rgba(0,0,0,${look.glintCut})`);
      gg.addColorStop(0.35, `rgba(0,0,0,${look.glintCut * 0.6})`);
      gg.addColorStop(1, "rgba(0,0,0,0)");
      c.globalCompositeOperation = "destination-out";
    } else {
      gg.addColorStop(0, rgba(look.glint[0], look.glint[1]));
      gg.addColorStop(0.35, rgba(look.glint[0], look.glint[1] * 0.55));
      gg.addColorStop(1, rgba(look.glint[0], 0));
    }
    c.fillStyle = gg;
    c.beginPath();
    c.arc(gx, gy, rr, 0, TAU);
    c.fill();
    c.globalCompositeOperation = "source-over";
  }
  c.restore();
}

/* ── the screen ───────────────────────────────────────────────────────── */
/** Coverage (fraction of a pitch cell) to a diameter in pitches, dots overlapping past 0.785. */
const D_OF_C = (() => {
  const n = 48, tab: number[] = [], ds: number[] = [];
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

function screen(
  ctx: CanvasRenderingContext2D,
  scale: number,
  cc: CanvasRenderingContext2D,
  W: number,
  H: number,
  x0: number,
  y0: number,
  RS: number,
  st: State,
  dark: boolean,
  fade: (y: number) => number,
) {
  const data = cc.getImageData(0, 0, W, H).data;
  // the screen is carried with the glasses: at 45 degrees to the front's own
  // horizontal on the page, its origin at their middle
  const fx = ap(st.R, [1, 0, 0]);
  const th = Math.atan2(-fx[1], fx[0]) + Math.PI / 4;
  const ex = [Math.cos(th) * PITCH, Math.sin(th) * PITCH];
  const ey = [-Math.sin(th) * PITCH, Math.cos(th) * PITCH];
  const det = ex[0] * ey[1] - ex[1] * ey[0];
  const x1 = x0 + W / RS, y1 = y0 + H / RS;
  const read = (X: number, Y: number) => {
    const i = Math.round((X - x0) * RS), j = Math.round((Y - y0) * RS);
    if (i < 0 || j < 0 || i >= W || j >= H) return -1;
    return (j * W + i) * 4;
  };
  const off = PITCH * 0.3;
  const idx = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([X, Y]) => {
    const rx0 = X - st.x, ry0 = Y - st.y;
    return [(rx0 * ey[1] - ry0 * ey[0]) / det, (ex[0] * ry0 - ex[1] * rx0) / det];
  });
  const i0 = Math.floor(Math.min(...idx.map((c) => c[0]))) - 1;
  const i1 = Math.ceil(Math.max(...idx.map((c) => c[0]))) + 1;
  const j0 = Math.floor(Math.min(...idx.map((c) => c[1]))) - 1;
  const j1 = Math.ceil(Math.max(...idx.map((c) => c[1]))) + 1;
  const byInk = new Map<number, number[]>();
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const X = st.x + i * ex[0] + j * ey[0];
      const Y = st.y + i * ex[1] + j * ey[1];
      if (X < x0 || Y < y0 || X > x1 || Y > y1) continue;
      let a = 0, r = 0, g = 0, b = 0;
      for (const [dx, dy] of [[0, 0], [off, 0], [-off, 0], [0, off], [0, -off]]) {
        const o = read(X + dx, Y + dy);
        if (o < 0) continue;
        const al = data[o + 3] / 255;
        a += al;
        r += data[o] * al;
        g += data[o + 1] * al;
        b += data[o + 2] * al;
      }
      if (a < 0.03) continue;
      const cov = (a / 5) * fade(Y);
      if (cov < 0.012) continue;
      const key = (Math.round(r / a / 8) << 10) | (Math.round(g / a / 8) << 5) | Math.round(b / a / 8);
      let list = byInk.get(key);
      if (!list) byInk.set(key, (list = []));
      list.push(X, Y, (D_OF_C(cov) * PITCH) / 2);
    }
  // lightest first on paper, darkest first on the plate, as the portrait
  const lum = (k: number) => 0.2126 * (k >> 10) + 0.7152 * ((k >> 5) & 31) + 0.0722 * (k & 31);
  const keys = [...byInk.keys()].sort((a, b) => (dark ? lum(a) - lum(b) : lum(b) - lum(a)));
  const grow = 0.045 / scale;
  ctx.setTransform(scale, 0, 0, scale, OVER * scale, 0);
  for (const k of keys) {
    const dots = byInk.get(k)!;
    ctx.fillStyle = `rgb(${Math.min(255, (k >> 10) * 8)}, ${Math.min(255, ((k >> 5) & 31) * 8)}, ${Math.min(255, (k & 31) * 8)})`;
    ctx.beginPath();
    for (let n = 0; n < dots.length; n += 3) {
      const r = dots[n + 2] + grow;
      ctx.moveTo(dots[n] + r, dots[n + 1]);
      ctx.arc(dots[n], dots[n + 1], r, 0, TAU);
    }
    ctx.fill();
  }
}

/* ── the path ─────────────────────────────────────────────────────────── */
const WORN_R = mul(rz(-T("turn", SEAT.turn)), mul(pose(T("yaw", HEAD.yaw), T("pitch", HEAD.pitch), T("roll", HEAD.roll)), rx(T("tilt", SEAT.tilt))));
const WORN_S = HEAD.s * T("size", SEAT.size);
const WORN_AT = { x: T("bx", SEAT.x), y: T("by", SEAT.y) };
/**
 * The path, as keys: at progress `p`, the middle of the front at (x, y)
 * (design px), its size against worn, its pose, the arms' fold (far, near),
 * and how much of it has printed in. Between keys every value runs on one C1
 * spline through them, so nothing stops at a key.
 *
 *   print in    under his chin, in the empty paper there, folded, its dots
 *               growing out of nothing with a small wobble;
 *   rise        up the left and out into the paper he is looking at, clear
 *               of his mouth and nose, turning over as it climbs;
 *   open        in front of his face at eye height, over paper, so the arms
 *               read as they swing out, the far one round behind his head;
 *   put on      back onto his nose in depth, overshooting a touch low and
 *               nose-down;
 *   settle      and home; then worn, held until he leaves.
 */
type Key = { p: number; x: number; y: number; s: number; q: Q; fold: [number, number]; ink: number };
const KEYS: Key[] = [
  { p: 0.04, x: 112, y: 606, s: 0.9, q: quat(pose(22, 18, -9)), fold: [1, 1], ink: 0 },
  { p: 0.12, x: 104, y: 590, s: 0.92, q: quat(pose(12, 14, -3)), fold: [1, 1], ink: 1 },
  { p: 0.24, x: 2, y: 480, s: 0.96, q: quat(pose(-12, 10, 7)), fold: [1, 1], ink: 1 },
  { p: 0.36, x: -26, y: 352, s: 1.02, q: quat(pose(-30, -4, 4)), fold: [0.96, 1], ink: 1 },
  { p: 0.52, x: 58, y: 250, s: 1.12, q: quat(mul(pose(-38, -12, 1), rx(6))), fold: [0.1, 0.25], ink: 1 },
  { p: 0.58, x: 66, y: 247, s: 1.12, q: quat(mul(pose(-44, -14, 0), rx(6))), fold: [0, 0], ink: 1 },
  { p: 0.78, x: WORN_AT.x, y: WORN_AT.y + 3, s: 0.995, q: quat(mul(WORN_R, rx(3))), fold: [0, 0], ink: 1 },
  { p: 0.86, x: WORN_AT.x, y: WORN_AT.y, s: 1, q: quat(WORN_R), fold: [0, 0], ink: 1 },
];
/** The keys' rotations, each turned to the same side as the one before, so the spline takes the short way. */
const KQ: Q[] = KEYS.reduce<Q[]>((out, k) => {
  const prev = out[out.length - 1];
  const d = prev ? k.q[0] * prev[0] + k.q[1] * prev[1] + k.q[2] * prev[2] + k.q[3] * prev[3] : 1;
  out.push(d < 0 ? (k.q.map((v) => -v) as Q) : k.q);
  return out;
}, []);

/** Cubic Hermite through the keys, with Catmull-Rom tangents on uneven times; still at both ends. */
function spline(p: number, get: (i: number) => number[]): number[] {
  const n = KEYS.length;
  if (p <= KEYS[0].p) return get(0);
  if (p >= KEYS[n - 1].p) return get(n - 1);
  let i = 0;
  while (KEYS[i + 1].p < p) i++;
  const dt = KEYS[i + 1].p - KEYS[i].p;
  const u = (p - KEYS[i].p) / dt;
  const A = get(i), B = get(i + 1);
  const tan = (j: number) => {
    if (j <= 0 || j >= n - 1) return A.map(() => 0);
    const P0 = get(j - 1), P1 = get(j + 1);
    return P0.map((v, c) => ((P1[c] - v) / (KEYS[j + 1].p - KEYS[j - 1].p)) * dt);
  };
  const ma = tan(i), mb = tan(i + 1);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return A.map((v, c) => h00 * v + h10 * ma[c] + h01 * B[c] + h11 * mb[c]);
}

function placed(p: number, phone: boolean): State {
  const [x0, y, sk, f0, f1, ink] = spline(p, (i) => {
    const k = KEYS[i];
    return [k.x, k.y, k.s, k.fold[0], k.fold[1], k.ink];
  });
  const qv = spline(p, (i) => KQ[i]);
  const n = Math.hypot(...qv) || 1;
  const R = mat(qv.map((v) => v / n) as Q);
  // a small wobble as they print in
  const w = smooth(0.04, 0.2, p);
  const wob = rz(4 * Math.sin(w * Math.PI * 3) * (1 - w));
  // on a phone the box is the screen's width, with no gap beside it: the
  // flight keeps inside the box, nearer him
  const x = phone && x0 < 104 ? 104 + (x0 - 104) * 0.12 : x0;
  return {
    R: mul(wob, R),
    s: WORN_S * sk,
    x,
    y,
    fold: [clamp01(f0), clamp01(f1)],
    hide: smooth(0.6, 0.8, p),
    alpha: clamp01(ink),
  };
}

/** Reduced motion: worn, fading in over the stretch. */
function still(p: number): State {
  return { R: WORN_R, s: WORN_S, x: WORN_AT.x, y: WORN_AT.y, fold: [0, 0], hide: 1, alpha: smooth(0.45, 0.95, p) };
}

/* ── the scroll ───────────────────────────────────────────────────────── */
/**
 * Where the scroll must be for them to be on, in px from the top: pinned
 * (from 56rem, or 48rem in landscape), a little before the pin lets go; in
 * the flow (a phone), when his eyes are a fifth of the window under the
 * header, so they are on while he is still well in view.
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
  const eye = rect.top + y + rect.height * (HEAD.ty / DESIGN_H);
  return Math.max(1, eye - (3.5 * rem + window.innerHeight * 0.22));
}

export function HeroShades() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const box = canvas?.parentElement;
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const held = "shades" in TUNE ? clamp01(TUNE.shades) : null;
    const phone = window.matchMedia("(width < 48rem)");
    const scratch: Scratch = { cov: document.createElement("canvas"), occ: document.createElement("canvas") };
    let end = 1;
    let raf = 0;
    let last = -1;
    let moving = motionAllowed();

    const draw = (force = false) => {
      raf = 0;
      if (box.dataset.state !== "static") {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        last = -1;
        return;
      }
      const p = held ?? clamp01(window.scrollY / end);
      if (!force && Math.abs(p - last) < 1e-4) return;
      last = p;
      const rect = canvas.getBoundingClientRect();
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
      const st = moving ? placed(p, phone.matches) : still(p);
      if (st.alpha <= 0.001) return;
      paint(ctx, w / (DESIGN_W + OVER), resolvedTheme() === "dark" ? PLATE : PAPER, st, scratch);
    };
    const frame = () => {
      if (!raf) raf = requestAnimationFrame(() => draw());
    };
    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => draw(true));
    };
    const relayout = () => {
      end = endOfScroll(box);
      redraw();
    };

    const ro = new ResizeObserver(relayout);
    ro.observe(box);
    // the portrait draws itself asynchronously; the glasses wait for it
    const mo = new MutationObserver(redraw);
    mo.observe(box, { attributes: true, attributeFilter: ["data-state"] });
    window.addEventListener("scroll", frame, { passive: true });
    window.addEventListener("resize", relayout);
    const offTheme = onThemeChange(redraw);
    const offMotion = onMotionChange(() => {
      moving = motionAllowed();
      redraw();
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
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="portrait-shades" />;
}
