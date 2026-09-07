import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties } from "react";
import { portraitOg } from "@/content/portrait";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/* ─────────────────────────────────────────────────────────────
   Tokens, copied from `:root` in globals.css §1. Satori resolves no CSS
   variables, so the values are repeated here; keep them in sync.

   Every rgba() token is pre-composited on the paper it sits on and written as
   a hex, because Satori's SVG serializer must never see a colour function.
   ───────────────────────────────────────────────────────────── */
const PAPER = "#faf8f4"; // --ground
const INK = "#14120e"; // --ink,   17.64:1 on paper
const INK_2 = "#4a453c"; // --ink-2,  8.97:1
const INK_3 = "#67604f"; // --ink-3,  5.89:1 — the floor for text
const SUN = "#a8321b"; // --sun, vermilion
/** `--line` (rgba .14) on paper: the running-head and colophon hairlines. */
const LINE = "#dad8d4";
/** `--rule-mid` (rgba .34) on paper: the plate mark itself. */
const RULE_MID = "#acaaa6";
/** `inset 0 1px 0 rgba(20,18,14,.10)` on paper: the light catching the deboss. */
const DEBOSS = "#e3e1dd";

/** The share card always names the production host, whatever hostname a
 *  preview deployment is built under. */
const DOMAIN = "ubali.dev";

/* ─────────────────────────────────────────────────────────────
   Geometry. The card is a sheet with one impression on it.

   There is no lattice. A permanent grid of grey pips is invisible on a dark
   ground and, on paper, is the smudge — everywhere, forever. What gives the
   card its material instead is the plate mark: a 1px --rule-mid rectangle
   with the site's only radius (2px, a plate edge's bevel) and its only
   shadow (a 1px inner highlight along the top). SHEET is the bare paper
   outside the impression; BITE is the margin a plate leaves between its own
   edge and the inked image.
   ───────────────────────────────────────────────────────────── */
const SHEET = 30;
const BITE = 36;
const CONTENT_W = OG_SIZE.width - 2 * (SHEET + 1 + BITE); // 1066; the height is 496

/** Running head and colophon: one line of type, then air, then a hairline. */
const HEAD_H = 26;
const HAIRLINE_GAP = 14;
/** Air between the hairlines and the composition they enclose. */
const FIGURE_PAD = 24;

const PORTRAIT_LARGE_H = 392; // 5.6px per cell of the 56 × 70 bake
/** The signature is 224 rather than the 96 the old card used. At 70 rows a
 *  96px box puts the cell at 1.4px, and a disc under about 3px stops resolving
 *  as a mark and goes back to being the grey haze the cull exists to prevent.
 *  A halftone has a minimum size at which it is still a halftone. */
const PORTRAIT_SIGNATURE_H = 224; // 3.2px per cell
const PORTRAIT_GAP = 56;
/** The register mark: 5px of vermilion at the sheet's corner, and on a card
 *  that has one it is the only saturated pixel. */
const REGISTER = 5;

/* ─────────────────────────────────────────────────────────────
   Portrait circles. Every inline <svg> becomes one raster image inside
   Satori, so the cost is the SVG string length; the budget below keeps a
   card under 2,000 circles. The ink-on-paper bake ships 1,666 dots — up from
   754, because the transfer no longer discards the sub-UNLIT cells and the
   grid went from 48 × 60 to 56 × 70 — so the filter never runs. If a re-bake
   overshoots, the smallest dots go first and the datum is always kept.
   ───────────────────────────────────────────────────────────── */
const MAX_CIRCLES = 2000;
const MIN_R = 0.18;
const PORTRAIT_DOTS =
  portraitOg.dots.length <= MAX_CIRCLES
    ? portraitOg.dots
    : portraitOg.dots.filter(([, , r, kind]) => kind === 1 || r >= MIN_R);

/** Two decimals: enough for a 3.2px cell, and it keeps the SVG string short. */
const px = (n: number) => Math.round(n * 100) / 100;

