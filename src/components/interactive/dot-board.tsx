"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { BoardField } from "@/content/portrait-types";
import { createBoard } from "@/lib/board";
import { onThemeChange } from "@/lib/theme";

/**
 * A plate: one baked dot field, drawn once into a canvas.
 *
 * This file used to be 1,100 lines and the head of a 3,400-line renderer. It
 * carried four modes. `hero` was the portrait: a WebGL2 transform-feedback
 * particle system that assembled the face over about a second while the whole
 * page palette stepped from plate to paper, with a cursor that burnished a
 * highlight into the field, a tear above 600 px/s, a frame governor and a tier
 * ladder down to a 2D canvas and then to a still image. `afterimage` was a
 * ghost of the same portrait in the corner of the close. `text` set a string
 * in dots and was never used by anything.
 *
 * The portrait is a photograph now (src/components/sections/hero.tsx), the
 * ghost is gone, and with them went the only reason any of that existed. What
 * is left is the one mode the site actually needs: the eight project devices,
 * the quarterly rule and the sky over West Lafayette, each a small engraved
 * diagram that is drawn once and never moves.
 *
 * So: no animation, no pointer, no WebGL, no tier ladder, no governor, no
 * session state. Load a field, draw it, redraw it if the theme or the size
 * changes. The `<picture>` beside the canvas is what shows without JavaScript,
 * in print, and if anything here fails.
 */

/** Which baked field a plate shows. The field itself loads on the client. */
export type PortraitSource =
  | "device-recurly"
  | "device-checkpoint"
  | "device-clip-h"
  | "device-crawler"
  | "device-qualgent"
  | "device-qa"
  | "device-clinical"
  | "device-wallex"
  | "rule-quarters"
  | "sky";

export type DotBoardProps = {
  /** The baked field to load. */
  source: PortraitSource;
  /** Accessible name of the figure. Empty string marks it decorative. */
  alt: string;
  /** Image shown when the canvas cannot run, and in print. */
  fallback?: string;
  className?: string;
};

/**
 * Every plate is baked at two cells to the lattice step. It is the grid at
 * which a 48-cell device still resolves a rank of marks and a 192-cell sky
 * still resolves a star; scripts/bake-art.py states it as the bakers' default,
 * src/content/plates.ts records it per plate, and scripts/check-plates.mjs
 * compares the two. A field baked at one density and drawn at another renders
 * at the wrong SIZE while every type check still passes, which is the bug
 * scripts/check-density.mjs exists for.
 */
const PLATE_DENSITY = 2;

type SourceSpec = {
  cols: number;
  rows: number;
  load: () => Promise<BoardField>;
};

/** One plate: one field export, one box. scripts/check-plates.mjs reads the
 *  arguments straight out of these calls and compares them to plates.ts. */
const plate = (
  cols: number,
  rows: number,
  load: () => Promise<BoardField>,
): SourceSpec => ({ cols, rows, load });

/**
 * The fields stay on the client side of the server boundary: each is its own
 * hashed chunk, fetched when a plate first needs it and cached across routes,
 * instead of tens of KB of base64 inlined in every page's HTML and RSC
 * payload. The box sizes are what the server renders, so the box never
 * depends on the data and nothing shifts when the field lands.
 */
