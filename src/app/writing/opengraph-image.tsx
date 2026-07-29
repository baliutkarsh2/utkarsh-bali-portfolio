import { publishedPosts } from "@/lib/writing";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Writing by Utkarsh Bali";

export default async function Image() {
  const count = publishedPosts().length;
  return renderOgCard({
    eyebrow: "Writing",
    title: "Worth thinking about twice",
    description:
      "Occasional essays on software, life, art, and philosophy.",
    meta: [`${count} ${count === 1 ? "post" : "posts"}`, "Utkarsh Bali"],
  });
}