/* ─────────────────────────────────────────────────────────────
   Fonts, read from disk at build time and never sent to a browser.

   Every file is a static instance cut by scripts/fetch-og-fonts.py: Satori's
   parser cannot handle a variable font (it fails on an undefined glyph-table
   read), so never swap one for a variable build of the same family.

   Four Bodoni cuts rather than one, because `opsz` is structural for a
   Didone and not a finish — hairlines drawn for 96px disappear at 22px, which
   is the failure mode optical sizing was invented to fix. Each cut is
   instantiated at the size it is actually set at, and the card picks between
   them by family name. Below 21px there is no Bodoni at all: that is Plex's
   job, and Plex sets nothing but data — never a sentence, never an eyebrow.
   ───────────────────────────────────────────────────────────── */
type OgFont = {
  name: string;
  data: Buffer;
  weight: 500 | 600 | 700;
  style: "normal";
};

let fontsPromise: Promise<OgFont[]> | undefined;

function loadFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    const dir = join(process.cwd(), "src/app/_fonts");
    fontsPromise = Promise.all([
      readFile(join(dir, "BodoniModa-Display.ttf")),
      readFile(join(dir, "BodoniModa-Numeral.ttf")),
      readFile(join(dir, "BodoniModa-Small.ttf")),
      readFile(join(dir, "BodoniModa-Italic.ttf")),
      readFile(join(dir, "IBMPlexMono-Medium.ttf")),
    ])
      .then(([display, numeral, small, italic, mono]): OgFont[] => [
        // opsz 96: titles from 56px up.
        { name: "Bodoni", data: display, weight: 500, style: "normal" },
        // opsz 96 at wght 700: the one-number plate. Same family, so Satori
        // selects it on font-weight alone.
        { name: "Bodoni", data: numeral, weight: 700, style: "normal" },
        // opsz 32: the eyebrow at 22px, Bodoni's hard floor.
        { name: "BodoniSmall", data: small, weight: 600, style: "normal" },
        // The standfirst. Registered as its own family under style "normal"
        // rather than as Bodoni's italic: the glyphs in the file are already
        // italic, so naming it directly removes every font-matching branch
        // Satori could take, and it can never fall through to a synthetic
        // slant of the roman.
        { name: "BodoniItalic", data: italic, weight: 500, style: "normal" },
        { name: "Plex", data: mono, weight: 500, style: "normal" },
      ])
      .catch((error: unknown) => {
        fontsPromise = undefined;
        throw error;
      });
  }
  return fontsPromise;
}

/* ─────────────────────────────────────────────────────────────
   Props
   ───────────────────────────────────────────────────────────── */
export type OgMetric = {
  /** The figure, e.g. "Top 10%". Set in Bodoni 700 at 150px. */
  value: string;
  /** What the figure measures, set under it in Plex. */
  label: string;
  /** The one ongoing project, which earns the register mark. */
  accent?: boolean;
};

export type OgCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  /** Short facts, joined with a middle dot on the colophon row. */
  meta: string[];
  /** Case studies only: the one-number plate. */
  metric?: OgMetric;
  /** "large": the 392px engraving beside the name (home, about).
   *  "small": a 224px signature at the right of a case study.
   *  Omitted: no portrait (writing, index pages). */
  portrait?: "large" | "small";
};

/* ─────────────────────────────────────────────────────────────
   Satori rules observed throughout:
   - flexbox only; every element with more than one child is `display: flex`;
   - an element holding a single string may be `display: block`, which is
     also what unlocks `lineClamp`;
   - inline <svg> is rasterised as an image, so it needs width and height;
   - numbers are px; `letterSpacing` is px, not em.
   ───────────────────────────────────────────────────────────── */

/** Plex sets data and nothing else: the address, the dates, the figures'
 *  units. Uppercase and tracked, because these are machine labels. */
const dataText = (size: number, color: string, tracking = 2.4): CSSProperties => ({
  display: "block",
  fontFamily: "Plex",
  fontWeight: 500,
  fontSize: size,
  lineHeight: 1.2,
  letterSpacing: tracking,
  textTransform: "uppercase",
  color,
});

/** Display roman. −0.5px flat, which is under half a percent at every size the
 *  card sets it — optical, not the old card's −4px. A Didone's rhythm is the
 *  hairline against the stem, and tight tracking closes its counters in. */
