/**
 * The site mark: a 3 × 3 lattice of dots at the page pitch.
 *
 * The SVG has no viewBox. CSS sizes it to `3 * var(--pitch)` square
 * (.nine-dot-mark in chrome.css) and the geometry is written in percentages
 * of that box (cell centres at 1/6, 3/6, 5/6), so every dot centre lands on
 * the lattice at either pitch without the component knowing whether the
 * pitch is 5px or 6px. Written this way the connecting hairlines are exactly
 * 1px and the dots exactly 1.5px (r = 0.75 user units = CSS px), the same
 * weight as every other dot on the site. A viewBox in pitch units would need
 * `vector-effect: non-scaling-stroke` for the 1px line, and under that effect
 * Chromium measures dash lengths in screen space, which breaks the
 * `pathLength`-normalised draw (verified: the segments render dashed at every
 * offset).
 *
 * At rest only the dots show. On hover of the enclosing link the twelve
 * neighbour hairlines draw in over 220ms (`.nine-dot-mark` in chrome.css):
 * the dots connect. Purely decorative, so it is hidden from the tree; the
 * link that wraps it carries the accessible name.
 */

const CELLS = [0, 1, 2] as const;

/** Centre of cell k as a percentage of the three-pitch box: 1/6, 3/6, 5/6. */
const at = (k: number) => `${((2 * k + 1) / 6) * 100}%`;

/** Orthogonal neighbour pairs, [x1, y1, x2, y2]: six horizontal, six vertical. */
const SEGMENTS: ReadonlyArray<readonly [number, number, number, number]> = [
  ...CELLS.flatMap((y) => [0, 1].map((x) => [x, y, x + 1, y] as const)),
  ...CELLS.flatMap((x) => [0, 1].map((y) => [x, y, x, y + 1] as const)),
];

export function NineDotMark() {
  return (
    <svg className="nine-dot-mark" aria-hidden="true" focusable="false">
      {/* Lines first so the dots paint over their end points. Each segment has
          pathLength=1, so a dash offset of 1 hides it and 0 draws it fully. */}
      <g className="nine-dot-mark-lines">
        {SEGMENTS.map(([x1, y1, x2, y2]) => (
          <line
            key={`${x1}${y1}-${x2}${y2}`}
            x1={at(x1)}
            y1={at(y1)}
            x2={at(x2)}
            y2={at(y2)}
            pathLength={1}
          />
        ))}
      </g>
      <g className="nine-dot-mark-dots">
        {CELLS.flatMap((y) =>
          CELLS.map((x) => <circle key={`${x}${y}`} cx={at(x)} cy={at(y)} r={0.75} />),
        )}
      </g>
    </svg>
  );
}
