#!/usr/bin/env node
/**
 * The baked fields and the page must agree on the density.
 *
 * A field is `box x DENSITY` cells, and the board draws it with cells of
 * `pitch / PORTRAIT_DENSITY` while the box itself is sized in CSS from the page
 * lattice. Those are two copies of one number, in two languages, in two files:
 * DENSITY in scripts/bake-portrait.py, PORTRAIT_DENSITY in
 * src/components/interactive/dot-board.tsx.
 *
 * If they disagree the portrait is drawn at DENSITY / PORTRAIT_DENSITY times
 * its box -- at 3 against 2 it is half again too wide and too tall, spilling
 * out of the figure and over the name -- and NOTHING says so. It is not a type
 * error: `BoardField` carries `w` and `h`, so a 288 x 360 field is as
 * well-typed as a 192 x 240 one. It is not a lint error. `next build` renders
 * it happily. The only witness is the page, and by then it has shipped.
 *
 * So the bake writes the density it used into src/content/portrait-meta.ts as
 * PORTRAIT_FIELD_DENSITY, and this compares the two and checks that every
 * committed field really is a whole number of page cells at that density.
 *
 *   node scripts/check-density.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const fail = (msg) => {
  console.error(`check-density: ${msg}`);
  process.exit(1);
};

const metaSrc = read("src/content/portrait-meta.ts");
const baked = metaSrc.match(/export const PORTRAIT_FIELD_DENSITY = (\d+);/);
if (!baked) fail("src/content/portrait-meta.ts has no PORTRAIT_FIELD_DENSITY — re-run scripts/bake-portrait.py");

const boardSrc = read("src/components/interactive/dot-board.tsx");
const page = boardSrc.match(/const PORTRAIT_DENSITY = (\d+);/);
if (!page) fail("src/components/interactive/dot-board.tsx has no PORTRAIT_DENSITY");

const bakedN = Number(baked[1]);
const pageN = Number(page[1]);
if (bakedN !== pageN) {
  fail(
    `the fields were baked at density ${bakedN} but the board draws at ${pageN}.\n` +
      `  The portrait would render at ${(bakedN / pageN).toFixed(3)}x its box.\n` +
      `  Set PORTRAIT_DENSITY = ${bakedN} in src/components/interactive/dot-board.tsx,\n` +
      `  or set DENSITY = ${pageN} in scripts/bake-portrait.py and re-bake.`,
  );
}

const fields = readdirSync(join(ROOT, "src/content")).filter((f) => /^portrait-field-.+\.ts$/.test(f));
if (fields.length === 0) fail("no src/content/portrait-field-*.ts");
for (const f of fields) {
  const s = read(join("src/content", f));
  const w = Number(s.match(/\n  w: (\d+),/)?.[1]);
  const h = Number(s.match(/\n  h: (\d+),/)?.[1]);
  if (!w || !h) fail(`${f} has no w/h`);
  if (w % bakedN || h % bakedN) {
    fail(`${f} is ${w} x ${h}, which is not a whole number of page cells at density ${bakedN}`);
  }
}

console.log(
  `check-density: fields and board agree at density ${bakedN} — ` +
    `${fields.length} fields, all a whole box of page cells.`,
);
