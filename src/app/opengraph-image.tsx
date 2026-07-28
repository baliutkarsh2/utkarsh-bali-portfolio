import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Utkarsh Bali, engineer, agent infrastructure and developer tools";

export default async function Image() {
  return renderOgCard({
    eyebrow: "Portfolio",
    title: "Utkarsh Bali",
    description: "Agent infrastructure, developer tools, and products people use.",
    meta: ["Purdue CS + AI", "Recurly", "Ex-QualGent YC X25"],
  });
}
