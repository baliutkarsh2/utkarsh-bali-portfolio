import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { experiences, projects, statusLabel } from "@/content";
import { Reveal } from "@/components/interactive/reveal";
import { cn } from "@/lib/utils";
import type { Experience, Project, ProjectStatus } from "@/content";

/* ═══════════════════════════════════════════════════════════════════════════
   The work constellation — /about §02, "Where I've worked".

   A time × employer chart. x is the date, y is the employer lane; an
   employment interval is a band of ink dots at the page pitch, a project is a
   marked point on the month it landed. Nothing here is a picture of data that
   the page does not also say in words: the plate is followed by a numbered
   <ol> of the same eight projects in date order, which is the key to the
   markers and the whole content of the section with the stylesheet off.

   Three decisions worth stating, because they are the ones a reader would
   otherwise have to reverse-engineer:

   1. Real DOM, not SVG. Every mark is an absolutely positioned element whose
      position is a percentage carried in a custom property (`--t0`/`--t1` for
      an interval, `--t` for a rule). Below 48rem constellation.css maps those
      same properties onto the block axis instead of the inline one and the
      chart transposes: time runs down the page, the lanes become columns. One
      set of nodes, one set of links, two layouts — which an <svg> could not do
      without shipping the markers twice.

   2. Month precision is drawn as month precision. `sortDate` is YYYY-MM-01,
      so a marker is placed at the MIDDLE of its month and carries a ±15 day
      error bar that spans the month. Putting the marker on the 1st would be a
      day-precision claim the data cannot support.

   3. Colour carries nothing. Lanes are told apart by position and label,
      project status by the shape of its mark (filled shipped, half-filled
      ongoing, open research). The single vermilion element on this screen is
      the TODAY rule, which is the one --sun licence this chart holds.

   4. The one thing that moves is a thing a PRESS does. The plate arrives by
      being PRINTED: a hard roller edge crosses it once, at about 1500 CSS
      px/s, and everything behind that edge is already there. It is a single
      `clip-path` keyframe in constellation.css, fired by <Reveal> — which
      lands `data-in` once and unobserves, so the sequence is bounded and
      self-terminating without this component owning a clock. Not one word is
      inside the clip that is not also outside it: the section head and the
      caption sit outside the plate entirely, so nothing that reads as type
      is ever animated. Without JavaScript, or under either motion switch,
      the CSS never clips at all and the finished plate is the first paint.

      The four crosshairs inside the plate mark's corners and the ticks on
      the ends of the TODAY rule are register marks — the first plate's and
      the second plate's. `data-sun` on the vermilion pair is where the
      second plate is told it may arrive a beat after the black one.
   ═══════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_INDEX = new Map(
  MONTHS.map((name, i) => [name.slice(0, 3).toLowerCase(), i]),
);

/**
 * Build-time "now". /about is statically rendered, so the TODAY rule is the
 * date of the deploy rather than the date of the visit. That is the honest
 * trade for a page that costs nothing to serve; the rule is a boundary
 * between what has happened and what has not, and it moves on every push.
 */
const NOW = Date.now();

