import { SectionHeading } from "@/components/ui/section-heading";
import { skillGroups } from "@/content";

export function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-title" className="shell section-y">
      <SectionHeading
        index="06"
        eyebrow="Toolkit"
        title="What I reach for."
        id="skills-title"
      />

      <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {skillGroups.map((group) => (
          <div key={group.name} className="border-t border-rule pt-5">
            <h3 className="meta text-faint">{group.name}</h3>
            <ul className="mt-4 space-y-2">
              {group.skills.map((skill) => (
                <li key={skill} className="text-sm text-muted">
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
