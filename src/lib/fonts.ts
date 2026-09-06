import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

/**
 * Three families, self-hosted by Next at build time, latin subset, `swap`
 * with size-adjusted fallbacks (the default `adjustFontFallback`), so a swap
 * never reflows.
 *
 * Doto sets numbers. Geist sets words. Geist Mono sets labels.
 *
 * Doto is monospaced at exactly 0.6em per glyph and its advance widths are
 * identical at every weight (verified on the hmtx table after instancing),
 * which is what makes the 400 → 700 warm-up in <Numeral> reflow-free. Its
 * dot pitch is 0.1em, so at `font-size: 10 × --pitch` the numerals' dots sit
 * on the page pitch. `axes: ["ROND"]` requests the roundness axis alongside
 * the implied weight range; every numeral carries "ROND" 100.
 */

/**
 * Every glyph a <Numeral> may contain: digits, the decimal and thousands
 * separators, the comparison and approximation marks, "x" and "K" for
 * multiples, and "Top" for a percentile. `scripts/check-glyphs.mjs` fails
 * the build if a metric in src/content uses a character outside this set,
 * and <Numeral> throws in development for the same reason.
 *
 * next/font/google has no `text` subsetting option, so Doto is hand-subset to
 * exactly these glyphs (src/fonts/Doto-numerals.woff2, 2 KB, both axes kept:
 * `pyftsubset "Doto[ROND,wght].ttf" --text="<DOT_GLYPHS>" --flavor=woff2
 * --layout-features='*'`) and self-hosted through next/font/local. Add a glyph
 * here and the font must be re-subset, or it renders in the mono fallback.
 */
export const DOT_GLYPHS = "0123456789.,%<>~+xKTop ";

/** True when every character of `value` is in DOT_GLYPHS. */
export function isDotSafe(value: string): boolean {
  for (const char of value) {
    if (!DOT_GLYPHS.includes(char)) return false;
  }
  return true;
}

export const dot = localFont({
  src: "../fonts/Doto-numerals.woff2",
  weight: "100 900",
  variable: "--font-dot-src",
  display: "swap",
  // The subset has no lowercase beyond "op", so a size-adjusted fallback
  // computed from it would be wrong for any other text; the numerals only
  // ever render inside <Numeral>, whose box is sized by the pitch anyway.
  adjustFontFallback: false,
});

export const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans-src",
  display: "swap",
});

/** Only the one weight the design uses. `font-synthesis-weight: none` in the
 *  base styles stops the browser from faking a bold if anyone asks for one. */
export const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono-src",
  display: "swap",
});
