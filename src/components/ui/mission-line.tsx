import type { CSSProperties } from "react";

type MissionLineProps = {
  /** Dots on the line: 7 in the hero, 3 in the footer. Never fewer than 2. */
  dots?: number;
  /** Optional caption after the line, set in `meta`. */
  text?: string;
};

/**
 * "Connecting the dots", literally: n dots at the page pitch joined by a
 * hairline that draws in from left to right.
 *
 * The SVG has no viewBox. CSS sizes it to `(dots - 1) * var(--pitch)` by
 * `var(--pitch)` (.mission-line-rule in chrome.css) and the geometry is
 * written in percentages of that box, so the dots land exactly one pitch
 * apart at either pitch while the hairline stays exactly 1px and each dot
 * exactly 1.5px (r = 0.75 user units = CSS px). A viewBox in pitch units
 * would need `vector-effect: non-scaling-stroke` to hold the line at 1px,
 * and under that effect Chromium measures dash lengths in screen space, which
 * defeats the `pathLength`-normalised draw below (verified: the line renders
 * as a dashed rule at every offset).
 *
 * The hairline has `pathLength=1`, so `stroke-dashoffset` runs 1 (hidden) →
 * 0 (drawn) regardless of how long the line is.
 *
 * Draw timing lives in chrome.css and is layered by capability:
 *  - no JS, no scroll timelines: drawn (the finished state is the fallback);
 *  - no JS, `animation-timeline: view()` supported: scrubbed in as it enters;
 *  - JS and motion allowed: hidden until `data-in` lands on it or an ancestor
 *    (the shared `<Reveal>` sets it once), then draws over `--dur-5`.
 * Words never animate: the caption is static text on the first frame.
 */
export function MissionLine({ dots = 7, text }: MissionLineProps) {
  const n = Math.max(2, Math.round(dots));
  const span = n - 1;

  return (
    <span className="mission-line" style={{ "--n": n } as CSSProperties}>
      <svg className="mission-line-rule" aria-hidden="true" focusable="false">
        <line x1="0" y1="50%" x2="100%" y2="50%" pathLength={1} />
        {Array.from({ length: n }, (_, i) => (
          <circle key={i} cx={`${(100 * i) / span}%`} cy="50%" r={0.75} />
        ))}
      </svg>
      {text && <span className="mission-line-text meta">{text}</span>}
    </span>
  );
}
