/**
 * The band under the hero. Every number here is claimed somewhere else on the
 * site with its full context, so this is a summary, never the only place a
 * figure appears. Keep it under about a dozen items: the marquee duplicates
 * the track, so each entry is rendered twice.
 */
export type Metric = {
  value: string;
  label: string;
  /** At most one or two: the figure sets in the accent colour. */
  accent?: boolean;
};

export const metrics: Metric[] = [
  { value: "3K+", label: "users across 22+ countries" },
  { value: "<1%", label: "task failure rate at scale" },
  { value: "45+", label: "tools and sub-agents unified" },
  { value: "0.844", label: "AUROC on hypothesis verification" },
  { value: "Top 10%", label: "of YC S26 applicants", accent: true },
  { value: "~3x", label: "faster shipping at Recurly" },
  { value: "300+", label: "students taught" },
  { value: "~25%", label: "compute spend cut at Microsoft" },
];
