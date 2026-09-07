import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Project } from "@/content";
import { CloseFigure } from "@/components/project/number-plate";
import { Reveal } from "@/components/interactive/reveal";
import { DotMask } from "@/components/ui/dot-mask";
import { ordinal } from "@/lib/utils";

/**
 * The four movements (five where there are learnings).
 *
 * Each opens with a standfirst — the block's own first sentence, set in the
 * display italic across a wider measure — and then drops to the body measure
 * for whatever is left. Nothing here is written for this component: the
 * standfirst is a substring of `problem`, `story`, `built` or `impact`, taken
 * at its first sentence boundary and never rewritten, so the page cannot make
 * a claim the content does not.
 *
 * That split is the whole design of the page. A reader who reads only the four
 * italic lines has the case: the problem, what he did, how it works, what came
 * of it. A reader who wants the argument reads on at 66ch. Three of the eight
 * projects have a one-sentence `problem` or `built`; there the standfirst is
 * the entire block and there is simply nothing under it, which is the honest
 * shape of a 136-word case study rather than a gap to be filled.
 *
 * The numbered hairline blocks this replaces put a mono "01 PROBLEM" over every
 * paragraph and set the whole page at one measure. Five of those over 198 words
 * is a table of contents for a page and a half.
 */

/** I … V. The movements are hung in the margin, so they are numbered like one. */
const ROMAN = ["I", "II", "III", "IV", "V"] as const;

/**
 * The first sentence, and everything after it.
 *
 * A terminator only ends a sentence when whitespace and a capital (or the end
 * of the string) follow it, which is what keeps "0.844 AUROC" and "top 10% of
 * the applicant pool" from splitting mid-figure. Every second sentence in
 * src/content/projects.ts starts with a capital; a block that never matches is
 * returned whole as the standfirst, with nothing under it.
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
  // The learnings are already written as "claim. elaboration.", so the coda
  // takes its standfirst the same way every other movement does: the first
  // sentence of the first learning, with the remainder of that learning and
  // the rest of the list under it. Nothing is repeated and nothing is dropped.
  const coda = learnings.length > 0 ? splitLead(learnings[0]) : null;
  const codaRest = coda ? [coda.rest, ...learnings.slice(1)].filter(Boolean) : [];

  return (
    <div className="movements">
      <Movement n={0} title="Problem" id="problem" lead={problem.lead}>
        {problem.rest && <p className="movement-copy text-body">{problem.rest}</p>}
      </Movement>

      <Movement n={1} title="Approach" id="approach" lead={approach.lead}>
        {approach.rest && <p className="movement-copy text-body">{approach.rest}</p>}
      </Movement>

      <Movement n={2} title="How it works" id="built" lead={how.lead}>
        {how.rest && <p className="movement-copy text-body">{how.rest}</p>}
        <Schematic project={project} />
        {project.cover && (
          <figure className="plate-figure plate-mark">
            <Reveal>
              <DotMask ratio={`${project.cover.width} / ${project.cover.height}`}>
                <Image
                  src={project.cover.src}
                  alt={project.cover.alt}
                  width={project.cover.width}
                  height={project.cover.height}
                  sizes="(min-width: 64rem) 52rem, 100vw"
                />
              </DotMask>
            </Reveal>
          </figure>
        )}
      </Movement>

      <Movement n={3} title="Impact" id="impact" lead={impact.lead}>
        {impact.rest && <p className="movement-copy text-body">{impact.rest}</p>}
        {/* The argument returns to its number. */}
        <CloseFigure project={project} />
      </Movement>

      {coda && (
        <Movement n={4} title="What I’d do differently" id="learnings" lead={coda.lead}>
          {codaRest.map((item) => (
            <p key={item} className="movement-copy text-body">
              {item}
            </p>
          ))}
        </Movement>
      )}
    </div>
  );
}

/**
 * One movement: the running head in the margin (roman numeral over the title,
 * sticky at ≥ 64rem so the reader always knows where they are without a bar
 * across the top of the page), the standfirst, and the body.
 *
 * `data-section-index` / `data-section-title` are kept: the header's SectionSpy
 * reads them and writes "III HOW IT WORKS" into the chrome, which is the same
 * running head one storey up. That readout is the site's, on every route, and
 * it costs this page nothing.
 */
function Movement({
  n,
  title,
  id,
  lead,
  children,
}: {
  n: number;
  title: string;
  id: string;
  lead: string;
  children?: ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-section-index={ROMAN[n]}
      data-section-title={title}
      className="movement sheet-row shell"
    >
      <div className="movement-head">
        <span className="movement-numeral text-display-s" aria-hidden="true">
          {ROMAN[n]}
        </span>
        <h2 id={headingId} className="movement-title meta">
          {title}
        </h2>
      </div>

      <div>
        <p className="standfirst text-display-s">{lead}</p>
        {children}
      </div>
    </section>
  );
}

/**
 * "How it works", drawn.
 *
 * Every one of the eight projects carries exactly three `architecture` strings
 * and they are always the same three things: an input, a transformation, an
 * output. That is a figure, not a list, and it is derived from data the content
 * already has — which is what turns the most text-heavy page on the site into a
 * structural one without writing a word of new copy.
 *
 * The stages run down the page rather than across it because the three
 * sentences are 15 to 65 words each: three columns stretched to the tallest is
 * a figure made mostly of empty ground, and it collapses at 390px regardless.
 * The caption is `highlight`, which on seven of the eight projects already
 * names the three stages in order ("DFS agent, Set-of-Marks, Vertex AI RAG
 * corpus") — it was doing nothing on the old page but restating the stack.
 *
 * Any other number of stages degrades to an ordered list of hairlined rows.
 */
function Schematic({ project }: { project: Project }) {
  const stages = project.architecture;

  if (stages.length !== 3) {
    return (
      <ol className="stage-list">
        {stages.map((item, i) => (
          <li key={item}>
            <span className="meta text-ink-3" aria-hidden="true">
              {ordinal(i)}
            </span>
            <p className="m-0 text-body text-ink-2">{item}</p>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <figure className="schematic">
      <ol className="schematic-stages">
        {stages.map((item, i) => (
          <li key={item} className="stage">
            <p className="stage-index meta">{ordinal(i)}</p>
            <p className="stage-text text-small">{item}</p>
          </li>
        ))}
      </ol>
      <figcaption className="schematic-caption caption">{project.highlight}</figcaption>
    </figure>
  );
}

/**
 * The colophon: stack, links, and the NDA note where there is one, at the foot
 * of the plate where an imprint goes.
 *
 * This is what the sticky rail was. A rail that follows 198 words down a page
 * is empty for most of them, and it cost three headings, a column of the grid
 * and 20rem of every wide screen to say six words of stack. The stack is one
 * line of data here, and the links are links.
 */
export function ProjectColophon({ project }: { project: Project }) {
  return (
    <section className="colophon sheet-row shell" aria-labelledby="colophon-title">
      <h2 id="colophon-title" className="movement-title meta">
        Colophon
      </h2>

      <div>
        <p className="colophon-stack data">
          {project.stack.join("  ·  ")}
        </p>

        {project.links.length > 0 && (
          <ul className="colophon-links">
            {project.links.map((link) => (
              <li key={link.href}>
                <a
                  className="colophon-link tap text-small"
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
        )}

        {project.confidential && (
          <p className="colophon-note text-small">
            Built inside a company codebase, so there’s no public source to link. Happy to
            talk through the design.
          </p>
        )}
      </div>
    </section>
  );
}
