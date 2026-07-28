import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const PAPER = "#f5f4ee";
const INK = "#14140f";
const INK_3 = "#82827a";
const RULE = "rgba(20,20,15,0.16)";
const ACCENT = "#c33d1c"; /* keep in sync with --accent in globals.css */

/**
 * Fonts are read from disk at build time, no network dependency.
 *
 * Both are static instances. Satori's parser cannot handle variable fonts
 * (it fails with an undefined glyph-table read), so do not swap either of
 * these for a variable build of the same family.
 */
async function loadFonts() {
  const dir = join(process.cwd(), "src/app/_fonts");
  const [display, mono] = await Promise.all([
    readFile(join(dir, "Fraunces.woff")),
    readFile(join(dir, "GeistMono-Medium.ttf")),
  ]);
  return [
    { name: "Fraunces", data: display, weight: 400 as const, style: "normal" as const },
    { name: "GeistMono", data: mono, weight: 500 as const, style: "normal" as const },
  ];
}

type OgCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  meta: string[];
};

/**
 * Satori supports a narrow CSS subset: flexbox only, no grid, and every element
 * with multiple children needs an explicit `display: flex`.
 */
export async function renderOgCard({ eyebrow, title, description, meta }: OgCardProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "64px 72px",
          border: `1px solid ${RULE}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontFamily: "GeistMono",
              fontSize: 20,
              letterSpacing: 3.6,
              textTransform: "uppercase",
              color: INK_3,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: "GeistMono",
              fontSize: 20,
              letterSpacing: 3.6,
              textTransform: "uppercase",
              color: INK_3,
            }}
          >
            ubali.dev
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Fraunces",
              fontSize: title.length > 26 ? 74 : 96,
              lineHeight: 1.02,
              letterSpacing: -2.6,
              color: INK,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 26,
              fontFamily: "GeistMono",
              fontSize: 26,
              lineHeight: 1.45,
              color: INK_3,
              maxWidth: 900,
            }}
          >
            {description}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 3, background: ACCENT, marginBottom: 22 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            {meta.map((item, index) => (
              <div key={item} style={{ display: "flex", alignItems: "center" }}>
                {index > 0 && (
                  <div
                    style={{
                      fontFamily: "GeistMono",
                      fontSize: 18,
                      color: INK_3,
                      padding: "0 16px",
                    }}
                  >
                    ·
                  </div>
                )}
                <div
                  style={{
                    fontFamily: "GeistMono",
                    fontSize: 18,
                    letterSpacing: 3.2,
                    textTransform: "uppercase",
                    color: INK_3,
                  }}
                >
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
