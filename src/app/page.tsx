import { Contact } from "@/components/sections/contact";
import { Hero } from "@/components/sections/hero";
import { Now } from "@/components/sections/now";
import { NumbersBoard } from "@/components/sections/numbers-board";
import { SelectedWork } from "@/components/sections/selected-work";

/**
 * Home (§7.1): the hero, three numbers, what is happening now, the top three
 * projects, and the close. There is one essay and it lives on Medium, so it is
 * a line in the close rather than a section of its own. About, the full index
 * and experience live on their own routes.
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
      <Contact index="03" />
    </>
  );
}
