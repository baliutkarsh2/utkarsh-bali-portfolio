import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Numeral } from "@/components/ui/numeral";
import { orderedProjects, statusLabel } from "@/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Every project: agent infrastructure, developer tools, consumer AI, and research prototypes, each with a full write-up.",
  alternates: { canonical: "/projects" },
};

/**
 * How far each figure reaches. This is the one editorial judgement on the
 * page, and it is read off the metric's own label rather than invented:
 *
 *   people   the number was measured on people outside the code — an
 *            engineering org's elapsed time, a nurse's shift, three thousand
 *            strangers in twenty-two countries.
 *   system   the number was measured on the thing itself, running: a failure
 *            rate at production scale, a tool surface a team queries daily.
 *   bench    the number came off a bench or somebody else's scoreboard: an
 *            AUROC against a synthetic oracle, an internal benchmark, a
 *            ranking inside an applicant pool.
 *
 * Nothing about a bench number is worth less. It claims less, so it is set
 * smaller: the size is the size of the claim, not the size of the pride. The
 * three tiers are uncorrelated with the dates, which is what makes the right
 * column a skyline instead of a ramp.
 */
type Reach = "people" | "system" | "bench";

const REACH: Record<string, Reach> = {
  "recurly-agent-platform": "people", // ~3x faster for a company's engineers
  "clinical-ai-assistant": "people", // ~40% off nurses' documentation
  wallex: "people", // 3K+ users, 22+ countries
  "autonomous-app-crawler": "system", // <1% failure at production scale
  "qualgent-ai-assistant": "system", // 45+ tools behind one interface
  checkpoint: "bench", // Top 10% of an applicant pool
  "clip-h": "bench", // 0.844 AUROC vs a synthetic oracle
  "multi-agent-qa": "bench", // >99%, internal benchmark
};

/**
 * The Work index (§7.3), set as a contents page.
 *
 * Two axes, both read off the data, and between them they answer the only
 * two questions an index has to answer — what did it prove, and when:
 *
 *   LEFT   a hairline runs the height of the list. Every row's year is set
 *          against it, and every row's text begins at a distance from it
 *          proportional to how long ago that work started. So the ragged
 *          left margin is not a rhythm, it is the chronology: the step
 *          between two rows is the real gap between two dates, which is why
 *          2025-11 sits a hair below 2025-12 and 2024-10 falls off a cliff.
 *
 *   RIGHT  the eight headline figures in a column, at three sizes by reach
 *          (see REACH). They are the first thing the eye lands on and they
 *          can be read on their own, top to bottom, before a single word.
 *
 * Row heights are unequal on purpose. The current year carries a standfirst;
 * everything older carries a title and one machine line. A contents page
 * thins as it recedes, and the year rule beside it explains why.
 *
 * Server component, no rail, nothing that animates: every project route and
 * every figure is in the HTML with JavaScript switched off.
 */
export default function ProjectsPage() {
  const count = orderedProjects.length;

  // The chronological axis. --t is 0 for the newest project and 1 for the
  // oldest; the CSS multiplies it by one indent step. Computed from the real
  // timestamps, so an unevenly spaced list stays unevenly spaced.
  const times = orderedProjects.map((p) => Date.parse(`${p.sortDate}T00:00:00Z`));
  const newest = Math.max(...times);
  const oldest = Math.min(...times);
  const span = newest - oldest || 1;

  const currentYear = new Date(newest).getUTCFullYear().toString();
  const firstYear = new Date(oldest).getUTCFullYear().toString();

  const years = orderedProjects.map((p) => p.sortDate.slice(0, 4));

  return (
    <>
      <header className="shell pt-24 pb-10 md:pt-28 md:pb-14">
        <p className="meta text-ink-3">
          Contents · {count} projects · {firstYear}&ndash;{currentYear}
        </p>
        <h1 className="mt-6 text-display-l text-ink">The work.</h1>
        <p className="measure mt-6 text-lede text-ink-2">
          Five on agents, two in research, one with 3,000+ users. The column on the right
          is what each one proved. The margin on the left is when.
        </p>
      </header>

      <div className="shell toc pb-4">
        {/* The column heads name the two axes, so the figures column does not
            have to be guessed at. Decorative for a screen reader: every row
            already says its own year, and every figure is followed by the
            label that says what it measures. */}
        <div className="toc-head meta" aria-hidden="true">
          <span>Year</span>
          <span>Project</span>
          <span>What it proved</span>
        </div>

        <ol className="toc-list">
          {orderedProjects.map((project, i) => {
            const year = years[i];
            // The list is already newest-first, so a year is new the moment
            // it differs from the row above it.
            const firstOfYear = i === 0 || years[i - 1] !== year;

            const reach = REACH[project.slug] ?? "system";
            // The current year gets the standfirst. Everything older gets the
            // title and the machine line: the list thins as it recedes, and
            // the year rule beside it is the reason.
            const lead = year === currentYear;
            const t = (newest - times[i]) / span;

            const meta = [
              project.eyebrow,
              project.org ?? project.role,
              statusLabel[project.status],
              project.confidential ? "NDA" : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={project.slug}
                className="toc-row"
                data-weight={lead ? "lead" : "plain"}
                data-reach={reach}
                style={{ "--t": t.toFixed(4) } as CSSProperties}
              >
                {/* The year is data, not decoration: it is read, and it is
                    the label on the axis the row's indent is measured
                    against. Full ink on the first row of each year, so the
                    three groups separate without a second rule. */}
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

                  {lead && (
                    <p className="toc-standfirst text-lede">{project.tagline}</p>
                  )}

                  <p className="toc-meta meta">{meta}</p>
                </div>

                <div className="toc-fig">
                  <Numeral value={project.metric} size="m" />
                  <p className="toc-fig-label meta">{project.metricLabel}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
