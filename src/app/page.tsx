import { Constellation } from "@/components/sections/constellation";
import { Contact } from "@/components/sections/contact";
import { Hero } from "@/components/sections/hero";
import { NumbersBoard } from "@/components/sections/numbers-board";
import { SelectedWork } from "@/components/sections/selected-work";

/**
 * Home (§7.1): the plate, three numbers, the top three projects, the
 * constellation full-bleed, and the close. There is one essay and it lives on
 * Medium, so it is a line in the close rather than a section of its own.
 * About, experience and the full index live on their own routes.
 *
 * The constellation is the closing composition, and it is the chart alone: no
 * numbered key and no record, both of which belong to /about, where they are
 * what you read after the ten-second scan. Here the chart IS the scan. It also
 * repairs something the three rows above cannot: SelectedWork links three of
 * the eight projects, and the plate’s eight marks are eight links, so the
 * page names and reaches all of them. It is the one section on this page that
 * is not `shell` — it drops the type column and takes the sheet.
 *
 * "Now" used to sit between the numbers and the work, restating the Recurly
 * summer in a spec list. That work is a case study of its own now, linked
 * from the first row below, so the section was the same paragraph told twice
 * one screen apart. The hero still carries the status line, which is the only
 * part of it that was time-sensitive.
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
      <SelectedWork index="01" />
      <Constellation
        variant="chart"
        index="02"
        title="Where the work went."
        readout="Trajectory"
        id="trajectory"
      />
      <Contact index="03" />
    </>
  );
}
