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
 * each frame, so a 5.7k-cell field is a couple of hundred path fills rather
 * than thousands of arcs: ~2 ms on a laptop, well inside a phone's budget.
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

export type BoardColors = { ink: string; sun: string; off: string };

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
   * canvas; `pitch` is the page pitch; the canvas is `width x height` CSS px at
   * `dpr`. Call on every resize and, for the fixed hero canvas, on every scroll.
   */
  layout: (g: { width: number; height: number; originX: number; originY: number; pitch: number; dpr: number }) => void;
  /** Begin the assembly clock. */
  assemble: (now: number) => void;
  /** Jump to the settled portrait. */
  settle: () => void;
  /** Pointer in canvas CSS px, or null when it leaves. */
  pointer: (x: number | null, y: number | null) => void;
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

const TONES = 8; // colour steps between --dot-off and --ink / --sun
const DIAS = 16; // diameter steps between 0.18 and 1.3 pitch
const DIA_MIN = 0.18;
const DIA_MAX = 1.3;
const ASSEMBLE_MS = 1100;
const GROW_MS = 500;
const SPRING_K = 0.14;
const SPRING_DAMP = 0.74;
const REST_V = 0.01; // px

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
  const isDatum = new Uint8Array(n);
  const delay = new Float32Array(n); // assembly start, ms
  const scx = new Float32Array(n); // scatter vector, CSS px
  const scy = new Float32Array(n);
  const cellIndex = new Int32Array(W * H).fill(-1);

  const rim = new Set(field.rim);
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
  let pitch = 6;
  let dpr = 1;
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  let scrollT = 0;
  let pushEnabled = opts.pointer && opts.mode === "hero";
  const lightEnabled = opts.pointer && (opts.mode === "hero" || opts.mode === "still" || opts.mode === "text");
  let assembling = false;
  let assembleStart = 0;
  let settled = opts.mode === "afterimage";
  let dirty = true;
  let disposed = false;

  const inkRGB = parseColor(opts.colors.ink, [242, 241, 236]);
  const sunRGB = parseColor(opts.colors.sun, [255, 106, 43]);
  const offRGB = parseColor(opts.colors.off, [35, 35, 38]);
  const palette: string[] = [];
  for (let k = 0; k < 2; k++)
    for (let t = 0; t < TONES; t++)
      palette.push(mix(offRGB, k === 0 ? inkRGB : sunRGB, t / (TONES - 1)));

  // The lattice: page dots sit at (k * pitch + 0.5), the top-left pixel of
  // each tile. Cells land on the same grid so an unlit cell and the field
  // beneath it are the same pixel.
  const homeX = (i: number) => originX + gx[i] * pitch + 0.5;
  const homeY = (i: number) => originY + gy[i] * pitch + 0.5;
  const snap = (v: number) => Math.round((v - 0.5) / pitch) * pitch + 0.5;

  function layout(g: { width: number; height: number; originX: number; originY: number; pitch: number; dpr: number }) {
    const resized = g.width !== width || g.height !== height || g.dpr !== dpr;
    width = g.width;
    height = g.height;
    originX = g.originX;
    originY = g.originY;
    pitch = g.pitch;
    dpr = g.dpr;
    if (resized) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
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

  function pointer(x: number | null, y: number | null) {
    pointerX = x;
    pointerY = y;
    dirty = true;
  }

  function scroll(t: number) {
    scrollT = Math.min(1, Math.max(0, t));
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

    const elapsed = assembling ? now - assembleStart : Infinity;
    if (assembling && elapsed >= ASSEMBLE_MS) {
      assembling = false;
      settled = true;
    }
    const t = opts.mode === "hero" ? scrollT : 0;
    const t2 = t * t;
    const hasPointer = pointerX !== null && pointerY !== null && lightEnabled;
    const R = 18 * pitch;
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
      let f = 0;
      if (hasPointer) {
        const dx = hx + px[i] - (pointerX as number);
        const dy = hy + py[i] - (pointerY as number);
        const d = Math.hypot(dx, dy);
        if (d < R) {
          const s = 1 - smoothstep(0, R, d);
          f = s * s;
          if (pushEnabled && d > 0.001 && !datum) {
            tx += (dx / d) * 1.6 * pitch * f;
            ty += (dy / d) * 1.6 * pitch * f;
          }
        }
      }

      if (physics) {
        const ax = (tx - px[i]) * SPRING_K;
        const ay = (ty - py[i]) * SPRING_K;
        vx[i] = (vx[i] + ax) * SPRING_DAMP;
        vy[i] = (vy[i] + ay) * SPRING_DAMP;
        px[i] += vx[i];
        py[i] += vy[i];
        const sp = Math.abs(vx[i]) + Math.abs(vy[i]) + Math.abs(tx - px[i]) + Math.abs(ty - py[i]);
        if (sp > restV) restV = sp;
      } else {
        px[i] = tx;
        py[i] = ty;
      }

      // Tone and diameter.
      const L = unlit ? (f > 0 ? UNLIT : 0) : Math.min(1, L0 + 0.25 * f);
      let dia: number;
      let tone: number;
      if (datum) {
        dia = 0.96;
        tone = 1;
      } else if (L < UNLIT && f === 0) {
        dia = DIA_MIN;
        tone = 0;
      } else {
        const base = DIA_MIN + 0.78 * L;
        dia = DIA_MIN + (base - DIA_MIN) * grow;
        dia *= 1 + 0.35 * f;
        tone = grow;
        if (t > 0) {
          dia = dia + (DIA_MIN - dia) * t;
          tone *= 1 - Math.min(1, Math.max(0, (t - 0.6) / 0.4));
        }
      }
      if (afterimage) {
        if (unlit) {
          bucketOf[i] = 65535;
          continue;
        }
        dia = Math.max(DIA_MIN, dia * 0.5);
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
      const di = Math.round(((Math.min(DIA_MAX, dia) - DIA_MIN) / (DIA_MAX - DIA_MIN)) * (DIAS - 1));
      const b = (kind[i] * TONES + ti) * DIAS + di;
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
    c.globalAlpha = afterimage ? 0.1 : 1;
    for (let b = 0; b < 2 * TONES * DIAS; b++) {
      const start = counts[b];
      const end = counts[b + 1];
      if (start === end) continue;
      const k = Math.floor(b / (TONES * DIAS));
      const ti = Math.floor(b / DIAS) % TONES;
      const di = b % DIAS;
      const r = ((DIA_MIN + ((DIA_MAX - DIA_MIN) * di) / (DIAS - 1)) * pitch) / 2;
      c.fillStyle = palette[k * TONES + ti];
      c.beginPath();
      for (let q = start; q < end; q++) {
        const i = order[q];
        const X = homeX(i) + px[i];
        const Y = homeY(i) + py[i];
        c.moveTo(X + r, Y);
        c.arc(X, Y, r, 0, Math.PI * 2);
      }
      c.fill();
    }
    c.globalAlpha = 1;

    if (restV > REST_V) moving = true;
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
