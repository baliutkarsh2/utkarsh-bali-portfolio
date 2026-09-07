import { Button } from "@/components/ui/button";
import { Row } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { featuredProjects, orderedProjects } from "@/content";

/** The home page shows the top three; the rest live on /projects. */
const ROW_COUNT = 3;

const title = "Selected work";

/**
 * `#work`: the first three featured projects as rows — name, tagline, and one
 * machine line carrying the eyebrow, the year and the project's number. The
 * whole row is the link; the name carries `view-transition-name:
 * project-{slug}` so it morphs into the case-study masthead.
 *
 * The number used to be set in Bodoni at display size in a column of its own,
 * with its label under it and a counter (01, 02, 03) hanging off the left of
 * each row. Both are gone, and /projects lost the same two things on the same
 * day. A figure four times the size of the name beside it is the page
 * choosing which fact you should be impressed by; in the machine line it is
 * the same fact, checkable against the sentence above it, and the row reads
 * as work rather than as a result.
 *
 * Rows are full width (the spec's "hover fill bleeds to the shell edges"):
 * `section-wide` (components.css) runs the copy across every column for a
 * Section without a rail whose body is rows.
 *
 * Each numeral sits in its own Reveal so it warms as its row enters view;
 * the words around it are outside the wrapper and never animate.
 */
export function SelectedWork({ index = "" }: { index?: string }) {
  const rows = featuredProjects.slice(0, ROW_COUNT);

  return (
    <Section index={index} title={title} id="work" className="section-wide">
      <ul className="rows">
        {rows.map((project) => (
          <li key={project.slug}>
            <Row
              title={project.name}
              subtitle={project.tagline}
              meta={`${project.eyebrow} · ${project.year} · ${project.metric} ${project.metricLabel}`}
              href={`/projects/${project.slug}`}
              transitionName={`project-${project.slug}`}
              titleAs="h3"
            />
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button variant="text" href="/projects">
          All work ({orderedProjects.length})
        </Button>
      </div>
    </Section>
  );
}
