"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { onThemeChange, resolvedTheme } from "@/lib/theme";

/**
 * The hero portrait: a colour dot field of the subject.
 *
 * One disc per grid cell, each carrying the mean colour under it, with
 * diameter carrying luminance so the ground shows between the marks and the
 * thing reads as a screen rather than as a picture. It draws once. Nothing
 * here animates, nothing follows the pointer, and there is no arrival: the
 * only redraws are a resize and a theme change.
 *
 * IT IS HIM, not the photograph. The bake reads the cut-out's alpha, so the
 * ridge, the sunset and the other people on it print nothing and the figure
 * sits ON the page rather than in a window cut into it. A cell the silhouette
 * only half covers prints a half-sized mark, so the edge thins instead of
 * stepping.
 *
 * THE FIELD IS AN IMAGE, not a module. `public/portrait/hero-grid.webp` is
 * 155 x 188 RGBA pixels, one per cell, baked by scripts/bake-hero.py. It is
 * about 23 KB; the same bytes as a base64 module would inline four times that
 * into a chunk. The renderer reads its pixels once and never touches it
 * again.
 *
 * THE GROUND FOLLOWS THE THEME, and so does the transfer. He is backlit --
 * the sun is behind him -- so his face is in shadow and only the rim is
 * bright, and the two grounds want different treatment:
 *
 *   · ON PAPER the diameter range is WIDE, 0.42 to 0.96. A dark cell closes
 *     up and a light one opens, so the sheet carries the highlights: his lit
 *     cheek and the rim light are made of paper showing through rather than
 *     of pale marks. A gamma of 1.10 on top separates his face from his hair.
 *   · ON THE PLATE the range is NARROW, 0.72 to 0.98, and the curve is off.
 *     There is no bright ground to show through, so a small mark is only a
 *     faint one; the marks stay big and their own colour does the work.
 *
 * Narrowing the paper range is what washed him out the first time, and the
 * ground took the blame for it -- the portrait shipped on a black plate in
 * both themes for exactly one commit. The range was the variable.
 *
 * Two grids, as the old dot portrait had. 155 columns is a 4 px cell in the
 * hero column; on a phone the same field would be a 2.3 px cell, where the
 * screen stops being visible at all and it just looks like a soft photograph,
 * so below 48rem it takes the 96-column bake instead.
 */

/** Kept in step with PAPER and PLATE in scripts/bake-hero.py, which renders
 *  the no-JavaScript stills and must draw the same picture. */
const LOOK = {
  light: { min: 0.42, max: 0.96, gamma: 1.1 },
  dark: { min: 0.72, max: 0.98, gamma: 1.0 },
} as const;
const CURVE_EXP = 0.85;
/** Below this mean coverage a cell is outside the subject and prints nothing.
 *  Kept in step with ALPHA_FLOOR in scripts/bake-hero.py, which renders the
 *  no-JavaScript still and must draw the same picture. */
const ALPHA_FLOOR = 0.35;
/** Colour buckets per channel. 32 steps is 8/255 apart: invisible in a dot
 *  screen, and it turns ~29,000 arcs into a few hundred path fills. */
const LEVELS = 32;
const PHONE = "(width < 48rem)";

const GRID = "/portrait/hero-grid.webp";
const GRID_SM = "/portrait/hero-grid-sm.webp";

type Grid = { w: number; h: number; data: Uint8ClampedArray };

/** Load the bake and read its pixels once. Same origin, so never tainted. */
function loadGrid(src: string): Promise<Grid> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("no 2d context"));
      ctx.drawImage(img, 0, 0);
      resolve({
        w: c.width,
        h: c.height,
        data: ctx.getImageData(0, 0, c.width, c.height).data,
      });
    };
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

