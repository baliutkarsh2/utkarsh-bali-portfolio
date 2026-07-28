import { SectionHeading } from "@/components/ui/section-heading";
import { now } from "@/content";
import { formatDate } from "@/lib/utils";

export function Now() {
  return (
    <section id="now" aria-labelledby="now-title" className="shell section-y">
      <SectionHeading index="02" eyebrow="Now" title={now.headline} id="now-title" />

      <div className="grid-editorial !mx-0 !max-w-none !px-0 mt-12">
        <div className="col-span-full md:col-span-5 lg:col-span-7">
          <p className="measure text-pretty text-lede text-muted">{now.body}</p>

          <ul className="mt-8">
            {now.points.map((point) => (
              <li key={point} className="flex gap-4 border-t border-rule py-4">
                <span aria-hidden className="meta shrink-0 pt-1 text-faint">
                  —
                </span>
                <span className="text-sm leading-6 text-muted">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Meta block — the register that makes it read as a record, not a blurb. */}
        <dl className="col-span-full mt-10 self-start border border-rule md:col-span-3 md:col-start-6 md:mt-0 lg:col-span-4 lg:col-start-9">
          {[
            { term: "Organisation", value: now.org },
            { term: "Role", value: now.role },
            { term: "Location", value: now.location },
            { term: "Period", value: now.period },
          ].map((row) => (
            <div
              key={row.term}
              className="flex items-baseline justify-between gap-4 border-b border-rule px-4 py-3"
            >
              <dt className="meta text-faint">{row.term}</dt>
              <dd className="text-sm">{row.value}</dd>
            </div>
          ))}
          <div className="px-4 py-3">
            <p className="meta text-faint">
              Last updated <time dateTime={now.updated}>{formatDate(now.updated)}</time>
            </p>
          </div>
        </dl>
      </div>
    </section>
  );
}
