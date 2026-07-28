import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProjectRow } from "@/components/project/project-row";
import { WorkPreview } from "@/components/interactive/work-preview";
import { featuredProjects, projects } from "@/content";

export function ProjectIndex() {
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

      <WorkPreview>
        <ul className="mt-12">
          {featuredProjects.map((project, index) => (
            <ProjectRow key={project.slug} project={project} index={index} />
          ))}
        </ul>
      </WorkPreview>

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
