import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Project } from "@/content";

export function ProjectNav({ prev, next }: { prev: Project; next: Project }) {
  return (
    <nav aria-label="More work" className="border-t border-rule">
      <div className="shell grid sm:grid-cols-2">
        <Link
          href={`/projects/${prev.slug}`}
          className="index-row group flex flex-col gap-2 border-b border-rule py-8 sm:border-b-0 sm:border-r sm:pr-8"
        >
          <span className="meta flex items-center gap-2 text-faint">
            <ArrowLeft
              aria-hidden
              className="size-3.5 transition-transform group-hover:-translate-x-1"
            />
            Previous
          </span>
          <span className="text-display-s font-display">{prev.name}</span>
        </Link>

        <Link
          href={`/projects/${next.slug}`}
          className="index-row group flex flex-col items-end gap-2 py-8 text-right sm:pl-8"
        >
          <span className="meta flex items-center gap-2 text-faint">
            Next
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform group-hover:translate-x-1"
            />
          </span>
          <span className="text-display-s font-display">{next.name}</span>
        </Link>
      </div>
    </nav>
  );
}
