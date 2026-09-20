import { formatPostDate, getPost, hostedPosts } from "@/lib/writing";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

// Only the slugs generateStaticParams emits. Without this the route
// answers 200 with a fallback card under pages that 404.
export const dynamicParams = false;

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Post by Utkarsh Bali";

export function generateStaticParams() {
  return hostedPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return renderOgCard({
      eyebrow: "Writing",
      title: "Utkarsh Bali",
      description: "Notes on agent infrastructure and developer tools.",
      meta: ["ubali.dev"],
    });
  }

  return renderOgCard({
    eyebrow: "Writing",
    title: post.title,
    description: post.summary,
    meta: [formatPostDate(post.date), `${post.readingMinutes} min read`],
  });
}
