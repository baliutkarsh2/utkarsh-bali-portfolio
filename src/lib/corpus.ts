import "server-only";

import { orderedProjects, type Project } from "@/content";

/**
 * THE COLLATION — a case study, described the way a catalogue describes a leaf.
 *
 * A rare-book catalogue does not summarise a volume, it *collates* it: a single
 * formula stating the physical make-up of the object in hand — how many
 * gatherings, how many leaves, how many plates, in roman for the structure and
 * arabic for the counts. It is the line a cataloguer writes so that another
 * cataloguer, holding a different copy, can tell whether anything is missing.
 *
 *   PLATE III · V MOVEMENTS · 3 STAGES · 6 MATERIALS · 1 FIGURE · 241 WORDS ·
 *   PULLED 07.IX.2026
 *
 * Every value here is counted off the project's own record. Nothing is written,
 * nothing is chosen, and there is no field anywhere in src/content for a human
 * to fill in wrongly:
 *
 *   · PLATE      position in `orderedProjects` — the site's one fixed collated
 *                order, which also drives routing, the sitemap and prev/next.
 *   · MOVEMENTS  the sections the page actually renders. `MOVEMENTS` and
 *                `hasCoda` below are the same values ProjectBody renders from,
 *                imported rather than duplicated, so the count and the page
 *                cannot disagree — this file is the only place either is stated.
 *   · STAGES     `architecture.length`. It is 3 on all eight today; the page
 *                degrades to a list at any other number and this line follows it.
 *   · MATERIALS  `stack.length`. A printer's "materials" is what the sheet is
 *                made of, which is exactly what a stack is.
 *   · FIGURES    impressions on the sheet: the cover plate plus the gallery
 *                plates. A *cancelled* plate is deliberately not counted — the
 *                whole point of the cancellation is that it makes no
 *                impressions — so the three NDA projects collate as no figures,
 *                and the term is omitted entirely rather than printed as a zero,
 *                which is what a catalogue does with something that isn't there.
 *   · WORDS      problem + story + built + impact + learnings, split on
 *                whitespace. The prose of the sheet, not its furniture.
 *   · PULLED     the date this impression was taken, i.e. the build. The one
 *                value that is about the copy rather than the work, which is
 *                precisely what a pull date is.
 *
 * Roman for PLATE and MOVEMENTS, arabic for the counts. That is the convention
 * and it is not decoration: the roman numbers are positions in a structure, the
 * arabic numbers are quantities of things, and a catalogue that mixes them tells
 * you nothing about which is which.
 *
 * Computed once, at module scope, for all eight projects. The page looks the
 * answer up; it never counts anything itself.
 */

/* ── Roman ────────────────────────────────────────────────────────────────
   Subtractive, up to XXXIX, which is roughly thirty years of shipping past
   the eight plates that exist. Beyond it the function is honest rather than
   clever and returns nothing, and the caller falls back to arabic. */
const NUMERALS: ReadonlyArray<readonly [number, string]> = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function roman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 39) return String(n);
  let rest = n;
  let out = "";
  for (const [value, glyph] of NUMERALS) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

/* ── The movements, stated once ───────────────────────────────────────────
   ProjectBody renders these titles and this predicate; the collation counts
   them. One statement, two consumers, so "V MOVEMENTS" cannot outlive a
   movement that was removed from the page. */
export const MOVEMENTS = ["Problem", "Approach", "How it works", "Impact"] as const;

/** The fifth movement, on the projects that have learnings to close on. */
export const CODA = "What I’d do differently";

export function hasCoda(project: Project): boolean {
  return (project.learnings?.length ?? 0) > 0;
}

/* ── The counts ───────────────────────────────────────────────────────────── */

/** The prose of the sheet: the four blocks the movements are drawn from, plus
    the coda's list. Not the architecture strings — those are counted as stages
    and printing them twice would flatter the page. */
function wordCount(project: Project): number {
  const prose = [
    project.problem,
    project.story,
    project.built,
    project.impact,
    ...(project.learnings ?? []),
  ]
    .join(" ")
    .trim();
  return prose.length === 0 ? 0 : prose.split(/\s+/).length;
}

/** Impressions on the sheet. See the note on FIGURES above. */
function figureCount(project: Project): number {
  return (project.cover ? 1 : 0) + (project.media?.length ?? 0);
}

/** The date the impression was taken. One clock read, for the whole build. */
/**
 * The date this impression was taken, in the imprint's own form.
 *
 * It used to be an ISO date, which put TWO formats for the same word on one
 * sheet: the footer's imprint says `PULLED 07.IX.2026` and this said
 * `PULLED 2026-09-07`, six inches apart. A printed object states its date once,
 * one way. The imprint's form wins because it is the older convention and
 * because this line is a rare-book collation formula, which is exactly the
 * register that writes a month in Roman.
 */
const PULLED = (() => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}.${roman(d.getMonth() + 1)}.${d.getFullYear()}`;
})();

export type Collation = {
  /** The formula, term by term, so the separator can be drawn in CSS and never
      announced. Joining these with " · " gives the whole line. */
  terms: string[];
  plate: number;
  movements: number;
  stages: number;
  materials: number;
  figures: number;
  words: number;
  pulled: string;
};

function collate(project: Project, index: number): Collation {
  const plate = index + 1;
  const movements = MOVEMENTS.length + (hasCoda(project) ? 1 : 0);
  const stages = project.architecture.length;
  const materials = project.stack.length;
  const figures = figureCount(project);
  const words = wordCount(project);

  const terms = [
    `Plate ${roman(plate)}`,
    `${roman(movements)} movements`,
    `${stages} stages`,
    `${materials} materials`,
    ...(figures > 0 ? [`${figures} ${figures === 1 ? "figure" : "figures"}`] : []),
    `${words} words`,
    `Pulled ${PULLED}`,
  ];

  return { terms, plate, movements, stages, materials, figures, words, pulled: PULLED };
}

/**
 * Every sheet, collated, at module scope — so the eight formulae are computed
 * once per build rather than once per render, and every one of them is derived
 * from the same array that decides what the routes are.
 */
export const collations: ReadonlyMap<string, Collation> = new Map(
  orderedProjects.map((project, index) => [project.slug, collate(project, index)]),
);

export function collationOf(slug: string): Collation | undefined {
  return collations.get(slug);
}
