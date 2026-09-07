/**
 * The board: one field of dots at the page pitch that becomes the portrait.
 *
 * Dependency-free 2D canvas. Every cell of a baked field has a home on the
 * grid. Nothing ever travels during assembly: cells grow in place, brightest
 * and most central first, so the lattice becomes the face. Afterwards the
 * pointer is a light (dots part a little and brighten a lot, on damped
 * springs), and scrolling disperses every lit dot along its own seeded line
 * onto the fixed page lattice, where it becomes indistinguishable from the
 * field and stops being drawn. Scrolling back reconnects the dots.
 *
 * Rendering batches dots by (colour, tone, diameter) with a counting sort
 * each frame, so a field is a couple of hundred path fills rather than one
 * call per dot, and the two smallest diameters (the unlit field and the
 * first step of growth, about a pixel) are squares, which cost a fraction of
 * an arc and cover the same pixels. Fields are baked at double density
 * (portrait-field-*.ts: 192 x 240 with 15,970 lit cells for the hero,
 * 128 x 160 with 7,150 on a phone), so a settled hero frame is ~16k lit dots
 * on a desktop and ~7k on a phone. The addendum's 2.4 ms / 6.3k-dot figure
 * predates that bake; re-measure on a mid-range Android against the 3 ms
 * phone budget (spec §10) before trusting a number here.
 *
 * Idle costs zero frames: `frame()` reports whether anything is still moving
 * and the caller stops scheduling when it is not.
 */
import type { BoardField } from "@/content/portrait-types";

export type BoardMode = "hero" | "still" | "afterimage" | "text";

/** Luminance below which a cell is drawn unlit (the field's own dot). */
export const UNLIT = 0.05;

