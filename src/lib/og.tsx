import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties } from "react";
import { portraitOg } from "@/content/portrait";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/* ─────────────────────────────────────────────────────────────
   Tokens, copied from `:root` in globals.css. Satori resolves no CSS
   variables, so the values are repeated here; keep them in sync.
   ───────────────────────────────────────────────────────────── */
const GROUND = "#0A0A0B";
const INK = "#F2F1EC";
const INK_2 = "#A6A5A0";
const INK_3 = "#8A8984";
const DOT_OFF = "#232326";
const SUN = "#FF6A2B";
/** `--line-strong` (rgba 0.38) composited on `--ground`; a hex so the SVG
 *  serializer never sees a colour function. */
const LINE_STRONG = "#626260";

/** The share card always names the production host, whatever hostname a
 *  preview deployment is built under. */
const DOMAIN = "ubali.dev";

/* ─────────────────────────────────────────────────────────────
   Geometry. The card has its own pitch, 12px: a 1px unlit dot every twelve
   pixels reads as a board at the sizes social previews are shown. The
   padding is six pitches, so the content box starts on a lattice point and
   every lit dot the card draws (ellipsis, rule) can land on the same lattice
   as the field behind it.
   ───────────────────────────────────────────────────────────── */
const PITCH = 12;
const PAD = 6 * PITCH; // 72
const CONTENT_W = OG_SIZE.width - 2 * PAD; // 1056 = 88 pitches
const ROW_H = 24; // the mono 20 line: 20 * 1.2
/** Rule and ellipsis: lit dots are 4px discs, unlit dots the field's 1px square. */
const LIT_R = 2;
const RULE_LIT = 8;

const PORTRAIT_LARGE_H = 420; // 7px per grid unit
const PORTRAIT_SMALL_H = 96; // 1.6px per grid unit
const PORTRAIT_GAP = 48;

/* ─────────────────────────────────────────────────────────────
   The field: one 12 × 12 tile with a 1px `--dot-off` square at its origin,
   repeated by `backgroundSize`. Satori turns a url() background into an SVG
   pattern anchored at the element's top-left corner, so on the root element
   the lattice starts at (0, 0). Base64 keeps the data URI free of characters
   Satori's url() splitter cares about.
   ───────────────────────────────────────────────────────────── */
const FIELD_TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${PITCH}" height="${PITCH}" viewBox="0 0 ${PITCH} ${PITCH}"><rect width="1" height="1" fill="${DOT_OFF}"/></svg>`;
const FIELD_TILE = `url(data:image/svg+xml;base64,${Buffer.from(FIELD_TILE_SVG).toString("base64")})`;

/* ─────────────────────────────────────────────────────────────
   Portrait circles. Every inline <svg> becomes one raster image inside
   Satori, so the cost is the SVG string length; the budget below keeps a
   card under 2,000 circles. The current bake ships 754 dots, so the filter
   never runs; if a re-bake overshoots, the faintest dots (radius under 0.12
   grid units) are dropped first and the sun dots are always kept.
   ───────────────────────────────────────────────────────────── */
const MAX_CIRCLES = 2000;
const MIN_R = 0.12;
const PORTRAIT_DOTS =
  portraitOg.dots.length <= MAX_CIRCLES
    ? portraitOg.dots
    : portraitOg.dots.filter(([, , r, kind]) => kind === 1 || r >= MIN_R);

/** Two decimals: enough for a 1.6px cell, and it keeps the SVG string short. */
const px = (n: number) => Math.round(n * 100) / 100;

/* ─────────────────────────────────────────────────────────────
   Fonts, read from disk at build time. Both are static instances: Satori's
   parser cannot handle variable fonts (it fails on an undefined glyph-table
   read), so never swap either for a variable build of the same family.
   Loaded once per process; every route shares the buffers.
   ───────────────────────────────────────────────────────────── */
type OgFont = { name: string; data: Buffer; weight: 500; style: "normal" };

let fontsPromise: Promise<OgFont[]> | undefined;

function loadFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    const dir = join(process.cwd(), "src/app/_fonts");
    fontsPromise = Promise.all([
      readFile(join(dir, "Geist-Medium.ttf")),
      readFile(join(dir, "GeistMono-Medium.ttf")),
    ])
      .then(([sans, mono]): OgFont[] => [
        { name: "Geist", data: sans, weight: 500, style: "normal" },
        { name: "GeistMono", data: mono, weight: 500, style: "normal" },
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
  /** The figure, e.g. "Top 10%". Set in Geist Medium at 200px. */
  value: string;
  /** What the figure measures, set under it in mono. */
  label: string;
  /** `--sun` for the one ongoing project; `--ink` for every other. */
  accent?: boolean;
};

export type OgCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  /** Short facts, joined with a middle dot on the bottom row. */
  meta: string[];
  /** Case studies only: the one-number plate. */
  metric?: OgMetric;
  /** "large": the 420px portrait beside the name (home, about).
   *  "small": a 96px signature bottom-right (case studies).
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

const monoText = (size: number, color: string, tracking = 0): CSSProperties => ({
  display: "block",
  fontFamily: "GeistMono",
  fontSize: size,
  lineHeight: 1.2,
  letterSpacing: tracking,
  color,
});

const sansText = (size: number, tracking: number, lineHeight: number): CSSProperties => ({
  display: "block",
  fontFamily: "Geist",
  fontSize: size,
  lineHeight,
  letterSpacing: tracking,
  color: INK,
  lineClamp: 2,
});

/** The small mono labels on the top row: the eyebrow (uppercase, meta) and
 *  the domain (as written, it is an address). */
const eyebrowStyle: CSSProperties = { ...monoText(20, INK_3, 3.6), textTransform: "uppercase" };
const domainStyle: CSSProperties = monoText(20, INK_3, 3.6);

/** The portrait: [x, y, r, kind] in 48 × 60 grid units, drawn as circles on
 *  cell centres. kind 1 is the rim and datum, the sun on his face. */
function Portrait({ height }: { height: number }) {
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
          fill={kind === 1 ? SUN : INK}
        />
      ))}
    </svg>
  );
}

/** The hero's first line, at card scale: three dots one pitch apart joined by
 *  a hairline. The svg is pulled left by half a pitch so the first dot centre
 *  sits on the lattice column at the padding edge, and the dots sit at
 *  y = 18.5 of the 24px row: on the field's row and on the mono baseline, so
 *  they read as a literal ellipsis. */
function Ellipsis() {
  const w = 3 * PITCH;
  const first = PITCH / 2 + 0.5;
  const cy = ROW_H - PITCH / 2 + 0.5;
  return (
    <svg
      width={w}
      height={ROW_H}
      viewBox={`0 0 ${w} ${ROW_H}`}
      style={{ width: w, height: ROW_H, marginLeft: -PITCH / 2, flexShrink: 0 }}
    >
      <rect x={first} y={cy - 0.5} width={2 * PITCH} height={1} fill={LINE_STRONG} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={first + i * PITCH} cy={cy} r={LIT_R} fill={INK} />
      ))}
    </svg>
  );
}

/** The progress row, finished at frame one: one lattice row across the
 *  content width, the first eight dots lit. Unlit dots are drawn as the
 *  field's own 1px squares so, on the lattice, they merge with it. */
function DotRule() {
  const count = CONTENT_W / PITCH;
  const cy = PITCH / 2 + 0.5;
  return (
    <svg
      width={CONTENT_W}
      height={PITCH}
      viewBox={`0 0 ${CONTENT_W} ${PITCH}`}
      style={{ width: CONTENT_W, height: PITCH, flexShrink: 0 }}
    >
      {Array.from({ length: count }, (_, i) =>
        i < RULE_LIT ? (
          <circle key={i} cx={i * PITCH + 0.5} cy={cy} r={LIT_R} fill={INK} />
        ) : (
          <rect key={i} x={i * PITCH} y={cy - 0.5} width={1} height={1} fill={DOT_OFF} />
        ),
      )}
    </svg>
  );
}

