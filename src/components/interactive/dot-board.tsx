"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { BoardField } from "@/content/portrait-types";
import {
  createBoard,
  TEAR_SPEED,
  type Board,
  type BoardMode,
} from "@/lib/board";
import { fieldCaps } from "@/lib/field/gl";
import { createGLBoard } from "@/lib/field/gl-board";
import { motionAllowed, onMotionChange } from "@/lib/motion";
import { onThemeChange } from "@/lib/theme";

type BoardStatus =
  "lattice" | "assembling" | "live" | "settled" | "static" | "fallback";

/**
 * Which baked field a board shows. The field itself is loaded on the client.
 *
 * Three of these are the portrait; the rest are plates -- the project devices,
 * the clinical screens, the quarterly rule, the sky. They are the same
 * material and the same renderer, and `src/content/plates.ts` is where their
 * captions, boxes and dot counts are stated once.
 */
export type PortraitSource =
  | "hero"
  | "contact"
  | "device-recurly"
  | "device-checkpoint"
  | "device-clip-h"
  | "device-crawler"
  | "device-qualgent"
  | "device-qa"
  | "device-clinical"
  | "device-wallex"
  | "clinical-voice"
  | "clinical-tasks"
  | "clinical-vitals"
  | "rule-quarters"
  | "sky";

export type DotBoardProps = {
  mode: BoardMode;
  /** The baked field to load. Required for hero, still and afterimage. */
  source?: PortraitSource;
  /** Text mode: the string to set in dots. */
  text?: string;
  /** Accessible name of the figure. Empty string marks it decorative. */
  alt: string;
  /** Show the mono readout under the box. */
  caption?: boolean;
  /** The readout's resting text. Defaults to "192 × 240 · 15,970 dots" from the field. */
  restLabel?: string;
  /** Lit-cell count of the field, for the resting text before the field arrives. */
  count?: number;
  /** Image shown when the canvas cannot run, and in print. */
  fallback?: string;
  /** Hero only: the image used below 48rem. */
  mobileFallback?: string;
  className?: string;
  /**
   * Ask for the GPU renderer on a board that would otherwise take the 2D floor.
   *
   * A settled board normally stays on the 2D canvas: it draws one frame and
   * never animates, so a GL context and a shader compile buy nothing and cost
   * a context slot Chrome may later evict from a board that DOES animate. That
   * reasoning is right for a thumbnail and wrong for a portrait, because the
   * two renderers do not draw the same mark. `gl.POINTS` with a hard `discard`
   * is binary coverage; `arc()` is antialiased. Measured on the live About
   * plate: **only 23% of its ink was fully opaque** and the other 77% was
   * grey, which is most of why that page read softer than the home page at the
   * same density.
   *
   * So it is opt-in rather than a mode rule: one portrait per page can afford
   * a context, and a page carrying eight small device plates must not ask for
   * eight.
   */
  gpu?: boolean;
};

const SEEN_KEY = "board:seen";
/**
 * Portrait fields are baked at twice the page pitch in each direction
 * (scripts/bake-portrait.py), so a 192 x 240 field fills a 96 x 120 lattice
 * box. Text mode rasterises at the lattice itself.
 */
// Three, not two. The field is baked at box x DENSITY, so this is the cell
// count of every portrait on the site, and it is the single biggest lever on
// how clear his face is: 22,990 dots to 51,747, and detail carried at a fixed
// PHYSICAL radius up 12.5% at a third of a page cell. Measured against the
// bake, not chosen -- scripts/check-density.mjs fails the build if this number
// and the bake's disagree, because a field baked at one density and drawn at
// another renders the portrait at the wrong SIZE and every type check still
// passes: BoardField carries its own w and h, so a 288x360 field is exactly as
// well-typed as a 192x240 one.
const PORTRAIT_DENSITY = 3;
const PHONE = "(width < 48rem)";

/**
 * The arrival, once per session, on the hero only.
 *
 * An intaglio plate is worked in the dark and cut in reverse, because the sheet
 * it prints is its mirror. So the board assembles as a plate -- bone marks on a
 * near-black ground, flipped -- and then the sheet is pulled.
 *
 * This half is the clock. The page half is globals.css section 11, which is a
 * pair of states rather than a keyframe: `plate` remaps the palette dark and
 * `sheet` warms the paper back up. The step between them is driven from here,
 * on the frame the pull crosses PULL_MID, because it has to land on the *same*
 * frame as the canvas mirror flip -- one event, not two clocks agreeing to
 * three decimal places.
 *
 * Why it is a step and not a crossfade: the page starts bone on plate and ends
 * ink on paper, the same two colours in opposite roles, so every continuous
 * path between them passes through the point where the two meet. The best
 * possible staged swap measures 4.18:1, under the floor; a simultaneous fade
 * bottoms out near 1.03:1 with the h1 invisible for a tenth of a second. The
 * marks are what carries the moment instead: half inked at the flip, they are
 * mid grey against both grounds, so they are the one thing that does not jump.
 *
 * The <h1> is real text at full opacity from frame zero throughout, so the
 * arrival never delays the largest contentful paint. Reduced motion, a return
 * visit, or no WebGL all skip straight to the printed sheet.
 */
