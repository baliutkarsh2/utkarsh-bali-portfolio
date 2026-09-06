import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SpecListProps = {
  rows: { term: string; value: ReactNode }[];
  /** Four-up grid (the case-study masthead) instead of stacked rows. */
  inline?: boolean;
  className?: string;
};

/**
 * A hairlined definition list: meta terms, small tabular values. The rail's
 * top edge is --line-strong, never --sun (rule 3: the numbers board above may
 * still be in view). `updated` and the like stay visible so staleness is
 * honest; nothing here is hidden behind a hover.
 */
export function SpecList({ rows, inline = false, className }: SpecListProps) {
  return (
    <dl className={cn("spec-list", className)} data-inline={inline ? "" : undefined}>
      {rows.map((row) => (
        <div key={row.term}>
          <dt className="meta text-ink-3">{row.term}</dt>
          <dd className="text-small">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
