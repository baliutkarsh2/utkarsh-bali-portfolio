import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  adjacentProjects,
  getProject,
  orderedProjects,
  statusLabel,
  type Project,
} from "@/content";
import { Gallery } from "@/components/project/gallery";
import { PlateFigure } from "@/components/project/number-plate";
import { ProjectBody, ProjectColophon } from "@/components/project/project-body";
import { ProjectNav } from "@/components/project/project-nav";
import { absoluteUrl, jsonLd, personId, siteConfig } from "@/lib/seo";

/** Unknown slugs 404 instead of being rendered on demand. */
export const dynamicParams = false;

export function generateStaticParams() {
  return orderedProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: project.name,
    description: project.tagline,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: {
      type: "article",
      url: `/projects/${slug}`,
      title: project.name,
      description: project.tagline,
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description: project.tagline,
    },
  };
}

/**
 * A case study, as one plate rather than a template around a paragraph.
 *
 * The measurement that decided this: a case study on this site averages 198
 * words — 317 at the longest, 136 at the shortest. Around those 198 words the
 * page this replaces wrapped a sticky sub-bar, a scroll-progress row, a
 * masthead, a full-bleed number band, five numbered section blocks, a sticky
 * 20rem rail and a two-row prev/next footer. The scaffolding outweighed the
 * content by an order of magnitude, which is exactly why it read as a template.
 *
 * What is here instead, in order:
 *
 *   · the frontispiece — the name at display-l, a one-line spec, and the
 *     headline figure set very large and bled off the right edge of the sheet;
 *   · four movements, each opening on its own first sentence set in the display
 *     italic across a wider measure, with "How it works" drawn as a three-stage
 *     schematic from the three `architecture` strings every project has;
 *   · the number again, at the close of Impact;
 *   · the plates, where there are screenshots; the colophon; the foot.
 *
 * Deleted, on purpose: the sub-bar (a sticky bar takes 44px off every screen of
 * a page people actually read — the running head hangs in the margin instead,
 * where a running head goes), the progress row, the number band, the numbered
 * block heads, and the rail.
 *
 * The dot field is absent from the body of this page and that is the point:
 * this is the document the machine printed, and a document does not contain its
 * press. The lattice belongs to the home board and to the image masks.
 *
 * Accents: none. --sun is licensed to four places site-wide and no case study
 * is one of them, so the figure, the rules and the schematic are all --ink.
 *
 * Motion: none. Nothing on this page has a cold state, so reduced motion and
 * JavaScript-off both render exactly what everyone else sees — the only moving
 * parts left are the shared image masks, which resolve themselves in CSS.
 */
export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const adjacent = adjacentProjects(slug);
  const spec = [
    project.eyebrow,
    project.org ?? "Independent",
    project.role,
    project.year,
    statusLabel[project.status],
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(buildSchema(project)) }}
      />

      <article className="plate">
        {/* Frontispiece. The margin column opens with the way back, which is
            the only navigation this page needs above the fold; the h1 shares
            `project-{slug}` with the index row's title, so the name morphs
            into place and nothing else moves. */}
        <header className="frontis sheet-row shell">
          <div>
            <Link href="/projects" className="frontis-back data tap">
              <ArrowLeft aria-hidden="true" />
              <span className="dot-underline">Work</span>
            </Link>
          </div>

          <div>
            <p className="spec-line data">
              {spec.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </p>
            <h1
              className="frontis-name text-display-l"
              style={{ viewTransitionName: `project-${project.slug}` }}
            >
              {project.name}
            </h1>
            <p className="frontis-tagline text-lede">{project.tagline}</p>
          </div>
        </header>

        <PlateFigure project={project} />

        <ProjectBody project={project} />

        {project.media && project.media.length > 0 && <Gallery media={project.media} />}

        <ProjectColophon project={project} />
      </article>

      {adjacent && <ProjectNav prev={adjacent.prev} next={adjacent.next} />}
    </>
  );
}

function buildSchema(project: Project) {
  const url = absoluteUrl(`/projects/${project.slug}`);
  const repo = project.links.find((link) => link.kind === "repo");

  return [
    {
      "@context": "https://schema.org",
      "@type": repo ? "SoftwareSourceCode" : "CreativeWork",
      "@id": `${url}#work`,
      name: project.name,
      headline: project.name,
      description: project.tagline,
      url,
      dateModified: project.sortDate,
      keywords: project.stack.join(", "),
      image: absoluteUrl(`/projects/${project.slug}/opengraph-image`),
      author: { "@id": personId },
      ...(repo ? { codeRepository: repo.href } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Work", item: absoluteUrl("/projects") },
        { "@type": "ListItem", position: 3, name: project.name, item: url },
      ],
    },
  ];
}
