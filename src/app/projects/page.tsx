import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Numeral } from "@/components/ui/numeral";
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
 * The printer's reference marks, in the order a compositor sets them: star,
 * dagger, double dagger, section, parallel, pilcrow — then the whole series
 * again doubled, which is how the tradition extends past six. Eight projects
 * take `*  †  ‡  §  ‖  ¶  **  ††`.
 *
 * Generated rather than listed so that a ninth project gets `‡‡` instead of
 * an empty mark, which is exactly the kind of silence a hardcoded array of
 * eight buys you the day the content changes. The figure column's mark slot
 * (plates.css) is two mono characters wide, so the series is safe out to
 * twelve; past that this page wants pagination more than it wants a mark.
 *
 * A mark and not a digit, because a superscript numeral beside a figure set
 * in lining figures does not read as a reference — the eye takes it for part
 * of the number. That is the whole reason the series exists in print.
 */
const MARK_SERIES = ["*", "†", "‡", "§", "‖", "¶"];
const markFor = (i: number) =>
  MARK_SERIES[i % MARK_SERIES.length].repeat(
    Math.floor(i / MARK_SERIES.length) + 1,
  );

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
 * Each figure carries a superscript reference mark instead of its label. The
 * labels are all together at the foot of the list, as a critical apparatus —
 * eight blocks of ragged 11px grey under eight numerals were the noisiest
 * thing on the quietest page on the site, and the skyline only reads as a
 * skyline if it is figures and nothing else. The marks are real anchors to
 * real note ids and every note links back, so the apparatus is navigable by
 * keyboard and works with scripting switched off, which is what a printed
 * apparatus has always done.
 *
 * Server component, no rail, nothing that animates: every project route and
 * every figure is in the HTML with JavaScript switched off.
 */
