"use client";

import { useEffect, useRef, useState } from "react";
import { createPress, type Press } from "@/lib/halftone";

const PAPER_LIGHT: [number, number, number] = [0.961, 0.957, 0.933];
/** A sheet under low light, not an inverted one. Ink never prints lighter than paper. */
const PAPER_DARK: [number, number, number] = [0.82, 0.81, 0.78];

const RESOLVE_MS = 1600;
/** Wide enough to show about ten rosettes across, which is what reads as glass. */
const LOUPE_R = 78;
const LOUPE_ZOOM = 3.0;
const EASE = 0.18;

/** easeOutExpo: fast commitment, long settle. Reads as mechanical, not springy. */
function easeOut(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Lays a live four-colour press over the portrait.
 *
 * It is strictly an enhancement: the real <img> underneath is the LCP element
 * and is never touched. This canvas fades in only once WebGL has compiled, the
 * texture has decoded, and a first frame is on screen. Anything short of that
 * and the visitor simply keeps the photograph.
 */
export function HalftoneLayer({
  src,
  focus = 0.22,
  freq = 5.2,
}: {
  src: string;
  /** Vertical framing, matching the CSS object-position of the photo. */
  focus?: number;
  /** Screen ruling: cell size in CSS px before device scaling. */
  freq?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The loupe is the reason this exists and it needs a real pointer. Without
    // this gate a phone compiles shaders, uploads a texture and fetches the
    // photograph a second time to power an interaction it can never trigger,
    // on the hardware least able to afford it.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let press: Press | null = null;
    let raf = 0;
    let disposed = false;
    let started = 0;
    let dpr = 1;

    // Target and eased loupe, so the glass trails the pointer instead of
    // snapping, which is what makes it feel like a physical object.
    const target = { x: 0, y: 0, r: 0 };
    const eased = { x: 0, y: 0, r: 0 };

    const paper = (): [number, number, number] =>
      document.documentElement.classList.contains("dark") ? PAPER_DARK : PAPER_LIGHT;

    const frame = (now: number) => {
      raf = 0;
      if (!press || disposed) return;

      if (!started) started = now;
      const resolve = easeOut(Math.min((now - started) / RESOLVE_MS, 1));

      eased.x += (target.x - eased.x) * EASE;
      eased.y += (target.y - eased.y) * EASE;
      eased.r += (target.r - eased.r) * EASE;

      press.draw({
        resolve,
        loupe: { x: eased.x, y: eased.y, r: eased.r },
        zoom: LOUPE_ZOOM,
        paper: paper(),
      });

      // Keep scheduling only while something is actually moving. An idle hero
      // must cost zero frames.
      const settling =
        Math.abs(target.x - eased.x) > 0.4 ||
        Math.abs(target.y - eased.y) > 0.4 ||
        Math.abs(target.r - eased.r) > 0.4;
      if (resolve < 1 || settling) raf = requestAnimationFrame(frame);
    };

    const schedule = () => {
      if (!raf && !disposed) raf = requestAnimationFrame(frame);
    };

    const sizeTo = () => {
      if (!press) return;
      const rect = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      press.resize(Math.round(rect.width * dpr), Math.round(rect.height * dpr));
      schedule();
    };

    const image = new Image();
    image.decoding = "async";

    /**
     * Shader compilation and texture upload are synchronous main thread work.
     * Held until the browser is idle so they can never land between the
     * photograph arriving and the browser painting it, which is the gap LCP
     * measures. The image itself is already in cache from next/image.
     */
    const begin = () => {
      if (disposed) return;
      image.src = src;
      image
        .decode()
        .then(() => {
          if (disposed) return;
          // Screen ruling is in device pixels, so the scale has to be known
          // before the shader is built.
          dpr = Math.min(window.devicePixelRatio || 1, 2);
          press = createPress(canvas, image, paper(), focus, freq * dpr);
          if (!press) return;

          sizeTo();
          setLive(true);
          schedule();
        })
        .catch(() => {
          /* Decode failed. The photograph below is already correct. */
        });
    };

    // A `in window` check here narrows window to never in the else branch,
    // so this tests the function directly.
    const canIdle = typeof window.requestIdleCallback === "function";
    const idle = canIdle
      ? window.requestIdleCallback(begin, { timeout: 2500 })
      : window.setTimeout(begin, 900);

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = host.getBoundingClientRect();
      target.x = (event.clientX - rect.left) * dpr;
      target.y = (rect.bottom - event.clientY) * dpr; // GL origin is bottom left
      if (target.r === 0) {
        // Open the glass where the pointer entered rather than sliding in
        // from wherever it was last seen.
        eased.x = target.x;
        eased.y = target.y;
      }
      target.r = LOUPE_R * dpr;
      schedule();
    };

    const onLeave = () => {
      target.r = 0;
      schedule();
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      disposed = true;
      setLive(false);
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("webglcontextlost", onLost);

    const ro = new ResizeObserver(sizeTo);
    ro.observe(host);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (canIdle) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      press?.dispose();
    };
  }, [src, focus, freq]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-live={live ? "" : undefined}
      className="portrait-canvas"
    />
  );
}
