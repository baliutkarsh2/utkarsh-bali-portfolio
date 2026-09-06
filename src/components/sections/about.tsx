import { DotBoard } from "@/components/interactive/dot-board";
import { SpecList } from "@/components/ui/spec-list";
import { aboutNote, profile } from "@/content";
import { portrait } from "@/content/portrait";

/**
 * The first section of /about (§7.2). The Section primitive renders an h2,
 * and a page has one h1, so this section writes its own head in the same
 * grammar (hairline, meta index, the title) with the h1 in display-l, and
 * carries the same data attributes the header's SectionSpy reads.
 *
 * Copy on 7 of 12 columns: the lead in display-s, the body in lede --ink-2.
 * Rail on 4 from column 9: the board in `still` mode (the tighter face crop,
 * 64 × 80, the second angle; drawn settled on mount, the pointer is a light
 * only) with its readout, then the spec list. The rail is taller than the
 * copy here, so it is not sticky: there is nothing for it to stick past.
 *
 * Below 64rem the copy wrapper dissolves (`display: contents` on a plain div
 * in components.css) and the board is ordered straight after the lead at its
 * own 320 px, with the body and the spec list following. The DOM order is
 * the reading order at every width: lead, board, body, facts.
 */
export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      data-section-index="01"
      data-section-title="About"
      className="section section-first shell"
    >
      <div className="section-head">
        <span className="meta text-ink-3" aria-hidden="true">
          01
        </span>
        <h1
          id="about-title"
          className="text-display-l font-medium text-balance text-ink"
        >
          Always building.
        </h1>
      </div>

      <div className="about-body">
        <div className="about-copy">
          {/* Prose in a display size: `pretty` wrapping, not the `balance`
              the display tokens carry, since this runs to five lines. */}
          <p className="about-lead measure text-display-s font-medium text-pretty text-ink">
            {aboutNote.lead}
          </p>
          <p className="about-prose measure text-lede text-ink-2 lg:mt-6">
            {aboutNote.body}
          </p>
        </div>

        <DotBoard
          mode="still"
          source="about"
          alt={portrait.alt}
          caption
          restLabel="64 × 80 · second angle"
          fallback={portrait.fallback.about}
          className="about-board"
        />

        <SpecList
          className="about-specs"
          rows={[
            { term: "Education", value: profile.educationDetail },
            { term: "Graduating", value: profile.graduation },
            { term: "GPA", value: profile.gpa },
            { term: "Based in", value: profile.location },
          ]}
        />
      </div>
    </section>
  );
}
