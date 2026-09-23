"use client";

import { useEffect, useRef } from "react";
import { onThemeChange, resolvedTheme } from "@/lib/theme";
import { DESK, SM, type Lattice } from "./hero-lattice";

/**
 * The hero portrait: a colour halftone of him, printed once.
 *
 * Round dots on a 45-degree screen, each dot's area carrying tone and its
 * colour carrying hue. It draws once. Nothing animates, nothing follows the
 * pointer, there is no arrival: the only redraws are a resize, a change of
 * width band and a theme change, and none of them leaves a frame loop behind.
 *
 * IT IS HIM, not the photograph, and there is no frame. The bake reads the
 * cut-out's alpha, so nothing outside his silhouette prints, and it dissolves
 * his shoulder off the bottom and right edges with a feather on all four, so
 * no dot ever touches the box. He stands on the page ground in both themes.
 *
 * ALL THE DECISIONS ARE BAKED (scripts/bake-hero.py). Per width band and
 * ground there is one small lossless image: its top half is the ink, one
 * pixel per dot, and its bottom half the dot's diameter as a grey level. Where
 * pixel (i, j) sits on the page is `hero-lattice.ts`, which the bake writes in
 * the same run: the screen is a square lattice laid out in log-polar space,
 * finest at the profile and coarsening toward the shoulder, so a dot's place
 * and pitch are an exp and a sin/cos away from its grid index. This file only
 * strokes discs, and the no-JavaScript stills are drawn by the bake from the
 * same grids in the same order -- the still is the canvas.
 *
 * DRAW ORDER is part of the picture. At the largest size neighbouring discs
 * overlap, and the one drawn last wins, so inks go from the least to the most
 * contrast with the ground: lightest first on paper, darkest first on the
 * plate. The bake's rasteriser sorts them the same way, ties by colour.
 */

const PHONE = "(width < 48rem)";
const TAU = Math.PI * 2;
/**
 * What the rasteriser loses, in device px of radius at 1x. Chrome's 2D
 * canvas, filling many small discs in one path, covers less than their exact
 * area: measured on flat patches of discs drawn exactly as below, and then
 * on the portrait itself against the bake's exact-area rasteriser, it is
 * about 0.045 px of radius at 1x and half that at 2x. At 1x, where a face dot
 * is 1 to 3 px across, that was 5% of the ink: the portrait printed 4 levels
 * lighter on paper and darker on the plate than the bake solved for. Each
 * disc is drawn that much larger, and every DPR lands within a level of it.
 */
const DOT_LOSS = 0.045;

const gridSrc = (phone: boolean, dark: boolean) =>
  `/portrait/hero-grid${phone ? "-sm" : ""}${dark ? "-dark" : ""}.webp`;

/** One grid, read once: every dot placed and sized in design px, by ink. */
type Grid = {
  designW: number;
  /** In draw order. `dots` is x, y, radius per dot, in design px. */
  inks: { style: string; dots: Float32Array }[];
};

const cache = new Map<string, Promise<Grid>>();

function readGrid(img: HTMLImageElement, L: Lattice, dark: boolean): Grid {
  const { cols, rows } = L;
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows * 2;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, cols, rows * 2).data;
  const half = cols * rows * 4;
  const byInk = new Map<number, number[]>();
  // A code of 255 is a diameter of dmax pitches, and the pitch at distance r
  // from the pole is k * sqrt(2) * r: so radius = code / 255 * unit * r.
  const unit = L.k * Math.SQRT2 * L.dmax * 0.5;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const n = (j * cols + i) * 4;
      const code = px[half + n];
      if (code === 0) continue;
      const key = (px[n] << 16) | (px[n + 1] << 8) | px[n + 2];
      const r = Math.exp(L.u0 + L.k * (L.a0 + 2 * i + (j & 1)));
      const th = L.v0 + L.k * (L.b0 + j);
      let list = byInk.get(key);
      if (!list) byInk.set(key, (list = []));
      list.push(L.cx + r * Math.cos(th), L.cy + r * Math.sin(th), (code / 255) * unit * r);
    }
  }
  const lum = (k: number) =>
    0.2126 * (k >> 16) + 0.7152 * ((k >> 8) & 255) + 0.0722 * (k & 255);
  const keys = [...byInk.keys()].sort(
    (a, b) => (dark ? lum(a) - lum(b) : lum(b) - lum(a)) || a - b,
  );
  return {
    designW: L.designW,
    inks: keys.map((k) => ({
      style: `rgb(${k >> 16}, ${(k >> 8) & 255}, ${k & 255})`,
      dots: new Float32Array(byInk.get(k) ?? []),
    })),
  };
}

