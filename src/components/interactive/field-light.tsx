"use client";

import { useEffect, useRef } from "react";
import { motionAllowed, onMotionChange } from "@/lib/motion";

/**
 * The page field is soft under the pointer everywhere, not only in the hero:
 * lattice dots within reach of the cursor light a little (tone toward
 * --ink-2, diameter up to 0.42 of the pitch) and settle back as it leaves.
 * The light trails the pointer on a short ease, so it reads as a lamp being
 * carried across the board rather than a cursor decoration.
 *
 * One fixed canvas behind every page at z 0; content sits above it. It draws
 * only while the light is moving or fading, so an idle page costs nothing.
 * Fine pointers only, and only while motion is allowed: on a phone or under
 * reduced motion the field simply stays as CSS paints it. Inside the hero
 * board the board is authoritative, so its box is skipped.
 */
const RADIUS_CELLS = 16;
const MAX_TONE = 0.7;
const MAX_DIAMETER = 0.5; // of the pitch
const EASE_POS = 0.32;
const EASE_INTENSITY = 0.2;
const TONE_STEPS = 6;

function parseRGB(input: string, fallback: [number, number, number]): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(input.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(input.trim());
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return fallback;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function FieldLight() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const root = document.documentElement;
    const readPitch = () => parseFloat(getComputedStyle(root).getPropertyValue("--pitch")) || 6;
    const off = parseRGB(getComputedStyle(root).getPropertyValue("--dot-off"), [35, 35, 38]);
    const ink2 = parseRGB(getComputedStyle(root).getPropertyValue("--ink-2"), [166, 165, 160]);
    const palette = Array.from({ length: TONE_STEPS + 1 }, (_, k) => {
      const t = (k / TONE_STEPS) * MAX_TONE;
      const c = off.map((v, i) => Math.round(v + (ink2[i] - v) * t));
      return `rgb(${c[0]} ${c[1]} ${c[2]})`;
    });

    let pitch = readPitch();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let enabled = motionAllowed();
    let disposed = false;
    // Target follows the pointer; the light eases toward it.
    let tx = -1e4;
    let ty = -1e4;
    let lx = tx;
    let ly = ty;
    let targetI = 0;
    let intensity = 0;
    let hero: HTMLElement | null = null;
    let heroChecked = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      pitch = readPitch();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (intensity <= 0.01) return;

      // The hero board draws its own light; re-find it occasionally because
      // routes change under this persistent canvas.
      const now = performance.now();
      if (now - heroChecked > 500) {
        hero = document.querySelector<HTMLElement>('.board[data-mode="hero"][data-fixed]');
        heroChecked = now;
      }
      const box = hero ? hero.getBoundingClientRect() : null;

      const R = RADIUS_CELLS * pitch;
      const i0 = Math.max(0, Math.floor((lx - R) / pitch));
      const i1 = Math.min(Math.ceil(width / pitch), Math.ceil((lx + R) / pitch));
      const j0 = Math.max(0, Math.floor((ly - R) / pitch));
      const j1 = Math.min(Math.ceil(height / pitch), Math.ceil((ly + R) / pitch));

      // A handful of tone buckets, one path each.
      const buckets: number[][] = Array.from({ length: TONE_STEPS + 1 }, () => []);
      for (let j = j0; j <= j1; j++) {
        const cy = j * pitch + 0.5;
        for (let i = i0; i <= i1; i++) {
          const cx = i * pitch + 0.5;
          const d = Math.hypot(cx - lx, cy - ly);
          if (d >= R) continue;
          if (box && cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom) continue;
          const s = 1 - smoothstep(0, R, d);
          const f = s * s * intensity;
          if (f < 0.04) continue;
          buckets[Math.round(f * TONE_STEPS)].push(cx, cy);
        }
      }
      for (let k = 1; k <= TONE_STEPS; k++) {
        const pts = buckets[k];
        if (pts.length === 0) continue;
        const f = k / TONE_STEPS;
        const r = (1 + (MAX_DIAMETER * pitch - 1) * f) / 2;
        ctx.fillStyle = palette[k];
        ctx.beginPath();
        for (let q = 0; q < pts.length; q += 2) {
          ctx.moveTo(pts[q] + r, pts[q + 1]);
          ctx.arc(pts[q], pts[q + 1], r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const frame = () => {
      raf = 0;
      if (disposed) return;
      lx += (tx - lx) * EASE_POS;
      ly += (ty - ly) * EASE_POS;
      intensity += (targetI - intensity) * EASE_INTENSITY;
      draw();
      const moving = Math.abs(tx - lx) > 0.3 || Math.abs(ty - ly) > 0.3 || Math.abs(targetI - intensity) > 0.01;
      if (moving && !document.hidden) {
        raf = requestAnimationFrame(frame);
        return;
      }
      // Settled: snap to the exact target, draw the final frame, and stop.
      // Idle costs zero frames.
      lx = tx;
      ly = ty;
      intensity = targetI;
      draw();
    };
    const schedule = () => {
      if (!raf && !disposed && enabled && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !enabled) return;
      if (targetI === 0) {
        // Arriving: open the light where the pointer is, not from off-screen.
        lx = event.clientX;
        ly = event.clientY;
      }
      tx = event.clientX;
      ty = event.clientY;
      targetI = 1;
      schedule();
    };
    const onLeave = () => {
      targetI = 0;
      schedule();
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else schedule();
    };
    const onResize = () => {
      resize();
      schedule();
    };

    resize();
    document.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    const stopMotion = onMotionChange((allowed) => {
      enabled = allowed;
      if (!allowed) {
        targetI = 0;
        intensity = 0;
        draw();
      }
    });

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      stopMotion();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="field-light" />;
}
