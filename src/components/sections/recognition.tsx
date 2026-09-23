import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Typeset } from "@/components/project/typeset";
import { Section } from "@/components/ui/section";
import { achievements } from "@/content";

/**
 * /about, section 03: what came of it.
 *
 * Two columns of entries at 64rem and up, one below. Each entry is the year in
 * mono (the only place the year appears, so it is read, not hidden), the
 * honour in the display face, and one line of detail in the reading face.
 * The two with a case study behind them (YC, NeurIPS) are whole-entry links
 * with the arrow.
 *
 * It used to be seven full-width rows, a year in a gutter and a display-s
 * title on each: 860 px of page at 1440 for seven lines of fact, with the
 * right half of every row bare because no honour is longer than half the
 * shell. Set in two columns the section is half as tall and uses the width.
 * An odd last entry takes both columns rather than leaving a hole beside it;
 * it is the teaching line, which is also the longest.
 *
 * Its own markup rather than <Row>: a row is a full-width list item with a
 * gutter, and this is a grid of short entries.
 */
export function Recognition() {
  return (
    <Section
      index="03"
      title="Recognition"
      id="recognition"
      className="recognition section-wide"
    >
      <ul className="recognition-list">
        {achievements.map((item) => (
          <li
            key={item.label}
            className="recognition-item"
            data-link={item.href ? "" : undefined}
          >
            <p className="recognition-year data">{item.year}</p>
            <h3 className="recognition-title text-display-s">
              {item.href ? (
                <Link className="recognition-link stretch-link" href={item.href}>
                  <Typeset>{item.label}</Typeset>
                </Link>
              ) : (
                <Typeset>{item.label}</Typeset>
              )}
            </h3>
            <p className="recognition-detail text-small">{item.detail}</p>
            {item.href && (
              <ArrowRight className="recognition-arrow" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
