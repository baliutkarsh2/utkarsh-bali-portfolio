import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  /**
   * "01", "02" … Only the SectionSpy's hook now: it is never rendered. The
   * numeral used to hang over every section title and it is gone site-wide —
   * a page of three sections does not need to count itself out loud.
   */
  index?: string;
  title: string;
  id?: string;
  children: ReactNode;
  className?: string;
};

/**
 * The shared grammar of every page (§7): a top hairline, a meta index, a
 * display-m title, copy on 7 of 12 columns, an optional rail. Nothing is
 * centred. The section carries `data-section-index` / `data-section-title`
 * for the header's SectionSpy, which writes "SELECTED WORK" into the readout
 * as the section comes into view.
 *
 * The right rail is gone: `rail` and `railLabel` were never passed by any of
 * the three call sites, and neither was `readout`, which existed for a title
 * long enough to be a sentence. No title on the site is.
 */
export function Section({ index = "", title, id, children, className }: SectionProps) {
  const sectionId = id ?? `section-${index}`;
  const headingId = `${sectionId}-title`;

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      data-section-index={index}
      data-section-title={title}
      className={cn("section shell section-y", className)}
    >
      <div className="section-head">
        <h2 id={headingId} className="text-display-m font-medium text-balance text-ink">
          {title}
        </h2>
      </div>

      <div className="section-body">
        <div className="section-copy">{children}</div>
      </div>
    </section>
  );
}
