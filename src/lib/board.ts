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

/** Luminance below which a cell is drawn unlit (the field's own dot). */
export const UNLIT = 0.05;

export function decodeField(field: BoardField): Uint8Array {
  const bin = atob(field.data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type BoardColors = {
  ink: string;
  off: string;
};

export type BoardOptions = {
  colors: BoardColors;
  /** Deterministic seed for scatter vectors and assembly noise. */
  seed?: number;
  /**
   * Print the field as its own negative: ink where the positive leaves bare
   * paper. Only for a plate whose picture is light marks on a dark field (the
   * sky), set on a dark ground, where the positive would be a sheet of paper
   * pasted onto the page. See NEG_GAMMA.
   */
  invert?: boolean;
};

export type Board = {
  /**
   * Geometry in CSS px. `originX/Y` is where the field's cell (0,0) sits in
   * the canvas; `pitch` is the cell size; `lattice` is the page pitch; the
   * canvas is `width x height` CSS px at `dpr`. Call on every resize.
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
  /** Begin the assembly clock. Only the 404 runs one. */
  assemble: (now: number) => void;
  /** Advance and draw. Returns true while another frame is needed. */
  frame: (now: number) => boolean;
  /** Draw the finished plate once, no physics. */
  drawSettled: () => void;
  count: number;
  dispose: () => void;
};


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
/**
 * A second floor, in DEVICE pixels rather than in cells, matching gl-board.ts.
 *
 * A mark under one device pixel cannot be drawn smaller than one device pixel:
 * every tone the transfer asks for at 0.4, 0.7 and 0.95 px arrives at exactly
 * one, and a whole band of the range collapses into one flat value. That is the
 * grey haze the direction exists to avoid, and the absence of a mark is what a
 * highlight is made of. It binds at DPR 1 and at fine grids — which is where
 * the picture was least clear — and it is what lets the grid get denser without
 * the bottom of the range turning to mush.
 */
/** Kept only so the two renderers read alike; see gl-board.ts's DRAW_FS for why
 *  a sub-device-pixel mark no longer needs deleting. Canvas antialiases a fill,
 *  so this floor was always doing less harm here than on the GPU -- but it was
 *  still deleting the lightest marks on the board, which are the highlights. */
const MIN_DEVICE_PX = 0.0;
const INK_DIA_MAX = 1.42;

/**
 * The negative (`invert`), for the sky on a dark ground.
 *
 * The positive prints the night as a field of ink and the stars as the paper
 * it leaves bare. On the dark theme that is a cream square on a black page,
 * the brightest thing on it, with the sky drawn dark-on-light. The negative
 * inks what the positive leaves bare instead, with the page's own ink (bone
 * in the dark): a cell prints the paper the positive would have shown ABOVE
 * the field's own ground, so the empty sky prints nothing, the Milky Way a
 * haze of fine marks and a star a full one. The gamma keeps the haze under
 * the stars; measured offline against the shipped field, 1.0 greys the whole
 * disc and 2.0 loses the Milky Way. Still one ink, still value by area.
 */
const NEG_GAMMA = 1.5;

/** The paper a cell leaves bare in the positive, 0..1. */
function paperOf(L: number): number {
  const inked = Math.pow(Math.max(L, DEEP_FLOOR), LIFT);
  return 1 - Math.pow(1 - inked, INK_GAIN);
}

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

const DIAS = 16; // diameter steps, in cells, between 0 and INK_DIA_MAX

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

/** Below this tone a cell is "the field": drawn only where a page dot is. */
const ASSEMBLE_MS = 1100;
const GROW_MS = 500;
// Critically damped: the pair below has real eigenvalues (modulus ~0.7), so a
// dot reaches its target in ~20 frames with no overshoot, and the loop can
// stop the frame after the last dot rests.
const SPRING_K = 0.2;
const SPRING_DAMP = 0.6;
const REST_V = 0.05; // px: below this, a dot is at rest

export function createBoard(canvas: HTMLCanvasElement, field: BoardField, opts: BoardOptions): Board | null {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  const bytes = decodeField(field);
  const W = field.w;
  const H = field.h;

  // ── Static per-cell data ────────────────────────────────────────────────
  //
  // A zero byte is "no cell": nothing is drawn there. In the positive that is
  // also how the bake writes its brightest highlights -- the absence of a mark
  // IS the highlight -- so a negative has to tell the two apart, or the
  // brightest stars print as black holes. An empty cell between a row's first
  // and last cells is inside the field and prints as full light; one outside
  // that span is the corner of the box and stays empty.
  const invert = opts.invert === true;
  const rowFrom = new Int32Array(H).fill(W);
  const rowTo = new Int32Array(H).fill(-1);
  if (invert) {
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (bytes[j * W + i] === 0) continue;
        if (i < rowFrom[j]) rowFrom[j] = i;
        rowTo[j] = i;
      }
    }
  }
  const inField = (i: number, j: number) =>
    bytes[j * W + i] > 0 || (invert && i >= rowFrom[j] && i <= rowTo[j]);

  let n = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (inField(i, j)) n++;
  const gx = new Uint16Array(n);
  const gy = new Uint16Array(n);
  const lum = new Float32Array(n); // 0..1
  const delay = new Float32Array(n); // assembly start, ms
  const scx = new Float32Array(n); // scatter vector, CSS px
  const scy = new Float32Array(n);
  const cellIndex = new Int32Array(W * H).fill(-1);

  const rand = rng(opts.seed ?? 11);
  const [cx0, cy0] = field.center;
  const maxDist = Math.hypot(W, H) * 0.6;
  let lit = 0;
  // The field's own ground: the paper its darkest cell leaves bare. The
  // negative prints only what rises above it.
  let groundL = 1;
  {
    let k = 0;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (!inField(i, j)) continue;
        const v = bytes[j * W + i];
        gx[k] = i;
        gy[k] = j;
        const L = v === 0 ? 1 : v / 255;
        if (v > 0 && L >= UNLIT && L < groundL) groundL = L;
        lum[k] = L;
        if (L >= UNLIT) lit++;
        const dist = Math.hypot(i - cx0, j - cy0) / maxDist;
        delay[k] = 600 * (0.55 * Math.min(1, dist) + 0.25 * (1 - L) + 0.2 * rand());
        const ang = rand() * Math.PI * 2;
        const len = 60 + rand() * 200;
        scx[k] = Math.cos(ang) * len;
        scy[k] = Math.sin(ang) * len - 40;
        cellIndex[j * W + i] = k;
        k++;
      }
    }
  }
  const groundPaper = paperOf(groundL);
  const negSpan = Math.max(1e-6, 1 - groundPaper);

  // ── Dynamic state, CSS px ────────────────────────────────────────────────
  const px = new Float32Array(n); // displacement from the (moving) home
  const py = new Float32Array(n);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const bucketOf = new Uint16Array(n);
  const order = new Int32Array(n);
  const counts = new Int32Array(DIAS + 1);
  // Sum of d^2 over the marks in each bucket, so a bucket can be drawn at the
  // RMS diameter of what it actually holds rather than at its nominal step.
  // See the note over `massSum` in pass 1.
  const massSum = new Float64Array(DIAS);

  let width = 0;
  let height = 0;
  let originX = 0;
  let originY = 0;
  let pitch = 6; // cell size
  let lattice = 6; // page pitch
  let dpr = 1;
  /** 0..1: how hard the pointer is currently tearing, and which way. */
  let assembling = false;
  let assembleStart = 0;
  let settled = false;
  let dirty = true;
  let disposed = false;

  // One ink, and it is the whole colour model.
  //
  // There were sixteen entries here: eight tones from --dot-off toward --ink,
  // and eight more toward --sun for the datum in the portrait's eye. Value is
  // carried by AREA alone -- that is what makes this an engraving rather than a
  // smudge -- so the tone index was pinned to its last step and fifteen of the
  // sixteen were never selected. The datum went with the portrait; every field
  // the site ships now carries datum [-1, -1].
  const ink = parseColor(opts.colors.ink, [20, 18, 14]);
  const inkFill = `rgb(${ink[0]}, ${ink[1]}, ${ink[2]})`;

  // The lattice: page dots sit at (k * pitch + 0.5), the top-left pixel of
  // each tile. Cells land on the same grid so an unlit cell and the field
  // beneath it are the same pixel.
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
    const t = 0;
    const t2 = 0;

    counts.fill(0);
    massSum.fill(0);
    let moving = false;
    let restV = 0;

    // Pass 1: state and bucket per dot.
    for (let i = 0; i < n; i++) {
      const L0 = lum[i];
      const unlit = L0 < UNLIT;

      // Assembly: grow in place from the unlit size.
      let grow = 1;
      if (assembling) {
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
      if (t > 0 && !unlit) {
        const fx = snap(hx + scx[i]);
        const fy = snap(hy + scy[i]);
        tx = (fx - hx) * t2;
        ty = (fy - hy) * t2;
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

      // Tone and diameter, straight off the bake.
      const L = unlit ? 0 : L0;

      // Ink, not light. Value is carried by AREA alone; the tone channel is
      // gone. On a dark ground luminance was encoded twice, in tone and in
      // diameter, and tone did most of the perceptual work -- invert the ground
      // and that same formula gives mid-grey dots on near-white, which the eye
      // integrates into one flat grey. The ink is always full black now, the
      // paper always full white, and the grey is an optical average of
      // hard-edged marks.
      let coverage = invert
        ? Math.pow(Math.max(0, paperOf(L) - groundPaper) / negSpan, NEG_GAMMA)
        : 1 - paperOf(L);
      coverage *= grow;
      let dia = Math.min(1.128 * Math.sqrt(Math.max(coverage, 0)), INK_DIA_MAX);
      if (t > 0) dia *= 1 - t;
      if (dia < CULL_DIA || dia * pitch * dpr < MIN_DEVICE_PX) {
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
      const b = Math.round((Math.min(INK_DIA_MAX, dia) / INK_DIA_MAX) * (DIAS - 1));
      bucketOf[i] = b;
      counts[b + 1]++;
      // ── What the bucket owes ──
      //
      // Bucketing by diameter is how one fill() draws thousands of marks, and
      // the cost has always been that every mark in a bucket is drawn at the
      // bucket's nominal step instead of its own size. Rounding a DIAMETER is
      // not unbiased in the thing that carries value here, which is AREA: the
      // error is whatever the field's own distribution happens to line up
      // with, and it is not small. Measured at DIAS 16 over the shipped
      // fields: the hero -0.53%, the About plate -0.08%, and the sky +2.00%,
      // because the sky's diameters bunch where the portrait's spread.
      //
      // Since the sort already walks every cell before anything is drawn, the
      // bucket can simply carry the sum of d^2 of its own members and be drawn
      // at their RMS. Then the batch lays down exactly the ink its members
      // demand, for any field and any distribution, and the residual is zero
      // by construction rather than by a bucket count that happened to align.
      // Clamped, so a bucket's size still cannot exceed INK_DIA_MAX.
      const dc = Math.min(INK_DIA_MAX, dia);
      massSum[b] += dc * dc;
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
    c.fillStyle = inkFill;
    for (let b = 0; b < DIAS; b++) {
      const start = counts[b];
      const end = counts[b + 1];
      if (start === end) continue;
      // The RMS of the bucket's own members, not its nominal step; see the
      // note over massSum. `end - start` is the bucket's population and is
      // never zero here, because a bucket with no members is skipped above.
      const dia = Math.sqrt(massSum[b] / (end - start));
      const r = (dia * pitch) / 2;
      c.beginPath();



      // Snap to the device pixel grid, exactly as gl-board.ts's DRAW_VS does
      // and for exactly the same reason: a cell is a whole number of CSS
      // pixels but a display is not obliged to be a whole number of device
      // pixels per CSS pixel, and at Windows' 125% a 2px cell is 2.5 device
      // px. Alternate marks then land on half-pixels, and the difference in
      // how they resolve beats against the lattice into a grid of light holes
      // punched through every dark passage. The two renderers must not
      // disagree about where a mark is, so this is the same arithmetic done
      // in CSS space: to the device grid and back.
      // Only where the device pitch is fractional; see gl-board.ts. On a whole
      // number of device pixels per cell there is no phase to correct, and
      // snapping would move every mark half a pixel off the grid it is already
      // aligned to.
      const devPitch = pitch * dpr;
      const needsSnap = Math.abs(devPitch - Math.round(devPitch)) > 0.01;
      const snapX = needsSnap
        ? (v: number) => (Math.floor(v * dpr) + 0.5) / dpr
        : (v: number) => v;
      // ── The mark stays a disc, and what that costs ──
      //
      // Value here is carried by ink AREA, so a mark that lays down the wrong
      // area is the wrong tone. Chrome does not fill a small disc to its own
      // area: measured on an 8 px lattice with a decorrelated phase, an arc of
      // radius 0.3 to 1.7 device px lays down 0.74 to 0.99 of the ink its
      // geometry demands, and it never quite gets there -- at radius 10 it is
      // still 0.976, because Skia approximates a circle with quads and a quad
      // chord always lies INSIDE the curve it stands for.
      //
      // An area-equivalent square (side sqrt(pi)/2 * d, the one primitive Skia
      // rasterises analytically) measures 0.98 to 1.00 over that same sweep,
      // and it was tried here. On the real board it is worth 0.5%: -2.72% for
      // the disc against +2.20% for the square, because on a REGULAR lattice
      // every mark of a size sits at the same sub-pixel phase, so the
      // rasteriser's per-size quantisation repeats identically tens of
      // thousands of times instead of averaging away -- and that error is
      // +-7% either way, whatever the shape. (fillRect per mark is far worse
      // again, 1.76 at the smallest size: Skia keeps a rect visible.) Half a
      // percent is not worth making the mark on the page a square, so the
      // disc stays and the residual is written down instead.
      //
      // The GPU tier, which is the one nearly every visitor gets, resolves its
      // own coverage analytically and is exact to 0.08%. This is the floor.
      //
      // (The old `di <= 1` square fast path is gone with the branch: with
      // CULL_DIA at 0.30 the two smallest of sixteen buckets hold a diameter
      // under 0.10 and were culled long before they could be drawn, so it had
      // been unreachable code.)
      for (let q = start; q < end; q++) {
        const i = order[q];
        const X = snapX(homeX(i) + px[i]);
        const Y = snapX(homeY(i) + py[i]);
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


  void dirty;

  return {
    layout,
    assemble,
    frame,
    drawSettled,
    count: lit,
    dispose: () => {
      disposed = true;
    },
  };
}