export function decodeField(field: BoardField): Uint8Array {
  const bin = atob(field.data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * The surface, read out of the picture.
 *
 * A dot portrait made of luminance is a photograph of a lit face, so the
 * luminance gradient across it points down the slope of the form: steeply at
 * the edge of the nose and the line of the jaw, gently across a cheek. Treated
 * as a height field it gives a normal per cell, and a normal is all you need to
 * light the face again from somewhere else. Nothing is baked and no asset
 * grows: this is the field the board already decoded, differentiated.
 *
 * Two things make it read as sculpture rather than as noise.
 *
 * The gradient is taken over a radius of RELIGHT_BLUR cells, not between
 * neighbours. At one cell the dominant signal is the halftone itself and the
 * result is static; at four it is the form.
 *
 * The rim is excluded by the caller. The photograph is backlit, so the bright
 * edge is the silhouette — the contour furthest from the viewer — and not the
 * nearest surface. Shading it as if it faced you turns the portrait inside out
 * the moment the light moves off-axis. `field.rim` already marks those cells
 * for the accent colour, and it marks exactly the ones to leave flat.
 *
 * Returns nx and ny in -1..1, one pair per cell, zero where there is no
 * gradient worth having.
 */
const RELIGHT_BLUR = 6; // cells: the radius the slope is measured over

/**
 * The turn, shared by both renderers so they cannot disagree about where the
 * plate is in its rotation.
 *
 * An engraver cuts a plate in reverse, because the sheet it prints is the
 * plate's mirror. So the field is drawn reversed until the pull and the right
 * way round after it — and it gets there by turning over, not by being swapped,
 * because a swap is a jump cut and a turn is what actually happens at a press.
 *
 * This is the x scale of a plate rotating about a vertical axis: `cos(theta)`
 * as theta runs from pi to 0. It is −1 while the plate is still a plate, passes
 * through 0 edge-on at exactly `pull = 0.5`, and reaches +1 on the sheet.
 *
 * That midpoint is not a coincidence and it is load-bearing: `pull = 0.5` is
 * also where dot-board steps the page palette from plate to paper. The one
 * frame where the whole field collapses to a hairline is the frame the ground
 * inverts under it, so the hardest cut on the site happens behind the one
 * moment there is almost nothing on screen to see it with.
 */
export function flipOf(pull: number): number {
  const u = Math.min(1, Math.max(0, (pull - 0.5) / (2 * FLIP_HALF) + 0.5));
  return -Math.cos(Math.PI * u);
}

/** Half the width, in `pull`, of the turn. Outside it the plate is flat on. */
const FLIP_HALF = 0.2;

/**
 * How far the relight may push a dot's luminance, as a fraction of itself.
 *
 * Tuned against the picture, not by feel. At 0.38 the relit portrait keeps a
 * 0.95 correlation with the original across every sun angle and its mean tone
 * moves by under 2%, so the likeness is never in question; the largest single
 * dot moves by 0.38 of the range, which is plainly visible. At 0.45 the
 * correlation falls to 0.89 and the cheek starts to read as noise rather than
 * as form.
 */
export const RELIGHT_GAIN = 0.38;

export function surfaceNormals(
  bytes: Uint8Array,
  w: number,
  h: number,
): { nx: Float32Array; ny: Float32Array } {
  // Separable box blur first, so the gradient sees the form and not the dots.
  const lum = new Float32Array(w * h);
  for (let i = 0; i < bytes.length; i++) lum[i] = bytes[i] / 255;
  const tmp = new Float32Array(w * h);
  const r = RELIGHT_BLUR;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    let count = 0;
    for (let x = -r; x <= r; x++) {
      if (x >= 0 && x < w) {
        sum += lum[y * w + x];
        count++;
      }
    }
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / count;
      const drop = x - r;
      const add = x + r + 1;
      if (drop >= 0) {
        sum -= lum[y * w + drop];
        count--;
      }
      if (add < w) {
        sum += lum[y * w + add];
        count++;
      }
    }
  }
  const flat = new Float32Array(w * h);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let y = -r; y <= r; y++) {
      if (y >= 0 && y < h) {
        sum += tmp[y * w + x];
        count++;
      }
    }
    for (let y = 0; y < h; y++) {
      flat[y * w + x] = sum / count;
      const drop = y - r;
      const add = y + r + 1;
      if (drop >= 0) {
        sum -= tmp[drop * w + x];
        count--;
      }
      if (add < h) {
        sum += tmp[add * w + x];
        count++;
      }
    }
  }

  const nx = new Float32Array(w * h);
  const ny = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bytes[i] === 0) continue;
      const xl = flat[y * w + Math.max(0, x - 1)];
      const xr = flat[y * w + Math.min(w - 1, x + 1)];
      const yu = flat[Math.max(0, y - 1) * w + x];
      const yd = flat[Math.min(h - 1, y + 1) * w + x];
      // Downhill in luminance is away from the original key light, so the
      // normal points up the gradient. Scaled so a typical slope lands near
      // unit length rather than clipping.
      const gx = (xr - xl) * 12;
      const gy = (yd - yu) * 12;
      const len = Math.hypot(gx, gy);
      if (len < 0.02) continue;
      const k = Math.min(1, len) / len;
      nx[i] = gx * k;
      ny[i] = gy * k;
    }
  }
  return { nx, ny };
}

export type BoardColors = {
  ink: string;
  sun: string;
  off: string;
  /** The ink the plate is worked in, before the sheet is pulled. */
  bone?: string;
};

export type BoardOptions = {
  mode: BoardMode;
  colors: BoardColors;
  /** A fine pointer is available: the pin bed and light are active. */
  pointer: boolean;
  /** Deterministic seed for scatter vectors and assembly noise. */
  seed?: number;
};

export type Cell = { x: number; y: number; L: number };

