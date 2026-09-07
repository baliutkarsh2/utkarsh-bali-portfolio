import { Reveal } from "@/components/interactive/reveal";
import { Numeral } from "@/components/ui/numeral";
import type { Project } from "@/content";

type NumberPlateProps = {
  project: Pick<Project, "metric" | "metricLabel" | "highlight">;
};

/**
 * The one-number slide (§7.4.3): a full-bleed --ground-2 band, 60svh tall
 * (40svh on phones), with the metric at size l top-left, its label beneath,
 * and the highlight in small --ink-2 at the bottom. Every project gets one;
 * it is the number that earns the rigour above and below it.
 *
 * The figure is --ink on every case study (rule 3). The sub-bar's progress
 * row is sticky, so its --sun head is on every case-study screen, including
 * the one this plate fills; a --sun figure for the ongoing project would be
 * the second accent on that screen. The share card (src/lib/og.tsx) is where
 * that project's number goes orange. The figure warms 400 → 700 as it enters
 * view, which on most screens is the moment the page settles.
 *
 * Doto sets numbers and nothing else. A metric with a glyph outside
 * DOT_GLYPHS ("0123456789.,%<>~+xKTop ") would be a content bug; rather than
 * render a missing glyph in the dot face, the plate falls back to Geist at
 * display-xl so the page still says its number. Every metric in
 * src/content/projects.ts passes the check today ("Top 10%", "<1%", "45+",
 * "0.844", ">99%", "~40%", "3K+").
 */
export function NumberPlate({ project }: NumberPlateProps) {
  return (
    <div className="case-plate">
      <div className="shell">
        <Reveal>
          <Numeral value={project.metric} size="l" as="p" />
        </Reveal>
        <p className="meta mt-4 text-ink-2">{project.metricLabel}</p>
      </div>

      <div className="shell">
        <p className="measure text-small text-ink-2">{project.highlight}</p>
      </div>
    </div>
  );
}
