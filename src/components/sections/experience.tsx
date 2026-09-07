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
 * /about §7.7, section 02. It writes its own head rather than using
 * <Section> because the spine has to sit in column 2 across every row, which
 * the Section body grammar has no room for.
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
 * The spine is this section's one accent: it lights top to bottom as you
 * scroll and its leading lit dot is --sun. "Current" is therefore text, not
 * an LED, which is also why two current roles cost nothing.
 */
export function Experience() {
  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      data-section-index="02"
      data-section-title="Experience"
      className="section shell section-y"
    >
      <div className="section-head">
        <span className="meta text-ink-3" aria-hidden="true">
          02
        </span>
        <h2
          id="experience-title"
          className="text-display-m font-medium text-balance text-ink"
        >
          Where I’ve worked.
        </h2>
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
                {/* h3: the section's own title is the h2 now that this lives
                    under /about rather than being a page of its own. */}
                <h3
                  id={headingId}
                  className="text-display-s font-medium text-balance text-ink"
                >
                  {entry.company}
                </h3>
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