/** "2026-05-01" → "May 2026" in the abbreviated form `experience.dates` uses. */
function shortMonthLabel(iso: string): string {
  const d = new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`));
  return `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/** "2026-05-01" → the UTC epoch of the first of that month. */
function monthStart(iso: string): number {
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

/** "2026-05-01" → "May 2026". The precision the data actually has. */
function monthLabel(iso: string): string {
  const d = new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Aug 2024" → the UTC epoch of 2024-08-01, or null if it is not a month. */
function parseHumanMonth(text: string): number | null {
  const match = /^\s*([A-Za-z]{3,9})\.?\s+(\d{4})\s*$/.exec(text);
  if (!match) return null;
  const month = MONTH_INDEX.get(match[1].slice(0, 3).toLowerCase());
  if (month === undefined) return null;
  return Date.UTC(Number(match[2]), month, 1);
}

function addMonths(t: number, n: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1);
}

type Interval = { start: number; end: number; open: boolean };

/**
 * The employment interval, read off the human `dates` string rather than
 * `sortDate`, because `sortDate` is one instant and a job is a span. The end
 * is exclusive — "Sep 2025 to Dec 2025" runs through the last day of December
 * — and "to Present" runs to the build date.
 */
function employmentInterval(entry: Experience): Interval {
  const [rawStart, rawEnd = ""] = entry.dates.split(/\s+to\s+/i);
  const start = parseHumanMonth(rawStart) ?? monthStart(entry.sortDate);
  const open = /present|current|now/i.test(rawEnd);
  const parsedEnd = open ? null : parseHumanMonth(rawEnd);
  const end = parsedEnd === null ? NOW : addMonths(parsedEnd, 1);
  return { start, end: Math.max(end, start + DAY), open };
}

/** Half the width of the error bar, in days. `sortDate` is month-accurate. */
const HALF_MONTH = 15 * DAY;

type Point = {
  n: number;
  slug: string;
  name: string;
  status: ProjectStatus;
  /** The middle of the project's month, and the ±15 day window around it. */
  centre: number;
  low: number;
  high: number;
  when: string;
  /** "Oct 2024", for the work dateline of a lane with no employment record. */
  shortWhen: string;
  role: string;
  tagline: string;
  /** “Checkpoint, February 2026, Checkpoint, Co-founder & CTO, Ongoing”. */
  label: string;
};

type LaneKind = "employer" | "venture" | "independent";

type Lane = {
  key: string;
  /** The first word, which is all a 51 px phone column can carry. */
  head: string;
  /** Everything after it. Hidden below 48rem, never duplicated. */
  tail: string;
  name: string;
  kind: LaneKind;
  role: string;
  /** The employment dateline, verbatim from the record. "" where there is none. */
  dates: string;
  location: string;
  /** The standfirst and the bullets, verbatim. Never summarised, never cut. */
  summary: string;
  bullets: string[];
  /**
   * Why a lane has no employment dateline. A lane that is a company he founded,
   * or a category rather than a place, is not missing data — it is a different
   * kind of row, and it says so in its own first line.
   */
  note: string;
  interval: Interval | null;
  sortKey: number;
  points: Point[];
};

const INDEPENDENT = "Independent";

/** Marker shape by status. Colour is not available, so the shape is the fact. */
const GLYPH: Record<ProjectStatus, "filled" | "half" | "open"> = {
  shipped: "filled",
  ongoing: "half",
  research: "open",
  archived: "open",
};

/**
 * A project's org string is not always an employer's company string
 * ("QualGent (YC X25)" against "QualGent"), and one of them is a company he
 * founded rather than one that employed him ("Checkpoint"). Prefix match, so
 * the parenthetical does not need a lookup table.
 */
function employerFor(org: string | undefined): Experience | undefined {
  if (!org) return undefined;
  return experiences.find(
    (e) => org === e.company || org.startsWith(`${e.company} `),
  );
}

/** "Purdue University" → "purdue-university", for the record's heading ids. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitName(name: string): { head: string; tail: string } {
  const space = name.indexOf(" ");
  return space === -1
    ? { head: name, tail: "" }
    : { head: name.slice(0, space), tail: name.slice(space + 1) };
}

/** Ascending, oldest first, so the numbering runs with the time axis. */
const inDateOrder: Project[] = [...projects].sort(
  (a, b) =>
    a.sortDate.localeCompare(b.sortDate) || a.name.localeCompare(b.name),
);

const lanes: Lane[] = (() => {
  const byKey = new Map<string, Lane>();

  for (const entry of experiences) {
    const interval = employmentInterval(entry);
    byKey.set(entry.company, {
      key: entry.company,
      ...splitName(entry.company),
      name: entry.company,
      kind: "employer",
      role: entry.role,
      dates: entry.dates,
      location: entry.location,
      summary: entry.summary,
      bullets: entry.bullets,
      note: "",
      interval,
      sortKey: interval.start,
      points: [],
    });
  }

  inDateOrder.forEach((project, i) => {
    const employer = employerFor(project.org);
    const key = employer ? employer.company : (project.org ?? INDEPENDENT);
    let lane = byKey.get(key);

    if (!lane) {
      lane = {
        key,
        ...splitName(key),
        name: key,
        kind: key === INDEPENDENT ? "independent" : "venture",
        role: "",
        dates: "",
        location: "",
        summary: "",
        bullets: [],
        note:
          key === INDEPENDENT
            ? "No employer, so no record to keep. These are the ones I owned end to end."
            : "Mine rather than an employer’s, so there is no employment record to keep here.",
        interval: null,
        sortKey: Number.NEGATIVE_INFINITY,
        points: [],
      };
      byKey.set(key, lane);
    }

    const start = monthStart(project.sortDate);
    const centre = start + HALF_MONTH;
    const when = monthLabel(project.sortDate);
    const laneName = lane.name;

    lane.points.push({
      n: i + 1,
      slug: project.slug,
      name: project.name,
      status: project.status,
      centre,
      low: centre - HALF_MONTH,
      high: centre + HALF_MONTH,
      when,
      shortWhen: shortMonthLabel(project.sortDate),
      role: project.role,
      tagline: project.tagline,
      label: `${project.name}, ${when}, ${laneName}, ${project.role}, ${statusLabel[project.status]}`,
    });

    if (lane.kind !== "employer") {
      lane.sortKey = Math.max(lane.sortKey, centre);
      // A lane with no employment record borrows its role from the work that
      // sits in it, de-duplicated: "Independent build · Solo product build".
      const roles = lane.points
        .map((p) => p.role)
        .filter((r, j, all) => all.indexOf(r) === j);
      lane.role = roles.join(" · ");
    }
  });

  return [...byKey.values()].sort((a, b) => {
    // The residual lane is always last: it is a category, not a place.
    if ((a.kind === "independent") !== (b.kind === "independent")) {
      return a.kind === "independent" ? 1 : -1;
    }
    return b.sortKey - a.sortKey;
  });
})();

/* ── The domain ───────────────────────────────────────────────────────────
   Start: the first day of the quarter holding the earliest thing on the
   chart. End: the first day of the year after the latest, so TODAY is a rule
   inside the plate rather than a line on its edge. Both derived, so the
   chart re-scales itself when the content moves. ──────────────────────── */
const earliest = Math.min(
  ...lanes.flatMap((lane) => [
    ...(lane.interval ? [lane.interval.start] : []),
    ...lane.points.map((p) => p.low),
  ]),
);
const latest = Math.max(
  NOW,
  ...lanes.flatMap((lane) => [
    ...(lane.interval ? [lane.interval.end] : []),
    ...lane.points.map((p) => p.high),
  ]),
);

const domainStart = (() => {
  const d = new Date(earliest);
  return Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1);
})();
const domainEnd = Date.UTC(new Date(latest).getUTCFullYear() + 1, 0, 1);
const span = domainEnd - domainStart;

/** An instant as a percentage across the domain, ready for a custom property. */
function at(t: number): string {
  const clamped = Math.min(Math.max(t, domainStart), domainEnd);
  return `${(((clamped - domainStart) / span) * 100).toFixed(3)}%`;
}

/** Year hairlines: every 1 January strictly inside the domain. */
const yearRules: { year: number; at: string }[] = [];
for (
  let year = new Date(domainStart).getUTCFullYear() + 1;
  Date.UTC(year, 0, 1) < domainEnd;
  year += 1
) {
  yearRules.push({ year, at: at(Date.UTC(year, 0, 1)) });
}

const firstYear = new Date(domainStart).getUTCFullYear();
const todayAt = at(NOW);

/** Spelled out: these are counts inside a sentence, not figures on a plate. */
const WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const word = (n: number) => WORDS[n] ?? String(n);
const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The margin dateline. An employer prints its employment record verbatim; a
 * lane that has none prints the span of the work that sits in it instead, and
 * says so — "Work dated Feb 2026" is a different claim from an employment
 * interval, and the plate draws no band for it either.
 */
function dateline(lane: Lane): string {
  if (lane.dates) return lane.dates;
  const months = lane.points.map((p) => p.shortWhen);
  if (months.length === 0) return "";
  const span =
    months.length === 1
      ? months[0]
      : `${months[0]} to ${months[months.length - 1]}`;
  return `Work dated ${span}`;
}

const employerLanes = lanes.filter((l) => l.kind === "employer");
const ventureLanes = lanes.filter((l) => l.kind === "venture");
const independentLane = lanes.find((l) => l.kind === "independent");

type ConstellationProps = {
  /**
   * `record` (/about §02) — the plate, its caption, the numbered key, and the
   * record: six lanes with their roles, datelines and every bullet verbatim.
   *
   * `chart` (/ §02) — the plate and its caption, full-bleed, and nothing else.
   * The key and the record are what you read AFTER the ten-second scan, and
   * they live on /about; on the home page the chart IS the scan, and the last
   * thing before the close. Two views of one dataset, not one section twice.
   */
  variant?: "record" | "chart";
  /** The section index in its page's own numbering. */
  index: string;
  title: string;
  /** The fragment id. /about keeps `experience`: /experience 308s to it. */
  id: string;
  /** Short label for the header readout when the title is a sentence. */
  readout?: string;
};

/**
 * The work constellation. The section head is written by hand rather than
 * taken from <Section> because the plate has to run the full column width (and
 * on the home page, wider than it) where the Section body grammar reserves
 * four columns for a rail.
 */
export function Constellation({
  variant = "record",
  index,
  title,
  id,
  readout,
}: ConstellationProps) {
  const bleed = variant === "chart";
  const headingId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-section-index={index}
      data-section-title={readout ?? title}
      /* Full-bleed is the absence of `shell`, never a viewport width: `100vw`
         includes the scrollbar and would overflow the page by its width. The
         head and the caption carry their own `shell` instead, so the section
         rule and the caption's left edge land exactly where every other
         section's do — a rule painted on `.shell` itself would span its
         PADDING box and run 2 × --shell-pad wider than all of them. */
      className={cn("section section-y", bleed ? "cn-bleed-section" : "shell")}
    >
      <div className={bleed ? "shell" : undefined}>
        <div className="section-head">
          <span className="meta text-ink-3" aria-hidden="true">
            {index}
          </span>
          <h2
            id={headingId}
            className="text-display-m font-medium text-balance text-ink"
          >
            {title}
          </h2>
        </div>
      </div>

      <figure className={cn("cn", bleed && "cn-full")}>
        <div className="cn-frame">
          {/* The bed under the roller. <Reveal> lands `data-in` here once, and
            the pull is one keyframe on the plate inside it — see "THE PULL"
            in constellation.css. The wrapper is a plain block, so it changes
            no box: the plate's own top margin collapses through it exactly as
            it collapsed through .cn-frame before. */}
          <Reveal className="cn-sheet">
            <div
              className="cn-plot plate-mark"
              style={{ "--lanes": lanes.length } as CSSProperties}
            >
              {/* The rules layer spans every lane and sits under the marks. */}
              <div className="cn-grid" aria-hidden="true">
                {yearRules.map((rule) => (
                  <span
                    key={rule.year}
                    className="cn-rule"
                    style={{ "--t": rule.at } as CSSProperties}
                  />
                ))}
                {/* `data-sun` is the second plate. The rule and its two end ticks
                are one element, so the ticks register with it. */}
                <span
                  className="cn-today"
                  data-sun=""
                  style={{ "--t": todayAt } as CSSProperties}
                />
              </div>

              {/* The first plate's register marks: four crosshairs just inside
              the corners of the plate mark, where a printer lays them so a
              second plate can be squared onto the first. Absolutely
              positioned, so the grid never counts them as a cell. */}
              <div className="cn-register" aria-hidden="true">
                <span className="cn-reg" data-corner="tl" />
                <span className="cn-reg" data-corner="tr" />
                <span className="cn-reg" data-corner="bl" />
                <span className="cn-reg" data-corner="br" />
              </div>

              {lanes.map((lane, i) => {
                const place = {
                  "--row": i + 1,
                  "--col": i + 2,
                } as CSSProperties;
                return (
                  <Fragment key={lane.key}>
                    <div className="cn-lane-label" style={place}>
                      <span className="cn-lane-name text-small font-medium text-ink">
                        {lane.head}
                        {lane.tail && (
                          <span className="cn-lane-tail"> {lane.tail}</span>
                        )}
                      </span>
                    </div>

                    <div
                      className="cn-lane"
                      data-bar={lane.interval ? "" : undefined}
                      style={
                        {
                          ...place,
                          ...(lane.interval
                            ? {
                                "--b0": at(lane.interval.start),
                                "--b1": at(lane.interval.end),
                              }
                            : {}),
                        } as CSSProperties
                      }
                    >
                      {lane.points.map((point) => (
                        <Link
                          key={point.slug}
                          className="cn-mark"
                          href={`/projects/${point.slug}`}
                          style={
                            {
                              "--t0": at(point.low),
                              "--t1": at(point.high),
                            } as CSSProperties
                          }
                        >
                          {/* Text, not an aria-label. The accessible name is the
                          same string either way, but real text is also the
                          anchor text a crawler reads and the name a find-on-
                          page hits — and on / the plate stands alone, so a
                          mark whose name lived only in an attribute would be
                          eight links to eight untitled pages. */}
                          <span className="sr-only">{point.label}</span>
                          <span className="cn-err" aria-hidden="true" />
                          <span
                            className="cn-glyph"
                            data-glyph={GLYPH[point.status]}
                            aria-hidden="true"
                          />
                          <span className="cn-num meta" aria-hidden="true">
                            {point.n}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </Fragment>
                );
              })}

              <div className="cn-axis" aria-hidden="true">
                <span
                  className="cn-tick data"
                  style={{ "--t": "0%" } as CSSProperties}
                >
                  {firstYear}
                </span>
                {yearRules.map((rule) => (
                  <span
                    key={rule.year}
                    className="cn-tick data"
                    style={{ "--t": rule.at } as CSSProperties}
                  >
                    {rule.year}
                  </span>
                ))}
                <span
                  className="cn-today-label meta"
                  style={{ "--t": todayAt } as CSSProperties}
                >
                  Today
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* The caption carries its own `shell` when the plate is bled, so it
            lines up with the section title above it rather than with the
            plate's edge. Same words either way; only the last sentence knows
            which page it is on, because on / there is no key below to point
            at and the marks are the only way in. */}
        <figcaption className={cn("cn-caption", bleed && "shell")}>
          <span className="caption measure block text-ink-2">
            {sentenceCase(word(inDateOrder.length))} projects on the month each
            one landed, against {word(lanes.length)} lanes:{" "}
            {word(employerLanes.length)} employers with a dated record;{" "}
            {ventureLanes.map((l) => l.name).join(", ")}, my own company, which
            employed nobody and so carries no band; and the{" "}
            {word(independentLane?.points.length ?? 0)} builds that answered to
            nobody, which sit in the Independent lane. A band of ink dots is a
            job; a mark is a project. Dates are accurate to the month and no
            further, so every mark sits at the middle of its month under a ±15
            day bar. Filled is shipped, half-filled is ongoing, open is
            research. The vermilion rule is today.{" "}
            {bleed
              ? "Every mark is a link to what it was."
              : "The numbered list below is the key."}
          </span>
        </figcaption>
      </figure>

      {variant === "record" && (
        <>
          <h3 className="cn-sub caption text-ink-3">
            The {word(inDateOrder.length)} projects, in date order
          </h3>
          <ol className="cn-index">
            {inDateOrder.map((project, i) => {
              const lane = lanes.find((l) =>
                l.points.some((p) => p.slug === project.slug),
              );
              return (
                <li key={project.slug}>
                  <Link
                    className="cn-index-link"
                    href={`/projects/${project.slug}`}
                  >
                    <span className="cn-index-gutter" aria-hidden="true">
                      <span className="cn-index-n meta">{i + 1}</span>
                      <span
                        className="cn-glyph"
                        data-glyph={GLYPH[project.status]}
                      />
                    </span>
                    <span className="cn-index-name text-body font-medium text-ink">
                      {project.name}
                    </span>
                    <span className="cn-index-meta data text-ink-3">
                      {monthLabel(project.sortDate)} ·{" "}
                      {lane?.name ?? INDEPENDENT} ·{" "}
                      {statusLabel[project.status]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          {/* The record. The plate is the ten-second scan; this is what you read
          after it. Laid on the plan's margin grammar (§5.5): the employer,
          the role and the dateline hang in a margin column the width of the
          chart's own lane-label gutter, which leaves the measure clear for the
          prose. Below 64rem the margin folds into a head row above the type,
          which is what a margin does on a narrow page.

          Every summary and every bullet is `experience.ts` verbatim. They are
          long and specific and that is the point: the Microsoft lane is
          fourteen months of employment band with no marker on it, and the
          LLaMA-4 pipeline, the Databricks workflows and the 25% compute saving
          exist nowhere else on this site. Same for two of the three Recurly
          items and the Spring Research Conference line. Nothing here is
          summarised, truncated or rewritten. */}
          <h3 className="cn-sub caption text-ink-3">
            The record, lane by lane
          </h3>
          <ol className="cn-record">
            {lanes.map((lane) => {
              const headingId = `lane-${slugify(lane.key)}`;
              return (
                <li key={lane.key}>
                  <article
                    className="cn-record-entry"
                    aria-labelledby={headingId}
                  >
                    <div className="cn-record-margin">
                      <h4
                        id={headingId}
                        className="cn-record-name text-small font-medium text-ink"
                      >
                        {lane.name}
                      </h4>
                      {lane.role && (
                        <p className="cn-record-role text-small text-ink-2">
                          {lane.role}
                        </p>
                      )}
                      {dateline(lane) && (
                        <p className="cn-record-when data text-ink-3">
                          {dateline(lane)}
                        </p>
                      )}
                      {lane.location && (
                        <p className="cn-record-where data text-ink-3">
                          {lane.location}
                        </p>
                      )}
                    </div>

                    <div className="cn-record-body">
                      {/* The standfirst. An employer's is its own summary; a lane
                      with no employment record says so here, in the same slot,
                      so the entry never renders as a gap. */}
                      <p className="cn-record-lede text-lede text-ink">
                        {lane.summary || lane.note}
                      </p>

                      {lane.bullets.length > 0 && (
                        <ul className="cn-record-list dot-list text-body text-ink-2">
                          {lane.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      )}

                      {/* No employment record means no bullets to print, so the
                      lane prints the work that put it on the chart instead:
                      each project and its own one line, from projects.ts. The
                      numbered key above already links every one of them, so
                      these are text and not a third link to the same page. */}
                      {lane.bullets.length === 0 && lane.points.length > 0 && (
                        <ul className="cn-record-list dot-list text-body text-ink-2">
                          {lane.points.map((point) => (
                            <li key={point.slug}>
                              <b className="font-medium text-ink">
                                {point.name}
                              </b>{" "}
                              {point.tagline}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