export type Board = {
  /**
   * Geometry in CSS px. `originX/Y` is where the field's cell (0,0) sits in the
   * canvas; `pitch` is the cell size; `lattice` is the page pitch (cells are
   * the lattice or a whole fraction of it: portrait fields are baked at half
   * the lattice, so every second cell sits on a page dot); the canvas is
   * `width x height` CSS px at `dpr`. Call on every resize and, for the fixed
   * hero canvas, on every scroll.
   */
  layout: (g: {
    width: number;
    height: number;
    originX: number;
    originY: number;
    pitch: number;
    lattice: number;
    dpr: number;
  }) => void;
  /** Begin the assembly clock. */
  assemble: (now: number) => void;
  /** Jump to the settled portrait. */
  settle: () => void;
  /**
   * Pointer in canvas CSS px, or null when it leaves. `vx` / `vy` are how
   * fast it is travelling, in CSS px per second, which is what decides
   * whether the pointer is a light or an adversary (see TEAR_SPEED).
   */
  pointer: (x: number | null, y: number | null, vx?: number, vy?: number) => void;
  /**
   * The pull. 0 is the plate: marks in bone on a near-black ground, and on the
   * GPU path mirrored, because an intaglio plate is cut in reverse. 1 is the
   * printed sheet. Only the arrival ever moves it.
   */
  setPull: (t: number) => void;
  /** Dispersal 0..1 (hero only). */
  scroll: (t: number) => void;
  /** Disable the pin bed (governor). Light stays. */
  disablePush: () => void;
  /** Advance and draw. Returns true while another frame is needed. */
  frame: (now: number) => boolean;
  /** Draw the settled portrait once, no physics. */
  drawSettled: () => void;
  /** Which cell is under a canvas CSS px point, for the readout. */
  cellAt: (x: number, y: number) => Cell | null;
  count: number;
  dispose: () => void;
};

/** Mulberry32, so the scatter pattern is identical on every visit. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function parseColor(input: string, fallback: [number, number, number]): [number, number, number] {
  const s = input.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(s);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return fallback;
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r} ${g} ${bl})`;
}

/**
 * Ink on paper. Every value measured offline before it was written; the same
 * constants appear in src/lib/field/gl-board.ts and the two must not drift.
 *
 * LIFT is not optional: straight inversion crushes the hair and the shadow
 * side to solid and loses the eye. DEEP_FLOOR holds the 27% of the mask below
 * UNLIT, which is otherwise the largest single cause of mud. 1.128 is 2/sqrt(pi),
 * the radius whose disc area equals the coverage. A dot below CULL_DIA is grey
 * haze, and the absence of a dot is a highlight.
 */
const LIFT = 0.55;
const INK_GAIN = 1.15;
const DEEP_FLOOR = 0.16;
const CULL_DIA = 0.3;
const INK_DIA_MAX = 1.42;
const BURNISH = 0.55;

/**
 * The burin and the stochastic screen are both gone; gl-board.ts carries the
 * measurement and the reasoning, and the two renderers must not drift.
 *
 * Short version: a 1.7-cell stroke crosses an eyelid rather than drawing it at
 * this cell size, the threshold fired on 46.8% of the cells in his face against
 * the 28% intended, and the tangents closed into concentric whorls. The jitter
 * existed only to keep those strokes from lining up, so it went with them —
 * and it was costing a third of a cell of placement error on every mark.
 */

const TONES = 8; // colour steps between --dot-off and --ink / --sun
const DIAS = 16; // diameter steps, in cells, between 0 and INK_DIA_MAX
/** Below this tone a cell is "the field": drawn only where a page dot is. */
const ASSEMBLE_MS = 1100;
const GROW_MS = 500;
// Critically damped: the pair below has real eigenvalues (modulus ~0.7), so a
// dot reaches its target in ~20 frames with no overshoot, and the loop can
// stop the frame after the last dot rests.
const SPRING_K = 0.2;
const SPRING_DAMP = 0.6;
const REST_V = 0.05; // px: below this, a dot is at rest

/**
 * The tear.
 *
 * Move the pointer slowly and it is a light: the dots brighten and lean away
 * from it, measured from each dot's home, and the formation holds. Move it
 * fast and it stops being a light and starts being a hand — a narrower, harder
 * core that grabs whatever is actually under it and throws that material along
 * the direction of travel. Then the spring, which never changed, pulls every
 * dot home.
 *
 * That is the whole argument the site is making, as an interaction rather than
 * a sentence: perturb it and it converges. It is triggered by speed, never by a
 * button, for two reasons. A held drag is also a text selection, and tearing
 * the field while someone selects a heading is a bug, not a feature. And a
 * thing you find by accident is worth more than a thing you are told about.
 *
 * The impulse is applied to VELOCITY, from the dot's LIVE position — unlike
 * the light, which moves a target and is measured from home. That is what makes
 * it feel like material rather than like a field: the dots keep the momentum
 * they were given and coast, and the spring has to win them back.
 */
