import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/content";
import { SpecPlate } from "@/components/project/spec-plate";
import { SlideLabel } from "@/components/ui/slide-label";
import { ordinal } from "@/lib/utils";

/**
 * Magazine spread for a top-billed project: oversized accent numeral, a media
 * plate, and copy on an alternating asymmetric grid. Odd spreads mirror. The
 * whole spread is one click target via stretch-link on the title anchor.
 *
 * The media wrapper carries a per-slug view-transition-name; the case-study
 * cover carries the same one, so navigating morphs the plate into the
 * masthead instead of cross-fading.
 */
export function FeatureSpread({ project, index }: { project: Project; index: number }) {
  return (
    <article
      className="feature-spread group slide-trigger relative"
      data-flip={index % 2 === 1 ? "" : undefined}
    >
      <div className="spread-media" style={{ viewTransitionName: `project-${project.slug}` }}>
        <span aria-hidden className="spread-num">
          {ordinal(index)}
        </span>
        {project.cover ? (
          <div className="duotone-frame relative aspect-[16/9] w-full overflow-hidden border border-rule bg-inset">
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              fill
              sizes="(min-width: 64rem) 45rem, 100vw"
              className="graded object-cover"
            />
          </div>
        ) : (
          <SpecPlate project={project} />
        )}
      </div>

      <div className="spread-copy">
        <p className="meta text-faint">
          {project.eyebrow} · {project.year}
        </p>
        <h3 className="mt-4 text-balance text-display-m font-display">
          <Link href={`/projects/${project.slug}`} className="stretch-link">
            {project.name}
          </Link>
        </h3>
        <p className="mt-4 max-w-md text-pretty leading-7 text-muted">{project.tagline}</p>

        {/* The SpecPlate already carries the metric; echoing it here would set
            the same figure twice side by side. Only real covers need it. */}
        {project.cover && (
          <>
            <p className="mt-6 font-display text-3xl leading-none tabular">{project.metric}</p>
            <p className="meta mt-2 text-faint">{project.metricLabel}</p>
          </>
        )}

        <p className="mt-8 inline-flex items-center gap-2 text-sm text-muted transition-colors group-hover:text-foreground">
          <SlideLabel>Read the case study</SlideLabel>
          <ArrowUpRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </p>
      </div>
    </article>
  );
}
