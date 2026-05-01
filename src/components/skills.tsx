import { BrainCircuit, Code2, Cpu, Layers3 } from "lucide-react";
import { skillGroups } from "@/lib/content";
import { SectionHeading } from "@/components/ui/section-heading";

const icons = [BrainCircuit, Cpu, Code2, Layers3];

export function Skills() {
  return (
    <section id="skills" className="section-shell">
      <SectionHeading eyebrow="Stack" title="The tools I reach for when I build.">
        I like being able to move between various tools when the goal is to ship something real.
      </SectionHeading>

      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
        {skillGroups.map((group, index) => {
          const Icon = icons[index] ?? Code2;
          return (
            <article key={group.name} className="rounded-[1.6rem] border-2 border-foreground/10 bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-foreground bg-highlight text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">{group.name}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <span key={skill} className="tech-chip">
                    {skill}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
