import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Project } from "@/content";
import { Typeset } from "@/components/project/typeset";

/**
 * The foot of a case study: the previous and the next project, each with its
 * name and its one sentence, as two halves of one band.
 *
 * They used to be two mono lines, "PREV name" and "NEXT name", stacked in the
 * corner under the last movement -- the right navigation at the size of a
 * footnote, on the one screen where a reader who finished the page decides
 * whether to read another. A reader deciding needs to know what the next
 * thing IS, so each half carries the tagline, and the whole half is the link.
 *
 * No `view-transition-name` on either: exactly one element per project is
 * paired across routes (the index row's title and the case-study h1).
 */
export function ProjectNav({ prev, next }: { prev: Project; next: Project }) {
  return (
    <nav aria-label="More work" className="case-foot shell">
      <div className="case-foot-grid">
        <Link href={`/projects/${prev.slug}`} className="foot-card" rel="prev">
          <span className="foot-label meta">
            <ArrowLeft aria-hidden="true" />
            Previous
          </span>
          <span className="foot-name text-display-s">
            <Typeset>{prev.name}</Typeset>
          </span>
          <span className="foot-tagline text-small">{prev.tagline}</span>
        </Link>
        <Link
          href={`/projects/${next.slug}`}
          className="foot-card"
          data-next=""
          rel="next"
        >
          <span className="foot-label meta">
            Next
            <ArrowRight aria-hidden="true" />
          </span>
          <span className="foot-name text-display-s">
            <Typeset>{next.name}</Typeset>
          </span>
          <span className="foot-tagline text-small">{next.tagline}</span>
        </Link>
      </div>
    </nav>
  );
}