// Measured, not chosen: the field is fully inked at ~800 ms and dead still by
// 950. Anything past that is a stare at a finished plate, so the pull begins
// 300 ms after it settles -- long enough to read the plate as a whole object,
// short enough that nothing waits.
const PULL_FROM = 1250; // ms after assembly begins: the marks start to darken
const PULL_TO = 1900; //  ms: the sheet is fully printed
/** Where the plate becomes the sheet. The shader flips its mirror on the same value. */
const PULL_MID = 0.5;
const ARRIVAL_END = 2600;
const FINE = "(hover: hover) and (pointer: fine)";
/** Text mode waits for the sans to load before rasterising, but never longer than this. */
const FONT_WAIT_MS = 1500;
/** Governor threshold (§4.8): a frame longer than this is a slow one. */
const SLOW_MS = 20;
/**
 * Smooth frames that earn the resolution back. The governor is a one-way
 * ratchet otherwise, and a single stall (another tab, a cold cache) would pin
 * the board below the display's resolution for the life of the page.
 */
const FAST_RECOVER = 90;
/** The light's reach from a dot's home, in lattice steps (board.ts). */
const LIGHT_CELLS = 18;

type Box = { cols: number; rows: number; colsSm?: number; rowsSm?: number };

type SourceSpec = Box & {
  load: () => Promise<BoardField>;
  /** Hero only: the field below 48rem. */
  loadSm?: () => Promise<BoardField>;
  /**
   * Cells per lattice step, where it is not the portrait's.
   *
   * The portraits share PORTRAIT_DENSITY because they are re-baked together
   * and check-density.mjs locks that one number to the bake's. A plate is a
   * different picture at a different grid -- a 48 x 60 device in a 24 x 30 box
   * is density 2 whatever the portrait is doing -- and riding the portrait's
   * constant would silently rescale every plate on the site the next time the
   * face is re-baked finer. The board draws `field.w / density` lattice cells
   * wide; if this and the field disagree the plate overflows its box and
   * nothing fails, which is the exact bug check-density.mjs exists for.
   */
  density?: number;
};

/** A plate: one field module, one export, one box. */
const plate = (
  cols: number,
  rows: number,
  load: () => Promise<BoardField>,
): SourceSpec => ({ cols, rows, load, density: PLATE_DENSITY });

/**
 * Every plate is baked at two cells to the lattice step. It is the grid at
 * which a 48-cell device still resolves a rank of marks and a 192-cell sky
 * still resolves a star, and it is stated in scripts/bake-art.py as the
 * bakers' default; src/content/plates.ts records it per plate and
 * scripts/check-plates.mjs compares the two.
 */
const PLATE_DENSITY = 2;

/**
 * The fields stay on the client side of the server boundary: each is its own
 * hashed chunk, fetched when a board first needs it and cached across routes,
 * instead of 30-90 KB of base64 inlined in every page's HTML and RSC payload.
 * The box sizes are the spec's (§4.3, §4.7, §4.10) and are what the server
 * renders, so the box never depends on the data.
 */
const SOURCES: Record<PortraitSource, SourceSpec> = {
  hero: {
    cols: 96,
    rows: 120,
    colsSm: 64,
    rowsSm: 80,
    load: () =>
      import("@/content/portrait-field-96").then((m) => m.portraitField96),
    loadSm: () =>
      import("@/content/portrait-field-64").then((m) => m.portraitField64),
  },
  contact: {
    cols: 48,
    rows: 60,
    load: () =>
      import("@/content/portrait-field-contact").then(
        (m) => m.portraitFieldContact,
      ),
  },

  // The eight project devices. One module, one chunk: eight 48 x 60 fields is
  // 31 KB of base64 against the hero portrait's 138, so splitting them would
  // buy eight requests to save nothing.
  "device-recurly": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceRecurly),
  ),
  "device-checkpoint": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceCheckpoint),
  ),
  "device-clip-h": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceClipH),
  ),
  "device-crawler": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceCrawler),
  ),
  "device-qualgent": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceQualgent),
  ),
  "device-qa": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceQa),
  ),
  "device-clinical": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceClinical),
  ),
  "device-wallex": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceWallex),
  ),

  // The three clinical screens, engraved from the committed screenshots.
  "clinical-voice": plate(30, 64, () =>
    import("@/content/plate-clinical").then((m) => m.clinicalVoice),
  ),
  "clinical-tasks": plate(30, 64, () =>
    import("@/content/plate-clinical").then((m) => m.clinicalTasks),
  ),
  "clinical-vitals": plate(30, 64, () =>
    import("@/content/plate-clinical").then((m) => m.clinicalVitals),
  ),

  // The register strip: projects per quarter, counted from projects.ts.
  "rule-quarters": plate(120, 4, () =>
    import("@/content/plate-rule").then((m) => m.quarterlyRule),
  ),

  // The sky over West Lafayette. The one plate on the site made mostly of ink.
  sky: plate(96, 96, () =>
    import("@/content/sky-field").then((m) => m.skyField),
  ),
};

