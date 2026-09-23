import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { experiences, projects, statusLabel } from "@/content";
import type { Experience, Project, ProjectStatus } from "@/content";

/* ═══════════════════════════════════════════════════════════════════════════
   The work constellation — the close of / ("Where the work went") and
   /about §02 ("Where I've worked"). One chart, drawn the same on both.

   A time × employer chart. x is the date, y is the employer lane; an
   employment interval is a band of ink dots at the page pitch (so is the
   span of a company he founded that is still running), a project is a
   marked point on the month it landed. Nothing here is a picture of data that
   the page does not also say in words: every mark is a link whose text names
   the project, its month, its lane, its role and its status, so with the
   stylesheet off the plate is a list of eight links. On /about the record
   (record.tsx) follows it and sets every lane out in full.

   The decisions worth stating, because they are the ones a reader would
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

   4. Nothing moves. The plate used to arrive by being PRINTED: a hard roller
      edge crossed it once, everything behind the edge already there. A
      visitor without JavaScript never saw it. Everything is present at first
      paint now; the CSS never clips and the finished plate is the first
      paint.

      There used to be four crosshairs just inside the plate mark's corners
      and a tick on each end of the TODAY rule: register marks, the first
      plate's and the second's. At the size they print they read as stray
      "+" glyphs in the corners, which is a bug to anyone who has not read
      this comment. The legend on the heading's line replaced them; it is
      the one thing a first-time reader of the plate actually lacked.

   5. A project is a milestone, and a milestone on a timeline is a diamond.
      The marks were squares, and the same squares in the legend and beside
      SHIPPED / ONGOING / RESEARCH on the work list read as checkboxes: a
      hollow square next to a word is a form control before it is anything
      else. A diamond is never a form control, and it is the shape a Gantt
      chart has always used for exactly this: an event on a span.
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

/** "2026-05-01" → "May 2026", the abbreviated form the mark's label uses. */
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
  // `null` means two different things: the job is open-ended, or the string
  // did not parse. Taken together they draw a typo as employment running to
  // the build date, with nothing anywhere saying so.
  if (!open && parsedEnd === null) {
    throw new Error(
      `constellation: could not parse the end of "${entry.dates}" for ` +
        `${entry.company}. Expected "Mon YYYY to Mon YYYY" or "... to Present".`,
    );
  }
  const end = parsedEnd === null ? NOW : addMonths(parsedEnd, 1);
  return { start, end: Math.max(end, start + DAY), open };
}

/** Half the width of the error bar, in days. `sortDate` is month-accurate. */
const HALF_MONTH = 15 * DAY;

/**
 * Two windows closer than this are one run of months. A window is 30 days,
 * so consecutive months leave a day's gap after a 31-day month and overlap
 * by a day or two after February.
 */
const JOIN_GAP = 2 * DAY;

/**
 * Which end caps of a mark's error bar meet a neighbour's in the same lane:
 * "low", "high", both, or none. The marks are in date order.
 */
function joinsOf(points: Point[], j: number): string | undefined {
  const point = points[j];
  const prev = points[j - 1];
  const next = points[j + 1];
  const joins = [
    prev && point.low - prev.high <= JOIN_GAP ? "low" : "",
    next && next.low - point.high <= JOIN_GAP ? "high" : "",
  ].filter(Boolean);
  return joins.length > 0 ? joins.join(" ") : undefined;
}

