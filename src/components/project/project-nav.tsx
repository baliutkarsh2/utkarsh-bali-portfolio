import Link from "next/link";
import type { Project } from "@/content";

/**
 * The foot of the plate: the catchword, with prev and next demoted under it.
 *
 * The catchword is the mark here and the two rows are the machinery. That is
 * the right way round, and it used to be the wrong one: the same navigational
 * work was being done by two lines of 16px serif with the project names set at
 * reading size, which is twice the height for the same job at the foot of a
 * page of 198 words. Prev/next are now one small mono block — a label and a
 * name, the site's data grammar — and the display mark on the sheet is the
 * single italic word hanging at the bottom right, where a binder would look
 * for it.
 *
 * The word itself is computed in the route (see the note there): it is the
 * first word of the *next* case study's opening sentence, so it is generated
 * from content and can never disagree with the page it points at.
 *
 * It is a real <Link> and it does real navigational work — it goes exactly
 * where the "Next" row goes. The hidden tail inside it is what turns a bare
 * word into an accessible name without changing what is printed: the visible
 * text is still the first thing in the accessible name, which is what a link
 * with a cryptic label needs.
 *
 * No `view-transition-name` on any of the three: §5.8 pairs exactly one element
 * per project across routes (the index row's title and the case-study h1), and
 * naming these would put three more groups in flight over the root's dot mask
 * on every navigation.
 */
export function ProjectNav({
  prev,
  next,
  catchword,
}: {
  prev: Project;
  next: Project;
  catchword: string;
}) {
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

      {catchword && (
        <Link href={`/projects/${next.slug}`} className="catchword tap">
          {catchword}
          <span className="sr-only">
            {" "}
            — the catchword: the first word of {next.name}, the next plate
          </span>
        </Link>
      )}
    </nav>
  );
}