export function HeroDots({ alt, className }: { alt: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !canvasRef.current) return;

    let disposed = false;
    let grid: Grid | null = null;
    let raf = 0;

    const setStatus = (s: "lattice" | "static" | "fallback") => {
      box.dataset.board = s;
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !grid) return;
      const rect = box.getBoundingClientRect();
      if (rect.width < 1) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const c = canvas.getContext("2d", { alpha: true });
      if (!c) {
        setStatus("fallback");
        return;
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, rect.width, rect.height);

      const { w, h, data } = grid;
      const cw = rect.width / w;
      const ch = rect.height / h;
      const cell = Math.min(cw, ch);
      const look = LOOK[resolvedTheme()];
      // One 256-entry curve rather than a pow() per channel per cell.
      const curve = new Uint8Array(256);
      for (let v = 0; v < 256; v++) {
        curve[v] = Math.round(Math.pow(v / 255, look.gamma) * 255);
      }

      // Bucket by quantised colour, then lay every disc of one colour into a
      // single path. A path may hold arcs of any radius, so diameter stays
      // exact and only the colour is stepped -- which is what makes ~29,000
      // marks a few hundred fills instead of 29,000 fillStyle assignments.
      const buckets = new Map<number, number[]>();
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = (j * w + i) * 4;
          const cover = data[k + 3] / 255;
          if (cover < ALPHA_FLOOR) continue;
          const r = curve[data[k]];
          const g = curve[data[k + 1]];
          const b = curve[data[k + 2]];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const dia =
            (look.min +
              (look.max - look.min) * Math.pow(1 - lum, CURVE_EXP)) *
            cover;
          const key =
            ((r * LEVELS) >> 8) * LEVELS * LEVELS +
            ((g * LEVELS) >> 8) * LEVELS +
            ((b * LEVELS) >> 8);
          let arr = buckets.get(key);
          if (!arr) buckets.set(key, (arr = []));
          arr.push((i + 0.5) * cw, (j + 0.5) * ch, (dia * cell) / 2);
        }
      }

      const step = 255 / (LEVELS - 1);
      for (const [key, arcs] of buckets) {
        const r = Math.round(Math.floor(key / (LEVELS * LEVELS)) * step);
        const g = Math.round((Math.floor(key / LEVELS) % LEVELS) * step);
        const b = Math.round((key % LEVELS) * step);
        c.fillStyle = `rgb(${r}, ${g}, ${b})`;
        c.beginPath();
        for (let n = 0; n < arcs.length; n += 3) {
          const x = arcs[n];
          const y = arcs[n + 1];
          const rad = arcs[n + 2];
          c.moveTo(x + rad, y);
          c.arc(x, y, rad, 0, Math.PI * 2);
        }
        c.fill();
      }
      setStatus("static");
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    const phone = window.matchMedia(PHONE);
    let loadedSrc = "";
    const boot = () => {
      const src = phone.matches ? GRID_SM : GRID;
      if (src === loadedSrc) return schedule();
      loadedSrc = src;
      loadGrid(src).then(
        (g) => {
          if (disposed) return;
          grid = g;
          draw();
        },
        () => {
          if (!disposed) setStatus("fallback");
        },
      );
    };

    const onResize = () => schedule();
    window.addEventListener("resize", onResize);
    phone.addEventListener("change", boot);
    const offTheme = onThemeChange(schedule);

    // Print: the still is in the DOM but out of layout and lazy on screen, so
    // it costs no request there; asking for it before the print snapshot
    // covers engines that do not load lazy images for paper.
    const onBeforePrint = () => {
      for (const img of box.querySelectorAll<HTMLImageElement>("img.board-fallback")) {
        img.loading = "eager";
      }
    };
    window.addEventListener("beforeprint", onBeforePrint);

    boot();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("beforeprint", onBeforePrint);
      phone.removeEventListener("change", boot);
      offTheme();
    };
  }, []);

  // The finished field, shown by CSS without JavaScript, in print, and in
  // forced colours. Out of layout and lazy on screen, so it is never requested
  // there; <picture> picks the phone bake below 48rem with no state involved.
  const image = (
    <picture>
      {/* Without JavaScript there is no theme toggle, so the theme IS the
          system preference and these can choose. Print falls through to the
          paper arm, which is the right answer on paper. */}
      <source
        media={`${PHONE} and (prefers-color-scheme: dark)`}
        srcSet="/portrait/hero-dots-sm-dark@2x.webp"
      />
      <source media={PHONE} srcSet="/portrait/hero-dots-sm@2x.webp" />
      <source
        media="(prefers-color-scheme: dark)"
        srcSet="/portrait/hero-dots-dark@2x.webp"
      />
      <img
        src="/portrait/hero-dots@2x.webp"
        alt=""
        className="board-fallback"
        width={620}
        height={760}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );

  return (
    <div
      ref={boxRef}
      className={className ? `board ${className}` : "board"}
      data-board="lattice"
      data-mode="hero"
      role="img"
      aria-label={alt}
      style={
        {
          "--board-cols-lg": 155,
          "--board-rows-lg": 190,
          "--board-cols-sm": 96,
          "--board-rows-sm": 118,
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} aria-hidden className="board-canvas" />
      {image}
      <noscript>{image}</noscript>
    </div>
  );
}
