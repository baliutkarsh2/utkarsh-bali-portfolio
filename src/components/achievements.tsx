import { Award, BookOpen, GraduationCap, Users } from "lucide-react";
import { achievements } from "@/lib/content";
import { SectionHeading } from "@/components/ui/section-heading";

const icons = [Award, BookOpen, GraduationCap, Users, Award];

export function Achievements() {
  return (
    <section id="achievements" className="section-shell">
      <SectionHeading eyebrow="Recognition" title="A few things outside the project list.">
        Some academic, research, and teaching context.
      </SectionHeading>

      <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2">
        {achievements.map((item, index) => {
          const Icon = icons[index] ?? Award;
          return (
            <article
              key={item.label}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
