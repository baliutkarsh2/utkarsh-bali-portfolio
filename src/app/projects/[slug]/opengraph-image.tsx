import { getProject, orderedProjects, statusLabel } from "@/content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

// Only the slugs generateStaticParams emits. Without this the route
// answers 200 with a fallback card under pages that 404.
export const dynamicParams = false;

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// No `alt` export. It is one string for all eight cards ("Project case
// study" was), so each case study lists its card in its own metadata with an
// alt that names it: generateMetadata in ./page.tsx. generateImageMetadata
// could carry a per-card alt here, but it moves the card under an id segment
// that this route cannot prerender, so every card would render on request.

export function generateStaticParams() {
  return orderedProjects.map((project) => ({ slug: project.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return renderOgCard({
      eyebrow: "Work",
      title: "Utkarsh Bali",
      description: "Agent infrastructure and developer tools.",
      meta: ["ubali.dev"],
    });
  }

  return renderOgCard({
    eyebrow: project.eyebrow,
    title: project.name,
    description: project.tagline,
    meta: [project.role, project.year, statusLabel[project.status]],
    // The one-number plate; the accent belongs to the ongoing project only.
    metric: {
      value: project.metric,
      label: project.metricLabel,
      accent: project.status === "ongoing",
    },
    portrait: "small",
  });
}
