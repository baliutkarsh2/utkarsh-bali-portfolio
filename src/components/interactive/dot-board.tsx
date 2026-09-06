"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardField } from "@/content/portrait-types";
import { portrait } from "@/content/portrait";
import { createBoard, type Board, type BoardMode } from "@/lib/board";
import { textField } from "@/lib/board-text";
import { motionAllowed } from "@/lib/motion";

type BoardStatus = "lattice" | "assembling" | "live" | "settled" | "static" | "fallback";

export type DotBoardProps = {
  mode: BoardMode;
  /** The baked field. Required for hero, still and afterimage. */
  field?: BoardField;
  /** Hero only: the field used below 48rem. */
  mobileField?: BoardField;
  /** Text mode: the string to set in dots. */
  text?: string;
  /** Accessible name of the figure. Empty string marks it decorative. */
  alt: string;
  /** Show the mono readout under the box. */
  caption?: boolean;
  /** The readout's resting text. Defaults to "96 × 120 · 3,085 dots" from the field. */
  restLabel?: string;
  /** Image shown when the canvas cannot run (and in print). Defaults per mode. */
  fallback?: string;
  className?: string;
};

const SEEN_KEY = "board:seen";
const PHONE = "(width < 48rem)";
const FINE = "(hover: hover) and (pointer: fine)";
/** Text mode waits for the sans to load before rasterising, but never longer than this. */
const FONT_WAIT_MS = 1500;

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
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
 */
