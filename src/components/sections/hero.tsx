import Link from "next/link";
import type { CSSProperties } from "react";
import { DotBoard } from "@/components/interactive/dot-board";
import { Button } from "@/components/ui/button";
import { Led } from "@/components/ui/led";
import { now, profile } from "@/content";
import { portrait, portraitField96 } from "@/content/portrait";

/** The name breaks after its first word: "Utkarsh" / "Bali" (§3). */
const [firstName, ...restOfName] = profile.name.split(" ");
const surname = restOfName.join(" ");

/**
 * The one link inside the lede carries its dotted rule at rest, as links in
 * prose do: colour alone would not mark it (--ink on --ink-2 is 2.1:1), and
 * the `dot-underline` utility only rests inside `.prose`. An inline custom
 * property is the sanctioned way to set it (addendum §C).
 */
const LINK_AT_REST = { "--u-rest": "100%" } as CSSProperties;

/**
 * The first screen (§7.1). Everything here is in the HTML on frame one and
 * nothing in it moves: the name is the LCP element on every viewport, plain
 * text in Geist 500, and the only things that animate are dots — the mission
 * line's hairline drawing in and the portrait assembling on the board.
 *
 * The status LED is the one --sun element of this screen (the portrait's rim
 * and datum are the light source, not UI, and do not count).
 *
 * Layout lives in `.hero` (components.css): one column in this DOM order on
 * phones and tablets; from 80rem a two-column grid where the h1 spans both
 * columns and passes over the board's empty top-left cells. Server component;
 * the board and the reveal are the only client islands.
 */
export function Hero() {
  return (
    <section id="home" aria-labelledby="hero-title" className="hero shell">
      <div className="hero-intro board-above flex flex-col items-start gap-4">
        {/* The mission line used to sit above this: seven dots at the page
            pitch and a drawing hairline, captioned "Connecting the dots...".
            Its referent was the CSS lattice, and the lattice is gone -- a joke
            whose setup has been deleted. Two stacked eyebrows over a display
            heading was also the genre's own device, twice. The component and
            the footer's use of it both stay. */}
        {/* A plate caption, not a machine eyebrow. Mono uppercase tracked
            small caps over a display heading is the single most-used device in
            this genre; the printed equivalent is an italic line under the
            impression, and the register mark carries the state. */}
        <p className="hero-status caption flex flex-wrap items-center gap-x-3 gap-y-2 text-ink-3">
          <span className="flex items-center gap-2 text-ink-2">
            <Led state="live" label="Currently" />
            {now.status}
          </span>
          <span aria-hidden="true">·</span>
          <span>{profile.location}</span>
        </p>
      </div>

      {/* Two block spans rather than a <br>: the whitespace text node between
          them keeps textContent "Utkarsh Bali" for assistive tech and crawlers
          while the blocks break the line. */}
      <h1 id="hero-title" className="hero-name board-above text-display-xl text-ink">
        <span className="block">{firstName}</span>{" "}
        {surname && <span className="block">{surname}</span>}
      </h1>

      {/* Column 2 from 80rem, directly under the name below that. The figure
          box is the layout anchor; the canvas is fixed behind the page. The
          board loads its field on the client (its own cached chunk); only
          the count crosses the boundary, for the caption's first frame. */}
      <DotBoard
        mode="hero"
        source="hero"
        alt={portrait.alt}
        caption
        count={portraitField96.count}
        fallback={portrait.fallback.hero}
        mobileFallback={portrait.fallback.phone}
        className="hero-board"
      />

      <div className="hero-copy board-above">
        <p className="max-w-[34ch] text-display-s text-ink">{profile.tagline}</p>

        <p className="mt-5 max-w-[34ch] text-lede text-ink-2">
          Recurly, summer 2026. Before that, agent infrastructure at{" "}
          <span className="text-ink">QualGent</span> (YC X25). Co-founder and CTO of{" "}
          <Link
            href="/projects/checkpoint"
            className="dot-underline text-ink"
            style={LINK_AT_REST}
          >
            Checkpoint
          </Link>
          . Purdue CS + AI, done in December.
        </p>

        <div className="hero-actions mt-8 flex flex-wrap items-center gap-3">
          <Button variant="primary" href="#work" className="max-md:w-full">
            View work
          </Button>
          <Button variant="secondary" href={`mailto:${profile.email}`}>
            Get in touch
          </Button>
          {profile.resume && (
            <Button variant="text" href={profile.resume.href} external>
              Résumé
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
