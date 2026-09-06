/**
 * The numbers board under the hero (#proof). Every number here is claimed
 * somewhere else on the site with its full context, so this is a summary,
 * never the only place a figure appears. Eight entries fill the 4 x 2 grid.
 * Every value must be set from the Doto subset (DOT_GLYPHS in src/lib/fonts.ts);
 * the prebuild check fails otherwise.
 */
export type Metric = {
  value: string;
  label: string;
  /** At most one: the figure sets in --sun, the board's one accent element. */
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
