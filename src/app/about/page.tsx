import type { Metadata } from "next";
import { About } from "@/components/sections/about";
import { Beliefs } from "@/components/sections/beliefs";
import { Toolkit } from "@/components/sections/toolkit";
import { OffHours } from "@/components/sections/off-hours";
import { Contact } from "@/components/sections/contact";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who I am, what I believe about building software, the toolkit I reach for, and what I'm reading, listening to, and chasing.",
  alternates: { canonical: "/about" },
};

/**
 * /about (§7.2): five numbered sections in the shared grammar. Each one is a
 * direct child of <main>, so each sits in its own stacking context above the
 * board layer (globals.css `main > *`). Nothing here is wrapped in a reveal:
 * the words are on the page from the first frame, and the only things that
 * move are the still board's dots under the pointer and the toolkit's leaders
 * drawing in, both of which the sections gate themselves.
 */
export default function AboutPage() {
  return (
    <>
      <About />
      <Beliefs />
      <Toolkit />
      <OffHours />
      <Contact index="05" />
    </>
  );
}
