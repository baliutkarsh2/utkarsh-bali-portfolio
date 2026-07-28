import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  adjacentProjects,
  getProject,
  orderedProjects,
  statusLabel,
  type Project,
} from "@/content";
import { ProjectNav } from "@/components/project/project-nav";
import { SpecPlate } from "@/components/project/spec-plate";
import { Contact } from "@/components/sections/contact";
import { ScrollProgress } from "@/components/interactive/scroll-progress";
import { Reveal } from "@/components/interactive/reveal";
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

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const adjacent = adjacentProjects(slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(buildSchema(project)) }}
      />

      <div className="sticky top-14 z-40 border-b border-rule bg-background/85 backdrop-blur-md">
        <div className="shell flex h-11 items-center">
          <Link
            href="/#work"
            className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft
              aria-hidden
              className="size-3.5 transition-transform group-hover:-translate-x-1"
            />
            Work
          </Link>
        </div>
        <ScrollProgress />
      </div>

      <article>
        {/* Masthead */}
        <header className="shell pb-10 pt-14 sm:pt-20">
          <div className="enter">
            <p className="meta text-faint">{project.eyebrow}</p>
            <h1 className="mt-6 text-balance text-display-l font-display">{project.name}</h1>
            <p
              className="measure mt-6 text-pretty text-lede text-muted"
              style={{ "--stagger": 1 } as React.CSSProperties}
            >
              {project.tagline}
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-y-5 border-t border-rule pt-5 sm:grid-cols-4">
            {[
              { term: "Role", value: project.role },
              { term: "Organisation", value: project.org ?? "Independent" },
              { term: "Year", value: project.year },
              { term: "Status", value: statusLabel[project.status] },
            ].map((row) => (
              <div key={row.term}>
                <dt className="meta text-faint">{row.term}</dt>
                <dd className="mt-1.5 text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        {/* Cover, or the typographic stand-in. The view-transition-name pairs
            with the homepage feature spread, so arriving from one morphs the
            plate into this masthead instead of cross-fading. */}
        <div className="shell" style={{ viewTransitionName: `project-${project.slug}` }}>
          {project.cover ? (
            <div className="duotone-frame relative aspect-[16/9] w-full overflow-hidden border border-rule bg-inset">
              <Image
                src={project.cover.src}
                alt={project.cover.alt}
                fill
                sizes="(min-width: 80rem) 78rem, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <SpecPlate project={project} />
          )}
        </div>

        {/* Body + sticky meta rail */}
        <div className="shell grid-editorial !mx-auto mt-16 !px-0 sm:mt-20">
          <div className="col-span-full lg:col-span-8">
            <Section index="01" label="Problem">
              <p className="text-pretty text-display-s font-display leading-tight">
                {project.problem}
              </p>
            </Section>

            <Section index="02" label="Approach">
              <p className="text-pretty leading-8 text-muted">{project.story}</p>
            </Section>

            <Section index="03" label="What I built">
              <p className="text-pretty leading-8 text-muted">{project.built}</p>
            </Section>

            <Section index="04" label="Architecture">
              <ol className="mt-1">
                {project.architecture.map((item, index) => (
                  <li key={item} className="flex gap-5 border-b border-rule py-5 first:pt-0">
                    <span aria-hidden className="meta shrink-0 pt-1 text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-pretty leading-7 text-muted">{item}</p>
                  </li>
                ))}
              </ol>
            </Section>

            <Section index="05" label="Impact">
              <div className="border-l-2 border-foreground pl-6">
                <p className="text-pretty font-display text-2xl leading-snug">
                  {project.impact}
                </p>
              </div>
              <div className="mt-8 flex items-baseline gap-5">
                <p className="font-display text-6xl leading-none tabular sm:text-7xl">
                  {project.metric}
                </p>
                <p className="meta max-w-40 text-faint">{project.metricLabel}</p>
              </div>
            </Section>

            {project.learnings && project.learnings.length > 0 && (
              <Section index="06" label="What I'd do differently">
                <ul>
                  {project.learnings.map((item) => (
                    <li key={item} className="border-b border-rule py-5 first:pt-0">
                      <p className="text-pretty leading-7 text-muted">{item}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <aside className="col-span-full mt-12 lg:col-span-3 lg:col-start-10 lg:mt-0">
            <div className="lg:sticky lg:top-32">
              <div className="border-t border-rule pt-5">
                <h2 className="meta text-faint">Stack</h2>
                <ul className="mt-4">
                  {project.stack.map((item) => (
                    <li key={item} className="border-b border-rule py-2 text-sm text-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {project.links.length > 0 && (
                <div className="mt-8 border-t border-rule pt-5">
                  <h2 className="meta text-faint">Links</h2>
                  <ul className="mt-4 space-y-2.5">
                    {project.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
                        >
                          <span className="link-underline">{link.label}</span>
                          <ArrowUpRight
                            aria-hidden
                            className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {project.confidential && (
                <p className="mt-8 border-t border-rule pt-5 text-sm leading-6 text-faint">
                  Built inside a company codebase, so there&rsquo;s no public source to
                  link. Happy to talk through the design.
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* Gallery, renders only once media exists */}
        {project.media && project.media.length > 0 && (
          <div className="shell mt-20 space-y-10">
            {project.media.map((item) => (
              <figure key={item.src}>
                <div className="overflow-hidden border border-rule bg-inset">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    sizes="(min-width: 80rem) 78rem, 100vw"
                    className="h-auto w-full"
                  />
                </div>
                {item.caption && (
                  <figcaption className="meta mt-3 text-faint">{item.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </article>

      <div className="mt-20">
        {adjacent && <ProjectNav prev={adjacent.prev} next={adjacent.next} />}
      </div>

      <Reveal>
        <Contact />
      </Reveal>
    </>
  );
}

function Section({
  index,
  label,
  children,
}: {
  index: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-5 [&:not(:first-child)]:mt-14">
      <div className="flex items-baseline gap-4">
        <span aria-hidden className="meta text-faint">
          {index}
        </span>
        <h2 className="meta text-faint">{label}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
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
      dateCreated: project.sortDate,
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
