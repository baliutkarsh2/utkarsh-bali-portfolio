import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { experiences, projects, type Project } from "@/content";
import { otherWork } from "@/content/experience";

/**
 * The record on /about: the six lanes of the chart above it, read as a
 * profile reads them. Who, the role, when and where in the margin; what the
 * work was in the text column; and in a third column, the case studies that
 * came out of it, each with the one result it is known for.
 *
 * It used to live inside the chart component as a margin and a 38rem column,
 * which left the right third of every entry bare at 1440, under a separate
 * numbered list of the same eight projects that restated /projects. The case
 * studies now sit beside the employer they belong to, which is the question
 * the list was answering ("what came of that job?"), and the list is gone.
 *
 * Order is the chart's: most recent start first, the independent lane last,
 * because it is a category rather than a place.
 */

type Entry = {
  key: string;
  company: string;
  role: string;
  dates: string;
  location: string;
  summary: string;
  bullets: string[];
  sortDate: string;
  work: Project[];
};

/** "QualGent (YC X25)" belongs to "QualGent"; no org is the independent lane. */
function laneOf(project: Project): string {
  const org = project.org;
  if (!org) return "Independent";
  const employer = experiences.find(
    (e) => org === e.company || org.startsWith(`${e.company} `),
  );
  return employer ? employer.company : org;
}

const entries: Entry[] = [
  ...experiences.map((e) => ({ ...e, key: e.company })),
  ...otherWork,
]
  .map((e) => ({
    key: e.key,
    company: e.company,
    role: e.role,
    dates: e.dates,
    location: e.location,
    summary: e.summary,
    bullets: e.bullets,
    sortDate: e.sortDate,
    work: projects
      .filter((p) => laneOf(p) === e.key)
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate)),
  }))
  .sort((a, b) => {
    if ((a.key === "Independent") !== (b.key === "Independent")) {
      return a.key === "Independent" ? 1 : -1;
    }
    return b.sortDate.localeCompare(a.sortDate);
  });

export function Record() {
  return (
    <section
      aria-label="The record"
      data-section-index="02"
      data-section-title="Experience"
      className="shell record"
    >
      <ol className="record-list">
        {entries.map((entry) => {
          const headingId = `record-${entry.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <li key={entry.key}>
              <article className="record-entry" aria-labelledby={headingId}>
                <div className="record-margin">
                  <h3 id={headingId} className="record-name text-display-s">
                    {entry.company}
                  </h3>
                  {entry.role && (
                    <p className="record-role text-small">{entry.role}</p>
                  )}
                  <p className="record-when data">
                    {entry.dates}
                    {entry.location && (
                      <>
                        <br />
                        {entry.location}
                      </>
                    )}
                  </p>
                </div>

                <div className="record-body">
                  <p className="record-lede text-lede">{entry.summary}</p>
                  {entry.bullets.length > 0 && (
                    <ul className="record-points dot-list text-body">
                      {entry.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {entry.work.length > 0 && (
                  <div className="record-work">
                    <h4 className="record-work-label meta">
                      {entry.work.length === 1 ? "Case study" : "Case studies"}
                    </h4>
                    <ul className="record-cases">
                      {entry.work.map((project) => (
                        <li key={project.slug}>
                          <Link
                            className="record-case"
                            href={`/projects/${project.slug}`}
                          >
                            <span className="record-case-name">
                              {project.name}
                              <ArrowRight aria-hidden="true" />
                            </span>
                            <span className="record-case-result text-small">
                              <b>{project.metric}</b> {project.metricLabel}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
