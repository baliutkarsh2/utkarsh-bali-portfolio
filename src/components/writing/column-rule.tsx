"use client";

import { useEffect, useRef } from "react";
import { startScrollProgress } from "@/lib/scroll-progress";

/**
 * The margin rule on a post, which is also the reading progress.
 *
 * It is not a bar. The hairline between the marginalia and the measure had to
 * exist anyway to make a margin a margin; this gives it a second job. Above
 * the reader's position it is ink, below it is the ordinary hairline, and the
 * boundary walks down the page as they read. Nothing is added to the layout
 * and nothing new appears on the screen.
 *
 * The mechanism is the one already in the repo for the case-study progress
 * row: the registered `--p` custom property, the shared `progress-fill`
 * keyframes, and `animation-timeline: scroll(root)` where it exists. This
 * component mounts a bare <div> in that case; `startScrollProgress` writes
 * the identical number from a passive, rAF-coalesced listener where it does
 * not, and returns a no-op where CSS already owns it.
 *
 * The finished state is the base state, decided in CSS before first paint:
 * globals.css sets `--p: 1` without JavaScript and under reduced motion from
 * either source, so a visitor with neither sees a fully drawn rule.
 *
 * Decorative: the reader's scroll position is the real progress.
 */
export function ColumnRule() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return startScrollProgress(el);
  }, []);

  return <div ref={ref} className="column-rule" aria-hidden="true" />;
}
