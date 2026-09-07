/**
 * The imprint and the colophon — how the artefact was made, in the two registers
 * a printed sheet actually uses for it.
 *
 * **The imprint** is the printer's line in the trim: three short machine lines
 * of date, state, edition, plate and type. It is data, so it is set in Plex, and
 * it goes on every sheet — the shared footer.
 *
 * **The colophon** is the leaf at the back of a book, in prose, in the reading
 * face: what the plate was, how it was inked, what the paper is. It goes on the
 * title page only, which for this site is `/`.
 *
 * Nothing here retypes a number. The cell count and the lattice come from the
 * bake's own generated modules (`portrait-meta.ts`, `portrait-field-96.ts`) and
 * the project count from the record, so the day the plate is re-cut this text
 * says what is true rather than what was true. The count went 22,907 → 51,747
 * in one commit, which is exactly the kind of figure that goes stale in a
 * hand-written colophon.
 */
import { DOT_COUNT } from "./portrait-meta";
import { portraitField96 } from "./portrait-field-96";
import { projects } from "./projects";

const decimal = new Intl.NumberFormat("en-US");

/* ── Roman numerals ──────────────────────────────────────────────────────────
   For the state and the month only. The day and the year stay arabic: a whole
   date in roman is a puzzle, and an imprint is a record, not a riddle. */
const ROMAN: readonly (readonly [number, string])[] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function roman(value: number): string {
  let left = Math.max(0, Math.floor(value));
  let out = "";
  for (const [step, glyph] of ROMAN) {
    while (left >= step) {
      out += glyph;
      left -= step;
    }
  }
  return out || "0";
}

/**
 * The state: how many pulls this plate has taken, which for a site is how many
 * commits it carries. `next.config.ts` reads it from git at build time and
 * inlines it here; see the note there about shallow clones, which is why this
 * falls back to the recorded floor rather than to zero.
 */
export const STATE = Number(process.env.PRESS_STATE) || 52;

/** The three lines of the imprint, in the trim of every sheet. */
export function imprintLines(pulled: Date = new Date()): readonly string[] {
  const day = String(pulled.getDate()).padStart(2, "0");
  const month = roman(pulled.getMonth() + 1);
  const cells = decimal.format(DOT_COUNT);
  return [
    `Pulled ${day}.${month}.${pulled.getFullYear()} · State ${roman(STATE)} · Open edition`,
    `Plate ${cells} cells · Screen 22.5° · One ink · Laid to the left lay`,
    "Bodoni Moda · Source Serif · IBM Plex Mono",
  ];
}

/**
 * The colophon proper: four sentences on the title page, justified, in the
 * reading face. Written to be read, not scanned — the imprint above is the
 * scannable version of the same facts.
 */
export const colophonNote =
  `The plate for this sheet is a photograph of the sitter, resampled to a lattice of ` +
  `${portraitField96.w} × ${portraitField96.h} cells, of which ${decimal.format(DOT_COUNT)} carry ink. ` +
  `There is one ink and it is never mixed toward the paper: value is held by area alone, on a ` +
  `screen ruled at 22.5°, so every grey here is an optical average of hard-edged marks rather ` +
  `than a tone — which is the whole difference between an engraving and a smudge. ` +
  `The field is not a picture of a print but a drawing, remade on each visit, and under a fine ` +
  `pointer it burnishes: the marks shrink, the paper opens, and a highlight is polished into the ` +
  `plate the way a burnisher opens one in copper. ` +
  `Set in Bodoni Moda and Source Serif 4 with IBM Plex Mono kept for data, composed around ` +
  `${projects.length} projects and their dates, and pulled as an open edition.`;
