"use client";

import { useEffect, useState } from "react";
import { getTheme, onThemeChange, setTheme, type Theme } from "@/lib/theme";

const NEXT: Record<Theme, Theme> = {
  system: "dark",
  dark: "light",
  light: "system",
};

const NAME: Record<Theme, string> = {
  system: "follows your system",
  dark: "dark",
  light: "light",
};

/** The sun's eight rays, as dots: the site's own material, not clip art. */
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return {
    cx: (10 + 7 * Math.cos(a)).toFixed(3),
    cy: (10 + 7 * Math.sin(a)).toFixed(3),
  };
});

/**
 * The theme control, cycling system → dark → light → system.
 *
 * It used to be a hairline square holding a 9px square, hollow, filled or
 * half-filled. The vocabulary was right and the result read as an empty
 * checkbox: a box inside a box is a form control, and at rest the paper state
 * was literally an empty square in the corner of every page.
 *
 * Now it is three glyphs everyone already reads, drawn in the site's own
 * material: a sun whose rays are dots, a crescent, and a half-inked disc for
 * "whatever the machine says". The mark is still the state, not the action.
 * All three are in the markup and CSS shows the one that matches `data-theme`
 * on <html>, which the boot script sets before first paint, so the right glyph
 * is there on frame one with no hydration guess and no empty slot. Switching
 * turns the outgoing glyph away and the next one in (chrome.css); under
 * reduced motion it simply swaps.
 *
 * Stroked SVG geometry, not a radius: the one radius on this site belongs to
 * the plate mark, and scripts/check-tokens.mjs holds that line.
 *
 * Only the accessible name depends on script. It starts generic, identical on
 * server and client, and names the state and the next one once mounted.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Theme | null>(null);

  useEffect(() => {
    const read = () => setChoice(getTheme());
    read();
    return onThemeChange(read);
  }, []);

  const label =
    choice === null
      ? "Change theme"
      : `Theme: ${NAME[choice]}. Switch to ${NAME[NEXT[choice]]}.`;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(NEXT[choice ?? getTheme()])}
      aria-label={label}
      title={choice === null ? "Theme" : `Theme: ${NAME[choice]}`}
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

        {/* System: half the disc inked, half left as paper. */}
        <g className="theme-glyph" data-glyph="system">
          <circle className="tg-line" cx="10" cy="10" r="6.25" />
          <path className="tg-ink" d="M10 3.75a6.25 6.25 0 0 0 0 12.5Z" />
        </g>
      </svg>
    </button>
  );
}
