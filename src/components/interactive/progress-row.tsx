"use client";

import { useEffect, useRef } from "react";
import { startScrollProgress } from "@/lib/scroll-progress";

/**
 * The reading-progress strip (§5.7): one row of unlit dots at the pitch
 * along the sub-bar's bottom edge, lighting --ink left to right with the
 * leading lit dot in --sun, the one accent element on a case-study screen.
 *
 * Everything visual is in `.progress-row`, driven by the registered `--p`
 * custom property. Where scroll timelines exist the CSS animation writes
 * `--p` and this component mounts nothing but a <div>. Elsewhere
 * `startScrollProgress` (@/lib/scroll-progress) writes the same `--p` from a
 * passive, rAF-coalesced scroll listener, so one set of keyframes serves
 * both paths and no frame runs while nothing scrolls. That module owns the
 * support check and the reduced-motion policy; it returns a no-op where CSS
 * already drives the row.
 *
 * Decorative: the page's scroll position is the real progress.
 */
export function ProgressRow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return startScrollProgress(el);
  }, []);

  return <div ref={ref} className={className ? `progress-row ${className}` : "progress-row"} aria-hidden="true" />;
}
