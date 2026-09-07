import type { Metadata } from "next";
import Link from "next/link";
import { DotBoard } from "@/components/interactive/dot-board";
import { deviceOf, plateById } from "@/content/plates";
import { orderedProjects, statusLabel } from "@/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Every project: agent infrastructure, developer tools, consumer AI, and research prototypes, each with a full write-up.",
  alternates: { canonical: "/projects" },
};

/**
 * The Work index: eight rows, newest first, each one a year, a name, a
 * sentence and a machine line.
 *
 * It used to be a contents page in the printed sense, and the apparatus went
 * with it. The eight headline figures were set as a right-hand column of
 * Bodoni numerals at three sizes graded by "reach", each carrying a
 * superscript reference mark — `*  †  ‡  §  ‖  ¶  **  ††` — that anchored to
 * a critical apparatus at the foot of the page, eight notes with lemmas and
 * links back to the figure. Rows were unequal in height by design and every
 * row's text was indented in proportion to how long ago the work started, so
 * the left margin encoded the chronology.
 *
 * All of it worked and none of it was for the reader. A figure set four times
 * the size of the name beside it is the page shouting which fact it would
 * like you to be impressed by, and a number whose label is three screens away
 * behind a dagger is a number you cannot check. What a person wants from an
 * index is to find the thing and know what it is. So: one uniform row, the
 * metric stated in the same line as the rest of the facts and at the same
 * size as them, and no furniture that has to be explained before it can be
 * read.
 *
 * Server component, no rail, nothing that animates: every project route and
 * every figure is in the HTML with JavaScript switched off.
 */
export default function ProjectsPage() {
  const count = orderedProjects.length;
  const years = orderedProjects.map((p) => p.sortDate.slice(0, 4));
  const currentYear = years[0];
  const firstYear = years[years.length - 1];
  const rule = plateById.get("rule-quarters");

  return (
    <>
      <header className="shell pt-24 pb-10 md:pt-28 md:pb-14">
        <p className="meta text-ink-3">
          {count} projects · {firstYear}&ndash;{currentYear}
        </p>
        <h1 className="mt-6 text-display-l text-ink">Work</h1>
        <p className="measure mt-6 text-lede text-ink-2">
          Five on agents, two in research, one with 3,000+ users.
        </p>

        {/* A rule whose ink thickens where the work landed: seven quarters,
            Q4 2024 to Q2 2026, counted off the real dates. You read it the
            way you read a printed rule of graded weight — the eye takes the
            shape of two years, not seven numbers. The hole is Q1 2025. */}
        {rule && (
          <figure className="toc-rule">
            <DotBoard
              mode="still"
              source={rule.id}
              alt={rule.alt}
              fallback={rule.still}
              className="rule-board"
            />
            <figcaption className="caption">{rule.subject}.</figcaption>
          </figure>
        )}
      </header>

      <div className="shell toc pb-4">
        <ol className="toc-list">
          {orderedProjects.map((project, i) => {
            const year = years[i];
            // The list is already newest-first, so a year is new the moment
            // it differs from the row above it.
            const firstOfYear = i === 0 || years[i - 1] !== year;
            const device = deviceOf(project.slug);

            // Everything the row says about itself, in one line and in one
            // size. The metric is the last item because it is the strongest,
            // not because it is a different kind of fact.
            const meta = [
              project.eyebrow,
              project.org ?? project.role,
              statusLabel[project.status],
              project.confidential ? "NDA" : null,
              `${project.metric} ${project.metricLabel}`,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={project.slug} className="toc-row">
                {/* The year is data, not decoration: it is the label on the
                    axis the date rule draws. Full ink on the first row of
                    each year, so the three groups separate without a second
                    rule. */}
                <span
                  className="toc-year data"
                  data-first={firstOfYear ? "" : undefined}
                >
                  {year}
                </span>

                <div className="toc-body">
                  <h2 className="toc-title text-display-s font-medium text-balance">
                    <Link
                      className="stretch-link"
                      href={`/projects/${project.slug}`}
                      style={{ viewTransitionName: `project-${project.slug}` }}
                    >
                      {project.name}
                    </Link>
                  </h2>

                  {/* Every row carries its sentence. Under the old design
                      only the current year did, so five of eight projects
                      were a name and a machine line — the page thinned as it
                      receded, which is a nice idea about a contents page and
                      a bad one about work someone came here to read. */}
                  <p className="toc-standfirst text-lede">{project.tagline}</p>

                  <p className="toc-meta meta">{meta}</p>
                </div>

                {/* The project's own device: a small engraved diagram of the
                    mechanism that project actually is. Hidden below 64rem,
                    where there is no band to put it in; the same device
                    appears full size on the case study, which is where a
                    phone reader meets it. */}
                {device && (
                  <div className="toc-device" aria-hidden="true">
                    <DotBoard
                      mode="still"
                      source={device.id}
                      alt=""
                      fallback={device.still}
                      className="device-board"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
