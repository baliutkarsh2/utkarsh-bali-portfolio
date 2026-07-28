"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Maximum pull in px. Small on purpose: a nudge, not a chase. */
const MAX = 5;
const EASE = 0.3;

/**
 * Magnetic hover for small square controls. Transform-only, rAF-driven with
 * an idle-settle stop (the same pattern as work-preview), and inert for
 * coarse pointers and reduced-motion users.
 */
export function Magnetic({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;

    const tick = () => {
      raf = 0;
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      if (Math.abs(targetX - x) > 0.15 || Math.abs(targetY - y) > 0.15) {
        raf = requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      targetX = (dx / rect.width) * 2 * MAX;
      targetY = (dy / rect.height) * 2 * MAX;
      schedule();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {children}
    </span>
  );
}
