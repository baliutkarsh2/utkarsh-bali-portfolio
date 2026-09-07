import { Reveal } from "@/components/interactive/reveal";
import { Button } from "@/components/ui/button";
import { Numeral } from "@/components/ui/numeral";
import { Row } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { featuredProjects, orderedProjects } from "@/content";
import { ordinal } from "@/lib/utils";

/** The home page shows the top three; the rest live on /projects. */
const ROW_COUNT = 3;

/** Spelled out, because the title is a sentence and a numeral there is a stat. */
const WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

/** "Eight projects." Counted, never typed: a hand-written total goes stale. */
const title =
  orderedProjects.length < WORDS.length
    ? `${WORDS[orderedProjects.length]} projects.`
    : `${orderedProjects.length} projects.`;

/**
 * Section 02 (§7.1, `#work`): the first three featured projects as rows —
 * index, name, tagline, "eyebrow · year", and the project's one number in
 * Bodoni on the right with its label beneath. The whole row is the link; the
 * name carries `view-transition-name: project-{slug}` so it morphs into the
 * case-study masthead. No LED and no accent here: the figures are --ink, so
 * the numbers board above keeps the screen's one --sun element.
 *
 * Rows are full width (the spec's "hover fill bleeds to the shell edges"):
 * `section-wide` (components.css) runs the copy across every column for a
 * Section without a rail whose body is rows.
 *
 * Each numeral sits in its own Reveal so it warms as its row enters view;
 * the words around it are outside the wrapper and never animate.
 */
export function SelectedWork({ index = "02" }: { index?: string }) {
  const rows = featuredProjects.slice(0, ROW_COUNT);

  return (
    <Section index={index} title={title} id="work" className="section-wide">
      <ul className="rows">
        {rows.map((project, i) => (
          <li key={project.slug}>
            <Row
              index={ordinal(i)}
              title={project.name}
              subtitle={project.tagline}
              meta={`${project.eyebrow} · ${project.year}`}
              trailing={
                <>
                  <Reveal>
                    <Numeral value={project.metric} size="m" />
                  </Reveal>
                  <span className="meta mt-2 block text-ink-3">{project.metricLabel}</span>
                </>
              }
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
