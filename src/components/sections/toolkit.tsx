import { Section } from "@/components/ui/section";
import { skillGroups } from "@/content";

/**
 * /about §7.2, section 02: a table, not a scoreboard. Five hairlined rows in
 * the SpecList grammar (`.toolkit` in components.css): the group name in the
 * meta column, its tools as one wrapped line joined by middots. Forty-six
 * tools in five rows rather than forty-six rows. Nothing here moves: tools
 * are words.
 */
export function Toolkit() {
  return (
    <Section index="02" title="Toolkit" id="toolkit" className="section-wide">
      <dl className="toolkit">
        {skillGroups.map((group) => (
          <div key={group.name}>
            <dt className="meta text-ink-3">{group.name}</dt>
            <dd>
              <ul className="toolkit-list text-body">
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