export const TEAR_SPEED = 600; // px/s: below this the pointer is only a light
const TEAR_FULL = 1800; // px/s: fully torn
const TEAR_CELLS = 10; // radius in lattice steps; the light's is 18
const TEAR_IMPULSE = 2.2; // lattice steps of velocity at the core, fully torn
const TEAR_DECAY = 0.86; // per frame once the pointer stops moving

export function createBoard(canvas: HTMLCanvasElement, field: BoardField, opts: BoardOptions): Board | null {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  const bytes = decodeField(field);
  const W = field.w;
  const H = field.h;

  // ── Static per-cell data ────────────────────────────────────────────────
  let n = 0;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] > 0) n++;
  const gx = new Uint16Array(n);
  const gy = new Uint16Array(n);
  const lum = new Float32Array(n); // 0..1
  const kind = new Uint8Array(n); // 0 ink, 1 sun (rim or datum)
  const snx = new Float32Array(n); // surface normal, for the relight
  const sny = new Float32Array(n);
  const isDatum = new Uint8Array(n);
  const delay = new Float32Array(n); // assembly start, ms
  const scx = new Float32Array(n); // scatter vector, CSS px
  const scy = new Float32Array(n);
  const cellIndex = new Int32Array(W * H).fill(-1);

  const rim = new Set(field.rim);
  // The face is relit from the pointer, so every dot needs to know which way
  // its patch of skin is facing. Costs one pass over the field at build time.
  // Normals used to be a relight-only luxury, so they were gated on the pointer
  // being available. The burin's direction comes from them now, and the burin
  // is the picture -- under reduced motion, where there is no pointer at all,
  // gating them here would hand that visitor a flat hatch instead of one that
  // follows his face.
  const shaped = opts.mode === "hero" || opts.mode === "still";
  const normals = shaped ? surfaceNormals(bytes, W, H) : null;
  const rand = rng(opts.seed ?? 11);
  const [cx0, cy0] = field.center;
  const [dx0, dy0] = field.datum;
  const maxDist = Math.hypot(W, H) * 0.6;
  let lit = 0;
  {
    let k = 0;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const v = bytes[j * W + i];
        if (v === 0) continue;
        gx[k] = i;
        gy[k] = j;
        const L = v / 255;
        lum[k] = L;
        const datum = i === dx0 && j === dy0;
        isDatum[k] = datum ? 1 : 0;
        kind[k] = datum || rim.has(j * W + i) ? 1 : 0;
        if (normals && kind[k] === 0) {
          snx[k] = normals.nx[j * W + i];
          sny[k] = normals.ny[j * W + i];
        }
        if (L >= UNLIT) lit++;
        const dist = Math.hypot(i - cx0, j - cy0) / maxDist;
        delay[k] = datum ? 0 : 600 * (0.55 * Math.min(1, dist) + 0.25 * (1 - L) + 0.2 * rand());
        const ang = rand() * Math.PI * 2;
        const len = 60 + rand() * 200;
        scx[k] = Math.cos(ang) * len;
        scy[k] = Math.sin(ang) * len - 40;
        cellIndex[j * W + i] = k;
        k++;
      }
    }
  }

  // ── Dynamic state, CSS px ────────────────────────────────────────────────
  const px = new Float32Array(n); // displacement from the (moving) home
  const py = new Float32Array(n);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const bucketOf = new Uint16Array(n);
  const order = new Int32Array(n);
  const counts = new Int32Array(2 * TONES * DIAS + 1);

  let width = 0;
  let height = 0;
  let originX = 0;
  let originY = 0;
  let pitch = 6; // cell size
  let lattice = 6; // page pitch
  let density = 1; // cells per lattice step
  let dpr = 1;
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  /** 0..1: how hard the pointer is currently tearing, and which way. */
  let tear = 0;
  let tearX = 0;
  let tearY = 0;
  let scrollT = 0;
  let pushEnabled = opts.pointer && opts.mode === "hero";
  const lightEnabled = opts.pointer && (opts.mode === "hero" || opts.mode === "still" || opts.mode === "text");
  let assembling = false;
  let assembleStart = 0;
  let settled = opts.mode === "afterimage";
  let dirty = true;
  let disposed = false;

  const inkRGB = parseColor(opts.colors.ink, [20, 18, 14]);
  const sunRGB = parseColor(opts.colors.sun, [168, 50, 27]);
  const offRGB = parseColor(opts.colors.off, [231, 225, 214]);
  // The ink the plate is worked in, before the sheet is pulled.
  const boneRGB = parseColor(opts.colors.bone ?? "#efe9dc", [239, 233, 220]);
  /** 0 while the plate is worked, 1 once the sheet is printed. */
  let pull = 1;
  const palette: string[] = [];
  const rebuildPalette = () => {
    palette.length = 0;
    const mark: [number, number, number] = [
      boneRGB[0] + (inkRGB[0] - boneRGB[0]) * pull,
      boneRGB[1] + (inkRGB[1] - boneRGB[1]) * pull,
      boneRGB[2] + (inkRGB[2] - boneRGB[2]) * pull,
    ];
    for (let k = 0; k < 2; k++)
      for (let t = 0; t < TONES; t++)
        palette.push(mix(offRGB, k === 0 ? mark : sunRGB, t / (TONES - 1)));
  };
  rebuildPalette();

  // The lattice: page dots sit at (k * pitch + 0.5), the top-left pixel of
  // each tile. Cells land on the same grid so an unlit cell and the field
  // beneath it are the same pixel.
  // Jitter is baked once per cell rather than recomputed every frame: it is a
  // property of the plate, not of the moment.
  const homeX = (i: number) => originX + gx[i] * pitch + 0.5;
  const homeY = (i: number) => originY + gy[i] * pitch + 0.5;
  const snap = (v: number) => Math.round((v - 0.5) / lattice) * lattice + 0.5;

  function layout(g: { width: number; height: number; originX: number; originY: number; pitch: number; lattice: number; dpr: number }) {
    const resized = g.width !== width || g.height !== height || g.dpr !== dpr;
    width = g.width;
    height = g.height;
    originX = g.originX;
    originY = g.originY;
    pitch = g.pitch;
    lattice = g.lattice;
    density = Math.max(1, Math.round(lattice / pitch));
    dpr = g.dpr;
    if (resized) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      // The CSS box follows the bitmap, never the other way round: a fixed
      // canvas sized 100vh by CSS would be stretched wherever 100vh and
      // innerHeight disagree (a phone with its toolbar showing).
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    dirty = true;
  }

  function assemble(now: number) {
    assembling = true;
    settled = false;
    assembleStart = now;
    dirty = true;
  }

  function settle() {
    assembling = false;
    settled = true;
    dirty = true;
  }

  function pointer(x: number | null, y: number | null, vx = 0, vy = 0) {
    pointerX = x;
    pointerY = y;
    const speed = Math.hypot(vx, vy);
    if (x === null || y === null || !pushEnabled || speed <= TEAR_SPEED) return;
    // Ramp rather than a switch: at 600 px/s nothing happens, at 1800 the
    // core is at full strength, so there is no moment where the field snaps
    // into a different mode.
    const k = Math.min(1, (speed - TEAR_SPEED) / (TEAR_FULL - TEAR_SPEED));
    if (k <= tear) return;
    tear = k;
    tearX = vx / speed;
    tearY = vy / speed;
    dirty = true;
  }

  function scroll(t: number) {
    scrollT = Math.min(1, Math.max(0, t));
    dirty = true;
  }

  /**
   * The pull. 0 is the plate, 1 is the printed sheet. The 2D board cannot
   * The palette is rebuilt rather than mixed per dot: sixteen entries against
   * tens of thousands of marks. The geometric half of the inversion -- the
   * turn -- is read from the same value in `draw`, so a single number carries
   * the whole pull and the two halves cannot come apart.
   */
  function setPull(t: number) {
    const next = Math.min(1, Math.max(0, t));
    if (next === pull) return;
    pull = next;
    rebuildPalette();
    dirty = true;
  }

  function disablePush() {
    pushEnabled = false;
  }

  /**
   * One frame: compute every dot's target displacement, tone and diameter,
   * integrate springs, counting-sort by bucket, and fill one path per bucket.
   */
  function draw(now: number, physics: boolean): boolean {
    const c = ctx as CanvasRenderingContext2D;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);

    // The turn (see `flipOf`), about the box's own centre rather than the
    // canvas's, because in hero mode the canvas is the whole viewport and the
    // board is one column of it.
    //
    // This is the one place the 2D floor does something the GPU cannot:
    // `gl_PointSize` is isotropic, so over there a foreshortened mark can only
    // shrink, while a context scale squashes the marks themselves and the discs
    // foreshorten into ellipses. A singular matrix draws nothing at all, so the
    // edge-on frame is held at 2% rather than 0 -- which is the hairline the
    // plate should read as anyway.
    const flip = flipOf(pull);
    if (flip !== 1) {
      const f = Math.abs(flip) < 0.02 ? 0.02 * Math.sign(flip || -1) : flip;
      const axis = originX + (W * pitch) / 2;
      c.transform(f, 0, 0, 1, axis * (1 - f), 0);
    }

    const elapsed = assembling ? now - assembleStart : Infinity;
    if (assembling && elapsed >= ASSEMBLE_MS) {
      assembling = false;
      settled = true;
    }
    const t = opts.mode === "hero" ? scrollT : 0;
    const t2 = t * t;
    const hasPointer = pointerX !== null && pointerY !== null && lightEnabled;
    const R = 18 * lattice;

    // The sun. The pointer is not a lamp hanging over the picture, it is the
    // direction the light comes FROM: one direction for the whole face, so the
    // lit side changes as a whole and the portrait reads as one solid object
    // being turned to the light rather than as a torch playing over a wall.
    //
    // It fades out past a board-and-a-half so a pointer parked somewhere else
    // on the page does not hold a raking light on the face forever, and so
    // scrolling away returns the portrait to the photograph it came from.
    let sunX = 0;
    let sunY = 0;
    if (normals && hasPointer) {
      const dx = (pointerX as number) - (originX + (W * pitch) / 2);
      const dy = (pointerY as number) - (originY + (H * pitch) / 2);
      const d = Math.hypot(dx, dy);
      const reach = Math.hypot(W * pitch, H * pitch) * 0.5;
      if (d > 1) {
        const fade = 1 - smoothstep(reach, reach * 2, d);
        sunX = (dx / d) * fade;
        sunY = (dy / d) * fade;
      }
    }
    const relighting = sunX !== 0 || sunY !== 0;
    // Read once per frame, then decay: a pointer that stops moving stops
    // tearing within about a fifth of a second, and the spring takes over.
    const tearNow = pointerX !== null && pointerY !== null ? tear : 0;
    const tearR = TEAR_CELLS * lattice;
    if (physics) tear = tear < 0.01 ? 0 : tear * TEAR_DECAY;
    const afterimage = opts.mode === "afterimage";

    counts.fill(0);
    let moving = false;
    let restV = 0;

    // Pass 1: state and bucket per dot.
    for (let i = 0; i < n; i++) {
      const L0 = lum[i];
      const unlit = L0 < UNLIT;
      const datum = isDatum[i] === 1;

      // Assembly: grow in place from the unlit size, colour from off to ink.
      let grow = 1;
      if (assembling && !datum) {
        const local = (elapsed - delay[i]) / GROW_MS;
        grow = local <= 0 ? 0 : easeOutExpo(Math.min(1, local));
        if (local < 1) moving = true;
      }
      if (settled === false && !assembling) grow = 0; // lattice frame zero

      // Home moves with the page; the dispersal target is fixed in the viewport.
      const hx = homeX(i);
      const hy = homeY(i);
      let tx = 0;
      let ty = 0;
      if (t > 0 && !datum && !unlit) {
        const fx = snap(hx + scx[i]);
        const fy = snap(hy + scy[i]);
        tx = (fx - hx) * t2;
        ty = (fy - hy) * t2;
      }

      // The light: brightness and diameter under the pointer, a little push.
      // Measured from the dot's home, not its displaced position, so the
      // target is fixed while the pointer rests and the spring settles fast.
      let f = 0;
      if (hasPointer) {
        const dx = hx - (pointerX as number);
        const dy = hy - (pointerY as number);
        const d = Math.hypot(dx, dy);
        if (d < R) {
          const s = 1 - smoothstep(0, R, d);
          f = s * s;
          if (pushEnabled && d > 0.001 && !datum) {
            tx += (dx / d) * 1.6 * lattice * f;
            ty += (dy / d) * 1.6 * lattice * f;
          }
        }
      }

      if (physics) {
        const ax = (tx - px[i]) * SPRING_K;
        const ay = (ty - py[i]) * SPRING_K;
        vx[i] = (vx[i] + ax) * SPRING_DAMP;
        vy[i] = (vy[i] + ay) * SPRING_DAMP;
        // The tear, after the spring and before the integrate, so the impulse
        // survives one whole frame instead of being damped on arrival.
        if (tearNow > 0 && !datum) {
          const lx = hx + px[i] - (pointerX as number);
          const ly = hy + py[i] - (pointerY as number);
          const ld = Math.hypot(lx, ly);
          if (ld < tearR) {
            const g = 1 - ld / tearR;
            const w = g * g * tearNow * TEAR_IMPULSE * lattice;
            // Mostly along the travel, a quarter outward: pure travel shears
            // the field into a smear, pure outward is just a bigger pin bed.
            const ox = ld > 0.001 ? lx / ld : 0;
            const oy = ld > 0.001 ? ly / ld : 0;
            vx[i] += (tearX * 0.75 + ox * 0.25) * w;
            vy[i] += (tearY * 0.75 + oy * 0.25) * w;
          }
        }
        px[i] += vx[i];
        py[i] += vy[i];
        const sp = Math.abs(vx[i]) + Math.abs(vy[i]) + Math.abs(tx - px[i]) + Math.abs(ty - py[i]);
        if (sp > restV) restV = sp;
      } else {
        px[i] = tx;
        py[i] = ty;
      }

      // Tone and diameter. The relight lands on the dot's own luminance
      // before the pointer's light is added, and never pushes a lit dot below
      // UNLIT: one that fell through would stop being part of the portrait and
      // become a lattice dot, which reads as a hole rather than as shadow.
      let L1 = L0;
      if (relighting && !unlit && kind[i] === 0) {
        L1 = L0 * (1 + RELIGHT_GAIN * (snx[i] * sunX + sny[i] * sunY));
        L1 = L1 < UNLIT ? UNLIT : L1 > 1 ? 1 : L1;
      }
      const L = unlit ? (f > 0 ? UNLIT : 0) : Math.min(1, L1 + 0.25 * f);

      // Ink, not light. Value is carried by AREA alone; the tone channel is
      // gone. On a dark ground luminance was encoded twice, in tone and in
      // diameter, and tone did most of the perceptual work -- invert the ground
      // and that same formula gives mid-grey dots on near-white, which the eye
      // integrates into one flat grey. The ink is always full black now, the
      // paper always full white, and the grey is an optical average of
      // hard-edged marks.
      const inked = Math.pow(Math.max(L, DEEP_FLOOR), LIFT);
      let coverage = Math.pow(1 - inked, INK_GAIN);
      // Light on paper is LESS ink: the pointer burnishes a highlight into the
      // plate rather than lighting it.
      coverage *= 1 - BURNISH * f;
      coverage *= grow;
      let dia = Math.min(1.128 * Math.sqrt(Math.max(coverage, 0)), INK_DIA_MAX);
      if (t > 0) dia *= 1 - t;
      // One ink: the datum is the only mark allowed to be the second.
      const tone = 1;
      if (datum) dia = 0.96 * density;
      else if (dia < CULL_DIA) {
        bucketOf[i] = 65535;
        continue;
      }
      if (afterimage) {
        if (unlit) {
          bucketOf[i] = 65535;
          continue;
        }
        dia = Math.max(CULL_DIA, dia * 0.5);
      }
      // Fully dispersed dots are the field: not drawn.
      if (t >= 1 && !datum) {
        bucketOf[i] = 65535;
        continue;
      }
      // Off-canvas dots are not drawn either.
      const X = hx + px[i];
      const Y = hy + py[i];
      if (X < -pitch || Y < -pitch || X > width + pitch || Y > height + pitch) {
        bucketOf[i] = 65535;
        continue;
      }
      const ti = Math.round(Math.min(1, Math.max(0, tone)) * (TONES - 1));
      const di = Math.round((Math.min(INK_DIA_MAX, dia) / INK_DIA_MAX) * (DIAS - 1));
      // The palette lane is the DATUM, not the rim. On a dark ground the rim
      // was a light source and earned the accent; on paper there is no light,
      // so the rim is ink like everything else and the catchlight in his eye is
      // the one mark on the page that is the second ink. `kind` still carries
      // the rim so the relight can leave it flat.
      const b = (isDatum[i] * TONES + ti) * DIAS + di;
      bucketOf[i] = b;
      counts[b + 1]++;
    }

    // Pass 2: counting sort.
    for (let b = 1; b < counts.length; b++) counts[b] += counts[b - 1];
    const fill = counts.slice(0, counts.length - 1);
    for (let i = 0; i < n; i++) {
      const b = bucketOf[i];
      if (b === 65535) continue;
      order[fill[b]++] = i;
    }

    // Pass 3: one path per bucket.
    // Just under half the ink: at a tenth the ghost matched the lattice's own
    // dots and the rail read as empty ground; at a third it still could not
    // hold the space its own height makes.
    c.globalAlpha = afterimage ? 0.45 : 1;
    for (let b = 0; b < 2 * TONES * DIAS; b++) {
      const start = counts[b];
      const end = counts[b + 1];
      if (start === end) continue;
      const k = Math.floor(b / (TONES * DIAS));
      const ti = Math.floor(b / DIAS) % TONES;
      const di = b % DIAS;
      // Must be the inverse of the bucket index above. The old mapping ran
      // DIA_MIN..DIA_MAX; the ink transfer runs 0..INK_DIA_MAX, and mixing the
      // two draws every dot at the wrong size.
      const dia = (di / (DIAS - 1)) * INK_DIA_MAX;
      const r = (dia * pitch) / 2;
      c.fillStyle = palette[k * TONES + ti];
      c.beginPath();



      if (di <= 1) {
        // The two smallest buckets are about a pixel across: a square is the
        // same pixels as a disc that small at a fraction of the path cost,
        // and never smaller than the 1 px lattice dot, so an unlit cell is
        // exactly the field's own dot.
        const s = Math.max(1, 2 * r);
        const h = s / 2;
        for (let q = start; q < end; q++) {
          const i = order[q];
          c.rect(homeX(i) + px[i] - h, homeY(i) + py[i] - h, s, s);
        }
      } else {
        for (let q = start; q < end; q++) {
          const i = order[q];
          const X = homeX(i) + px[i];
          const Y = homeY(i) + py[i];
          c.moveTo(X + r, Y);
          c.arc(X, Y, r, 0, Math.PI * 2);
        }
      }
      c.fill();
    }
    c.globalAlpha = 1;

    if (restV > REST_V || tear > 0) moving = true;
    return moving;
  }

  function frame(now: number): boolean {
    if (disposed || width === 0) return false;
    if (settled === false && !assembling) {
      // Frame zero: the lattice only.
      draw(now, false);
      dirty = false;
      return false;
    }
    const more = draw(now, true);
    dirty = false;
    return more;
  }

  function drawSettled() {
    settled = true;
    assembling = false;
    draw(0, false);
    dirty = false;
  }

  function cellAt(x: number, y: number): Cell | null {
    const i = Math.floor((x - originX) / pitch);
    const j = Math.floor((y - originY) / pitch);
    if (i < 0 || j < 0 || i >= W || j >= H) return null;
    const k = cellIndex[j * W + i];
    if (k < 0) return null;
    return { x: i, y: j, L: lum[k] };
  }

  void dirty;

  return {
    layout,
    assemble,
    settle,
    pointer,
    setPull,
    scroll,
    disablePush,
    frame,
    drawSettled,
    cellAt,
    count: lit,
    dispose: () => {
      disposed = true;
    },
  };
}
