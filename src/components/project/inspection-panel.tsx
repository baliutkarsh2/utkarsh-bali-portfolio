"use client";

import { useEffect, useState } from "react";
import { Numeral } from "@/components/ui/numeral";
import { TagRow } from "@/components/ui/tag";
import type { Project } from "@/content";

/**
 * The attribute the Work index puts on its rows container. Every row wrapper
 * inside it carries `data-slug`; the panel finds the container by this
 * attribute and reads the slug off whichever row the pointer enters or focus
 * lands in. Change it here and in src/app/projects/page.tsx together.
 */
export const PROJECT_ROWS_ATTRIBUTE = "data-project-rows";

/** The panel exists only where the rail does (§7.3). */
const WIDE = "(min-width: 64rem)";

type InspectionProject = Pick<
  Project,
  "slug" | "metric" | "metricLabel" | "role" | "org" | "highlight" | "stack"
>;

type InspectionPanelProps = {
  projects: InspectionProject[];
};

/**
 * The Work index's inspection panel (§7.3): a sticky --ground-2 plate in the
 * rail that shows the hovered or focused row's metric at size l, its label,
 * role, organisation, highlight and stack. It replaces cover previews: five
 * of seven projects have no screenshot, and a number never needs a
 * placeholder.
 *
 * One delegated `pointerenter` (capture phase, since enter events do not
 * bubble) and one `focusin` listener on the rows container, armed only at
 * ≥ 64rem where the panel is visible. Content swaps with no animation: the
 * numeral has `warm` off, so a change of figure is a change of text and
 * nothing else. The last row entered stays shown on leave; the default is
 * the first project.
 *
 * The figure is always --ink (rule 3). The ongoing project's row LED is this
 * page's one --sun element, and the panel opens on that same project: a
 * --sun figure here would sit beside that LED on the first 1440 × 900 screen
 * as a second orange thing, whatever it says.
 */
export function InspectionPanel({ projects }: InspectionPanelProps) {
  const [slug, setSlug] = useState(projects[0]?.slug);

  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const rows = document.querySelector<HTMLElement>(`[${PROJECT_ROWS_ATTRIBUTE}]`);
    if (!rows) return;

    const read = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const next = target.closest<HTMLElement>("[data-slug]")?.dataset.slug;
      if (!next) return;
      // Functional update so an unchanged slug bails out before a render:
      // pointerenter fires for every element the pointer crosses inside a row.
      setSlug((current) => (current === next ? current : next));
    };

    const media = matchMedia(WIDE);
    let armed = false;

    const arm = () => {
      if (armed) return;
      armed = true;
      rows.addEventListener("pointerenter", read, true);
      rows.addEventListener("focusin", read);
    };
    const disarm = () => {
      if (!armed) return;
      armed = false;
      rows.removeEventListener("pointerenter", read, true);
      rows.removeEventListener("focusin", read);
    };
    const sync = () => (media.matches ? arm() : disarm());

    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      disarm();
    };
  }, []);

  const project = projects.find((p) => p.slug === slug) ?? projects[0];
  if (!project) return null;

  return (
    <aside className="inspect" aria-label="Inspection" data-slug={project.slug}>
      <Numeral value={project.metric} size="l" warm={false} as="p" />
      <p className="meta mt-4 text-ink-2">{project.metricLabel}</p>

      <div className="mt-8 border-t border-line pt-5">
        <p className="text-small text-ink">{project.role}</p>
        <p className="text-small text-ink-2">{project.org ?? "Independent"}</p>
      </div>

      <p className="mt-5 text-body text-ink-2">{project.highlight}</p>

      <div className="mt-5">
        <TagRow items={project.stack} label="Stack" />
      </div>
    </aside>
  );
}
