import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  /** "01", "02" … IBM Plex Mono meta in --ink-3. Data only; never a sentence. */
  index: string;
  title: string;
  /**
   * Short label for the header readout when the title is a sentence.
   * "01 THIS SUMMER I BUILT THE AGENT …" is not a section name.
   */
  readout?: string;
  id?: string;
  /** Right rail, 4 of 12 columns from column 9, sticky at ≥ 64rem. */
  rail?: ReactNode;
  /**
   * Names the rail as a complementary landmark. Without it the rail is a
   * plain div: an unnamed, or decorative, aside is noise in a landmark list.
   */
  railLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * The shared grammar of every page (§7): a top hairline, a meta index, a
 * display-m title, copy on 7 of 12 columns, an optional rail. Nothing is
 * centred. The section carries `data-section-index` / `data-section-title`
 * for the header's SectionSpy, which writes "02 SELECTED WORK" into the
 * readout as the section comes into view. The index is aria-hidden; the
 * heading carries the text.
 */
export function Section({ index, title, readout, id, rail, railLabel, children, className }: SectionProps) {
  const sectionId = id ?? `section-${index}`;
  const headingId = `${sectionId}-title`;

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      data-section-index={index}
      data-section-title={readout ?? title}
      className={cn("section shell section-y", className)}
    >
      <div className="section-head">
        <span className="meta text-ink-3" aria-hidden="true">
          {index}
        </span>
        <h2 id={headingId} className="text-display-m font-medium text-balance text-ink">
          {title}
        </h2>
      </div>

      <div className="section-body">
        <div className="section-copy">{children}</div>
        {rail &&
          (railLabel ? (
            <aside className="section-rail" aria-label={railLabel}>
              {rail}
            </aside>
          ) : (
            <div className="section-rail">{rail}</div>
          ))}
      </div>
    </section>
  );
}
