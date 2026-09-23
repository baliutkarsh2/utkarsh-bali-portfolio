import type { Metadata } from "next";
import { About } from "@/components/sections/about";
import { Constellation } from "@/components/sections/constellation";
import { Recognition } from "@/components/sections/recognition";
import { Record } from "@/components/sections/record";

export const metadata: Metadata = {
  title: "About",
  description:
    "Where Utkarsh Bali has worked and what he has built: Recurly, QualGent (YC X25), Purdue AI research, and a Microsoft Research collaboration.",
  alternates: { canonical: "/about" },
  // Without this the page inherits the layout's openGraph verbatim, so a
  // share of /about resolves to the home page and carries the home page's
  // headline over a card image that says "About".
  openGraph: {
    url: "/about",
    title: "About",
    description:
      "Where Utkarsh Bali has worked and what he has built: Recurly, QualGent (YC X25), Purdue AI research, and a Microsoft Research collaboration.",
  },
};

/**
 * /about: a profile, in the order a reader asks the questions. Who is this
 * (the masthead: a headline, two paragraphs in his own voice, and the facts
 * column), where has he worked (the chart, then the record under it), and
 * what came of it (recognition). Each block is a direct child of <main>, so
 * each sits in its own stacking context (globals.css `main > *`). Nothing
 * here is wrapped in a reveal: the words are on the page from the first
 * frame.
 *
 * Experience and Recognition used to be a page of their own. Two sections is
 * not a page, and "who are you" and "where have you worked" are one question
 * asked twice — so /experience is a 308 to #experience here, and the answer
 * is in one place.
 *
 * The chart is the one the home page closes on, in its plain `chart` form:
 * the ten-second scan. What used to follow it inside the chart component --
 * a numbered key restating /projects and a record set in a 38rem column
 * beside a bare right third -- is the record (record.tsx) now: every lane of
 * the chart as an entry, with its case studies beside it. The chart keeps
 * the `#experience` id the 308 from /experience points at.
 */
export default function AboutPage() {
  return (
    <>
      <About />
      <Constellation
        variant="chart"
        index="02"
        title="Where I’ve worked"
        readout="Experience"
        id="experience"
      />
      <Record />
      <Recognition />
    </>
  );
}