type Point = {
  slug: string;
  name: string;
  status: ProjectStatus;
  /** The middle of the project's month, and the ±15 day window around it. */
  centre: number;
  low: number;
  high: number;
  /** "Apr 2026", for the label the mark shows under the pointer. */
  shortWhen: string;
  /** “Checkpoint, April 2026, Checkpoint, Co-founder & CTO, Ongoing”. */
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

function splitName(name: string): { head: string; tail: string } {
  const space = name.indexOf(" ");
  return space === -1
    ? { head: name, tail: "" }
    : { head: name.slice(0, space), tail: name.slice(space + 1) };
}

/** Ascending, oldest first, so a lane's marks run with the time axis. */
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
      interval,
      sortKey: interval.start,
      points: [],
    });
  }

  for (const project of inDateOrder) {
    const employer = employerFor(project.org);
    const key = employer ? employer.company : (project.org ?? INDEPENDENT);
    let lane = byKey.get(key);

    if (!lane) {
      lane = {
        key,
        ...splitName(key),
        name: key,
        kind: key === INDEPENDENT ? "independent" : "venture",
        interval: null,
        sortKey: Number.NEGATIVE_INFINITY,
        points: [],
      };
      byKey.set(key, lane);
    }

    const start = monthStart(project.sortDate);
    const centre = start + HALF_MONTH;
    const when = monthLabel(project.sortDate);

    lane.points.push({
      slug: project.slug,
      name: project.name,
      status: project.status,
      centre,
      low: centre - HALF_MONTH,
      high: centre + HALF_MONTH,
      shortWhen: shortMonthLabel(project.sortDate),
      label: `${project.name}, ${when}, ${lane.name}, ${project.role}, ${statusLabel[project.status]}`,
    });

    if (lane.kind !== "employer") {
      lane.sortKey = Math.max(lane.sortKey, centre);
    }
  }

  /* A company he founded has no employment record to read a band from, so
     its lane used to carry its milestone and nothing else: Checkpoint, the
     company the hero says he is building, stopped as one diamond in February
     while Purdue, the other thing still running, ran on to TODAY. A venture
     whose work is ongoing is a span that is still running, and it is drawn
     the way the chart already draws one: the band, open at TODAY, from the
     month its first project landed. Both ends are read off data the lane
     already holds (a project's month, its status), so no date is made up
     here, and a venture whose work has all shipped keeps its diamonds only. */
  for (const lane of byKey.values()) {
    if (lane.kind !== "venture" || lane.interval) continue;
    if (!lane.points.some((p) => p.status === "ongoing")) continue;
    const start = Math.min(...lane.points.map((p) => p.low));
    lane.interval = { start, end: Math.max(NOW, start + DAY), open: true };
  }

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
   chart. End: six weeks past the latest thing on it, which is TODAY, so the
   rule sits just inside the plate's edge with room for its flag and nothing
   after it. It used to run to the next 1 January, which in September left a
   quarter of a year of empty lanes to the right of TODAY: a chart whose last
   eighth was a void, labelled with nothing. Both ends are derived, so the
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
const domainEnd = latest + 45 * DAY;
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

/**
 * The axis names each year in the MIDDLE of the stretch of it the plate
 * shows, the way a Gantt chart's timescale does, and the hairlines are the
 * boundaries between them. The labels used to sit on the left of each rule,
 * with the first on the plate's left edge: but that edge is a quarter, not a
 * 1 January, so "2024" named July while "2025" and "2026" named January, and
 * the three read as an axis with uneven steps. A year the plate shows less
 * than a quarter of (the six weeks past TODAY, in a December deploy) is too
 * narrow to name and is left to its rule.
 */
const YEAR = 365.25 * DAY;
const yearLabels: { year: number; at: string }[] = [];
for (
  let year = new Date(domainStart).getUTCFullYear();
  Date.UTC(year, 0, 1) < domainEnd;
  year += 1
) {
  const from = Math.max(Date.UTC(year, 0, 1), domainStart);
  const to = Math.min(Date.UTC(year + 1, 0, 1), domainEnd);
  if (to - from < YEAR / 4) continue;
  yearLabels.push({ year, at: at((from + to) / 2) });
}

const todayAt = at(NOW);

/**
 * Which way a mark's label hangs. Centred over the diamond, except near
 * either end of the plot, where a centred label would run past the plate's
 * edge: there it starts at the diamond and runs inward.
 */
function tipAlign(t: number): "start" | "end" | undefined {
  const x = (t - domainStart) / span;
  if (x < 0.15) return "start";
  if (x > 0.75) return "end";
  return undefined;
}

type ConstellationProps = {
  /**
   * The plate and its legend, and nothing else. There used to be a `record`
   * variant that followed the plate with a numbered key and the employment
   * record; /about sets the record itself now (record.tsx), so the chart is
   * the one rendering and this is kept only so the call sites read as what
   * they are.
   */
  variant?: "chart";
  /**
   * The section index in its page's own numbering. Only the SectionSpy's
   * hook; never rendered.
   */
  index?: string;
  title: string;
  /** The fragment id. /about keeps `experience`: /experience 308s to it. */
  id: string;
  /** Short label for the header readout when the title is a sentence. */
  readout?: string;
};

