import type { Metadata } from "next";
import { InspectionPanel } from "@/components/project/inspection-panel";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";
import { Numeral } from "@/components/ui/numeral";
import { Row } from "@/components/ui/row";
import { orderedProjects, statusLabel } from "@/content";
import { ordinal } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Every project: agent infrastructure, developer tools, consumer AI, and research prototypes, each with a full write-up.",
  alternates: { canonical: "/projects" },
};

/**
 * The Work index (§7.3): the board, listed. A meta count, "The work." at
 * display-l, the lede, then every project as a <Row> on the body columns
 * with the inspection panel sticky in the rail at ≥ 64rem. Below that the
 * panel is gone and each row carries its metric inline under the title.
 *
 * The one accent on this page is the ongoing project's row LED (Checkpoint).
 * Every figure, in the rows and in the panel, is --ink.
 */
export default function ProjectsPage() {
  const count = orderedProjects.length;

  // Only the seven fields the panel reads cross to the client; the full
  // record (story, architecture, links…) stays on the server.
  const inspected = orderedProjects.map(
    ({ slug, metric, metricLabel, role, org, highlight, stack }) => ({
      slug,
      metric,
      metricLabel,
      role,
      org,
      highlight,
      stack,
    }),
  );

  return (
    <>
      <header className="shell pt-24 pb-10 md:pt-28 md:pb-12">
        <p className="meta text-ink-3">Index · {count} projects</p>
        <h1 className="mt-6 text-display-l text-ink">The work.</h1>
        <p className="measure mt-6 text-lede text-ink-2">
          {count} projects, from production agent infrastructure to research prototypes. For
          each: the problem, the architecture, and what it proved.
        </p>
      </header>

      <div className="shell work-index">
        {/* `data-project-rows` is PROJECT_ROWS_ATTRIBUTE in inspection-panel.tsx:
            the panel's one delegated listener lives on this list and reads
            `data-slug` from the row wrappers. */}
        <ul className="work-rows rows" data-project-rows="">
          {orderedProjects.map((project, i) => {
            const live = project.status === "ongoing";
            // "NDA" sits where a source link would: confidential work has
            // nothing public to link, and the index says so up front.
            const meta = [
              project.eyebrow,
              project.year,
              statusLabel[project.status],
              project.confidential ? "NDA" : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={project.slug} data-slug={project.slug}>
                <Row
                  index={ordinal(i)}
                  title={project.name}
                  titleAs="h2"
                  transitionName={`project-${project.slug}`}
                  subtitle={project.tagline}
                  meta={meta}
                  led={live ? "live" : "off"}
                  ledLabel={statusLabel[project.status]}
                  href={`/projects/${project.slug}`}
                  trailing={
                    <>
                      {/* Only the figure is a dot surface; the label is a word
                          and stays outside the Reveal. */}
                      <Reveal>
                        <Numeral value={project.metric} size="m" />
                      </Reveal>
                      <p className="meta mt-2 text-ink-3">{project.metricLabel}</p>
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>

        <div className="work-inspect">
          <InspectionPanel projects={inspected} />
        </div>
      </div>

      {/* The index has no numbered sections, so the close is the first. */}
      <Contact index="01" />
    </>
  );
}