export function DotBoard({
  mode,
  field,
  mobileField,
  text,
  alt,
  caption = false,
  restLabel,
  fallback,
  className,
}: DotBoardProps) {
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  // The board's state lives on the figure as data-board, written imperatively
  // by the effect below: it changes on the animation's own schedule, and a
  // React render for each step would be wasted work. React state is kept only
  // for the one change that swaps DOM: showing the fallback image.
  const [fallbackShown, setFallbackShown] = useState(false);
  const [phone, setPhone] = useState(false);

  // Which field is on the board follows the breakpoint, and the pixel grid
  // must match the CSS box exactly, so the board rebuilds when it flips.
  useEffect(() => {
    if (mode !== "hero" || !mobileField) return;
    const mq = window.matchMedia(PHONE);
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode, mobileField]);

  const active: BoardField | undefined = mode === "hero" && phone && mobileField ? mobileField : field;
  const cols = mode === "text" ? (phone ? 64 : 96) : (active?.w ?? 96);
  const rows = mode === "text" ? (phone ? 28 : 40) : (active?.h ?? 120);

  useEffect(() => {
    const figure = figureRef.current;
    const canvas = canvasRef.current;
    if (!figure || !canvas) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    const setStatus = (s: BoardStatus) => {
      figure.dataset.board = s;
      if (s === "fallback") {
        queueMicrotask(() => {
          if (!disposed) setFallbackShown(true);
        });
      }
    };

    const fine = window.matchMedia(FINE).matches;
    const motion = motionAllowed();
    const fixed = (mode === "hero" || mode === "text") && motion;
    if (fixed) figure.dataset.fixed = "";
    else delete figure.dataset.fixed;
    const pitch = parseFloat(cssVar(figure, "--pitch", "6")) || 6;
    const colors = {
      ink: cssVar(figure, "--ink", "#F2F1EC"),
      sun: cssVar(figure, "--sun", "#FF6A2B"),
      off: cssVar(figure, "--dot-off", "#232326"),
    };

    /** Everything after the field is known. Returns its own teardown. */
    const start = (source: BoardField): (() => void) | null => {
      const board: Board | null = createBoard(canvas, source, {
        mode,
        colors,
        pointer: fine && motion,
      });
      if (!board) {
        setStatus("fallback");
        return null;
      }

      let raf = 0;
      let visible = true;
      let hidden = document.hidden;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      let slowFrames = 0;
      let pushDisabled = false;
      let leaveTimer = 0;
      let assembledOnce = false;
      let idle: number | undefined;
      let begin: (() => void) | null = null;
      const canIdle = typeof window.requestIdleCallback === "function";

      const restText = () =>
        restLabel ?? `${source.w} × ${source.h} · ${board.count.toLocaleString("en-US")} dots`;
      const setReadout = (s: string) => {
        const el = readoutRef.current;
        if (el && el.textContent !== s) el.textContent = s;
      };

      const relayout = () => {
        const rect = figure.getBoundingClientRect();
        if (fixed) {
          board.layout({
            width: window.innerWidth,
            height: window.innerHeight,
            originX: Math.round(rect.left / pitch) * pitch,
            originY: Math.round(rect.top / pitch) * pitch,
            pitch,
            dpr,
          });
        } else {
          board.layout({ width: rect.width, height: rect.height, originX: 0, originY: 0, pitch, dpr });
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
        // Governor: three slow frames drop the resolution; three more drop the pin bed.
        if (dt > 20) {
          slowFrames++;
          if (slowFrames === 3 && dpr > 1.5) {
            dpr = 1.5;
            relayout();
          } else if (slowFrames === 6 && !pushDisabled) {
            pushDisabled = true;
            board.disablePush();
          }
        }
        if (more && visible && !hidden) raf = requestAnimationFrame(loop);
        else if (!more && figure.dataset.board === "assembling") finish();
      };
      const schedule = () => {
        if (!raf && !disposed && visible && !hidden) raf = requestAnimationFrame(loop);
      };

      // ── Pointer: the light ──────────────────────────────────────────────
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        let x = event.clientX;
        let y = event.clientY;
        if (!fixed) {
          const rect = figure.getBoundingClientRect();
          x -= rect.left;
          y -= rect.top;
        }
        board.pointer(x, y);
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
        schedule();
      };
      const onLeave = () => {
        board.pointer(null, null);
        if (caption) {
          window.clearTimeout(leaveTimer);
          leaveTimer = window.setTimeout(() => setReadout(restText()), 240);
        }
        schedule();
      };

      // ── Scroll: the fixed canvas follows the figure; hero disperses ─────
      let scrollRaf = 0;
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

      const onResize = () => {
        relayout();
        schedule();
      };
      const onVisibility = () => {
        hidden = document.hidden;
        schedule();
      };

      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
          figure.dataset.visible = visible ? "true" : "false";
          if (visible) schedule();
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
      const wantsPointer = fine && motion && mode !== "afterimage";
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
        if (mode === "still" && wantsPointer) {
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
        // hello waits for the visitor rather than running out unseen.
        board.frame(performance.now());
        const run = () => {
          if (disposed) return;
          if (document.hidden) {
            document.addEventListener("visibilitychange", run, { once: true });
            return;
          }
          if (!visible) {
            idle = window.setTimeout(run, 300);
            return;
          }
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

    if (mode === "text") {
      // The string is rasterised in the page's sans. A webfont that is still
      // loading draws nothing on a canvas, so wait for it (briefly).
      const w = window.matchMedia(PHONE).matches ? 64 : 96;
      const h = window.matchMedia(PHONE).matches ? 28 : 40;
      const family = getComputedStyle(figure).fontFamily || "sans-serif";
      const ready =
        typeof document.fonts?.load === "function"
          ? document.fonts.load(`500 ${h * 4}px ${family.split(",")[0]}`).then(
              () => undefined,
              () => undefined,
            )
          : Promise.resolve();
      const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, FONT_WAIT_MS));
      Promise.race([ready, timeout]).then(() => {
        if (disposed) return;
        const source = textField(text ?? "404", w, h, family);
        if (!source) {
          setStatus("fallback");
          return;
        }
        cleanup = start(source);
      });
    } else if (active) {
      cleanup = start(active);
    } else {
      setStatus("fallback");
    }

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [mode, active, text, caption, restLabel]);

  const fallbackSrc =
    fallback ??
    (mode === "hero"
      ? phone
        ? portrait.fallback.phone
        : portrait.fallback.hero
      : mode === "still"
        ? portrait.fallback.about
        : undefined);

  const decorative = alt === "";
  // The caption's resting text is in the HTML from the first frame; the
  // effect only ever replaces it with the pointer readout. Text mode has no
  // count until the string is rasterised, so it shows the grid alone.
  const rest =
    restLabel ??
    (active
      ? `${active.w} × ${active.h} · ${active.count.toLocaleString("en-US")} dots`
      : `${cols} × ${rows}`);

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
          "--board-cols": cols,
          "--board-rows": rows,
          ...(mode === "hero" && mobileField
            ? { "--board-cols-sm": mobileField.w, "--board-rows-sm": mobileField.h }
            : {}),
        } as React.CSSProperties
      }
    >
      <canvas ref={canvasRef} aria-hidden className="board-canvas" />
      {fallbackSrc && fallbackShown && (
        // eslint-disable-next-line @next/next/no-img-element -- the finished portrait, fixed size, no resizing wanted
        <img src={fallbackSrc} alt="" className="board-fallback" width={cols} height={rows} />
      )}
      {fallbackSrc && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- no JS, no canvas */}
          <img src={fallbackSrc} alt="" className="board-fallback" width={cols} height={rows} />
        </noscript>
      )}
      {caption && (
        <figcaption className="board-caption data" aria-live="off">
          <span ref={readoutRef}>{rest}</span>
        </figcaption>
      )}
    </figure>
  );
}
