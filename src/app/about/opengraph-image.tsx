import { experiences, profile } from "@/content";
import { otherWork } from "@/content/experience";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "About Utkarsh Bali: co-founder and CTO of Checkpoint, and where he has worked";

/**
 * /about is the profile, and it is where /experience and the résumé send a
 * reader, so its card is the person rather than a section title: the
 * engraving and the name, as on the home card, with what he is doing now as
 * the standfirst (his own sentence, from the Checkpoint entry) and the
 * record's employers along the colophon. Every word comes from src/content.
 */
export default async function Image() {
  const checkpoint = otherWork.find((work) => work.key === "Checkpoint");

  return renderOgCard({
    eyebrow: "About",
    title: profile.name,
    description: checkpoint?.summary ?? profile.tagline,
    meta: experiences.map((experience) => experience.company),
    portrait: "large",
  });
}
