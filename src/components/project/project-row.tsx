import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/content";
import { ordinal } from "@/lib/utils";

/**
 * Hairline index row. The whole row is clickable via `stretch-link` on the
 * title anchor — never an <a> nested inside another <a>.
 */
export function ProjectRow({ project, index }: { project: Project; index: number }) {
  return (
    <li className="index-row border-t border-rule last:border-b">
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 gap-y-1 py-6 md:grid-cols-[3rem_minmax(0,1fr)_7rem_10rem_1.5rem] md:gap-x-6 md:py-7">
        <span aria-hidden className="row-num meta">
          {ordinal(index)}
        </span>

        <div className="min-w-0">
          <h3 className="text-display-s font-display">
            <Link href={`/projects/${project.slug}`} className="stretch-link">
              {project.name}
            </Link>
          </h3>
          <p className="mt-1.5 max-w-lg text-pretty text-sm leading-6 text-muted">
            {project.tagline}
          </p>
          {project.org && (
            <p className="meta mt-2 text-faint md:hidden">
              {project.org} · {project.year}
            </p>
          )}
        </div>

        <span className="meta hidden text-faint md:block">{project.year}</span>

        <div className="hidden md:block">
          <p className="font-display text-xl leading-none tabular">{project.metric}</p>
          <p className="meta mt-1.5 text-faint">{project.metricLabel}</p>
        </div>

        <ArrowUpRight
          aria-hidden
          className="row-arrow size-4 shrink-0 justify-self-end text-faint"
        />
      </div>
    </li>
  );
}