const TEXT_BOX: Required<Box> = { cols: 96, rows: 40, colsSm: 64, rowsSm: 28 };
const DEFAULT_BOX: Box = { cols: 96, rows: 120 };

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function densityOf(
  mode: BoardMode,
  source: PortraitSource | undefined,
): number {
  if (mode === "text") return 1;
  return (source && SOURCES[source].density) || PORTRAIT_DENSITY;
}

function boxOf(mode: BoardMode, source: PortraitSource | undefined): Box {
  if (mode === "text") return TEXT_BOX;
  return source ? SOURCES[source] : DEFAULT_BOX;
}

/**
 * The board. Frame zero is the page lattice itself (the box is transparent),
 * so nothing is on screen before the canvas mounts that will change when it
 * does. Everything the board does after that is a dot growing, lighting,
 * moving or dimming; the words around it never move.
 *
 * Hero and text modes draw on a viewport-fixed canvas so dispersing dots can
 * leave the box, pass behind the name and settle onto the fixed page field.
 * Under reduced motion nothing disperses, so the canvas stays in the box.
 * Still and afterimage always draw inside the box.
 *
 * The box is sized by CSS from the `--board-*-lg/-sm` pairs written here, so
 * the phone box is right on the first frame; JS only picks the field.
 */
export function DotBoard({
  mode,
  source,
  text,
  alt,
  caption = false,
  restLabel,
  count,
  fallback,
  mobileFallback,
  className,
  gpu = false,
}: DotBoardProps) {
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  // The motion policy can flip mid-session (the OS setting). Each change
  // re-runs the board effect, which tears the board down and rebuilds it
  // under the new policy: a settled still when reduced, the fixed canvas with
  // its pin bed when restored.
  const [motionEpoch, setMotionEpoch] = useState(0);
  useEffect(() => onMotionChange(() => setMotionEpoch((n) => n + 1)), []);

  // So can the theme, and the board cannot ignore it. Every colour it draws
  // with -- ink, sun, the unlit dot, the bone the arrival starts in -- is read
  // from CSS ONCE, below, when the board is built. Flip to dark without this
  // and the field keeps painting #14120e ink onto a #16140f ground: the
  // portrait does not go dark, it goes invisible. Bumping the epoch re-runs
  // the effect, which re-reads all four.
  const [themeEpoch, setThemeEpoch] = useState(0);
  useEffect(() => onThemeChange(() => setThemeEpoch((n) => n + 1)), []);

  const box = boxOf(mode, source);
  const density = densityOf(mode, source);

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || !canvasRef.current) return;

    let disposed = false;
    let generation = 0;
    let cleanup: (() => void) | null = null;
    // Set once the GPU path has proved it cannot be trusted on this page: a
    // failed setup, or a context the driver took away. The rebuild after the
    // first loss is allowed to try again; a second loss pins the 2D board for
    // the life of the page rather than flickering between the two.
    let losses = 0;
    let forceCpu = false;

    // The board's state lives on the figure as data-board, written
    // imperatively: it changes on the animation's own schedule, and a React
    // render for each step would be wasted work. CSS shows the fallback image
    // for data-board="fallback".
    const setStatus = (s: BoardStatus) => {
      figure.dataset.board = s;
    };

    const fine = window.matchMedia(FINE).matches;
    const motion = motionAllowed();
    const fixed = (mode === "hero" || mode === "text") && motion;
    if (fixed) figure.dataset.fixed = "";
    else delete figure.dataset.fixed;
    const readPitch = () => parseFloat(cssVar(figure, "--pitch", "6")) || 6;
    const colors = {
      ink: cssVar(figure, "--ink", "#14120e"),
      sun: cssVar(figure, "--sun", "#a8321b"),
      off: cssVar(figure, "--dot-off", "rgba(20,18,14,0.06)"),
      bone: cssVar(figure, "--bone", "#efe9dc"),
    };
    const phoneQuery = window.matchMedia(PHONE);

    /** Everything after the field is known. Returns its own teardown. */
    const start = (field: BoardField): (() => void) | null => {
      const options = { mode, colors, pointer: fine && motion };
      // The GPU field first, the 2D canvas as the floor. Both satisfy the same
      // `Board` contract and draw the same picture; `createGLBoard` returns
      // null for no WebGL2, a software renderer, a clamped point size, or any
      // error during setup, and each of those has to land on the 2D board
      // rather than on a black rectangle.
      //
      // A canvas only ever gives out one kind of context: once it has held a
      // WebGL2 one, `getContext("2d")` is null on that element forever. The
      // capability question is therefore settled on a throwaway canvas inside
      // `fieldCaps()`, so a "no" never touches this one. The remaining case is
      // a context that was created and then failed during setup — that element
      // is spent, so swap in a fresh canvas before falling back.
      //
      // Reduced motion and the afterimage draw one settled frame and never
      // animate again, so a GL context and a 35 ms shader compile would buy
      // nothing and cost a context slot Chrome may later evict from a board
      // that does animate.
      // Only the two full-viewport boards. The rail boards are a few hundred
      // cells that the 2D renderer draws in under a millisecond, and each GL
      // context is one more for Chrome to evict — it drops the oldest when a
      // page holds too many, which would blank the hero to animate a thumbnail.
      const wantsGpu =
        motion &&
        (mode === "hero" || mode === "text" || (gpu && mode === "still")) &&
        !forceCpu;
      if (!canvasRef.current) return null;
      // Recycle first, not just on the way down to 2D: after a context loss
      // the old element still owns a dead context, so retrying GL on it would
      // fail every time and the one permitted rebuild would be spent for
      // nothing.
      let canvas = recycleCanvas(canvasRef.current);
      let board: Board | null = wantsGpu
        ? createGLBoard(canvas, field, options, onLost)
        : null;
      let renderer = "gpu";
      if (!board) {
        // A silent tier drop is the failure mode this whole ladder invites:
        // everything still works, nobody sees an error, and the GPU path
        // quietly stops being the one anybody actually gets. In development it
        // says so, with the reason the capability probe gave.
        if (wantsGpu && process.env.NODE_ENV !== "production") {
          console.warn(
            "[dot-board] GPU declined:",
            JSON.stringify(fieldCaps()),
          );
        }
        canvas = recycleCanvas(canvas);
        board = createBoard(canvas, field, options);
        renderer = "2d";
      }
      if (!board) {
        setStatus("fallback");
        return null;
      }
      figure.dataset.renderer = renderer;

      let raf = 0;
      let visible = true;
      let hidden = document.hidden;
      // The governor pins the DPR cap below the display's; relayout applies it.
      // Three, not two. On a DPR-3 panel a cap of 2 backs the canvas at 2x and
      // lets the compositor upscale it 1.5x to fill the CSS box -- and every
      // mark here is a hard-edged disc, so that upscale is a blur applied to
      // precisely the thing the renderer works hardest to keep crisp. The
      // governor below still drops the cap on sustained slow frames, so this
      // raises the ceiling without removing the floor.
      let dprCap = 3;
      let pitch = readPitch();
      let bleed = 0;
      let rect = figure.getBoundingClientRect();
      let slowFrames = 0;
      let fastFrames = 0;
      let recovered = false;
      let pushDisabled = false;
      let leaveTimer = 0;
      let assembledOnce = false;
      let pending = false;
      let idle: number | undefined;
      let begin: (() => void) | null = null;
      let lastNow = 0;
      let continuous = false;
      let inside = false;
      let scrollRaf = 0;
      let arrivalRaf = 0;
      let resizeRaf = 0;
      const canIdle = typeof window.requestIdleCallback === "function";

      const restText = () =>
        restLabel ??
        `${field.w} × ${field.h} · ${board.count.toLocaleString("en-US")} dots`;
      const cellText = (c: { x: number; y: number; L: number }) =>
        `x ${String(c.x).padStart(3, "0")} · y ${String(c.y).padStart(3, "0")} · ${c.L.toFixed(2)}`;
      const setReadout = (s: string) => {
        const el = readoutRef.current;
        if (el && el.textContent !== s) el.textContent = s;
      };

      // Geometry is read fresh every time: the pitch steps at 80rem, the DPR
      // changes with zoom or a display move, and the box moves with the page.
      // The grid origin snaps to the page lattice (viewport k * pitch) so an
      // unlit cell and the field dot beneath it are the same pixel.
      const relayout = () => {
        pitch = readPitch();
        const cell = pitch / density;
        // ── Never screen the plate at fewer than two device px per cell ──
        //
        // The field is a halftone, and a halftone needs room per cell to BE
        // one: the dot has to be free to grow and shrink inside its cell, and
        // the eye has to have neighbouring dots of different sizes to average.
        // At 100% on a 1x panel a cell is 2 device px, which is the display's
        // Nyquist limit for this screen ruling -- the tone comes out exactly
        // right (measured: mean luminance 202.0 against 202.1 for the same
        // board at 200%) and the DETAIL does not survive. His eyes, brows and
        // mouth flatten into one grey slab. That is what "washed out at 100%"
        // actually was: not too little ink, too little room for it.
        //
        // So on the GPU the canvas is backed at 2x whatever the display gives,
        // and the compositor resolves it down. That is a supersample, and it
        // is the same picture the 200% panel gets, which is the one that
        // reads. It costs fill rate and nothing else -- the particle count,
        // the transform feedback and every buffer are untouched, and this
        // machine already draws the 2x framebuffer at a locked 60fps because
        // that is simply what a DPR-2 visitor has always been served.
        //
        // On the GPU always: it pays per fragment, and this machine draws the
        // 2x framebuffer at a locked 60fps because that is simply what a DPR-2
        // visitor has always been served. On the 2D floor only where the board
        // is drawn ONCE -- the device plates, the quarterly rule, the sky, the
        // afterimage -- because there the extra rasterisation is a single
        // one-shot cost and never a frame budget. An animating 2D board (the
        // hero's fallback, the text boards) keeps native resolution: it pays
        // per mark in path work, every frame, and 4x of that is 4x for real.
        //
        // dprCap still wins in both cases, so the governor can pull this back
        // on a machine that cannot hold the frame.
        const SUPERSAMPLE_MIN = 2;
        const drawnOnce = mode === "still" || mode === "afterimage" || !motion;
        const native = window.devicePixelRatio || 1;
        const dpr = Math.min(
          renderer === "gpu" || drawnOnce
            ? Math.max(native, SUPERSAMPLE_MIN)
            : native,
          dprCap,
        );
        rect = figure.getBoundingClientRect();
        const snapX = Math.round(rect.left / pitch) * pitch;
        const snapY = Math.round(rect.top / pitch) * pitch;
        if (fixed) {
          bleed = 0;
          board.layout({
            // The layout viewport, not innerWidth: that includes a classic
            // scrollbar, so the canvas would be wider than the box `inset: 0`
            // gives it and the two would disagree on the first frame.
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
            originX: snapX,
            originY: snapY,
            pitch: cell,
            lattice: pitch,
            dpr,
          });
        } else {
          // In the box the canvas bleeds one pitch on every side, so a snapped
          // origin just outside the box is not clipped.
          bleed = pitch;
          board.layout({
            width: rect.width + 2 * bleed,
            height: rect.height + 2 * bleed,
            originX: snapX - rect.left + bleed,
            originY: snapY - rect.top + bleed,
            pitch: cell,
            lattice: pitch,
            dpr,
          });
        }
      };

      const finish = () => {
        if (!assembledOnce) {
          assembledOnce = true;
          try {
            sessionStorage.setItem(SEEN_KEY, "1");
          } catch {
            /* private mode */
          }
        }
        setStatus("settled");
      };

      const loop = (now: number) => {
        raf = 0;
        if (disposed) return;
        const t0 = performance.now();
        const more = board.frame(now);
        const dt = performance.now() - t0;
        // Governor: three slow frames drop the resolution; three more drop the
        // pin bed. The callback's own time misses the raster, which happens
        // after it returns, so the rAF interval (which includes it) counts
        // too, on frames that directly follow another.
        //
        // The assembly is exempt. It is a bounded one-off burst of the whole
        // field, the same work on every machine, and judging by it capped
        // every retina display at 1.5x for the life of the page even where
        // the steady state then held 60fps. What the governor is for is the
        // steady state, where a dropped frame is something a visitor feels.
        const slow =
          figure.dataset.board !== "assembling" &&
          (dt > SLOW_MS || (continuous && now - lastNow > SLOW_MS));
        lastNow = now;
        if (slow) {
          fastFrames = 0;
          slowFrames++;
          if (slowFrames === 3 && dprCap > 1.5) {
            dprCap = 1.5;
            relayout();
          } else if (slowFrames === 6 && !pushDisabled) {
            pushDisabled = true;
            board.disablePush();
          }
        } else if (!recovered && dprCap < 3 && ++fastFrames >= FAST_RECOVER) {
          // A second and a half of smooth frames: the stall was transient.
          // Once only, so a board that is genuinely at the edge of the budget
          // settles at 1.5x instead of oscillating and relaying out forever.
          recovered = true;
          dprCap = 3;
          slowFrames = 0;
          fastFrames = 0;
          relayout();
        }
        continuous = more && visible && !hidden;
        if (continuous) raf = requestAnimationFrame(loop);
        else if (!more && figure.dataset.board === "assembling") finish();
      };
      const schedule = () => {
        if (!raf && !disposed && visible && !hidden) {
          continuous = false;
          raf = requestAnimationFrame(loop);
        }
      };

      // ── Pointer: the light, and the readout ─────────────────────────────
      // The readout is information and works under reduced motion; the light
      // and the pin bed are motion and do not.
      // Pointer velocity in CSS px per second, for the tear. Measured over
      // the gap between two real events rather than per frame: a mouse that
      // reports at 1000 Hz would otherwise read as motionless most frames.
      // getCoalescedEvents is deliberately not used — the tear wants the
      // gesture, not every sample of it.
      let lastX = 0;
      let lastY = 0;
      let lastT = 0;
      /** While this is in the future, the readout says so instead of coordinates. */
      let tornUntil = 0;
      let tornTimer = 0;
      let lastCellX = 0;
      let lastCellY = 0;
      const leave = () => {
        inside = false;
        lastT = 0;
        tornUntil = 0;
        window.clearTimeout(tornTimer);
        if (motion) {
          board.pointer(null, null);
          schedule();
        }
        if (caption) {
          window.clearTimeout(leaveTimer);
          leaveTimer = window.setTimeout(() => setReadout(restText()), 240);
        }
      };
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        let x = event.clientX;
        let y = event.clientY;
        if (fixed) {
          // Read on the document while fixed, but a pointer beyond the light's
          // reach of the box changes nothing, so it schedules nothing.
          // Wide enough for the relight, not just for the light. The light
          // reaches 18 cells; the sun that shades the face reaches one board
          // diagonal from its centre, because moving the cursor across the
          // words beside the portrait is meant to move the light across the
          // face. Frames still stop the moment the pointer stops, so the cost
          // is paid only while something is actually changing.
          const R = Math.max(
            LIGHT_CELLS * pitch,
            Math.hypot(rect.width, rect.height),
          );
          const near =
            x > rect.left - R &&
            x < rect.right + R &&
            y > rect.top - R &&
            y < rect.bottom + R;
          if (!near) {
            if (inside) leave();
            return;
          }
          inside = true;
        } else {
          const r = figure.getBoundingClientRect();
          x += bleed - r.left;
          y += bleed - r.top;
        }
        if (motion) {
          // A gap longer than a quarter second is a new gesture, not a fast
          // one: re-entering the window must not read as a 4000 px/s flick.
          const t = event.timeStamp;
          const dt = lastT > 0 ? (t - lastT) / 1000 : 0;
          const fresh = dt > 0.001 && dt < 0.25;
          const vx = fresh ? (x - lastX) / dt : 0;
          const vy = fresh ? (y - lastY) / dt : 0;
          board.pointer(x, y, vx, vy);
          // The one place the field explains itself, and only to someone who
          // has already made it happen. It says nothing until you tear it.
          if (Math.hypot(vx, vy) > TEAR_SPEED) {
            tornUntil = t + 900;
            // A pointer that tears and then stops dead sends no further
            // events, so the word has to take itself off the page.
            window.clearTimeout(tornTimer);
            tornTimer = window.setTimeout(() => {
              const c = board.cellAt(lastCellX, lastCellY);
              setReadout(c ? cellText(c) : restText());
            }, 900);
          }
          lastX = x;
          lastY = y;
          lastT = t;
          schedule();
        }
        if (caption) {
          lastCellX = x;
          lastCellY = y;
          const cell = board.cellAt(x, y);
          window.clearTimeout(leaveTimer);
          if (event.timeStamp < tornUntil) {
            setReadout("torn · converging");
          } else if (cell) {
            setReadout(cellText(cell));
          } else {
            leaveTimer = window.setTimeout(() => setReadout(restText()), 240);
          }
        }
      };
      const onLeave = () => leave();

      // ── Scroll: the fixed canvas follows the figure; hero disperses ─────
      const onScroll = () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = 0;
          relayout();
          const t = Math.min(
            1,
            Math.max(0, window.scrollY / (0.9 * window.innerHeight)),
          );
          board.scroll(t);
          schedule();
        });
      };

      // Coalesced like scroll: a resize reallocates a viewport-sized bitmap.
      const onResize = () => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0;
          relayout();
          schedule();
        });
      };
      const onVisibility = () => {
        hidden = document.hidden;
        schedule();
      };

      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
          figure.dataset.visible = visible ? "true" : "false";
          if (!visible) return;
          if (pending) begin?.();
          else schedule();
        },
        { rootMargin: "20% 0px" },
      );

      // ── Wire up ─────────────────────────────────────────────────────────
      relayout();
      if (caption) setReadout(restText());
      io.observe(figure);
      window.addEventListener("resize", onResize);
      if (fixed) window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);

      const pointerTarget: HTMLElement | Document = fixed ? document : figure;
      const leaveTarget = fixed ? document.documentElement : figure;
      const wantsPointer = fine && mode !== "afterimage" && (motion || caption);
      if (wantsPointer) {
        pointerTarget.addEventListener("pointermove", onMove as EventListener);
        leaveTarget.addEventListener("pointerleave", onLeave);
      }

      let seen = false;
      try {
        seen = sessionStorage.getItem(SEEN_KEY) === "1";
      } catch {
        /* private mode */
      }

      if (mode === "afterimage" || mode === "still" || !motion) {
        // No assembly: the settled portrait, drawn once. A still board with
        // a fine pointer keeps its light; the loop only runs while it moves.
        board.drawSettled();
        setStatus("static");
        // A GL board cannot draw until its two programs have linked, and
        // drawSettled() is one call with nothing to retry it -- so on the GPU
        // path the first frame lands on an empty canvas and stays empty
        // forever. frame() reports "more" while the driver is still compiling,
        // so one scheduled loop carries it across and stops by itself the
        // moment it is ready. Bounded, and it costs the 2D floor nothing.
        if (renderer === "gpu") schedule();
        if (mode === "still" && fine && motion) {
          board.settle();
          setStatus("settled");
        }
      } else if (seen && mode === "hero") {
        // Return visit in the same session: no second hello, fade in settled.
        board.settle();
        figure.dataset.fade = "";
        setStatus("settled");
        schedule();
      } else {
        // Frame zero now; the assembly once the browser is idle, the box is
        // on screen and the tab is visible. Opened in a background tab, the
        // hello waits for the visitor rather than running out unseen; opened
        // scrolled past the box, it waits for the observer, not a timer.
        board.frame(performance.now());
        const run = () => {
          if (disposed) return;
          if (document.hidden) {
            document.addEventListener("visibilitychange", run, { once: true });
            return;
          }
          if (!visible) {
            pending = true;
            return;
          }
          pending = false;
          const t0 = performance.now();
          board.assemble(t0);
          setStatus("assembling");
          schedule();
          if (mode === "hero") {
            board.setPull(0);
            const root = document.documentElement;
            root.dataset.arrival = "plate";
            const pull = () => {
              if (disposed) {
                delete root.dataset.arrival;
                return;
              }
              const t = performance.now() - t0;
              const p = Math.min(
                1,
                Math.max(0, (t - PULL_FROM) / (PULL_TO - PULL_FROM)),
              );
              const pull01 = p * p * (3 - 2 * p);
              board.setPull(pull01);
              // The board rests the moment it has nothing left to do, and by
              // the time the pull begins the assembly is long finished -- so
              // without this the ink changes and no frame is ever drawn to
              // show it. schedule() is a no-op while the loop is already
              // running, so the assembly is never double-stepped.
              schedule();
              // The one event. The palette steps on the frame the mirror
              // releases, so the two halves of the inversion cannot disagree.
              if (pull01 >= PULL_MID && root.dataset.arrival === "plate") {
                root.dataset.arrival = "sheet";
              }
              if (t < ARRIVAL_END) arrivalRaf = requestAnimationFrame(pull);
              else {
                board.setPull(1);
                schedule();
                delete root.dataset.arrival;
              }
            };
            arrivalRaf = requestAnimationFrame(pull);
          }
        };
        begin = run;
        idle = canIdle
          ? window.requestIdleCallback(run, { timeout: 1200 })
          : window.setTimeout(run, 500);
      }

      return () => {
        if (raf) cancelAnimationFrame(raf);
        if (arrivalRaf) {
          cancelAnimationFrame(arrivalRaf);
          delete document.documentElement.dataset.arrival;
        }
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        if (idle !== undefined) {
          if (canIdle) window.cancelIdleCallback(idle);
          window.clearTimeout(idle);
        }
        window.clearTimeout(leaveTimer);
        window.clearTimeout(tornTimer);
        io.disconnect();
        if (begin) document.removeEventListener("visibilitychange", begin);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        pointerTarget.removeEventListener(
          "pointermove",
          onMove as EventListener,
        );
        leaveTarget.removeEventListener("pointerleave", onLeave);
        board.dispose();
      };
    };

    /**
     * Text mode: the string is rasterised in the page's sans. A webfont that
     * is still loading draws nothing on a canvas, so wait for it (briefly).
     * The rasteriser is its own chunk; only the 404 pays for it.
     */
    const loadText = async (phone: boolean): Promise<BoardField | null> => {
      const w = phone ? TEXT_BOX.colsSm : TEXT_BOX.cols;
      const h = phone ? TEXT_BOX.rowsSm : TEXT_BOX.rows;
      const family = getComputedStyle(figure).fontFamily || "sans-serif";
      const ready =
        typeof document.fonts?.load === "function"
          ? document.fonts.load(`500 ${h * 4}px ${family.split(",")[0]}`).then(
              () => undefined,
              () => undefined,
            )
          : Promise.resolve();
      const timeout = new Promise<void>((resolve) =>
        window.setTimeout(resolve, FONT_WAIT_MS),
      );
      const [{ textField }] = await Promise.all([
        import("@/lib/board-text"),
        Promise.race([ready, timeout]),
      ]);
      return textField(text ?? "404", w, h, family);
    };

    const stop = () => {
      cleanup?.();
      cleanup = null;
    };

    /**
     * A canvas hands out one kind of context for its whole life: once it has
     * held a WebGL2 one, `getContext("2d")` is null on that element forever.
     * So the element is replaced before the 2D board is asked for a context.
     * Only a canvas that actually took a WebGL context is spent, and the
     * capability probe runs on a throwaway one, so this is rare.
     */
    const recycleCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
      if (!(canvas as HTMLCanvasElement & { poisoned?: boolean }).poisoned)
        return canvas;
      const fresh = document.createElement("canvas");
      fresh.className = canvas.className;
      fresh.setAttribute("aria-hidden", "true");
      canvas.replaceWith(fresh);
      canvasRef.current = fresh;
      return fresh;
    };

    /**
     * The GPU path gave up after starting. The visitor sees the finished WebP
     * while this rebuilds, which is the whole point of preventing the default
     * on a lost context: a lost context is recoverable, a black rectangle is
     * not. A program that failed to link will fail again, so that goes to the
     * 2D board immediately.
     */
    const onLost = (reason: "lost" | "failed") => {
      if (disposed) return;
      losses += 1;
      if (losses > 1 || reason === "failed") forceCpu = true;
      const canvas = canvasRef.current;
      if (canvas)
        (canvas as HTMLCanvasElement & { poisoned?: boolean }).poisoned = true;
      setStatus("fallback");
      stop();
      boot();
    };

    // The field follows the breakpoint, chosen here rather than in React
    // state, so the board is built once with the right field instead of
    // built with the desktop field and rebuilt after the state lands.
    const boot = () => {
      const gen = ++generation;
      const phone = phoneQuery.matches;
      const spec = source ? SOURCES[source] : undefined;
      const loading: Promise<BoardField | null> =
        mode === "text"
          ? loadText(phone)
          : spec
            ? phone && spec.loadSm
              ? spec.loadSm()
              : spec.load()
            : Promise.resolve(null);
      loading.then(
        (field) => {
          if (disposed || gen !== generation) return;
          if (!field) {
            setStatus("fallback");
            return;
          }
          cleanup = start(field);
        },
        () => {
          if (!disposed && gen === generation) setStatus("fallback");
        },
      );
    };

    // Hero and text: the field and the pixel grid follow the 48rem breakpoint
    // and must match the CSS box exactly, so a flip rebuilds the board.
    const rebuilds =
      mode === "text" || Boolean(source && SOURCES[source].loadSm);
    const onBreakpoint = () => {
      stop();
      setStatus("lattice");
      boot();
    };
    if (rebuilds) phoneQuery.addEventListener("change", onBreakpoint);

    // Print: the fallback image is in the DOM but out of layout (and lazy) on
    // screen, so it costs no request; asking for it before the print snapshot
    // covers engines that do not load lazy images for paper.
    const onBeforePrint = () => {
      for (const img of figure.querySelectorAll<HTMLImageElement>(
        "img.board-fallback",
      )) {
        img.loading = "eager";
      }
    };
    const printQuery = window.matchMedia("print");
    const onPrintQuery = (event: MediaQueryListEvent) => {
      if (event.matches) onBeforePrint();
    };
    window.addEventListener("beforeprint", onBeforePrint);
    printQuery.addEventListener("change", onPrintQuery);

    boot();

    return () => {
      disposed = true;
      generation++;
      if (rebuilds) phoneQuery.removeEventListener("change", onBreakpoint);
      window.removeEventListener("beforeprint", onBeforePrint);
      printQuery.removeEventListener("change", onPrintQuery);
      stop();
    };
  }, [
    mode,
    source,
    text,
    caption,
    restLabel,
    density,
    motionEpoch,
    themeEpoch,
    gpu,
  ]);

  const decorative = alt === "";
  // The caption's resting text is in the HTML from the first frame; the
  // effect only ever replaces it with the pointer readout (and, on a phone,
  // with the phone field's numbers once it arrives). Text mode has no count
  // until the string is rasterised, so it shows the grid alone.
  const grid = `${box.cols * density} × ${box.rows * density}`;
  const rest =
    restLabel ??
    (count !== undefined
      ? `${grid} · ${count.toLocaleString("en-US")} dots`
      : grid);

  // The finished portrait, shown by CSS when the canvas cannot run and in
  // print. Out of layout and lazy on screen, so it is never requested there.
  // <picture> picks the phone crop below 48rem with no state involved.
  const image = (
    <picture>
      {mobileFallback && <source media={PHONE} srcSet={mobileFallback} />}
      <img
        src={fallback}
        alt=""
        className="board-fallback"
        width={box.cols}
        height={box.rows}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );

  return (
    <figure
      ref={figureRef}
      className={className ? `board ${className}` : "board"}
      data-board="lattice"
      data-mode={mode}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      style={
        {
          "--board-cols-lg": box.cols,
          "--board-rows-lg": box.rows,
          ...(box.colsSm !== undefined
            ? { "--board-cols-sm": box.colsSm, "--board-rows-sm": box.rowsSm }
            : {}),
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} aria-hidden className="board-canvas" />
      {fallback && image}
      {fallback && <noscript>{image}</noscript>}
      {caption && (
        <figcaption className="board-caption data" aria-live="off">
          <span ref={readoutRef}>{rest}</span>
        </figcaption>
      )}
    </figure>
  );
}
