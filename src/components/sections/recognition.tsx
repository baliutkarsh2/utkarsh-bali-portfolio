import { Row } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { achievements } from "@/content";

/**
 * /experience §7.7, section 02. Every achievement is one <Row>: the year in
 * the gutter, the label in display-s, the detail in small --ink-2, the kind
 * as the meta line. Rows with an href (YC, NeurIPS) are whole-row links with
 * the arrow; the rest are static. No numerals and no LED: the spine above is
 * the page's accent, and the rows here are words.
 *
 * The gutter is drawn for a two-digit index; a year span ("2024 to 2026")
 * needs more, so `.recognition .row` in components.css widens it. The rows
 * run the full shell (`section-wide`) so the hover fill reaches both edges.
 */
export function Recognition() {
  return (
    <Section index="02" title="Recognition" id="recognition" className="recognition section-wide">
      <ul className="rows">
        {achievements.map((item) => (
          <li key={item.label}>
            <Row
              index={item.year}
              title={item.label}
              subtitle={item.detail}
              meta={item.kind}
              href={item.href}
              titleAs="h3"
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
