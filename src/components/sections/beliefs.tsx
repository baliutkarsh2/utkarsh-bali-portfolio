import { Row } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { beliefs } from "@/content";
import { ordinal } from "@/lib/utils";

/**
 * /about §7.2, section 02. The three beliefs are numbered rows in the site's
 * one list grammar (<Row>: meta index in the gutter, title in display-s), with
 * the body under the title in body --ink-2 through the row's children slot,
 * since the subtitle slot is the `small` register. No href, so no hover fill
 * and no arrow: these are statements, not links.
 *
 * From 64rem the list is three columns; the `rows` container closes all
 * three with one bottom hairline. `section-wide` lets the columns run the
 * full shell rather than the 7-column prose measure.
 */
export function Beliefs() {
  return (
    <Section index="02" title="Beliefs" id="beliefs" className="section-wide">
      <ol className="rows lg:grid lg:grid-cols-3 lg:gap-x-(--gutter)">
        {beliefs.map((belief, i) => (
          <li key={belief.title}>
            <Row index={ordinal(i)} title={belief.title} titleAs="h3">
              <p className="mt-3 text-body text-ink-2">{belief.body}</p>
            </Row>
          </li>
        ))}
      </ol>
    </Section>
  );
}
