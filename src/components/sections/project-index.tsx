import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProjectRow } from "@/components/project/project-row";
import { FeatureSpread } from "@/components/project/feature-spread";
import { WorkPreview } from "@/components/interactive/work-preview";
import { featuredProjects, projects } from "@/content";

/** Top three get magazine spreads; the rest stay compact index rows. */
const SPREAD_COUNT = 3;

export function ProjectIndex() {
  const spreads = featuredProjects.slice(0, SPREAD_COUNT);
  const rows = featuredProjects.slice(SPREAD_COUNT);
  const remaining = projects.length - featuredProjects.length;

  return (
    <section id="work" aria-labelledby="work-title" className="shell section-y">
      <SectionHeading
        index="03"
        eyebrow="Selected work"
        title="Agent infrastructure, developer tools, and a few things I shipped alone."
        id="work-title"
      >
        Each one has a write-up: what the problem actually was, what I built, and what
        it did or didn&rsquo;t prove.
      </SectionHeading>

      <div className="mt-20 space-y-24 lg:mt-28 lg:space-y-32">
        {spreads.map((project, index) => (
          <FeatureSpread key={project.slug} project={project} index={index} />
        ))}
      </div>

      {rows.length > 0 && (
        <>
          <p className="meta mt-24 border-t border-rule pt-5 text-faint lg:mt-32">More work</p>
          <WorkPreview>
            <ul className="mt-6">
              {rows.map((project, index) => (
                <ProjectRow
                  key={project.slug}
                  project={project}
                  index={index + SPREAD_COUNT}
                />
              ))}
            </ul>
          </WorkPreview>
        </>
      )}

      {remaining > 0 && (
        <Link
          href="/projects"
          className="group mt-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <span className="link-underline">
            All work ({projects.length} projects)
          </span>
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </section>
  );
}
