#!/usr/bin/env node
/**
 * The design rules that must not drift, as a build failure rather than a comment.
 *
 * The failure mode of every art direction is gradual: one more accent hue
 * because a chart needed a third series, one Didone caption at 14px because the
 * space was tight, one rounded card because a component library had one. Each
 * is defensible alone and together they are the generic template the direction
 * exists to escape. A rule you have to *delete* to break is a rule that holds.
 *
 * Pure text analysis on purpose. It runs in `prebuild` on Vercel, so it may not
 * need a browser, a GL driver, Python, or a network. (The shader COMPILE check
 * needs all of that and is therefore a separate, local gate:
 * `npm run check:shaders`.)
 *
 *   node scripts/check-tokens.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS_DIR = join(ROOT, "src", "app");
const GLOBALS = join(CSS_DIR, "globals.css");

const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

const cssFiles = readdirSync(CSS_DIR)
  .filter((name) => name.endsWith(".css"))
  .map((name) => [name, readFileSync(join(CSS_DIR, name), "utf8")]);

const globals = readFileSync(GLOBALS, "utf8");

/* ─────────────────────────────────────────────────────────────
   1. One saturated hue, site-wide.

   Measured as chroma — (max − min) / 255 — and not HSL saturation, which is
   inflated near white and near black: the paper #e7e1d6 computes to 0.26
   saturation and the plate #16140f to 0.19, while both are obviously neutral.
   Chroma separates them cleanly: every neutral on this site is under 0.10 and
   both vermilions are over 0.55.
   ───────────────────────────────────────────────────────────── */
const CHROMA_LIMIT = 0.25;
/** Vermilion is 9.8°, the lit variant 15.5°. Anything else coloured is a second ink. */
const HUE_CENTRE = 13;
const HUE_TOLERANCE = 22;

function chromaAndHue(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = max - min;
  if (c === 0) return { chroma: 0, hue: 0 };
  let hue;
  if (max === r) hue = 60 * (((g - b) / c + 6) % 6);
  else if (max === g) hue = 60 * ((b - r) / c + 2);
  else hue = 60 * ((r - g) / c + 4);
  return { chroma: c, hue };
}

