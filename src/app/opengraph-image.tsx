import { profile } from "@/content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Utkarsh Bali: agent infrastructure and developer tools";

export default async function Image() {
  return renderOgCard({
    eyebrow: "Portfolio",
    title: profile.name,
    description: profile.tagline,
    meta: [profile.education, "Recurly", "QualGent (YC X25)"],
    portrait: "large",
  });
}
