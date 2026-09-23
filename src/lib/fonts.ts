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
 *
 * **The reading italic is declared everywhere and preloaded nowhere.** Next
 * preloads every face this file declares on every route, since it is the
 * root layout's. Source Serif's italic, at 130 KB the largest file on the
 * site, used to share the roman's call, so every route fetched it at high
 * priority and it competed with the romans for the first second, while the
 * home page, /about, /projects and the 404 set no italic at all. It is now a
 * call of its own with `preload: false`. Every route still declares it, so
 * italic text anywhere gets the true face, and the browser fetches it only
 * for a page that sets it, as soon as it lays that page out. Today its first
 * use on every route is a caption that is either below the fold or sets the
 * same lines in the fallback, so arriving late moves nothing. Next names every
 * call's @font-face after the family itself, so the italic joins the roman's
 * family and `font-style: italic` finds it. `assertItalicOf` fails the build
 * if that ever stops being true, because the failure is silent: a slanted
 * roman that looks roughly right.
 *
 * **Bodoni's italic stays preloaded** (53 KB). The case-study standfirst sets
 * it above the fold, and the fallback sets that paragraph up to a line longer,
 * so an italic that arrives after first paint moves the page under the reader
 * (measured: CLS 0 became 0.003 on /projects/checkpoint). Preloading it on
 * the case studies alone is not available: the build merges every route's
 * font CSS into one shared stylesheet, and Next preloads each face that
 * stylesheet declares on every route.
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
  style: "normal",
  variable: "--font-text-src",
  display: "swap",
});

export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-src",
  display: "swap",
});

/*
 * The reading italic. No `variable` (it shares the roman's family name) and
 * no fallback of its own: the roman's size-adjusted fallback already stands
 * in for the whole family, and a second one would be declared under the same
 * name.
 */
const textItalic = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  style: "italic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

type LoadedFont = { style: { fontFamily: string } };

const familyOf = (font: LoadedFont) =>
  font.style.fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");

/**
 * Throws unless `italic` resolves to the same font-family name as `roman`.
 * Called at module scope below, so a mismatch fails the build rather than
 * shipping every italic on the site as a synthesised oblique.
 */
function assertItalicOf(italic: LoadedFont, roman: LoadedFont): void {
  const [a, b] = [familyOf(italic), familyOf(roman)];
  if (a !== b) {
    throw new Error(
      `The italic loads as "${a}" but the roman as "${b}". They must share a ` +
        `family name, or font-style: italic falls back to a slanted roman. ` +
        `See src/lib/fonts.ts.`,
    );
  }
}

assertItalicOf(textItalic, text);
