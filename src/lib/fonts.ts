import { Bodoni_Moda, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";

/**
 * Three families, self-hosted by Next at build time, latin subset, `swap` with
 * size-adjusted fallbacks, so a swap never reflows.
 *
 * INTAGLIO. The site is a printed artefact, so the type comes from printing.
 *
 * **Bodoni Moda** sets every display size and every figure. Bodoni cut his
 * types to reproduce the hairline of an engraved copperplate line, which is the
 * same mark the dot field is made of — a Didone over an engraving is the
 * historically correct pairing, not a mood board. Its `opsz` axis is
 * load-bearing rather than decorative: a Didone's failure mode on screen is that
 * its hairlines vanish at small sizes, and optical sizing is the historical fix.
 * `opsz` must track the rendered size (96 above 72px, 48 at 32–56, 32 at 24–30,
 * 20 at 21) and **Bodoni is forbidden below 21px**.
 *
 * **Source Serif 4** sets every word a person actually reads. Drawn by Frank
 * Grießhammer for screen reading: low contrast, large x-height, quiet. Two
 * serifs rather than serif + grotesque because the distance between a Didone and
 * a transitional is enormous — that is deliberate hierarchy, where Didone plus a
 * grotesque is the generic editorial template.
 *
 * **IBM Plex Mono** is allowed on data only: dates, axis values, plate marks,
 * the colophon. It never sets a sentence and it never sets an eyebrow.
 */

export const display = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-display-src",
  display: "swap",
});

export const text = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-text-src",
  display: "swap",
});

export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-src",
  display: "swap",
});
