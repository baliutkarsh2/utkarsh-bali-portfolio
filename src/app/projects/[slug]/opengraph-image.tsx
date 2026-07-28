import { getProject, orderedProjects, statusLabel } from "@/content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Project case study";

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
  });
}