/**
 * One renderer for every route.
 *
 * Vertical budget on the 486px content box (630 − 2 × 72):
 * - top row 24, then 16;
 * - large: name (2 lines of 112 × 0.92 = 206) + description ≤ 2 × 36, beside
 *   the 420px portrait, both bottom-aligned; bottom row 24. 24+16+420+2+24 = 486.
 * - metric: 170 + 6 + 29 + 28 + 65 + 12 + ≤ 60, then 20 + 22 + 12 + 12 = 456.
 *   The 96px signature is absolutely positioned above the rule; the text
 *   beside it stops 48px short of it.
 * - plain: title ≤ 3 × 73 + 20 + description ≤ 3 × 34, then the same bottom:
 *   at most 459.
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
  const small = portrait === "small";
  const smallW = px(portraitOg.w * (PORTRAIT_SMALL_H / portraitOg.h));
  /** Room reserved on the right for the signature, where it exists. */
  const textRight = small ? smallW + PORTRAIT_GAP : 0;
  const metaLine = meta.join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: PAD,
          backgroundColor: GROUND,
          backgroundImage: FIELD_TILE,
          backgroundSize: `${PITCH}px ${PITCH}px`,
          backgroundRepeat: "repeat",
        }}
      >
        {/* Top row. The home card leads with the address, every other with
            its eyebrow; the other label sits at the far right. */}
        <div style={{ display: "flex", justifyContent: "space-between", height: ROW_H }}>
          <div style={large ? domainStyle : eyebrowStyle}>{large ? DOMAIN : eyebrow}</div>
          <div style={large ? eyebrowStyle : domainStyle}>{large ? eyebrow : DOMAIN}</div>
        </div>

        {large ? (
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 16,
            }}
          >
            {/* Bottom-aligned with the portrait box, whose last dot row sits
                ~10px above its edge; the padding keeps the copy clear of the
                ellipsis row beneath. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: CONTENT_W - px(portraitOg.w * (PORTRAIT_LARGE_H / portraitOg.h)) - PORTRAIT_GAP,
                paddingBottom: 28,
              }}
            >
              {/* The name breaks to two lines here, as the hero's h1 does. */}
              <div style={sansText(112, -4, 0.92)}>{title}</div>
              <div style={{ ...monoText(26, INK_2), lineHeight: 1.4, lineClamp: 2, marginTop: 24 }}>
                {description}
              </div>
            </div>
            <Portrait height={PORTRAIT_LARGE_H} />
          </div>
        ) : (
          /* No fragments here: Satori lays a Fragment out as an implicit
             flex row, which would put these blocks side by side. Each block
             is a direct child of the column. */
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              marginTop: 16,
              paddingRight: textRight,
            }}
          >
            {/* The one-number plate. 0.85 line-height trims the line box
                around figures that have no descenders. */}
            {metric && (
              <div
                style={{
                  ...sansText(200, -6, 0.85),
                  lineClamp: 1,
                  color: metric.accent ? SUN : INK,
                }}
              >
                {metric.value}
              </div>
            )}
            {metric && (
              <div style={{ ...monoText(22, INK_2), lineHeight: 1.3, lineClamp: 1, marginTop: 6 }}>
                {metric.label}
              </div>
            )}
            {/* Post titles run long; three lines of 72 still fit the budget. */}
            <div
              style={
                metric
                  ? { ...sansText(64, -1.92, 1.02), marginTop: 28 }
                  : { ...sansText(72, -2.16, 1.02), lineClamp: 3 }
              }
            >
              {title}
            </div>
            <div
              style={
                metric
                  ? { ...monoText(22, INK_3), lineHeight: 1.35, lineClamp: 2, marginTop: 12 }
                  : { ...monoText(24, INK_2), lineHeight: 1.4, lineClamp: 3, marginTop: 20 }
              }
            >
              {description}
            </div>
          </div>
        )}

        {/* Bottom. Home: the ellipsis and the facts on one row. Everything
            else: the facts, then the rule as the last thing on the card. */}
        {large ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: ROW_H,
              marginTop: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <Ellipsis />
              <div style={{ ...monoText(20, INK_3), marginLeft: 14 }}>Connecting the dots</div>
            </div>
            <div style={{ ...monoText(18, INK_3, 3.2), textTransform: "uppercase" }}>{metaLine}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 20, paddingRight: textRight }}>
            <div style={{ ...monoText(18, INK_3, 3.2), textTransform: "uppercase" }}>{metaLine}</div>
            <div style={{ display: "flex", marginTop: PITCH, marginRight: -textRight }}>
              <DotRule />
            </div>
          </div>
        )}

        {/* The signature: bottom-right, one pitch above the rule. */}
        {small && (
          <div
            style={{
              position: "absolute",
              right: PAD,
              bottom: PAD + 2 * PITCH,
              display: "flex",
            }}
          >
            <Portrait height={PORTRAIT_SMALL_H} />
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
