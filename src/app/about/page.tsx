import type { Metadata } from "next";
import { About } from "@/components/sections/about";
import { Toolkit } from "@/components/sections/toolkit";

export const metadata: Metadata = {
  title: "About",
  description:
    "How I got here, what I have shipped, and the tools I reach for. Purdue CS + AI, graduating December 2026.",
  alternates: { canonical: "/about" },
};

/**
 * /about (§7.2): numbered sections in the shared grammar. Each one is a
 * direct child of <main>, so each sits in its own stacking context above the
 * board layer (globals.css `main > *`). Nothing here is wrapped in a reveal:
 * the words are on the page from the first frame, and the only things that
 * moves is the still board's dots under the pointer, which the board gates
 * itself.
 */
export default function AboutPage() {
  return (
    <>
      <About />
      <Toolkit />
    </>
  );
}
