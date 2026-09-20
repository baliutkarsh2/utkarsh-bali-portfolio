/**
 * What is left of the dot portrait.
 *
 * The hero was a photograph turned into a field of dots: `scripts/segment.py`
 * cut the subject out, `scripts/bake-portrait.py` sampled that cutout onto dot
 * grids at three sizes, and the board drew them. The hero is the photograph
 * itself now (src/assets/portrait/utkarsh-hero.jpg), so the three fields and
 * their baked stills are gone.
 *
 * `portraitOg` survives because the social card is not the site: Satori draws
 * it at request time with no canvas and no CSS variables, and a field of
 * circles is the one thing that renderer does well.
 */
export { portraitOg } from "./portrait-og";

export const portrait = {
  alt:
    "Utkarsh Bali on a ridge above the coast at sunset, looking out over the " +
    "ocean with the sun low behind him",
} as const;
