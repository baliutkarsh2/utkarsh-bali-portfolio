import Link from "next/link";
import type { Project } from "@/content";

/**
 * The foot of the plate: previous and next as two lines of data.
 *
 * This used to be two full <Row>s — two project names at display-s, two meta
 * lines, two arrows and two hover fills — restating a quarter of the work index
 * under a page of 198 words. The crawl path and the reader's next step are the
 * whole job here, and both are done by a link with a name on it.
 *
 * No `view-transition-name`: §5.8 pairs exactly one element per project across
 * routes (the index row's title and the case-study h1), and naming these would
 * put two more groups in flight over the root's dot mask on every navigation.
 */
export function ProjectNav({ prev, next }: { prev: Project; next: Project }) {
  return (
    <nav aria-label="More work" className="plate-foot shell">
      <Link href={`/projects/${prev.slug}`} className="text-small tap">
        <span className="foot-label meta">
          Prev
        </span>
        <span className="dot-underline">{prev.name}</span>
      </Link>
      <Link href={`/projects/${next.slug}`} className="text-small tap">
        <span className="foot-label meta">
          Next
        </span>
        <span className="dot-underline">{next.name}</span>
      </Link>
    </nav>
  );
}
