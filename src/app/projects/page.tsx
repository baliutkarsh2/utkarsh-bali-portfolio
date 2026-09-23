import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DeviceMark } from "@/components/project/device-mark";
import { Typeset } from "@/components/project/typeset";
import { deviceOf } from "@/content/plates";
import { orderedProjects, statusLabel, type Project } from "@/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Eight projects, 2024 to 2026: agent infrastructure, developer tools, consumer AI and research, each with a write-up.",
  alternates: { canonical: "/projects" },
  openGraph: {
    url: "/projects",
    title: "Work",
    description:
      "Eight projects, 2024 to 2026: agent infrastructure, developer tools, consumer AI and research, each with a write-up.",
  },
};

/**
 * The Work index: eight rows, newest first, grouped by year.
 *
 * Each row answers the three questions a reader brings to an index, in the
 * order they bring them: what is it (the name and one sentence), did it work
 * (the result, set in the reading face with the figure in full ink, on a line
 * of its own rather than buried at the end of a machine line), and where did
 * it happen (eyebrow, organisation, status, in mono). The project's device
 * hangs at the right edge: the mechanism of that project drawn as a diagram
 * of rules, bars and dots, the same mark the case study shows at full size.
 *
 * The year is a group label, said once per group against a heavier rule,
 * instead of repeated on every row beside a vertical spine: three groups read
 * as three groups without a second axis to explain. It is set as a figure in
 * the display face and rides the margin while its rows pass, so the margin is
 * never a strip of bare paper with a date at the top of it.
 *
 * A strip used to sit under the standfirst: projects per quarter as a band of
 * graded dot density. At its real size it read as a loading bar, and nobody
 * who came to find a project needed the quarterly histogram first. Gone.
 *
 * Server component. Nothing here animates, and every route and figure is in
 * the HTML with JavaScript switched off.
 */
export default function ProjectsPage() {
  const count = orderedProjects.length;
  const yearOf = (p: Project) => p.sortDate.slice(0, 4);
  const firstYear = yearOf(orderedProjects[count - 1]);
  const currentYear = yearOf(orderedProjects[0]);

  // Already newest-first, so a group is a run of equal years.
  const groups: { year: string; projects: Project[] }[] = [];
  for (const project of orderedProjects) {
    const year = yearOf(project);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.projects.push(project);
    else groups.push({ year, projects: [project] });
  }

  return (
    <>
      <header className="shell page-mast toc-mast">
        <div className="toc-mast-type">
          <p className="meta text-ink-3">
            {count} projects · {firstYear}&ndash;{currentYear}
          </p>
          <h1 className="page-mast-title text-display-l text-ink">
            <Typeset>Work</Typeset>
          </h1>
          <p className="page-mast-lede text-lede text-ink-2">
            Five on agents, two in research, one with 3,000+ users. Each one
            has a write-up: the problem, what I built, and what came of it.
          </p>
        </div>

        {/* The contents, beside the masthead at 64rem and up: all eight
            names on the first screen, by year, each a link to its write-up.
            The rows below are tall, and at 1440 only two of them are above
            the fold; this is where a reader who came for one project finds
            it without scrolling, and it is what the right half of the
            masthead is for instead of bare paper. */}
        <nav className="toc-contents" aria-label="Contents">
          {groups.map((group) => (
            <div key={group.year} className="toc-contents-row">
              <p className="toc-contents-year data">{group.year}</p>
              <ul className="toc-contents-list">
                {group.projects.map((project) => (
                  <li key={project.slug}>
                    <Link
                      className="toc-contents-link"
                      href={`/projects/${project.slug}`}
                    >
                      {project.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </header>

      <div className="shell toc">
        {groups.map((group) => (
          <section
            key={group.year}
            className="toc-group"
            aria-label={`Projects from ${group.year}`}
          >
            {/* The group's label: the year as a figure in the display face,
                and the count under it. Sticky in the margin at 48rem and up,
                so the year stays beside the rows it heads while they pass. */}
            <p className="toc-year">
              <span className="toc-year-n text-display-s">{group.year}</span>
              <span className="toc-year-count meta">
                {group.projects.length}{" "}
                {group.projects.length === 1 ? "project" : "projects"}
              </span>
            </p>

            <ol className="toc-list">
              {group.projects.map((project) => {
                const device = deviceOf(project.slug);
                // One item per fact, so a wrap can only fall between two of
                // them and never leaves a middot at either end of a line.
                const meta = [
                  project.eyebrow,
                  project.org ?? "Independent",
                  statusLabel[project.status],
                ];

                return (
                  <li key={project.slug} className="toc-row">
                    <div className="toc-body">
                      <h2 className="toc-title text-display-s">
                        <Link
                          className="stretch-link"
                          href={`/projects/${project.slug}`}
                          style={{
                            viewTransitionName: `project-${project.slug}`,
                          }}
                        >
                          <Typeset>{project.name}</Typeset>
                        </Link>
                        <ArrowRight className="toc-arrow" aria-hidden="true" />
                      </h2>

                      <p className="toc-standfirst">{project.tagline}</p>

                      <p className="toc-result text-small">
                        <span className="toc-figure">{project.metric}</span>{" "}
                        {project.metricLabel}
                      </p>

                      <ul className="toc-meta tag-row meta">
                        {meta.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    {device && (
                      <div className="toc-device">
                        <DeviceMark plate={device} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
