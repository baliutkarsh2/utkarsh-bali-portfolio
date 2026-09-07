"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { BoardField } from "@/content/portrait-types";
import { createBoard, type Board, type BoardMode } from "@/lib/board";
import { createGLBoard } from "@/lib/field/gl-board";
import { motionAllowed, onMotionChange } from "@/lib/motion";

type BoardStatus = "lattice" | "assembling" | "live" | "settled" | "static" | "fallback";

/** Which baked portrait a board shows. The field itself is loaded on the client. */
export type PortraitSource = "hero" | "about" | "contact";

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
};

const SEEN_KEY = "board:seen";
/**
 * Portrait fields are baked at twice the page pitch in each direction
 * (scripts/bake-portrait.py), so a 192 x 240 field fills a 96 x 120 lattice
 * box. Text mode rasterises at the lattice itself.
 */
const PORTRAIT_DENSITY = 2;
const PHONE = "(width < 48rem)";
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
};

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
    load: () => import("@/content/portrait-field-96").then((m) => m.portraitField96),
    loadSm: () => import("@/content/portrait-field-64").then((m) => m.portraitField64),
  },
  about: {
    cols: 64,
    rows: 80,
    load: () => import("@/content/portrait-field-about").then((m) => m.portraitFieldAbout),
  },
  contact: {
    cols: 48,
    rows: 60,
    load: () => import("@/content/portrait-field-contact").then((m) => m.portraitFieldContact),
  },
};

const TEXT_BOX: Required<Box> = { cols: 96, rows: 40, colsSm: 64, rowsSm: 28 };
const DEFAULT_BOX: Box = { cols: 96, rows: 120 };

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function densityOf(mode: BoardMode): number {
  return mode === "text" ? 1 : PORTRAIT_DENSITY;
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
}: DotBoardProps) {
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  // The motion policy can flip mid-session (the palette's toggle, the OS
  // setting). Each change re-runs the board effect, which tears the board
  // down and rebuilds it under the new policy: a settled still when reduced,
  // the fixed canvas with its pin bed when restored.
  const [motionEpoch, setMotionEpoch] = useState(0);
  useEffect(() => onMotionChange(() => setMotionEpoch((n) => n + 1)), []);

  const box = boxOf(mode, source);
  const density = densityOf(mode);

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
      ink: cssVar(figure, "--ink", "#F2F1EC"),
      sun: cssVar(figure, "--sun", "#FF6A2B"),
      off: cssVar(figure, "--dot-off", "#232326"),
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
      const wantsGpu = motion && (mode === "hero" || mode === "text") && !forceCpu;
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
      let dprCap = 2;
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
      let resizeRaf = 0;
      const canIdle = typeof window.requestIdleCallback === "function";

      const restText = () =>
        restLabel ?? `${field.w} × ${field.h} · ${board.count.toLocaleString("en-US")} dots`;
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
        const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
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
        } else if (!recovered && dprCap < 2 && ++fastFrames >= FAST_RECOVER) {
          // A second and a half of smooth frames: the stall was transient.
          // Once only, so a board that is genuinely at the edge of the budget
          // settles at 1.5x instead of oscillating and relaying out forever.
          recovered = true;
          dprCap = 2;
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
      const leave = () => {
        inside = false;
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
          const R = LIGHT_CELLS * pitch;
          const near =
            x > rect.left - R && x < rect.right + R && y > rect.top - R && y < rect.bottom + R;
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
          board.pointer(x, y);
          schedule();
        }
        if (caption) {
          const cell = board.cellAt(x, y);
          window.clearTimeout(leaveTimer);
          if (cell) {
            setReadout(
              `x ${String(cell.x).padStart(3, "0")} · y ${String(cell.y).padStart(3, "0")} · ${cell.L.toFixed(2)}`,
            );
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
          const t = Math.min(1, Math.max(0, window.scrollY / (0.9 * window.innerHeight)));
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
          board.assemble(performance.now());
          setStatus("assembling");
          schedule();
        };
        begin = run;
        idle = canIdle ? window.requestIdleCallback(run, { timeout: 1200 }) : window.setTimeout(run, 500);
      }

      return () => {
        if (raf) cancelAnimationFrame(raf);
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        if (idle !== undefined) {
          if (canIdle) window.cancelIdleCallback(idle);
          window.clearTimeout(idle);
        }
        window.clearTimeout(leaveTimer);
        io.disconnect();
        if (begin) document.removeEventListener("visibilitychange", begin);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        pointerTarget.removeEventListener("pointermove", onMove as EventListener);
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
      const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, FONT_WAIT_MS));
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
      if (!(canvas as HTMLCanvasElement & { poisoned?: boolean }).poisoned) return canvas;
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
      if (canvas) (canvas as HTMLCanvasElement & { poisoned?: boolean }).poisoned = true;
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
    const rebuilds = mode === "text" || Boolean(source && SOURCES[source].loadSm);
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
      for (const img of figure.querySelectorAll<HTMLImageElement>("img.board-fallback")) {
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
  }, [mode, source, text, caption, restLabel, density, motionEpoch]);

  const decorative = alt === "";
  // The caption's resting text is in the HTML from the first frame; the
  // effect only ever replaces it with the pointer readout (and, on a phone,
  // with the phone field's numbers once it arrives). Text mode has no count
  // until the string is rasterised, so it shows the grid alone.
  const grid = `${box.cols * density} × ${box.rows * density}`;
  const rest =
    restLabel ?? (count !== undefined ? `${grid} · ${count.toLocaleString("en-US")} dots` : grid);

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