const displayText = (size: number, lineHeight: number): CSSProperties => ({
  display: "block",
  fontFamily: "Bodoni",
  fontWeight: 500,
  fontSize: size,
  lineHeight,
  letterSpacing: -0.5,
  color: INK,
});

/** The standfirst. One italic line per plate, which is the whole of the
 *  card's running text — a share card has no prose, so it loads no reading
 *  face to set one in. */
const standfirst = (size: number): CSSProperties => ({
  display: "block",
  fontFamily: "BodoniItalic",
  fontWeight: 500,
  fontSize: size,
  lineHeight: 1.34,
  color: INK_2,
  lineClamp: 2,
});

/** The running head. Bodoni at 22px is the smallest the family is allowed to
 *  be set anywhere on the site, and it is cut for it. */
const eyebrowStyle: CSSProperties = {
  display: "block",
  fontFamily: "BodoniSmall",
  fontWeight: 600,
  fontSize: 22,
  lineHeight: 1.2,
  letterSpacing: 1.6,
  textTransform: "uppercase",
  color: INK_2,
};

const hairline: CSSProperties = { height: 1, backgroundColor: LINE };

/**
 * The engraving: [x, y, r, kind] in 56 × 70 grid units, drawn as hard-edged
 * discs on cell centres.
 *
 * One ink at full strength; value is carried by dot AREA alone. There is no
 * tone channel — mixing a dot toward the ground is what turns a field on
 * paper into one flat 55% grey, and an engraving is the opposite of that:
 * the ink is always full black, the paper always full white, and the grey is
 * an optical average of hard-edged marks. The radii are baked through the
 * same transfer the board and the no-JS still use (see `ink_dia` in
 * scripts/bake-portrait.py), including its cull — a dot below 0.30 cells is
 * not drawn, because a dot you cannot resolve is haze and the absence of a
 * dot is a highlight.
 *
 * kind 1 is the datum, the catchlight in his eye. `sun` gates it because
 * vermilion is rationed to one mark per card: where a card carries a register
 * mark the datum prints in ink instead.
 */
function Portrait({ height, sun }: { height: number; sun: boolean }) {
  const cell = height / portraitOg.h;
  const width = px(portraitOg.w * cell);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height, flexShrink: 0 }}
    >
      {PORTRAIT_DOTS.map(([x, y, r, kind]) => (
        <circle
          key={`${x}-${y}`}
          cx={px((x + 0.5) * cell)}
          cy={px((y + 0.5) * cell)}
          r={px(r * cell)}
          fill={sun && kind === 1 ? SUN : INK}
        />
      ))}
    </svg>
  );
}

/**
 * One renderer for every route: a sheet of paper with one impression on it.
 *
 * Vertical budget inside the plate mark (630 − 2 × 67 = 496):
 * - running head 26 + 14 + 1, colophon 1 + 14 + 20 → 76, leaving 420;
 * - the figure sits inside 24 of air top and bottom, so 372 of composition.
 * - large: name 2 × 127 + 24 + standfirst 2 × 37 = 352, bottom-aligned with
 *   the 392px engraving, which therefore overhangs the air by 20. That
 *   overhang is why FIGURE_PAD is 24 and not less.
 * - metric: 150 + 22 + 18 + 22 + 59 + 14 + 2 × 35 = 355.
 * - plain: 3 × 87 + 24 + 2 × 38 = 361, centred rather than hung.
 */
