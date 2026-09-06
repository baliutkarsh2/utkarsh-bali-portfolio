import { DOT_GLYPHS } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type NumeralProps = {
  /** The figure as text: "0.844", "Top 10%", "<1%". Every glyph must be in DOT_GLYPHS. */
  value: string;
  /** Two sizes only, both multiples of the pitch: 10× (m) and 20× (l). */
  size: "m" | "l";
  /** Sets the figure in --sun. At most one per viewport (rule 3). */
  accent?: boolean;
  /** Warm 400 → 700 on `data-in`. Off for figures that swap in place (inspection panel). */
  warm?: boolean;
  as?: "span" | "p" | "dd";
};

/**
 * The only component on the site that sets Doto (`.numeral` in
 * components.css is the single `--font-dot` rule). Doto sets numbers; Geist
 * sets words, so a glyph outside DOT_GLYPHS is a content bug, not a styling
 * one, and is thrown at render in development where the stack points at the
 * caller. Production renders whatever it is given: `scripts/check-glyphs.mjs`
 * runs the same check against src/content before the build.
 *
 * The value is real text. The weight warm-up is purely visual; the stagger
 * comes from `--i` set by a wrapping <Reveal stagger>, which inherits to here.
 */
export function Numeral({ value, size, accent = false, warm = true, as: Tag = "span" }: NumeralProps) {
  if (process.env.NODE_ENV !== "production") {
    for (const glyph of value) {
      if (!DOT_GLYPHS.includes(glyph)) {
        throw new Error(
          `<Numeral value="${value}">: "${glyph}" is not in DOT_GLYPHS ("${DOT_GLYPHS}"). ` +
            "Doto sets numbers only; put words in Geist.",
        );
      }
    }
  }

  return (
    <Tag
      className={cn("numeral", size === "l" ? "text-dot-l" : "text-dot-m", accent ? "text-sun" : "text-ink")}
      data-size={size}
      data-warm={warm ? "" : undefined}
      data-accent={accent ? "" : undefined}
    >
      {value}
    </Tag>
  );
}
