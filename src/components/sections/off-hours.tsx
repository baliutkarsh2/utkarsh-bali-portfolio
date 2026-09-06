import { Section } from "@/components/ui/section";
import { interests, music, reading } from "@/content";

/**
 * /about §7.2, section 04: three meta-headed lists under hairlines, three
 * columns from 64rem and stacked below. Reading carries the author after the
 * title in --ink-3 (at body size, well above the 11 px floor for that ink);
 * Listening and Chasing are plain lists in --ink-2. Warmth, no ornament.
 */
export function OffHours() {
  return (
    <Section index="04" title="Off hours" id="off-hours" className="section-wide">
      <div className="grid gap-y-12 lg:grid-cols-3 lg:gap-x-(--gutter)">
        <div className="border-t border-line pt-6">
          <h3 className="meta text-ink-3">Reading</h3>
          <ul className="mt-5 space-y-2 text-body">
            {reading.map((book) => (
              <li key={book.title}>
                <span className="text-ink">{book.title}</span>{" "}
                <span className="text-ink-3">{book.author}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-line pt-6">
          <h3 className="meta text-ink-3">Listening</h3>
          <ul className="mt-5 space-y-2 text-body text-ink-2">
            {music.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="border-t border-line pt-6">
          <h3 className="meta text-ink-3">Chasing</h3>
          <ul className="mt-5 space-y-2 text-body text-ink-2">
            {interests.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
