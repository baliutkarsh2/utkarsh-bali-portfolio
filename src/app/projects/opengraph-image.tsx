import { orderedProjects } from "@/content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "The work of Utkarsh Bali";

export default async function Image() {
  return renderOgCard({
    eyebrow: "Work",
    title: "The work.",
    description:
      "Agent infrastructure, developer tools, consumer AI, and research prototypes, each with a full write-up.",
    meta: [`${orderedProjects.length} projects`, "Utkarsh Bali"],
  });
}
