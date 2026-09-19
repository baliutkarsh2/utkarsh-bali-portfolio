import type { CSSProperties } from "react";
import { DotBoard } from "@/components/interactive/dot-board";
import { Button } from "@/components/ui/button";
import { Story } from "@/components/sections/story";
import { profile } from "@/content";
import { portrait } from "@/content/portrait";

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
 * text in Bodoni 500, and the only things that animate are dots — the mission
 * line's hairline drawing in and the portrait assembling on the board.
 *
 * The name is at full opacity from frame zero THROUGHOUT the arrival — bone on
 * the plate, ink on the sheet — which is why the arrival can invert the whole
 * palette under it without ever delaying the largest contentful paint.
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
      {/* No status line over the name.
          "Currently · Final semester at Purdue · West Lafayette, IN" sat here
          with a live LED, and every fact in it is said again below: the
          semester in the lede, the graduation in the last line of the story,
          the town in the footer. It was an eyebrow over a display heading --
          the one device this direction set out to avoid -- and it was the only
          thing on the site that had to be revisited on a date. */}
      {/* Two block spans rather than a <br>: the whitespace text node between
          them keeps textContent "Utkarsh Bali" for assistive tech and crawlers
          while the blocks break the line. */}
      <h1
        id="hero-title"
        className="hero-name board-above text-display-xl text-ink"
      >
        <span className="block">{firstName}</span>{" "}
        {surname && <span className="block">{surname}</span>}
      </h1>

      {/* Column 2 from 80rem, directly under the name below that. The figure
          box is the layout anchor; the canvas is fixed behind the page. The
          board loads its field on the client, in its own cached chunk.

          No caption. It read "288 × 360 · 51,747 dots" at rest and
          "x 003 · y 012 · 0.42" under the pointer -- the machine describing
          its own output, under a picture of a person. */}
      <DotBoard
        mode="hero"
        source="hero"
        alt={portrait.alt}
        fallback={portrait.fallback.hero}
        mobileFallback={portrait.fallback.phone}
        className="hero-board"
      />

      <div className="hero-copy board-above">
        {/* One line under the name, and it is the whole introduction.
            What was here: the positioning line ("I build the infrastructure
            agents run on, and the thing that breaks them before a user
            does.") over a second paragraph naming the role, the company, what
            it builds, the university and the semester. Six facts in two
            sentences, when the story below already tells all six in order.

            The link goes to the product, not to its case study: the case
            study is two clicks away from the work index and this line is the
            only place on the page where the live thing is one click away.
            `--u-rest: 100%` rests the dotted rule at full width, as links in
            prose do; colour alone would not mark it, --ink on --ink-2 being
            2.1:1. */}
        <p className="max-w-[34ch] text-display-s text-ink">
          building{" "}
          <a
            href="https://usecheckpoint.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="dot-underline text-ink"
            style={LINK_AT_REST}
          >
            Checkpoint
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
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

        <Story className="hero-story" />
      </div>
    </section>
  );
}
