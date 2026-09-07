#!/usr/bin/env node
/**
 * A caption may not drift from its plate.
 *
 * `src/content/plates.ts` states every engraving's grid, dot count, box and
 * still, once, and every route sets its captions from it. That is only worth
 * anything if something compares it to the plate. Nothing else can: a
 * `BoardField` carries its own `w`, `h` and `count`, so a plate re-baked at a
 * different grid is exactly as well-typed as it was before, `next build`
 * renders it happily, and the only witness is a caption under a picture that
 * now says 48 x 60 about a 64 x 80 field. This is the same shape of bug
 * scripts/check-density.mjs was written for, one level up.
 *
 * Four things are checked, all by reading text -- so this runs in `prebuild`
 * on Vercel, where there is no Python, no GL driver and no browser.
 *
 *   1. every plate's w, h and count against the generated module that exports
 *      its field;
 *   2. every plate's box against its own grid: `w === box[0] * density`,
 *      because that is what the board draws and getting it wrong overflows
 *      the figure silently;
 *   3. the box and density against the `SOURCES` entry in
 *      src/components/interactive/dot-board.tsx, which is where the CSS box
 *      actually comes from;
 *   4. the eight project devices against the collated order of
 *      src/content/projects.ts, so a device's plate number is the same number
 *      src/lib/corpus.ts prints for that case study.
 *
 * And it checks that every still named in the manifest is a file on disk.
 *
 *   node scripts/check-plates.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Newlines normalised on the way in: this parses by indentation, and half the
// files in a repository checked out on Windows arrive with CRLF.
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

const failures = [];
const fail = (msg) => failures.push(msg);

const manifest = read("src/content/plates.ts");

/* ── 1. The manifest's own entries ───────────────────────────────────────── */
const plates = [];
for (const block of manifest.split(/\n  \{\n/).slice(1)) {
  const body = block.split(/\n  \},?\n/)[0];
  const str = (k) => body.match(new RegExp(`\\b${k}: "([^"]*)"`))?.[1];
  const num = (k) => {
    const m = body.match(new RegExp(`\\b${k}: (\\d+)`));
    return m ? Number(m[1]) : undefined;
  };
  const id = str("id");
  const field = str("field");
  if (!id || !field) continue;
  const box = body.match(/\bbox: \[(\d+), (\d+)\]/);
  plates.push({
    id,
    field,
    project: str("project"),
    still: str("still"),
    w: num("w"),
    h: num("h"),
    count: num("count"),
    density: num("density"),
    box: box ? [Number(box[1]), Number(box[2])] : undefined,
  });
}
if (plates.length === 0)
  fail("src/content/plates.ts parsed to zero plates — this check has gone stale");

/* ── The generated field modules, indexed by export name ─────────────────── */
const fields = new Map();
for (const name of readdirSync(join(ROOT, "src/content"))) {
  if (!name.endsWith(".ts")) continue;
  const src = read(join("src/content", name));
  const re =
    /export const (\w+): BoardField = \{\s*\n\s*w: (\d+),\s*\n\s*h: (\d+),\s*\n\s*count: (\d+),/g;
  for (const m of src.matchAll(re)) {
    fields.set(m[1], {
      module: `src/content/${name}`,
      w: Number(m[2]),
      h: Number(m[3]),
      count: Number(m[4]),
    });
  }
}

const board = read("src/components/interactive/dot-board.tsx");
const plateDensity = Number(board.match(/const PLATE_DENSITY = (\d+);/)?.[1]);
if (!plateDensity) fail("dot-board.tsx has no PLATE_DENSITY");

for (const p of plates) {
  const baked = fields.get(p.field);
  if (!baked) {
    fail(
      `${p.id}: no "export const ${p.field}: BoardField" under src/content — ` +
        `re-run the baker, or the manifest names a field that was never made.`,
    );
    continue;
  }
  for (const key of ["w", "h", "count"]) {
    if (p[key] !== baked[key]) {
      fail(
        `${p.id}: plates.ts says ${key} ${p[key]}, ${baked.module} was baked at ${baked[key]}. ` +
          `The caption would be wrong about the picture under it.`,
      );
    }
  }
  if (p.box && p.density && p.w !== p.box[0] * p.density) {
    fail(
      `${p.id}: a ${p.w} x ${p.h} field is not a ${p.box[0]} x ${p.box[1]} box at density ${p.density}. ` +
        `The board would draw it at ${(p.w / (p.box[0] * p.density)).toFixed(3)}x its figure.`,
    );
  }
  if (p.density !== plateDensity) {
    fail(`${p.id}: density ${p.density} in plates.ts, PLATE_DENSITY ${plateDensity} in dot-board.tsx`);
  }
  if (p.still && !existsSync(join(ROOT, "public", p.still))) {
    fail(`${p.id}: still ${p.still} is not in public/. No JS, print and forced colours all show it.`);
  }
  // The SOURCES entry, which is where the CSS box actually comes from.
  // The key is quoted where the id has a hyphen in it and bare where it does
  // not, which is a decision Prettier makes and this check has no opinion on.
  const entry = board.match(
    new RegExp(`"?${p.id}"?: plate\\((\\d+), (\\d+),`),
  );
  if (!entry) {
    fail(`${p.id}: no SOURCES entry in src/components/interactive/dot-board.tsx`);
  } else if (p.box && (Number(entry[1]) !== p.box[0] || Number(entry[2]) !== p.box[1])) {
    fail(
      `${p.id}: box [${p.box}] in plates.ts, plate(${entry[1]}, ${entry[2]}) in dot-board.tsx`,
    );
  }
}

/* ── 4. The devices are in the collated order ────────────────────────────── */
const projectsSrc = read("src/content/projects.ts");
const entries = [...projectsSrc.matchAll(/slug: "([^"]+)"/g)].map((m, i) => ({
  slug: m[1],
  i,
}));
const dates = [...projectsSrc.matchAll(/sortDate: "([^"]+)"/g)].map((m) => m[1]);
const featured = [...projectsSrc.matchAll(/featured: (true|false)/g)].map(
  (m) => m[1] === "true",
);
if (entries.length === dates.length && entries.length === featured.length) {
  const ordered = entries
    .map((e) => ({ ...e, date: dates[e.i], featured: featured[e.i] }))
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.date.localeCompare(a.date);
    })
    .map((e) => e.slug);
  const devices = plates.filter((p) => p.id.startsWith("device-"));
  if (devices.length !== ordered.length) {
    fail(
      `${devices.length} project devices for ${ordered.length} projects. ` +
        `Every case study gets a device or the plate numbers stop meaning anything.`,
    );
  }
  devices.forEach((d, i) => {
    if (d.project !== ordered[i]) {
      fail(
        `plate ${i + 1} is ${d.id} (${d.project}), but orderedProjects[${i}] is ${ordered[i]}. ` +
          `A device's plate number must be the one src/lib/corpus.ts prints for its case study.`,
      );
    }
  });
} else {
  fail("could not read slug/sortDate/featured triples out of projects.ts — this check has gone stale");
}

/* ───────────────────────────────────────────────────────────────────────── */
if (failures.length > 0) {
  console.error("check-plates: a caption has drifted from its plate.\n");
  for (const f of failures) console.error(`  ${f}\n`);
  console.error(
    `${failures.length} problem${failures.length === 1 ? "" : "s"}. ` +
      "Re-run the baker that owns the plate (it prints the numbers it made), " +
      "then copy them into src/content/plates.ts.",
  );
  process.exit(1);
}
console.log(
  `check-plates: ${plates.length} plates, every grid, count, box and still matches its bake.`,
);