export default function ProjectsPage() {
  const count = orderedProjects.length;

  // The chronological axis. --t is 0 for the newest project and 1 for the
  // oldest; the CSS multiplies it by one indent step. Computed from the real
  // timestamps, so an unevenly spaced list stays unevenly spaced.
  const times = orderedProjects.map((p) =>
    Date.parse(`${p.sortDate}T00:00:00Z`),
  );
  const newest = Math.max(...times);
  const oldest = Math.min(...times);
  const span = newest - oldest || 1;

  const currentYear = new Date(newest).getUTCFullYear().toString();
  const firstYear = new Date(oldest).getUTCFullYear().toString();

  const years = orderedProjects.map((p) => p.sortDate.slice(0, 4));
  const rule = plateById.get("rule-quarters");

  return (
    <>
      <header className="shell pt-24 pb-10 md:pt-28 md:pb-14">
        <p className="meta text-ink-3">
          Contents · {count} projects · {firstYear}&ndash;{currentYear}
        </p>
        <h1 className="mt-6 text-display-l text-ink">The work.</h1>
        <p className="measure mt-6 text-lede text-ink-2">
          Five on agents, two in research, one with 3,000+ users. The column on
          the right is what each one proved. The margin on the left is when.
        </p>

        {/* The register strip the direction asked for in §6 and nobody built:
            a rule whose ink thickens where the work landed. Seven quarters,
            Q4 2024 to Q2 2026, counted off the real dates -- the plan claimed
            ten, and the data says seven, so the script reads the dates rather
            than the claim.

            It is a rule and not a chart. You read it the way you read a
            printed rule of graded weight: the eye takes the shape of the
            year, not seven numbers. The hole is Q1 2025, the one quarter in
            two years with nothing in it, and it is the loudest thing on the
            band precisely because it is the absence of a mark -- which is
            what a highlight is on this whole site. */}
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
        {/* The column heads name the two axes, so the figures column does not
            have to be guessed at. Decorative for a screen reader: every row
            already says its own year, and every figure's reference mark
            carries the label that says what it measures. */}
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

            const device = deviceOf(project.slug);

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
                /* The apparatus returns here, to the row, not to the mark.
                   Measured at 390: a phone row is 294px tall with the figure
                   at the bottom of it, so landing on the mark itself put the
                   project's own name 63px above the top of the screen — a
                   return that shows you the number and not what it belongs
                   to. The row lands whole at every width. `tabindex="-1"`
                   is what moves the reading cursor with the scroll rather
                   than only the viewport. */
                id={`fig-${project.slug}`}
                tabIndex={-1}
                className="toc-row"
                data-weight={lead ? "lead" : "plain"}
                data-reach={reach}
                style={
                  {
                    "--t": t.toFixed(4),
                    // The figure's view-transition name, inherited down to
                    // .toc-fig .numeral (plates.css). Written as a custom
                    // property rather than as a style on <Numeral> because
                    // <Numeral> is shared by six routes and takes no style
                    // prop; a custom ident substitutes into
                    // `view-transition-name` exactly like any other value,
                    // and if it is ever missing the property falls back to
                    // its initial `none` rather than erroring.
                    "--vt-fig": `metric-${project.slug}`,
                  } as CSSProperties
                }
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
                    <p className="toc-standfirst text-lede">
                      {project.tagline}
                    </p>
                  )}

                  <p className="toc-meta meta">{meta}</p>
                </div>

                {/* The project's own device: a small engraved diagram of the
                    mechanism that project actually is, in the band between
                    the reading column and the figures. The column was 360px
                    of bare paper down all eight rows, and this is what it is
                    for -- a printer's device is exactly the mark that belongs
                    in a contents page's margin, and each one here is a
                    picture of the thing rather than a logo for it.

                    Hidden below 64rem: there is no band there to put it in,
                    and eight 180px plates would add 1,440px to a phone page
                    that is already long. The same device appears full size on
                    the case study, which is where a phone reader meets it. */}
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

                {/* The figure and its reference mark, on one line and in that
                    order, so the mark reads as belonging to the number. The
                    mark's own accessible name carries the label, because a
                    figure read aloud as "0.844" and nothing else has lost the
                    only thing that made it worth setting. */}
                <div className="toc-fig">
                  <Numeral value={project.metric} size="m" />
                  <a className="toc-mark" href={`#note-${project.slug}`}>
                    <span aria-hidden="true">{markFor(i)}</span>
                    <span className="sr-only">
                      Note {i + 1}: {project.metricLabel}
                    </span>
                  </a>
                </div>
              </li>
            );
          })}
        </ol>

        {/* ── The apparatus ────────────────────────────────────────────────
            Eight notes under a short rule at the foot of the list, in the
            order of the list, each opening with the mark that points at it
            and with its own figure as the lemma. The lemma is what makes a
            note that someone lands on cold — from a link, or scrolled to on a
            phone where the figure it belongs to is three screens up — still
            say what it is about. It is also exactly the form a critical
            apparatus has had for four hundred years: mark, lemma, reading. */}
        <section className="toc-apparatus" aria-labelledby="figure-notes">
          <h2 id="figure-notes" className="toc-apparatus-head meta">
            What the figures measure
          </h2>

          <ol className="toc-notes">
            {orderedProjects.map((project, i) => (
              <li
                key={project.slug}
                id={`note-${project.slug}`}
                tabIndex={-1}
                className="toc-note"
              >
                <a className="toc-note-back" href={`#fig-${project.slug}`}>
                  <span className="toc-note-mark" aria-hidden="true">
                    {markFor(i)}
                  </span>
                  <span className="toc-note-lemma data">{project.metric}</span>
                  {/* The trailing space is load-bearing: the lemma's fixed
                      width is what sets the gap to the label, so there is no
                      text node between the two for a screen reader to break
                      on. Without it the note is read as one run-on word. */}
                  <span className="sr-only">{", back to the figure. "}</span>
                </a>
                <span className="toc-note-text">{project.metricLabel}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
