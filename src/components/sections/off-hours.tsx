import { SectionHeading } from "@/components/ui/section-heading";
import { interests, mission, music, reading } from "@/content";

export function OffHours() {
  return (
    <section id="off-hours" aria-labelledby="off-hours-title" className="shell section-y">
      <SectionHeading
        index="07"
        eyebrow="Off hours"
        title="What I'm reading, listening to, and chasing."
        id="off-hours-title"
      />

      <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-t border-rule pt-5">
          <h3 className="meta text-faint">Currently reading</h3>
          <ul className="mt-4 space-y-3">
            {reading.map((book) => (
              <li key={book.title}>
                <p className="text-sm">{book.title}</p>
                <p className="mt-0.5 text-sm text-faint">{book.author}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-rule pt-5">
          <h3 className="meta text-faint">In rotation</h3>
          <ul className="mt-4 space-y-2">
            {music.map((item) => (
              <li key={item} className="text-sm text-muted">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-rule pt-5">
          <h3 className="meta text-faint">Interests</h3>
          <ul className="mt-4 space-y-2">
            {interests.map((item) => (
              <li key={item} className="text-sm text-muted">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-rule pt-5">
          <h3 className="meta text-faint">The mission</h3>
          <p className="mt-4 font-display text-xl italic leading-snug">
            &ldquo;{mission}&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