export async function renderOgCard({
  eyebrow,
  title,
  description,
  meta,
  metric,
  portrait,
}: OgCardProps) {
  const large = portrait === "large";
  const signature = portrait === "small";
  const register = Boolean(metric?.accent);
  /** Vermilion is licensed to one mark per card. The register mark on the
   *  ongoing project outranks the datum, because it is the card's only piece
   *  of state; every other card spends the ration on his eye, or not at all. */
  const datum = large && !register;
  const metaLine = meta.join("  ·  ");

  const figureW =
    (large ? PORTRAIT_LARGE_H : PORTRAIT_SIGNATURE_H) * (portraitOg.w / portraitOg.h);
  const textW = large || signature ? CONTENT_W - px(figureW) - PORTRAIT_GAP : CONTENT_W;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: SHEET,
          backgroundColor: PAPER,
        }}
      >
        {/* The plate mark. The impression a copper plate leaves in dampened
            paper: the card's only container, only radius and only shadow. */}
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            paddingTop: 0,
            paddingRight: BITE,
            paddingBottom: BITE,
            paddingLeft: BITE,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: RULE_MID,
            borderRadius: 2,
          }}
        >
          {/* The light catching the deboss, drawn rather than set as
              `box-shadow: inset 0 1px 0`. Verified, not assumed: Satori paints
              an inset shadow over the border box instead of inside it, so the
              shadow replaced the top rule with itself and the plate mark came
              out with three sides. As a 1px element bled to the padding edge
              it lands where the browser puts it, one pixel under the rule.
              paddingTop is 0 and the head carries BITE − 1 to pay for it, so
              the content box is where it was. */}
          <div style={{ height: 1, backgroundColor: DEBOSS, marginLeft: -BITE, marginRight: -BITE }} />

          {/* Running head: the section in Bodoni, the address in Plex. An
              address is data; a section name is not, which is the whole of
              the rule about which family sets what. */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              height: HEAD_H,
              marginTop: BITE - 1,
            }}
          >
            <div style={eyebrowStyle}>{eyebrow}</div>
            <div style={dataText(14, INK_3, 2.8)}>{DOMAIN}</div>
          </div>
          <div style={{ ...hairline, marginTop: HAIRLINE_GAP }} />

          {/* The figure: the engraving hangs from the colophon rule the way a
              plate hangs from a folio line, and the type sits on the same
              baseline as its foot. */}
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              // An index or a post has no engraving to hang from, and a
              // one-line title bottom-aligned under 250px of bare paper reads
              // as a mistake rather than as air. Those centre; anything with a
              // figure in it hangs.
              alignItems: large || signature ? "flex-end" : "center",
              justifyContent: "space-between",
              paddingTop: FIGURE_PAD,
              paddingBottom: FIGURE_PAD,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", width: textW }}>
              {/* The one-number plate. A case study is an argument that ends
                  in a number, so the number is the ten-second scan and it is
                  set before the name, in the 700 cut — Bodoni's lining figures
                  at that weight are what replaced the site's dot numerals. */}
              {metric && (
                <div
                  style={{
                    ...displayText(150, 1.0),
                    fontWeight: 700,
                    lineClamp: 1,
                  }}
                >
                  {metric.value}
                </div>
              )}
              {metric && (
                /* 22, measured rather than chosen: Bodoni Moda's content area
                   is 1.525em against a 1.0 line box, so a 150px figure hangs
                   its descender 39px below its own box and "Top 10%" would
                   otherwise print its p through this line. */
                <div style={{ ...dataText(15, INK_3), lineClamp: 1, marginTop: 22 }}>
                  {metric.label}
                </div>
              )}
              {/* 132 on the home card so the name breaks to two lines the way
                  the hero's h1 does — measured, not hoped: "Utkarsh Bali"
                  sets 745px against a 697px column, and a shorter name or a
                  wider engraving would put it back on one line. Post titles
                  run long, so three lines of 82 still fit the budget. */}
              <div
                style={
                  large
                    ? displayText(132, 0.96)
                    : metric
                      ? { ...displayText(56, 1.05), lineClamp: 1, marginTop: 22 }
                      : { ...displayText(82, 1.06), lineClamp: 3 }
                }
              >
                {title}
              </div>
              <div
                style={{
                  ...standfirst(metric ? 26 : 28),
                  marginTop: metric ? 14 : 24,
                }}
              >
                {description}
              </div>
            </div>

            {/* The engraving. On a case study it is a signature at the foot
                of the plate rather than the subject of it. */}
            {(large || signature) && (
              <Portrait
                height={large ? PORTRAIT_LARGE_H : PORTRAIT_SIGNATURE_H}
                sun={datum}
              />
            )}
          </div>

          {/* Colophon: the facts, and the register mark where there is one. */}
          <div style={hairline} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: HAIRLINE_GAP,
              height: 20,
            }}
          >
            <div style={dataText(15, INK_3, 3.0)}>{metaLine}</div>
            {register && (
              <div
                style={{ width: REGISTER, height: REGISTER, backgroundColor: SUN }}
              />
            )}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
