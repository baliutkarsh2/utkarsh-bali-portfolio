import type { Metadata } from "next";
import Image from "next/image";
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
import { NumberPlate } from "@/components/project/number-plate";
import { ProjectBody, ProjectRail } from "@/components/project/project-body";
import { ProjectNav } from "@/components/project/project-nav";
import { ProgressRow } from "@/components/interactive/progress-row";
import { Reveal } from "@/components/interactive/reveal";
import { DotMask } from "@/components/ui/dot-mask";
import { Led } from "@/components/ui/led";
import { SpecList } from "@/components/ui/spec-list";
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
 * A case study (§7.4), in order: the sticky sub-bar with its progress row,
 * the masthead (the name morphs in from the index row), the one-number
 * plate, the cover when there is one, the four numbered sections beside the
 * sticky rail, the gallery when there is media, previous / next.
 * Rigour, then the number that earns it.
 *
 * Accent count per screen (rule 3): the progress row's leading dot is the
 * one accent on every case-study screen, and it is sticky, so nothing else
 * on the page is ever --sun: the plate's figure is --ink and the masthead
 * LED is --ink even when the project is ongoing (.case-mast in
 * components.css). The word beside the LED carries the status.
 */
export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const adjacent = adjacentProjects(slug);
  const live = project.status === "ongoing";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(buildSchema(project)) }}
      />

      {/* Sub-bar: in flow under the 3.5rem fixed header (hence mt-14), then
          sticky at the header's bottom edge. The progress row is its bottom
          edge: a row of unlit dots lighting left to right with reading
          progress, the leading dot in --sun. */}
      <div className="case-bar mt-14">
        <div className="shell flex h-11 items-center">
          <Link
            href="/projects"
            className="group tap inline-flex items-center gap-2 text-small text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft
              className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            <span className="dot-underline group-hover:[--u:100%] group-focus-visible:[--u:100%]">
              Work
            </span>
          </Link>
        </div>
        <ProgressRow />
      </div>

      <article>
        {/* Masthead. The h1 shares `project-{slug}` with the index row's
            title, so the name morphs into place; nothing else here moves. */}
        <header className="case-mast shell pt-12 pb-12 md:pt-16 md:pb-16">
          <p className="meta text-ink-3">{project.eyebrow}</p>
          <h1
            className="mt-6 text-display-l text-ink"
            style={{ viewTransitionName: `project-${project.slug}` }}
          >
            {project.name}
          </h1>
          <p className="measure mt-6 text-lede text-ink-2">{project.tagline}</p>

          <SpecList
            inline
            className="mt-10"
            rows={[
              { term: "Role", value: project.role },
              { term: "Organization", value: project.org ?? "Independent" },
              { term: "Year", value: project.year },
              {
                term: "Status",
                value: (
                  <span className="inline-flex items-center gap-2">
                    {/* The word beside it is the LED's label. */}
                    <Led state={live ? "live" : "off"} />
                    {statusLabel[project.status]}
                  </span>
                ),
              },
            ]}
          />
        </header>

        <NumberPlate project={project} />

        {/* Cover, only when one exists. No placeholder plates: the number
            above is the slide every project gets. */}
        {project.cover && (
          <div className="shell mt-12 md:mt-16">
            <Reveal>
              <DotMask ratio={`${project.cover.width} / ${project.cover.height}`}>
                <Image
                  src={project.cover.src}
                  alt={project.cover.alt}
                  width={project.cover.width}
                  height={project.cover.height}
                  sizes="(min-width: 84rem) 80rem, 100vw"
                />
              </DotMask>
            </Reveal>
          </div>
        )}

        <div className="shell case-body section-y">
          <ProjectBody project={project} />
          <ProjectRail project={project} />
        </div>

        {project.media && project.media.length > 0 && (
          <div className="pb-(--section-y)">
            <Gallery media={project.media} />
          </div>
        )}
      </article>

      {adjacent && (
        <div className="mt-(--section-y)">
          <ProjectNav prev={adjacent.prev} next={adjacent.next} />
        </div>
      )}

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
