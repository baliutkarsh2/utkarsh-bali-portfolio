import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { FeatureSpread } from "@/components/project/feature-spread";
import { featuredProjects, projects } from "@/content";

/** Homepage teaser: the top three as spreads, then a link to /projects. */
const SPREAD_COUNT = 3;

export function ProjectIndex({ index = "02" }: { index?: string }) {
  const spreads = featuredProjects.slice(0, SPREAD_COUNT);

  return (
    <section id="work" aria-labelledby="work-title" className="shell section-y">
      <SectionHeading
        index={index}
        eyebrow="Selected work"
        title="Agent infrastructure, developer tools, and a few things I shipped end to end."
        id="work-title"
      >
        Each one has a write-up: what the problem actually was, what I built, and what
        it did or didn&rsquo;t prove.
      </SectionHeading>

      <div className="mt-20 space-y-24 lg:mt-28 lg:space-y-32">
        {spreads.map((project, spreadIndex) => (
          <FeatureSpread key={project.slug} project={project} index={spreadIndex} />
        ))}
      </div>

      <Link
        href="/projects"
        className="tap group mt-20 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground lg:mt-28"
      >
        <span className="link-underline">All work ({projects.length} projects)</span>
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </section>
  );
}
