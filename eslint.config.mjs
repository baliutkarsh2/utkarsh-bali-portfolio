import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Doto sets numbers and nothing else (spec §3): `<Numeral>` is the only
 * component allowed to reach the dot face, through the `.numeral` class in
 * components.css and the two `text-dot-*` size utilities. Any other file that
 * names `font-dot` or `text-dot-` in a string is putting a word in Doto. The
 * two exemptions are the component itself and the font loader that declares
 * the `--font-dot-src` variable it resolves through.
 */
const dotFace = /font-dot|text-dot-/.source;

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/numeral.tsx", "src/lib/fonts.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${dotFace}/]`,
          message: "Doto is set only by <Numeral> (src/components/ui/numeral.tsx).",
        },
        {
          selector: `TemplateElement[value.raw=/${dotFace}/]`,
          message: "Doto is set only by <Numeral> (src/components/ui/numeral.tsx).",
        },
      ],
    },
  },
];

export default eslintConfig;
