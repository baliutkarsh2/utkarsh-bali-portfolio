import type { CSSProperties } from "react";
import { Numeral } from "@/components/ui/numeral";
import type { Project } from "@/content";

type FigureProps = {
  project: Pick<Project, "metric" | "metricLabel">;
};

type PlateFigureProps = {
  project: Pick<Project, "slug" | "metric" | "metricLabel">;
};

/**
 * The frontispiece figure: the headline metric set very large and bled off the
 * right edge of the sheet, with its label under it as an italic caption.
 *
 * This is the only element on the site permitted to leave the page, and the
 * amount it leaves by is measured rather than picked: 0.16em (see
 * `.figure-hero .numeral` in case.css) is a little more than the right side
 * bearing of the widest terminal glyph across the eight metrics, so what is
 * clipped is the edge of the ink, never a glyph. The same figure is repeated
 * whole and unbled at the close of Impact, and it is real text in both places —
 * with JavaScript off, with images blocked, in the print stylesheet.
 *
 * It used to be a 60svh full-bleed --ground-2 band with the figure top-left and
 * the highlight at the bottom. A band sized by nothing is a slide, and the page
 * is a plate, not a deck. The highlight moved to where it is actually useful:
 * it names the three stages of the schematic, so it is the schematic's caption.
 *
 * The figure is --ink, like every figure on the site. Vermilion is licensed to
 * four places and none of them is a case study.
 */
export function PlateFigure({ project }: PlateFigureProps) {
  return (
    /* The number you clicked is the thing that survives the change. The
       contents page gives the same figure `view-transition-name:
       metric-<slug>`, so navigating from the index morphs THAT numeral into
       this bled one and crossfades everything else under it -- the number is
       the argument of both pages and the only object with a continuous
       identity across them.

       It goes on the frontispiece figure and NOT on the reprise at the close
       of Impact: two elements sharing one view-transition-name makes the
       browser skip the whole transition rather than degrade it. `.figure-hero`
       in case.css is the selector precisely because it excludes
       `.close-figure`. */
    <div
      className="figure-bleed"
      style={{ "--vt-fig": `metric-${project.slug}` } as CSSProperties}
    >
      <p className="figure-hero">
        <Numeral value={project.metric} size="l" />
      </p>
      <p className="figure-cap caption shell">{project.metricLabel}</p>
    </div>
  );
}

/**
 * The reprise. Impact closes on the number the page opened on, inside the type
 * column this time and at about a third of the size, over a --line-strong rule.
 * A <figure> rather than a repeat of the frontispiece markup: here the label is
 * genuinely a caption to a figure, and the pair is one node to a screen reader.
 */
export function CloseFigure({ project }: FigureProps) {
  return (
    <figure className="close-figure">
      <Numeral value={project.metric} size="l" as="p" />
      <figcaption className="caption">{project.metricLabel}</figcaption>
    </figure>
  );
}