function loadGrid(phone: boolean, dark: boolean): Promise<Grid> {
  const src = gridSrc(phone, dark);
  const hit = cache.get(src);
  if (hit) return hit;
  const L = phone ? SM : DESK;
  const p = new Promise<Grid>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // A grid baked for other lattice numbers would draw a scrambled face.
      // Refuse it, and the still -- baked with the grid -- takes over.
      if (img.naturalWidth !== L.cols || img.naturalHeight !== L.rows * 2) {
        reject(new Error(`${src} is not a ${L.cols}x${L.rows * 2} grid`));
        return;
      }
      try {
        resolve(readGrid(img, L, dark));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
  p.catch(() => cache.delete(src));
  cache.set(src, p);
  return p;
}

export function HeroDots({ alt, className }: { alt: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !canvasRef.current) return;

    let disposed = false;
    let grid: Grid | null = null;
    let wanted = "";
    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !grid) return;
      const rect = box.getBoundingClientRect();
      if (rect.width < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      // Setting the size clears the bitmap, which is the only clear needed.
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const c = canvas.getContext("2d");
      if (!c) {
        box.dataset.state = "fallback";
        return;
      }
      // Design px straight onto device px: the lattice is 620 units wide in
      // every band, and the bitmap is the box at the device's resolution.
      const s = canvas.width / grid.designW;
      c.setTransform(s, 0, 0, s, 0, 0);
      const grow = DOT_LOSS / (s * dpr);
      for (const { style, dots } of grid.inks) {
        c.fillStyle = style;
        c.beginPath();
        for (let n = 0; n < dots.length; n += 3) {
          const x = dots[n];
          const y = dots[n + 1];
          const r = dots[n + 2] + grow;
          c.moveTo(x + r, y);
          c.arc(x, y, r, 0, TAU);
        }
        c.fill();
      }
      box.dataset.state = "static";
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    const phone = window.matchMedia(PHONE);
    // Which grid is a function of two things, the width band and the theme,
    // and either can change under a drawn field. Ask again on both; a grid
    // already read comes back from the cache without a request.
    const boot = () => {
      const isPhone = phone.matches;
      const dark = resolvedTheme() === "dark";
      const src = gridSrc(isPhone, dark);
      if (src === wanted) return schedule();
      wanted = src;
      loadGrid(isPhone, dark).then(
        (g) => {
          if (disposed || src !== wanted) return;
          grid = g;
          schedule();
        },
        () => {
          if (!disposed && src === wanted) box.dataset.state = "fallback";
        },
      );
    };

    // The box is sized by the viewport (its height on a laptop, the column's
    // width on a phone), so its own size is the thing to watch. A redraw sets
    // the canvas's bitmap, never the box's size, so this cannot feed itself.
    // A zoom changes the device pixel ratio without always changing the box.
    const ro = new ResizeObserver(schedule);
    ro.observe(box);
    window.addEventListener("resize", schedule);
    phone.addEventListener("change", boot);
    const offTheme = onThemeChange(boot);

    // Print: the still is in the DOM but out of layout and lazy on screen, so
    // it costs no request there; asking for it before the print snapshot
    // covers engines that do not load lazy images for paper.
    const onBeforePrint = () => {
      for (const img of box.querySelectorAll<HTMLImageElement>("img.portrait-still")) {
        img.loading = "eager";
      }
    };
    window.addEventListener("beforeprint", onBeforePrint);

    boot();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("beforeprint", onBeforePrint);
      phone.removeEventListener("change", boot);
      offTheme();
    };
  }, []);

  // The finished print, shown by CSS without JavaScript, in print, in forced
  // colours and if a grid cannot be read. Out of layout and lazy on screen, so
  // it is never requested there; <picture> picks the band and the ground with
  // no state involved, AVIF first (a third of the WebP's weight).
  const image = (
    <picture>
      {/* Without JavaScript there is no theme toggle, so the theme IS the
          system preference and these can choose. Print falls through to the
          paper arm, which is the right answer on paper. */}
      <source
        media={`${PHONE} and (prefers-color-scheme: dark)`}
        type="image/avif"
        srcSet="/portrait/hero-dots-sm-dark@2x.avif"
      />
      <source
        media={`${PHONE} and (prefers-color-scheme: dark)`}
        srcSet="/portrait/hero-dots-sm-dark@2x.webp"
      />
      <source media={PHONE} type="image/avif" srcSet="/portrait/hero-dots-sm@2x.avif" />
      <source media={PHONE} srcSet="/portrait/hero-dots-sm@2x.webp" />
      <source
        media="(prefers-color-scheme: dark)"
        type="image/avif"
        srcSet="/portrait/hero-dots-dark@2x.avif"
      />
      <source media="(prefers-color-scheme: dark)" srcSet="/portrait/hero-dots-dark@2x.webp" />
      <source type="image/avif" srcSet="/portrait/hero-dots@2x.avif" />
      <img
        src="/portrait/hero-dots@2x.webp"
        alt=""
        className="portrait-still"
        width={620}
        height={775}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );

  return (
    <div
      ref={boxRef}
      className={className ? `portrait ${className}` : "portrait"}
      data-state="pending"
      role="img"
      aria-label={alt}
    >
      <canvas ref={canvasRef} aria-hidden className="portrait-canvas" />
      {image}
      <noscript>{image}</noscript>
    </div>
  );
}
