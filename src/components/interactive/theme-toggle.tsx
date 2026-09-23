"use client";

import { useEffect, useState } from "react";
import { onThemeChange, resolvedTheme, setTheme } from "@/lib/theme";

type Scheme = "light" | "dark";

const OS_DARK = "(prefers-color-scheme: dark)";

/**
 * Every click flips what is on screen. The choice that lands on the OS's own
 * scheme is stored as "system" rather than pinned, so a visitor who switches
 * away and back is following their machine again, sunset and all, without
 * a third state to step through.
 */
function flip(): void {
  const next: Scheme = resolvedTheme() === "dark" ? "light" : "dark";
  const os: Scheme = window.matchMedia(OS_DARK).matches ? "dark" : "light";
  setTheme(next === os ? "system" : next);
}

/** The label is the action, which is what a button's name should say. */
function actionFor(shown: Scheme | null): string {
  if (shown === null) return "Switch theme";
  return shown === "dark" ? "Switch to light theme" : "Switch to dark theme";
}

/** The sun's eight rays, as dots: the site's own material, not clip art. */
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return {
    cx: (10 + 7 * Math.cos(a)).toFixed(3),
    cy: (10 + 7 * Math.sin(a)).toFixed(3),
  };
});

/**
 * The theme control: one click, the other scheme.
 *
 * It used to cycle system → dark → light → system, so for a visitor whose
 * machine is dark the first click went from "system, which is dark" to
 * "dark": the page did not change, only the glyph did, and the control read
 * as broken. It is the visitor most likely to try it who hit that. Now every
 * click flips the page, and "follows your system" is not a step in a cycle
 * but where you land whenever you choose your OS's own scheme (see `flip`).
 *
 * It used to be a hairline square holding a 9px square, hollow, filled or
 * half-filled. The vocabulary was right and the result read as an empty
 * checkbox: a box inside a box is a form control, and at rest the paper state
 * was literally an empty square in the corner of every page.
 *
 * Now it is two glyphs everyone already reads, drawn in the site's own
 * material: a sun whose rays are dots, and a crescent. The glyph is the
 * scheme on screen. Both are in the markup and CSS shows the one that
 * matches, from `data-theme` on <html> (set by the boot script before first
 * paint) or, with no choice made, the OS's `prefers-color-scheme`, so the
 * right glyph is there on frame one with no hydration guess and no empty
 * slot. Switching turns the outgoing glyph away and the next one in
 * (chrome.css); under reduced motion it simply swaps.
 *
 * Stroked SVG geometry, not a radius: the one radius on this site belongs to
 * the plate mark, and scripts/check-tokens.mjs holds that line.
 *
 * Only the accessible name depends on script. It starts generic, identical on
 * server and client, and names the action once mounted.
 */
export function ThemeToggle() {
  const [shown, setShown] = useState<Scheme | null>(null);

  useEffect(() => {
    const read = () => setShown(resolvedTheme());
    read();
    return onThemeChange(read);
  }, []);

  const action = actionFor(shown);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={flip}
      aria-label={action}
      title={action}
    >
      <svg
        className="theme-glyphs"
        viewBox="0 0 20 20"
        aria-hidden="true"
        focusable="false"
      >
        {/* Light is paper: a sun, its disc open and its rays eight dots. */}
        <g className="theme-glyph" data-glyph="light">
          <circle className="tg-line" cx="10" cy="10" r="3.6" />
          {RAYS.map((ray) => (
            <circle
              key={`${ray.cx},${ray.cy}`}
              className="tg-ink"
              cx={ray.cx}
              cy={ray.cy}
              r="1.05"
            />
          ))}
        </g>

        {/* Dark is the plate: a crescent, inked solid. */}
        <g className="theme-glyph" data-glyph="dark">
          <path
            className="tg-ink"
            d="M8.822 3.608A6.5 6.5 0 1 0 16.392 11.178A5.5 5.5 0 0 1 8.822 3.608Z"
          />
        </g>
      </svg>
    </button>
  );
}
