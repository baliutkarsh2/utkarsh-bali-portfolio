import type { Metadata } from "next";
import { About } from "@/components/sections/about";
import { Constellation } from "@/components/sections/constellation";
import { Recognition } from "@/components/sections/recognition";
import { Toolkit } from "@/components/sections/toolkit";

export const metadata: Metadata = {
  title: "About",
  description:
    "How I got here, where I’ve worked, and the tools I reach for. Recurly, QualGent (YC X25), Purdue and a Microsoft Research collaboration at the Data Mine. Purdue CS + AI, December 2026.",
  alternates: { canonical: "/about" },
};

/**
 * /about (§7.2): four numbered sections in the shared grammar — who, where,
 * what came of it, what I work with. Each one is a direct child of <main>, so
 * each sits in its own stacking context above the board layer (globals.css
 * `main > *`). Nothing here is wrapped in a reveal: the words are on the page
 * from the first frame, and the only thing that moves is the still board's
 * dots under the pointer, which the board gates itself.
 *
 * Experience and Recognition used to be a page of their own. Two sections is
 * not a page, and "who are you" and "where have you worked" are one question
 * asked twice — so /experience is a 308 to #experience here, the nav is three
 * items instead of five, and the answer is in one place.
 *
 * Section 02 is the work constellation (§7.2a): a time × employer chart
 * with the eight projects marked on the month each one landed, followed by
 * the same eight as a numbered list of links. It keeps the `#experience` id
 * the 308 from /experience points at.
 */
export default function AboutPage() {
  return (
    <>
      <About />
      <Constellation
        index="02"
        title="Where I’ve worked."
        readout="Experience"
        id="experience"
      />
      <Recognition />
      <Toolkit />
    </>
  );
}
