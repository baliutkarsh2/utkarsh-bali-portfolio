import type { CSSProperties } from "react";
import { Reveal } from "@/components/interactive/reveal";
import { DotLeader } from "@/components/ui/dot-leader";
import { Section } from "@/components/ui/section";
import { skillGroups } from "@/content";

/**
 * /about §7.2, section 03: a table of contents, not a scoreboard. Five
 * groups, two per row from 64rem, each under its own hairline. Inside a
 * group the name sits in a meta column on the left (from 40rem; stacked
 * above on a phone) and every skill is one <DotLeader> row: the label, then
 * dots at the pitch running to the right edge. No chips, no bars.
 *
 * The leaders are the one thing here that moves: they draw in over --dur-5
 * when the group enters view. <Reveal> lands `data-in` on the list, and each
 * <li> carries `--i` so its leader starts `--i × --stagger` (40 ms) after the
 * one above, top to bottom. The index is set inline rather than through
 * Reveal's `stagger` prop because that prop numbers the wrapper's direct
 * children, and here the direct child is the <ul>. Without JS, or under
 * reduced motion, the leaders are simply drawn (the CSS gates itself).
 */
export function Toolkit() {
  return (
    <Section index="03" title="Toolkit" id="toolkit" className="section-wide">
      <div className="grid gap-y-12 lg:grid-cols-2 lg:gap-x-(--gutter) lg:gap-y-16">
        {skillGroups.map((group) => (
          <div
            key={group.name}
            className="grid gap-y-4 border-t border-line pt-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-6"
          >
            <h3 className="meta text-ink-3">{group.name}</h3>
            <Reveal>
              <ul>
                {group.skills.map((skill, i) => (
                  <li key={skill} style={{ "--i": i } as CSSProperties}>
                    <DotLeader label={skill} />
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        ))}
      </div>
    </Section>
  );
}
