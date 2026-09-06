import { Contact } from "@/components/sections/contact";
import { Hero } from "@/components/sections/hero";
import { Now } from "@/components/sections/now";
import { NumbersBoard } from "@/components/sections/numbers-board";
import { SelectedWork } from "@/components/sections/selected-work";
import { Writing } from "@/components/sections/writing";

/**
 * Home (§7.1): the hero, proof before story (the numbers board), what is
 * happening now, the top three projects, the latest post, and the close.
 * About, the full index and experience live on their own routes.
 *
 * No <Reveal> around a section: words never animate. The reveals sit inside
 * the sections, around the dot surfaces only (the mission line's hairline,
 * the numerals). Metadata and JSON-LD come from the layout.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <NumbersBoard />
      <Now index="01" />
      <SelectedWork index="02" />
      <Writing index="03" />
      <Contact index="04" />
    </>
  );
}