for (const [file, css] of cssFiles) {
  for (const [, token, hex] of css.matchAll(
    /(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g,
  )) {
    const { chroma, hue } = chromaAndHue(hex);
    if (chroma < CHROMA_LIMIT) continue;
    // Shortest signed angular distance, so 358° and 2° are four degrees apart.
    const off = ((((hue - HUE_CENTRE + 180) % 360) + 360) % 360) - 180;
    if (Math.abs(off) > HUE_TOLERANCE) {
      fail(
        "one saturated hue",
        `${file}: ${token} is ${hex} — chroma ${chroma.toFixed(2)} at hue ${hue.toFixed(0)}°, ` +
          `outside the vermilion family (${HUE_CENTRE}° ± ${HUE_TOLERANCE}). ` +
          `The second ink is licensed to four places site-wide; a third is not licensed at all.`,
      );
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   2. Bodoni's floor is 21px.

   A Didone's failure mode on screen is that its hairlines vanish at small
   sizes — worst on a 1× Windows panel with greyscale antialiasing, which is
   most visitors. Optical sizing is the historical fix and it runs out: below
   21px the answer is not a smaller `opsz`, it is a different typeface.

   Checked at the type scale rather than at every call site, because the scale
   is where a size is *decided*. The smallest value of a `clamp()` is the one
   that matters: it is what a narrow viewport actually renders.
   ───────────────────────────────────────────────────────────── */
const BODONI_FLOOR_REM = 21 / 16;

for (const [, token, value] of globals.matchAll(
  /(--text-display-[\w-]*?):\s*([^;]+);/g,
)) {
  if (token.includes("--line-height") || token.includes("--letter-spacing"))
    continue;
  if (token.includes("--font-weight")) continue;
  const sizes = [...value.matchAll(/([\d.]+)rem/g)].map((m) => Number(m[1]));
  if (sizes.length === 0) continue;
  const smallest = Math.min(...sizes);
  if (smallest < BODONI_FLOOR_REM - 1e-9) {
    fail(
      "Bodoni's floor",
      `${token} can render at ${(smallest * 16).toFixed(1)}px, under the 21px floor. ` +
        `Below 21px the display face is not the answer; Source Serif is.`,
    );
  }
}

/* ─────────────────────────────────────────────────────────────
   3. No tone channel in the draw shader.

   The renderer used to encode luminance in two channels: tone (mixing the
   unlit colour toward the ink) and diameter. On a dark ground tone does most
   of the perceptual work. Invert the ground and the same formula gives
   mid-grey dots on near-white, which the eye integrates into one flat grey —
   the smudge. The fix was not to tune it. The fix was to delete the channel:
   every mark is one ink at full strength and value is carried by AREA alone.
   That is what an engraving is.

   So `uOff` — the unlit colour — must never reach the fragment colour.
   ───────────────────────────────────────────────────────────── */
const shaderSource = readFileSync(
  join(ROOT, "src", "lib", "field", "gl-board.ts"),
  "utf8",
);
const drawStart = shaderSource.indexOf("const DRAW_VS");
const drawEnd = shaderSource.indexOf("const SHARED");
if (drawStart < 0 || drawEnd < 0) {
  fail(
    "no tone channel",
    "could not find DRAW_VS in gl-board.ts — this check has gone stale",
  );
} else {
  const draw = shaderSource.slice(drawStart, drawEnd);
  for (const line of draw.split("\n")) {
    const code = line.replace(/\/\/.*$/, "");
    if (!code.includes("uOff")) continue;
    if (/^\s*uniform\s/.test(code)) continue;
    fail(
      "no tone channel",
      `the draw shader reads uOff: "${code.trim()}". Value is carried by ink AREA, ` +
        `not by mixing a mark toward the ground — that is the smudge, and it is the ` +
        `one thing this direction cannot survive.`,
    );
  }
}

/* ─────────────────────────────────────────────────────────────
   4. One radius, and it is the plate mark.

   `--plate-radius` is 2px and it is the deboss a copper plate leaves in
   dampened paper: the site's only radius and only shadow. `50%` is allowed
   only on something that is actually a dot — 6px or under — because a dot in a
   dot field is round by definition and a card is not.
   ───────────────────────────────────────────────────────────── */
if (!/--radius:\s*0px/.test(globals)) {
  fail(
    "one radius",
    "--radius is no longer 0px. Nothing on this site is rounded but the plate mark.",
  );
}

for (const [file, css] of cssFiles) {
  for (const match of css.matchAll(/border-radius:\s*([^;]+);/g)) {
    const value = match[1].trim();
    if (value === "var(--radius)" || value === "var(--plate-radius)") continue;
    if (value === "50%") {
      // Allowed only on a dot. Look back over the declaration block for a size.
      const block = css.slice(Math.max(0, match.index - 400), match.index);
      const sizes = [
        ...block.matchAll(/\b(?:width|height):\s*([\d.]+)px/g),
      ].map((m) => Number(m[1]));
      if (sizes.length > 0 && Math.max(...sizes) <= 6) continue;
      fail(
        "one radius",
        `${file}: border-radius: 50% on something that is not a dot (${sizes.join("×") || "no px size found"}).`,
      );
      continue;
    }
    fail(
      "one radius",
      `${file}: border-radius: ${value}. The only radius on this site is the plate mark's 2px deboss.`,
    );
  }
}

/* ───────────────────────────────────────────────────────────── */
if (failures.length > 0) {
  console.error("check-tokens: the direction has drifted.\n");
  for (const { rule, detail } of failures)
    console.error(`  [${rule}] ${detail}\n`);
  console.error(
    `${failures.length} violation${failures.length === 1 ? "" : "s"}. ` +
      "Each of these is a rule you have to delete to break — so if one of them is now wrong, " +
      "delete it here, deliberately, rather than working around it.",
  );
  process.exit(1);
}
console.log(
  "check-tokens: one hue, one radius, no tone channel, Bodoni above its floor.",
);
