import { Row } from "@/components/ui/row";
import type { Project } from "@/content";

/**
 * Previous / next at the foot of a case study (§7.4.7): two <Row>s, the
 * names in display-s, "Previous" / "Next" in meta beneath. The same list as
 * everywhere else on the site.
 *
 * No `view-transition-name` here on purpose. §5.8 pairs exactly one element
 * per project across routes, the index row title and the case-study h1;
 * naming these rows as well would add two more groups flying off-screen
 * over the root's dot mask on every index → case-study navigation. No
 * headings either: this is navigation, not a section.
 */
export function ProjectNav({ prev, next }: { prev: Project; next: Project }) {
  return (
    <nav aria-label="More work" className="shell">
      <div className="rows">
        <Row titleAs="div" title={prev.name} meta="Previous" href={`/projects/${prev.slug}`} />
        <Row titleAs="div" title={next.name} meta="Next" href={`/projects/${next.slug}`} />
      </div>
    </nav>
  );
}
