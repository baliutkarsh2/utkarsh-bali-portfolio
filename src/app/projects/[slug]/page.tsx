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
import { ProjectBody } from "@/components/project/project-body";
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
 * A case study: a masthead, the argument, and the way to the next one.
 *
 * The masthead is the name, its one sentence, and a row of facts the way a
 * magazine sets them over a profile: role, organisation, status, and the
 * result -- the figure in the display face, its label under it in the reading
 * face. That row replaces a single mono "spec line" and a second mono line
 * for the figure, both of which asked a reader to parse a string of middots
 * to find out who he was on the project and whether it worked.
 *
 * Under it the sheet (project-body.tsx): the movements in a margin-and-text
 * pair, and the rail beside them with the project's device, its stack and its
 * links. The page is laid on one grid from top to bottom: every running head
 * hangs in the same margin, the name, every standfirst and every step share
 * one left edge, and the rail and the facts row share the right one.
 *
 * Accents: none. --sun is licensed to three places site-wide and no case
 * study is one of them.
 *
 * Motion: hover only. Nothing on this page has a cold state, so reduced
 * motion and JavaScript-off both render exactly what everyone else sees.
 */
export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const adjacent = adjacentProjects(slug);

  // An independent build says so in its role, so it has no organisation cell.
  const facts: { label: string; value: string }[] = [
    { label: "Role", value: project.role },
    ...(project.org ? [{ label: "Organization", value: project.org }] : []),
    { label: "Year", value: project.year },
    { label: "Status", value: statusLabel[project.status] },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(buildSchema(project)) }}
      />

      <article className="case">
        <header className="case-head shell">
          <div className="case-head-margin">
            <Link href="/projects" className="case-back data tap">
              <ArrowLeft aria-hidden="true" />
              <span className="dot-underline">All work</span>
            </Link>
          </div>

          <div className="case-head-main">
            <p className="case-eyebrow meta">{project.eyebrow}</p>
            {/* Shares `project-{slug}` with the index row's title, so the
                name morphs into place and nothing else moves. */}
            <h1
              className="case-name text-display-l"
              style={{ viewTransitionName: `project-${project.slug}` }}
            >
              {project.name}
            </h1>
            <p className="case-tagline text-lede">{project.tagline}</p>

            <dl className="case-facts">
              {facts.map((fact) => (
                <div key={fact.label} className="case-fact">
                  <dt className="meta">{fact.label}</dt>
                  <dd className="text-small">{fact.value}</dd>
                </div>
              ))}
              <div className="case-fact case-fact-result">
                <dt className="meta">Result</dt>
                <dd>
                  <span className="case-stat text-display-s">
                    <Stat value={project.metric} />
                  </span>
                  <span className="case-stat-label text-small">
                    {project.metricLabel}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <ProjectBody project={project} />
      </article>

      {adjacent && <ProjectNav prev={adjacent.prev} next={adjacent.next} />}
    </>
  );
}

/**
 * The result figure, with its signs set in the reading face.
 *
 * Bodoni Moda draws `+`, `<` and `>` as hairlines: at the 30 px this figure
 * is set at, the plus in "3K+" and the angle in "<1%" were a pixel wide and
 * read as a smudge beside the numeral, so "3K+" looked like "3K" with dirt on
 * it. Source Serif's signs carry a stroke that holds at this size; the digits
 * and letters stay in the display face.
 */
function Stat({ value }: { value: string }) {
  return value.split(/([+<>])/).map((part, i) =>
    /^[+<>]$/.test(part) ? (
      <span key={i} className="case-stat-sign">
        {part}
      </span>
    ) : (
      part
    ),
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
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Work",
          item: absoluteUrl("/projects"),
        },
        { "@type": "ListItem", position: 3, name: project.name, item: url },
      ],
    },
  ];
}
