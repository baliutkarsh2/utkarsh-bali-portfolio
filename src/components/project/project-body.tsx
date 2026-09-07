import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Project } from "@/content";
import { DotBoard } from "@/components/interactive/dot-board";
import { deviceOf } from "@/content/plates";
import { Reveal } from "@/components/interactive/reveal";
import { DotMask } from "@/components/ui/dot-mask";
import { CODA, MOVEMENTS, hasCoda } from "@/lib/corpus";
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
  const device = deviceOf(project.slug);

  const learnings = project.learnings ?? [];
  // The learnings are already written as "claim. elaboration.", so the coda
  // takes its standfirst the same way every other movement does: the first
  // sentence of the first learning, with the remainder of that learning and
  // the rest of the list under it. Nothing is repeated and nothing is dropped.
  //
  // `hasCoda` and the four titles come from src/lib/corpus.ts rather than being
  // written here, because the colophon's collation line counts the movements
  // this page renders. One statement, two consumers: a movement cannot be
  // removed from the page and go on being counted underneath it.
  const coda = hasCoda(project) ? splitLead(learnings[0]) : null;
  const codaRest = coda
    ? [coda.rest, ...learnings.slice(1)].filter(Boolean)
    : [];

  return (
    <div className="movements">
      <Movement n={0} title={MOVEMENTS[0]} id="problem" lead={problem.lead}>
        {problem.rest && (
          <p className="movement-copy text-body">{problem.rest}</p>
        )}
      </Movement>

      <Movement n={1} title={MOVEMENTS[1]} id="approach" lead={approach.lead}>
        {approach.rest && (
          <p className="movement-copy text-body">{approach.rest}</p>
        )}
      </Movement>

      <Movement n={2} title={MOVEMENTS[2]} id="built" lead={how.lead}>
        {how.rest && <p className="movement-copy text-body">{how.rest}</p>}
        {/* The project's own device, at full size, in the movement about the
            mechanism it draws. The contents page carries the same mark small,
            in its margin; this is where a reader who followed it from there
            meets it whole -- and it is the only picture a phone gets of it,
            since the contents page has no band to hold eight of them.

            It is a diagram of the thing, not a logo for it, and it is drawn at
            the page pitch out of the same marks as the portrait. The plan said
            a case study contains no field, on the grounds that a document does
            not contain its press. A printer's device is not the press: it is
            the mark that says whose press it was. */}
        {device && (
          <figure className="device-figure">
            <DotBoard
              mode="still"
              source={device.id}
              alt={device.alt}
              fallback={device.still}
              className="device-board"
            />
            <figcaption className="caption">{device.subject}</figcaption>
          </figure>
        )}
        <Schematic project={project} />
        {project.cover && (
          <figure className="plate-figure plate-mark">
            <Reveal>
              <DotMask
                ratio={`${project.cover.width} / ${project.cover.height}`}
              >
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

      <Movement n={3} title={MOVEMENTS[3]} id="impact" lead={impact.lead}>
        {impact.rest && (
          <p className="movement-copy text-body">{impact.rest}</p>
        )}
        {/* No reprise of the number here. It is already in the masthead, set
            large, and the standfirst two lines up says it again in a sentence
            -- so the page was making the same claim three times before the
            reader reached the bottom of it. Once, at the top, where it says
            what the project is for. */}
      </Movement>

      {coda && (
        <Movement n={4} title={CODA} id="learnings" lead={coda.lead}>
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
 * One section: the running head in the margin, sticky at >= 64rem so the
 * reader always knows where they are without a bar across the top of the
 * page, then the standfirst and the body.
 *
 * The head used to carry a roman numeral over the title -- I, II, III, IV, V
 * down a 200-word case study. It is gone. Five sections do not need numbering
 * to be followed, and setting them in roman said nothing about the work
 * except that the page would like to be taken for a book.
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
      data-section-index={String(n + 1)}
      data-section-title={title}
      className="movement sheet-row shell"
    >
      <div className="movement-head">
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
      <figcaption className="schematic-caption caption">
        {project.highlight}
      </figcaption>
    </figure>
  );
}

/**
 * The foot of a case study: what it was built with, the links, and the NDA
 * note where there is one.
 *
 * This is what the sticky rail was. A rail that follows 198 words down a page
 * is empty for most of them, and it cost three headings, a column of the grid
 * and 20rem of every wide screen to say six words of stack. The stack is one
 * line of data here, and the links are links.
 *
 * There was a second line under the stack: a rare-book collation formula,
 * "Plate II · V movements · 3 stages · 5 materials · 272 words · Pulled
 * 07.IX.2026", every term counted off the project's own record. It was
 * accurate and it told a reader nothing they had come for -- a word count of
 * the page they are already on, in roman, is the site admiring itself. Gone,
 * along with the heading over it, which said "Colophon" where it meant
 * "built with".
 */
export function ProjectColophon({ project }: { project: Project }) {
  return (
    <section
      className="colophon sheet-row shell"
      aria-labelledby="colophon-title"
    >
      <h2 id="colophon-title" className="movement-title meta">
        Built with
      </h2>

      <div>
        <p className="colophon-stack data">{project.stack.join("  ·  ")}</p>

        {project.links.length > 0 ? (
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
        ) : (
          <CancelledPlate />
        )}

        {project.confidential && (
          <p className="colophon-note text-small">
            Built inside a company codebase, so there’s no public source to
            link. Happy to talk through the design.
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * PLATE CANCELLED.
 *
 * Three of the eight projects carry no link at all, and until now that read as
 * a missing field: the row where every other case study has a "Source" or a
 * "Watch the demo" was simply not there, and absence is indistinguishable from
 * oversight.
 *
 * A printer closing an edition takes a burin to the copper and scores the plate
 * through, so that no further impressions can ever be pulled from it. The
 * cancelled plate is then kept and often printed *once more*, cancelled, as the
 * record that the edition is closed. That is exactly the right object here,
 * because the reason there is no screenshot is the same reason a cancelled plate
 * makes no prints: the work exists, the plate exists, and nothing more comes off
 * it. It says "closed", not "missing".
 *
 * The strokes are ruled at ±22.5°, which is not a picked angle: it is this
 * site's own screen angle (§5.3.3 — not 45°, which aligns with the pixel
 * diagonal and with every rule on the page). The cancellation is cut at the
 * angle the plate was screened at.
 *
 * Rendered on the *absence of a link*, never on the `confidential` flag: the
 * mark has to be a consequence of the record, so it can never appear as
 * decoration beside a working link. On the five projects that have one, this
 * function is not called at all.
 *
 * The caption is real DOM text in a real <figcaption> and is deliberately not
 * aria-hidden. "Under NDA" is a fact about the work and it stays crawlable,
 * announced, and selectable; the drawing above it is the only part that is
 * decorative, and it is the only part marked so.
 */
function CancelledPlate() {
  return (
    <figure className="cancel">
      {/* 168 × 104 with the strokes struck corner-to-edge through the centre.
          tan(22.5°) × 84 = 34.79, so a line through (84, 52) at 22.5° leaves
          the plate at y = 52 ± 34.79 on the left and right edges — the full
          width of the copper, which is how far a burin goes. */}
      <span className="cancel-well plate-mark">
        <svg
          className="cancel-plate"
          viewBox="0 0 168 104"
          width="168"
          height="104"
          aria-hidden="true"
          focusable="false"
        >
          <rect
            className="cancel-ground"
            x="0"
            y="0"
            width="168"
            height="104"
          />
          <path className="cancel-stroke" d="M0 17.21 L168 86.79" />
          <path className="cancel-stroke" d="M0 86.79 L168 17.21" />
        </svg>
      </span>

      <figcaption className="cancel-note">
        <span>Plate cancelled</span>
        <span>NDA</span>
        <span>No impressions</span>
      </figcaption>
    </figure>
  );
}
