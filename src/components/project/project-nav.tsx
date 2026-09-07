import Link from "next/link";
import type { Project } from "@/content";

/**
 * The foot of a case study: prev and next, as one small mono block — a label
 * and a name, the site's data grammar.
 *
 * A third element used to sit above them and outrank them: the catchword, a
 * single italic word hanging at the bottom right, the first word of the next
 * case study's opening sentence, the way a binder's sheet carried the first
 * word of the sheet that followed. It was generated from the content and so
 * could never go stale, and for two of the eight projects it came out as a
 * bare "I" or "A". That is what a real catchword looks like, and it is also a
 * link whose label tells a reader nothing. Prev and next do the navigating.
 *
 * No `view-transition-name` on either: §5.8 pairs exactly one element per
 * project across routes (the index row's title and the case-study h1), and
 * naming these would put more groups in flight over the root's dot mask on
 * every navigation.
 */
export function ProjectNav({ prev, next }: { prev: Project; next: Project }) {
  return (
    <nav aria-label="More work" className="plate-foot shell">
      <div className="foot-rows">
        <Link href={`/projects/${prev.slug}`} className="foot-row data tap">
          <span className="foot-label meta">Prev</span>
          <span className="dot-underline">{prev.name}</span>
        </Link>
        <Link href={`/projects/${next.slug}`} className="foot-row data tap">
          <span className="foot-label meta">Next</span>
          <span className="dot-underline">{next.name}</span>
        </Link>
      </div>
    </nav>
  );
}
