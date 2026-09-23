import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Project } from "@/content";
import { deviceOf } from "@/content/plates";
import { DeviceMark } from "@/components/project/device-mark";
import { Gallery } from "@/components/project/gallery";
import { DotMask } from "@/components/ui/dot-mask";
import { CODA, MOVEMENTS, hasCoda } from "@/lib/corpus";

/**
 * The body of a case study: the movements in the left two columns of the
 * sheet, the rail in the third.
 *
 * Each movement opens with a standfirst -- the block's own first sentence, set
 * in the display italic -- and drops to the reading measure for whatever is
 * left. Nothing here is written for this component: the standfirst is a
 * substring of `problem`, `story`, `built` or `impact`, taken at its first
 * sentence boundary and never rewritten, so the page cannot make a claim the
 * content does not. A reader who reads only the display lines has the case.
 *
 * The rail is what used to be the colophon at the foot of the page: the
 * project's device, what it was built with, and the links. At 64rem and up it
 * rides beside the argument, which is where the eye goes looking for "what
 * was this built with" and "where can I see it", and it fills the column that
 * used to be a screen-high strip of bare paper. Below 64rem it follows the
 * movements, as the colophon did.
 */

/**
 * The first sentence, and everything after it.
 *
 * A terminator only ends a sentence when whitespace and a capital (or the end
 * of the string) follow it, which is what keeps "~3x faster" and "top 10% of
 * the applicant pool" from splitting mid-figure.
 */
function splitLead(text: string): { lead: string; rest: string } {
  const trimmed = text.trim();
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s+["“‘'([]?[A-Z]|\s*$)/);
  if (!match) return { lead: trimmed, rest: "" };
  return { lead: match[0], rest: trimmed.slice(match[0].length).trim() };
}

export function ProjectBody({ project }: { project: Project }) {
  const problem = splitLead(project.problem);
  const approach = splitLead(project.story);
  const how = splitLead(project.built);
  const impact = splitLead(project.impact);

  const learnings = project.learnings ?? [];
  const coda = hasCoda(project) ? splitLead(learnings[0]) : null;
  const codaRest = coda
    ? [coda.rest, ...learnings.slice(1)].filter(Boolean)
    : [];

  // The clinical assistant's cover is its three gallery screens composited
  // into one picture. Where the screens are shown one by one, with their
  // captions, the composite would be the same three phones twice.
  const hasGallery = (project.media?.length ?? 0) > 0;
  const cover = hasGallery ? undefined : project.cover;

  return (
    <div className="case-sheet shell">
      <div className="movements">
        <Movement n={0} title={MOVEMENTS[0]} id="problem" lead={problem.lead}>
          {problem.rest && <Copy>{problem.rest}</Copy>}
        </Movement>

        <Movement n={1} title={MOVEMENTS[1]} id="approach" lead={approach.lead}>
          {approach.rest && <Copy>{approach.rest}</Copy>}
        </Movement>

        <Movement n={2} title={MOVEMENTS[2]} id="built" lead={how.lead}>
          {how.rest && <Copy>{how.rest}</Copy>}
          <Steps project={project} />
          {cover && (
            <figure className="case-figure plate-mark">
              <DotMask ratio={`${cover.width} / ${cover.height}`}>
                <Image
                  src={cover.src}
                  alt={cover.alt}
                  width={cover.width}
                  height={cover.height}
                  sizes="(min-width: 80rem) 48rem, (min-width: 64rem) 40rem, 100vw"
                />
              </DotMask>
            </figure>
          )}
        </Movement>

        {hasGallery && project.media && (
          <Movement n={3} title="Screens" id="screens">
            <Gallery media={project.media} />
          </Movement>
        )}

        <Movement
          n={hasGallery ? 4 : 3}
          title={MOVEMENTS[3]}
          id="impact"
          lead={impact.lead}
          quote
        >
          {impact.rest && <Copy>{impact.rest}</Copy>}
        </Movement>

        {coda && (
          <Movement
            n={hasGallery ? 5 : 4}
            title={CODA}
            id="learnings"
            lead={coda.lead}
          >
            {codaRest.map((item) => (
              <Copy key={item}>{item}</Copy>
            ))}
          </Movement>
        )}
      </div>

      <ProjectRail project={project} />
    </div>
  );
}

function Copy({ children }: { children: ReactNode }) {
  return <p className="movement-copy text-body">{children}</p>;
}

/**
 * One movement: the running head in the margin (sticky at >= 64rem, so the
 * reader always knows where they are), then the standfirst and the body.
 *
 * `quote` sets the standfirst as the page's pull quote -- a size up, with a
 * rule down its left edge. Impact is the one movement that gets it: it is the
 * sentence a reader should leave with.
 *
 * `data-section-index` / `data-section-title` feed the header's SectionSpy.
 */
function Movement({
  n,
  title,
  id,
  lead,
  quote = false,
  children,
}: {
  n: number;
  title: string;
  id: string;
  lead?: string;
  quote?: boolean;
  children?: ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-section-index={String(n + 1)}
      data-section-title={title}
      className="movement"
    >
      <div className="movement-head">
        <h2 id={headingId} className="movement-title meta">
          {title}
        </h2>
      </div>

      <div className="movement-main">
        {lead &&
          (quote ? (
            <blockquote className="standfirst standfirst-quote text-display-m">
              <p>{lead}</p>
            </blockquote>
          ) : (
            <p className="standfirst text-display-s">{lead}</p>
          ))}
        {children}
      </div>
    </section>
  );
}

/**
 * "How it works" as three numbered steps.
 *
 * Every project carries exactly three `architecture` strings and they are
 * always an input, a transformation and an output, so they are set as a
 * sequence: a figure in the margin of each step, a hairline between them, and
 * the project's `highlight` under the last one as the figure's caption. It
 * replaces three bordered boxes joined by arrows, which read as a flowchart
 * template rather than as a page.
 */
function Steps({ project }: { project: Project }) {
  return (
    <figure className="steps">
      <ol className="steps-list">
        {project.architecture.map((item, i) => (
          <li key={item} className="step">
            <span className="step-n" aria-hidden="true">
              {i + 1}
            </span>
            <p className="step-text text-body">{item}</p>
          </li>
        ))}
      </ol>
      {project.highlight && (
        <figcaption className="steps-caption caption">
          {project.highlight}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * The rail: the project's device, what it was built with, and the links.
 */
function ProjectRail({ project }: { project: Project }) {
  const device = deviceOf(project.slug);
  return (
    <aside className="case-rail" aria-label="About this project">
      <div className="case-rail-inner">
        {device && (
          <figure className="rail-device">
            <div className="rail-plate">
              <DeviceMark plate={device} label={device.alt} />
            </div>
            <figcaption className="caption">{device.subject}.</figcaption>
          </figure>
        )}

        <div className="rail-block">
          <h2 className="rail-label meta">Built with</h2>
          <ul className="rail-stack tag-row text-small">
            {project.stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {project.links.length > 0 && (
          <div className="rail-block">
            <h2 className="rail-label meta">Links</h2>
            <ul className="rail-links">
              {project.links.map((link) => (
                <li key={link.href}>
                  <a
                    className="rail-link tap text-small"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="dot-underline">{link.label}</span>
                    <ArrowUpRight aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.confidential && (
          <p className="rail-note text-small">
            {project.confidential === "lab"
              ? "Written inside a research group’s codebase, so there’s no public source to link. Happy to talk through the design."
              : "Built inside a company codebase, so there’s no public source to link. Happy to talk through the design."}
          </p>
        )}
      </div>
    </aside>
  );
}
