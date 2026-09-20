/**
 * What is left of the portrait content.
 *
 * The hero is a colour dot field of the cut-out, drawn by
 * src/components/interactive/hero-dots.tsx from a grid image that
 * scripts/bake-hero.py writes. Nothing about it lives here any more: the
 * three monochrome luminance fields the old WebGL board loaded are gone with
 * it, and so are their baked stills.
 *
 * `portraitOg` survives because the social card is not the site: Satori draws
 * it at request time with no canvas and no CSS variables, and a field of
 * circles is the one thing that renderer does well.
 */
export { portraitOg } from "./portrait-og";

export const portrait = {
  alt:
    "Utkarsh Bali in profile, rendered as a field of coloured dots: looking " +
    "out past the camera with the low sun catching the edge of his face",
} as const;
