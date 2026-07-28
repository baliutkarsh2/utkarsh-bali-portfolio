import { SectionHeading } from "@/components/ui/section-heading";
import { TagRow } from "@/components/ui/tag";
import { experiences } from "@/content";

export function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title" className="shell section-y">
      <SectionHeading
        index="05"
        eyebrow="Experience"
        title="Where I've worked."
        id="experience-title"
      />

      <ol className="mt-12">
        {experiences.map((role) => (
          <li key={`${role.company}-${role.dates}`} className="border-t border-rule last:border-b">
            <div className="grid gap-y-4 py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-x-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-display-s font-display leading-none">{role.company}</h3>
                  {role.current && (
                    <span className="meta shrink-0 border border-rule px-1.5 py-1 text-faint">
                      Current
                    </span>
                  )}
                </div>
                <p className="meta mt-3 text-faint">{role.dates}</p>
                <p className="meta mt-1.5 text-faint">{role.location}</p>
              </div>

              <div>
                <p className="text-base font-medium">{role.role}</p>
                <p className="measure mt-3 text-pretty leading-7 text-muted">{role.summary}</p>

                <ul className="mt-5 space-y-2.5">
                  {role.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-6 text-muted">
                      <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-faint" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  <TagRow items={role.tags} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