/**
 * The work constellation. The section head is written by hand rather than
 * taken from <Section> because the plate has to run the full column width,
 * where the Section body grammar reserves four columns for a rail, and
 * because the head carries the legend on its right.
 */
export function Constellation({
  index = "",
  title,
  id,
  readout,
}: ConstellationProps) {
  const headingId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-section-index={index}
      data-section-title={readout ?? title}
      /* On the page column like every other section, on / as on /about. The
         home chart used to drop `shell` and run to within --shell-pad of the
         trim, 60px wider than every rule and heading around it on each side,
         which broke the one alignment grid the page has. The plate mark is
         drawn OUTSIDE the plot, so the plot is inset by exactly that much
         (constellation.css) and the mark's outer edge lands on the column. */
      className="section section-y shell cn-section"
    >
      {/* The key sits on the heading's line, where a chart's legend goes: the
          shapes are read once, here, before the eye reaches the plate. It is
          the same three marks the work list above uses, so the page teaches
          them once and uses them twice. */}
      <div className="section-head section-head-split">
        <h2
          id={headingId}
          className="text-display-m font-medium text-balance text-ink"
        >
          {title}
        </h2>
        <ul className="cn-legend meta" aria-label="Key">
          <li>
            <span className="cn-legend-band" aria-hidden="true" />
            Employed
          </li>
          {(["shipped", "ongoing", "research"] as const).map((status) => (
            <li key={status}>
              <span
                className="cn-glyph"
                data-glyph={GLYPH[status]}
                aria-hidden="true"
              />
              {statusLabel[status]}
            </li>
          ))}
        </ul>
      </div>

      <figure className="cn">
        <div className="cn-frame">
          <div
            className="cn-plot plate-mark"
            style={{ "--lanes": lanes.length } as CSSProperties}
          >
            {/* The rules layer spans every lane and sits under the marks.
                TODAY is a flag on a pole: its label rides in the band above
                the lanes (on a phone, in the axis gutter beside the rule),
                so it never competes with the year labels on the axis. */}
            <div className="cn-grid" aria-hidden="true">
              {yearRules.map((rule) => (
                <span
                  key={rule.year}
                  className="cn-rule"
                  style={{ "--t": rule.at } as CSSProperties}
                />
              ))}
              {/* `data-sun` is the second plate: the rule and its label
                  register together, a beat after the black. */}
              <span
                className="cn-today"
                data-sun=""
                style={{ "--t": todayAt } as CSSProperties}
              />
              <span
                className="cn-today-label meta"
                data-sun=""
                style={{ "--t": todayAt } as CSSProperties}
              >
                Today
              </span>
            </div>

            {lanes.map((lane, i) => {
              /* `--row` counts from 2 at ≥ 48rem, where row 1 is the band
                 that carries the TODAY flag. */
              const place = {
                "--row": i + 2,
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
                    {lane.points.map((point, j) => (
                      <Link
                        key={point.slug}
                        className="cn-mark"
                        href={`/projects/${point.slug}`}
                        data-join={joinsOf(lane.points, j)}
                        data-tip={tipAlign(point.centre)}
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
                        {/* The name under the pointer. Eight diamonds are eight
                        links, and the lanes name employers, not projects: on
                        QualGent's lane nothing said which diamond was App
                        Crawler until you clicked it. Hidden from assistive
                        tech, because the sr-only label above already is the
                        link's name and says more. */}
                        <span className="cn-tip" aria-hidden="true">
                          <span className="cn-tip-name text-ink">
                            {point.name}
                          </span>{" "}
                          <span className="cn-tip-when data text-ink-3">
                            {point.shortWhen}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </Fragment>
              );
            })}

            <div className="cn-axis" aria-hidden="true">
              {yearLabels.map((label) => (
                <span
                  key={label.year}
                  className="cn-tick data"
                  style={{ "--t": label.at } as CSSProperties}
                >
                  {label.year}
                </span>
              ))}
            </div>
          </div>
        </div>
      </figure>
    </section>
  );
}
