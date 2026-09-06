import type { CSSProperties } from "react";
import { Spine } from "@/components/ui/spine";
import { TagRow } from "@/components/ui/tag";
import { experiences } from "@/content";

/** Newest first. The content array is immutable, so the sort is a copy. */
const byRecency = [...experiences].sort((a, b) => b.sortDate.localeCompare(a.sortDate));

/** "Purdue University" → "purdue-university", for the entry heading ids. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * The first section of /experience (§7.7). Like About, it writes its own
 * head in the Section grammar so the title can be the page's h1.
 *
 * The entries sit on a three-column grid: dates on the left in the `data`
 * register (--ink-3, with a meta "Current" in --ink where it applies), the
 * spine, then the entry: company in display-s, role in body 500, summary in
 * body --ink-2, bullets as a dot list, tags as one meta line. Each entry is
 * an <article> spanning all three columns as a subgrid, so its hairline runs
 * the full width and its two halves land in the outer columns; its grid row
 * is explicit (`--row`) because the spine has a definite place in column 2
 * across every row, and an auto-placed item would be pushed beneath it.
 * Layout rules: `.experience` in components.css. Below 48rem it is one
 * column with the spine in the left gutter and the entries indented 1.5rem,
 * dates above the company.
 *
 * The spine is the page's one accent: it lights top to bottom as you scroll
 * and its leading lit dot is --sun. "Current" is therefore text, not an LED,
 * which is also why two current roles cost nothing.
 */
export function Experience() {
  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      data-section-index="01"
      data-section-title="Experience"
      className="section section-first shell"
    >
      <div className="section-head">
        <span className="meta text-ink-3" aria-hidden="true">
          01
        </span>
        <h1
          id="experience-title"
          className="text-display-l font-medium text-balance text-ink"
        >
          Where I’ve worked.
        </h1>
      </div>

      <div className="experience">
        <Spine rows={byRecency.length} />

        {byRecency.map((entry, i) => {
          const headingId = `experience-${slug(entry.company)}`;
          return (
            <article
              key={`${entry.company}-${entry.sortDate}`}
              className="experience-entry"
              aria-labelledby={headingId}
              style={{ "--row": i + 1 } as CSSProperties}
            >
              <div className="experience-when data">
                <p>{entry.dates}</p>
                <p className="mt-1">{entry.location}</p>
                {entry.current && <p className="meta mt-3 text-ink">Current</p>}
              </div>

              <div className="experience-what">
                <h2
                  id={headingId}
                  className="text-display-s font-medium text-balance text-ink"
                >
                  {entry.company}
                </h2>
                <p className="mt-1 text-body font-medium text-ink">{entry.role}</p>
                <p className="measure mt-4 text-body text-ink-2">{entry.summary}</p>
                <ul className="dot-list measure mt-5 text-small text-ink-2">
                  {entry.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  <TagRow items={entry.tags} label={`${entry.company} stack`} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
