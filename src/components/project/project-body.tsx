import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/interactive/reveal";
import { Numeral } from "@/components/ui/numeral";
import type { Project } from "@/content";
import { ordinal } from "@/lib/utils";

/**
 * How many numbered sections the body renders for a project. The page uses
 * it to number what follows (Contact).
 */
export function projectSectionCount(project: Pick<Project, "learnings">): number {
  return project.learnings && project.learnings.length > 0 ? 6 : 5;
}

/**
 * The case-study body (§7.4.5): six numbered hairline blocks on the copy
 * columns. Each block is a `section` carrying `data-section-index` and
 * `data-section-title`, so the header readout follows the reader through
 * "01 PROBLEM" … "06 WHAT I'D DO DIFFERENTLY" exactly as it does through
 * the home page's sections.
 *
 * 01 Problem is set in display-s: the problem is the title. 02 and 03 are
 * body copy in --ink-2. 04 Architecture is numbered hairline rows. 05 Impact
 * is a pull quote behind a 2px --ink rule, then the metric restated at size
 * m with its label. 06 appears only when there are learnings.
 */
export function ProjectBody({ project }: { project: Project }) {
  const hasLearnings = project.learnings && project.learnings.length > 0;

  return (
    <div className="case-copy space-y-16">
      <Block index="01" title="Problem" id="problem">
        <p className="measure text-display-s text-ink">{project.problem}</p>
      </Block>

      <Block index="02" title="Approach" id="approach">
        <p className="measure text-body text-ink-2">{project.story}</p>
      </Block>

      <Block index="03" title="What I built" id="built">
        <p className="measure text-body text-ink-2">{project.built}</p>
      </Block>

      <Block index="04" title="Architecture" id="architecture">
        <ol className="m-0 list-none border-b border-line p-0">
          {project.architecture.map((item, i) => (
            <li
              key={item}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-t border-line py-5 first:border-t-0 first:pt-0"
            >
              <span className="meta pt-1 text-ink-3" aria-hidden="true">
                {ordinal(i)}
              </span>
              <p className="measure text-body text-ink-2">{item}</p>
            </li>
          ))}
        </ol>
      </Block>

      <Block index="05" title="Impact" id="impact">
        {/* A pull quote, not a <blockquote>: it is his statement, not a
            citation, and it is the section's own copy rather than a repeat. */}
        <div className="border-l-2 border-ink pl-6">
          <p className="measure text-lede text-ink">{project.impact}</p>
        </div>
        <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <Reveal>
            <Numeral value={project.metric} size="m" />
          </Reveal>
          <p className="meta max-w-[24ch] text-ink-3">{project.metricLabel}</p>
        </div>
      </Block>

      {hasLearnings && (
        <Block index="06" title="What I'd do differently" id="learnings">
          <ul className="m-0 list-none border-b border-line p-0">
            {project.learnings?.map((item) => (
              <li key={item} className="border-t border-line py-5 first:border-t-0 first:pt-0">
                <p className="measure text-body text-ink-2">{item}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}

/**
 * The case-study rail (§7.4.5): Stack as hairlined rows, Links with the
 * outward arrow and the sr-only new-tab notice, and the NDA note for
 * confidential work. Sticky at ≥ 64rem under the header and the sub-bar
 * (.case-rail in components.css). Its top edge is --line-strong like every
 * rail on the site, never --sun (rule 3).
 */
export function ProjectRail({ project }: { project: Project }) {
  return (
    <aside className="case-rail" aria-label="Project details">
      <div>
        <section aria-labelledby="stack-title" className="border-t border-line-strong pt-5">
          <h2 id="stack-title" className="meta text-ink-3">
            Stack
          </h2>
          <ul className="m-0 mt-4 list-none p-0">
            {project.stack.map((item) => (
              <li key={item} className="border-b border-line py-2 text-small text-ink-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {project.links.length > 0 && (
          <section aria-labelledby="links-title" className="mt-8 border-t border-line pt-5">
            <h2 id="links-title" className="meta text-ink-3">
              Links
            </h2>
            <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
              {project.links.map((link) => (
                <li key={link.href}>
                  {/* The dotted underline sits on the label only, so the arrow
                      is never underlined; the group variants draw it from the
                      whole link's hover and focus. */}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group tap inline-flex items-center gap-1.5 text-small text-ink-2 transition-colors hover:text-ink"
                  >
                    <span className="dot-underline group-hover:[--u:100%] group-focus-visible:[--u:100%]">
                      {link.label}
                    </span>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {project.confidential && (
          <p className="mt-8 border-t border-line pt-5 text-small text-ink-3">
            Built inside a company codebase, so there&apos;s no public source to link. Happy
            to talk through the design.
          </p>
        )}
      </div>
    </aside>
  );
}

function Block({
  index,
  title,
  id,
  children,
}: {
  index: string;
  title: string;
  id: string;
  children: ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-section-index={index}
      data-section-title={title}
      className="border-t border-line pt-5"
    >
      <div className="flex items-baseline gap-4">
        <span className="meta text-ink-3" aria-hidden="true">
          {index}
        </span>
        <h2 id={headingId} className="meta text-ink-3">
          {title}
        </h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
