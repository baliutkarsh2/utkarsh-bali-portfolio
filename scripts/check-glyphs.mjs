#!/usr/bin/env node
/**
 * Fails the build if a figure that <Numeral> will set contains a glyph the
 * Doto subset does not carry (src/fonts/Doto-numerals.woff2 is hand-subset
 * to exactly DOT_GLYPHS in src/lib/fonts.ts). Runs as `prebuild`; no deps.
 *
 * It reads the content files as text rather than importing them, so it needs
 * no TypeScript toolchain: every `metric: "…"` in projects.ts and every
 * `value: "…"` in metrics.ts is a figure.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const fontsSource = readFileSync(join(root, "src/lib/fonts.ts"), "utf8");
const glyphMatch = /export const DOT_GLYPHS = "([^"]*)"/.exec(fontsSource);
if (!glyphMatch) {
  console.error("check-glyphs: could not find DOT_GLYPHS in src/lib/fonts.ts");
  process.exit(1);
}
const allowed = new Set(glyphMatch[1]);

const sources = [
  { file: "src/content/metrics.ts", pattern: /value:\s*"([^"]*)"/g },
  { file: "src/content/projects.ts", pattern: /metric:\s*"([^"]*)"/g },
];

let failures = 0;
for (const { file, pattern } of sources) {
  const text = readFileSync(join(root, file), "utf8");
  for (const match of text.matchAll(pattern)) {
    const value = match[1];
    const bad = [...value].filter((c) => !allowed.has(c));
    if (bad.length > 0) {
      failures++;
      console.error(
        `check-glyphs: ${file}: "${value}" uses ${bad.map((c) => JSON.stringify(c)).join(", ")}, ` +
          `not in DOT_GLYPHS ("${glyphMatch[1]}"). Doto sets numbers only; re-subset the font or change the figure.`,
      );
    }
  }
}

if (failures > 0) process.exit(1);
console.log("check-glyphs: every numeral is in the Doto subset.");
