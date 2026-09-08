import { Constellation } from "@/components/sections/constellation";
import { Contact } from "@/components/sections/contact";
import { Hero } from "@/components/sections/hero";
import { SelectedWork } from "@/components/sections/selected-work";
import { Story } from "@/components/sections/story";

/**
 * Home: the plate, the story, the top three projects, the constellation
 * full-bleed, and the close.
 *
 * There was a "Three numbers" board between the plate and the work -- the YC
 * ranking, a failure rate and an AUROC, set large, above the projects they
 * came from. It is gone. Pulling three figures out of eight case studies and
 * setting them at display size is the page telling you what to be impressed
 * by before it has told you what the work is; each of those numbers is still
 * on the project it belongs to, next to the sentence that makes it mean
 * something. The section numbering went with it, for the same reason a list
 * of three does not need to count itself out loud. There is one essay and it lives on
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
      <Story />
      <SelectedWork />
      <Constellation
        variant="chart"
        title="Where the work went"
        readout="Trajectory"
        id="trajectory"
      />
      <Contact />
    </>
  );
}
