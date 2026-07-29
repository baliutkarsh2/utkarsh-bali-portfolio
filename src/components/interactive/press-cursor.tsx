"use client";

import { useEffect, useRef } from "react";

/** How hard the ring chases the pointer. The crosshair itself never lags. */
const EASE = 0.22;

/**
 * The pointer becomes a printer's registration target: a hairline crosshair
 * that tracks exactly, a ring that trails slightly, and a live coordinate
 * readout in the mono face.
 *
 * Only ever mounts for a fine pointer that is not asking for reduced motion.
 * Touch, keyboard and reduced-motion visitors keep the native cursor and lose
 * nothing, because this carries no information that is not already on screen.
 */
export function PressCursor() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cross = root.querySelector<HTMLElement>("[data-cross]");
    const ring = root.querySelector<HTMLElement>("[data-ring]");
    const readout = root.querySelector<HTMLElement>("[data-readout]");
    if (!cross || !ring || !readout) return;

    let raf = 0;
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const eased = { x: target.x, y: target.y };
    let printed = "";

    const frame = () => {
      raf = 0;
      eased.x += (target.x - eased.x) * EASE;
      eased.y += (target.y - eased.y) * EASE;

      cross.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      ring.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0)`;

      // Coordinates are the point of a registration target, so they update
      // with the crosshair, not the trailing ring.
      const next = `${Math.round(target.x)} ${Math.round(target.y)}`;
      if (next !== printed) {
        printed = next;
        readout.textContent = next;
      }

      if (Math.abs(target.x - eased.x) > 0.1 || Math.abs(target.y - eased.y) > 0.1) {
        raf = requestAnimationFrame(frame);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target.x = event.clientX;
      target.y = event.clientY;

      const el = event.target as Element | null;
      const state = el?.closest?.("[data-loupe]")
        ? "loupe"
        : el?.closest?.("a, button, [role='button'], summary")
          ? "live"
          : el?.closest?.("input, textarea, [contenteditable='true']")
            ? "text"
            : "idle";
      if (root.dataset.state !== state) root.dataset.state = state;

      if (!root.dataset.on) root.dataset.on = "";
      schedule();
    };

    const onLeave = () => {
      delete root.dataset.on;
    };

    const onDown = () => {
      root.dataset.press = "";
    };
    const onUp = () => {
      delete root.dataset.press;
    };

    document.documentElement.classList.add("press-cursor");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      document.documentElement.classList.remove("press-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden className="cursor-root">
      <div data-ring className="cursor-ring" />
      <div data-cross className="cursor-cross">
        <span className="cursor-arm cursor-arm-h" />
        <span className="cursor-arm cursor-arm-v" />
        <span data-readout className="cursor-readout meta" />
      </div>
    </div>
  );
}
