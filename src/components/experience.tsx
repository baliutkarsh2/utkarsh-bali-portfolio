import { experiences } from "@/lib/content";
import { SectionHeading } from "@/components/ui/section-heading";

export function Experience() {
  return (
    <section id="experience" className="section-shell">
      <SectionHeading eyebrow="Experience" title="Places I&apos;ve built and learned.">
        A short version of the work behind the projects: internships, research,
        and startups.
      </SectionHeading>

      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 md:grid-cols-2">
          {experiences.map((experience) => (
            <article
              key={`${experience.company}-${experience.role}`}
            >
              <div className="h-full rounded-[1.6rem] border-2 border-foreground/10 bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">
                      {experience.company}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-accent">{experience.role}</p>
                  </div>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {experience.dates}
                  </p>
                </div>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  {experience.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {experience.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="tech-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
