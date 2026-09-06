import { Section } from "@/components/ui/section";
import { SpecList } from "@/components/ui/spec-list";
import { now } from "@/content";
import { formatDate } from "@/lib/utils";

/**
 * Section 01 (§7.1): what is happening this week. The headline is the
 * section title; the body sits at the prose measure with the three points
 * as a dot list (4 px --ink bullets at the pitch); the rail is a SpecList
 * whose top edge is --line-strong, never --sun, because the numbers board's
 * accent figure may still be on screen. `updated` stays visible so a stale
 * entry is honest rather than misleading.
 */
export function Now({ index = "01" }: { index?: string }) {
  const rows = [
    { term: "Organisation", value: now.org },
    { term: "Role", value: now.role },
    { term: "Location", value: now.location },
    { term: "Period", value: now.period },
    {
      term: "Updated",
      value: <time dateTime={now.updated}>{formatDate(now.updated)}</time>,
    },
  ];

  return (
    <Section
      index={index}
      title={now.headline}
      id="now"
      rail={<SpecList rows={rows} />}
      railLabel="Now, at a glance"
    >
      <p className="measure text-body text-ink-2">{now.body}</p>

      <ul className="dot-list measure mt-8 text-body text-ink-2">
        {now.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </Section>
  );
}
