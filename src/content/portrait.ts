/**
 * The portrait: a photograph turned into a field of dots.
 *
 * The photograph itself is never served. `scripts/segment.py` cuts the subject
 * out of it, `scripts/bake-portrait.py` samples that cutout onto dot grids and
 * writes the generated modules re-exported here. To change the portrait,
 * replace `src/assets/portrait/utkarsh-cutout.png`, re-run the bake, update
 * `alt`, and commit the outputs. Nothing runs at build time.
 */
export type { BoardField } from "./portrait-types";
export { portraitField96 } from "./portrait-field-96";
export { portraitField64 } from "./portrait-field-64";
export { portraitFieldAbout } from "./portrait-field-about";
export { portraitFieldContact } from "./portrait-field-contact";
export { portraitOg } from "./portrait-og";
export { DOT_COUNT } from "./portrait-meta";

export const portrait = {
  alt: "Utkarsh Bali in profile, rendered as a field of dots: sitting on a hilltop above the coast, smiling into the light as the sun drops over the ocean behind him",
  /** Where the noscript, print and no-canvas fallbacks live. */
  fallback: {
    hero: "/portrait/dots-96@2x.webp",
    phone: "/portrait/dots-64@2x.webp",
    about: "/portrait/dots-about@2x.webp",
  },
} as const;
