import type { CSSProperties } from "react";

type SpineProps = {
  /** Grid rows the spine spans: the number of experience entries. */
  rows: number;
};

/**
 * The experience column: unlit dots at the pitch from the first entry to
 * the last, lighting --ink top to bottom as you scroll with the leading lit
 * dot in --sun (the only accent on that page). Pure CSS: the light is a
 * `view()` scroll timeline on a registered number in components.css, and
 * where timelines are unsupported the spine is fully lit. Decorative; the
 * dates and "Current" tags carry the information.
 *
 * Place it in the middle column of the entries grid; `--rows` makes it span
 * every entry row (`grid-row: 1 / span var(--rows)`).
 */
export function Spine({ rows }: SpineProps) {
  return (
    <div
      className="spine"
      aria-hidden="true"
      style={{ "--rows": Math.max(1, Math.floor(rows)) } as CSSProperties}
    />
  );
}
