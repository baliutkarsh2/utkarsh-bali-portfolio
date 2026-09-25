/**
 * What is left of the portrait content.
 *
 * The hero is a colour halftone of the cut-out, drawn by
 * src/components/interactive/hero-dots.tsx from grid images that
 * scripts/bake-hero.py writes. Nothing about it lives here but its alt text:
 * the three monochrome luminance fields the old WebGL board loaded are gone
 * with it, and so are their baked stills.
 *
 * `portraitOg` survives because the social card is not the site: Satori draws
 * it at request time with no canvas and no CSS variables, and a field of
 * circles is the one thing that renderer does well.
 */
export { portraitOg } from "./portrait-og";

export const portrait = {
  alt:
    "Utkarsh Bali in a striped T-shirt, smiling and looking off past the " +
    "camera with the low sun catching the edge of his face, printed as a " +
    "halftone of colored dots",
} as const;