const SOURCES: Record<PortraitSource, SourceSpec> = {
  // The eight project devices. One module, one chunk: eight fields is 31 KB
  // of base64, so splitting them would buy eight requests to save nothing.
  "device-recurly": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceRecurly)),
  "device-checkpoint": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceCheckpoint)),
  "device-clip-h": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceClipH)),
  "device-crawler": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceCrawler)),
  "device-qualgent": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceQualgent)),
  "device-qa": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceQa)),
  "device-clinical": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceClinical)),
  "device-wallex": plate(24, 30, () =>
    import("@/content/plate-devices").then((m) => m.deviceWallex)),

  // The register strip: projects per quarter, counted from projects.ts.
  "rule-quarters": plate(120, 4, () =>
    import("@/content/plate-rule").then((m) => m.quarterlyRule)),

  // The sky over West Lafayette. The one plate made mostly of ink.
  sky: plate(96, 96, () =>
    import("@/content/sky-field").then((m) => m.skyField)),
};

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export function DotBoard({ source, alt, fallback, className }: DotBoardProps) {
  const figureRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The board reads its ink out of the cascade once, at create time, so a
  // theme change has to rebuild it. The epoch is a ref rather than state
  // because nothing React renders depends on it -- it only re-runs the effect.
  const themeRef = useRef(0);

  const box = SOURCES[source];

  useEffect(() => {
    const figure = figureRef.current;
    const canvasEl = canvasRef.current;
    if (!figure || !canvasEl) return;

    let disposed = false;
    let teardown: (() => void) | null = null;

    // The plate's state lives on the figure as data-board, written
    // imperatively. CSS shows the fallback image for data-board="fallback".
    const setStatus = (s: "lattice" | "static" | "fallback") => {
      figure.dataset.board = s;
    };

    const draw = (field: BoardField) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const board = createBoard(canvas, field, {
        colors: {
          ink: cssVar(figure, "--ink", "#14120e"),
          off: cssVar(figure, "--dot-off", "rgba(20,18,14,0.06)"),
        },
      });
      if (!board) {
        setStatus("fallback");
        return;
      }

      // Geometry is read fresh on every layout: the pitch steps at 80rem, the
      // DPR changes with zoom or a display move, and the box moves with the
      // page. The grid origin snaps to the page lattice (viewport k * pitch)
      // so a field dot and the page dot beneath it are the same pixel.
      const relayout = () => {
        const pitch = parseFloat(cssVar(figure, "--pitch", "6")) || 6;
        const rect = figure.getBoundingClientRect();
        if (rect.width < 1) return;
        // Backed at 2x whatever the display gives, then resolved down by the
        // compositor. A cell at 100% on a 1x panel is two device px, which is
        // this screen ruling's Nyquist limit: the TONE comes out right and the
        // DETAIL does not survive -- marks flatten into one grey slab. That is
        // what "washed out at 100%" actually was, and this is the fix. The
        // plate is drawn once, so the extra rasterisation is a one-shot cost
        // and never a frame budget.
        const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
        // The canvas bleeds one pitch on every side, so a snapped origin just
        // outside the box is not clipped.
        const bleed = pitch;
        board.layout({
          width: rect.width + 2 * bleed,
          height: rect.height + 2 * bleed,
          originX: Math.round(rect.left / pitch) * pitch - rect.left + bleed,
          originY: Math.round(rect.top / pitch) * pitch - rect.top + bleed,
          pitch: pitch / PLATE_DENSITY,
          lattice: pitch,
          dpr,
        });
        board.drawSettled();
      };

      relayout();
      setStatus("static");

      // A resize can fire many times a second; the plate only needs the last
      // one, and drawing it is cheap enough that one frame of coalescing is
      // the whole optimisation it needs.
      let raf = 0;
      const onResize = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(relayout);
      };
      window.addEventListener("resize", onResize);

      // Print: the fallback image is in the DOM but out of layout (and lazy)
      // on screen, so it costs no request; asking for it before the print
      // snapshot covers engines that do not load lazy images for paper.
      const onBeforePrint = () => {
        for (const img of figure.querySelectorAll<HTMLImageElement>(
          "img.board-fallback",
        )) {
          img.loading = "eager";
        }
      };
      window.addEventListener("beforeprint", onBeforePrint);

      teardown = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("beforeprint", onBeforePrint);
        board.dispose();
      };
    };

    SOURCES[source].load().then(
      (field) => {
        if (!disposed) draw(field);
      },
      () => {
        if (!disposed) setStatus("fallback");
      },
    );

    // A theme change remaps --ink under the figure, and the board sampled it
    // at create time. Bump the epoch and let the effect run again.
    const offTheme = onThemeChange(() => {
      themeRef.current += 1;
      teardown?.();
      teardown = null;
      setStatus("lattice");
      SOURCES[source].load().then((field) => {
        if (!disposed) draw(field);
      });
    });

    return () => {
      disposed = true;
      offTheme();
      teardown?.();
    };
  }, [source]);

  const decorative = alt === "";

  // The finished plate, shown by CSS when the canvas cannot run and in print.
  // Out of layout and lazy on screen, so it is never requested there.
  const image = (
    // A raw <img>, deliberately: these are baked stills of the plate at its
    // exact box size (24x30, 120x4, 96x96), already committed as .webp by the
    // bakers. next/image would resample a 24px image through the optimiser to
    // hand back the same 24px, and this element is out of layout and lazy --
    // on screen it is never requested at all.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fallback}
      alt=""
      className="board-fallback"
      width={box.cols}
      height={box.rows}
      loading="lazy"
      decoding="async"
    />
  );

  return (
    <div
      ref={figureRef}
      className={className ? `board ${className}` : "board"}
      data-board="lattice"
      data-mode="still"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      style={
        {
          "--board-cols-lg": box.cols,
          "--board-rows-lg": box.rows,
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} aria-hidden className="board-canvas" />
      {fallback && image}
      {fallback && <noscript>{image}</noscript>}
    </div>
  );
}
