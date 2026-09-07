import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * An architectural lock, not a guideline.
 *
 * The display face is a Didone, and a Didone's one failure mode on screen is
 * that its hairlines vanish when it is set small. The design forbids it below
 * 21px, which in practice means: nothing outside <Numeral> may name the display
 * family or a numeral size utility, because doing so is how a 13px caption ends
 * up in Bodoni and turns to lace on a 1x Windows panel.
 *
 * The rule this replaces guarded a 23-glyph subset font that no longer exists.
 * Same shape, real reason.
 */
const displayFace = /font-display|text-numeral/.source;

const eslintConfig = [
  {
    /**
     * Build output. `next-config`'s default ignores cover `.next`, but not the
     * parallel build directories `NEXT_DIST_DIR` creates (see next.config.ts) —
     * and a single one of those adds 554 errors from generated code and fails
     * `prebuild` for work that is nowhere near `src`.
     */
    ignores: [".next-*/**"],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/numeral.tsx", "src/lib/fonts.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${displayFace}/]`,
          message: "The display face is set only by <Numeral> (src/components/ui/numeral.tsx); Bodoni is forbidden below 21px.",
        },
        {
          selector: `TemplateElement[value.raw=/${displayFace}/]`,
          message: "The display face is set only by <Numeral> (src/components/ui/numeral.tsx); Bodoni is forbidden below 21px.",
        },
      ],
    },
  },
];

export default eslintConfig;
