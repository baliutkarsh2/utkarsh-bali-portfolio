import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Row } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { featuredProjects, orderedProjects, statusLabel } from "@/content";
import type { ProjectStatus } from "@/content";

/** The home page shows the top three; the rest live on /projects. */
const ROW_COUNT = 3;

const title = "Selected work";

/** Status is a shape (the chart below uses the same three). */
const GLYPH: Record<ProjectStatus, "filled" | "half" | "open"> = {
  shipped: "filled",
  ongoing: "half",
  research: "open",
};

/**
 * `#work`: the first three featured projects as rows. The whole row is the
 * link; the name carries `view-transition-name: project-{slug}` so it morphs
 * into the case-study masthead.
 *
 * Each row hangs its year and status in a 12rem margin, the page's margin
 * grammar: the chart below starts its plot at the same x, and /about's record
 * sets its type column there too. The status is the chart's own mark — filled
 * shipped, half ongoing, open research — so the page teaches the three shapes
 * once, in words, and the plate can use them without a caption. The margin
 * used to be an empty 3rem gutter that pushed every title 72px in from the
 * heading above it.
 *
 * The result reads as /projects sets it: one line of the reading face under
 * the standfirst, the figure in full ink at medium weight and the same size
 * as the words beside it. A figure four times the size of the name would be
 * the page choosing which fact you should be impressed by; a clause in mono
 * capitals broke mid-phrase on a phone and read "~3X". The machine line under
 * it is the category alone, one tag that cannot wrap: the status already
 * hangs in the margin, and the year with it.
 *
 * "All work" was a lone 16px text link under the list. It is a button now,
 * on the list's own type column, saying how many there are.
 */
export function SelectedWork() {
  const rows = featuredProjects.slice(0, ROW_COUNT);

  return (
    <Section title={title} id="work" className="section-wide work-section">
      <ul className="rows work-rows">
        {rows.map((project) => (
          <li key={project.slug}>
            <Row
              gutter={
                <>
                  <span className="work-year data">{project.year}</span>
                  <span className="work-status">
                    <span
                      className="cn-glyph"
                      data-glyph={GLYPH[project.status]}
                      aria-hidden="true"
                    />
                    {statusLabel[project.status]}
                  </span>
                </>
              }
              title={project.name}
              subtitle={project.tagline}
              subtitleSize="body"
              result={
                <>
                  <span className="row-figure">{project.metric}</span>{" "}
                  {project.metricLabel}
                </>
              }
              meta={project.eyebrow}
              href={`/projects/${project.slug}`}
              cta="Case study"
              transitionName={`project-${project.slug}`}
              titleAs="h3"
            />
          </li>
        ))}
      </ul>

      <div className="work-more">
        <Button variant="secondary" href="/projects">
          All {orderedProjects.length} projects
          <ArrowRight className="work-more-arrow" aria-hidden="true" />
        </Button>
      </div>
    </Section>
  );
}
