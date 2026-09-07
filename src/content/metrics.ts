/**
 * The numbers under the hero (#proof). Three, not eight.
 *
 * Every figure the board used to carry already lives somewhere with its full
 * context — five of them are a project's own `metric`, the other three sit in
 * an experience bullet or an achievement — and it omitted two project metrics
 * entirely, so it was never a summary. It was an eight-cell grid that needed
 * filling, which is the most generic thing a portfolio can do.
 *
 * These three are three different KINDS of proof: someone else's judgement,
 * production scale, and research rigour. Each links to where it is earned.
 * A value used to have to be spellable in the Doto subset, and a prebuild check
 * failed the build when it was not. Bodoni has the whole alphabet: say what the
 * number honestly says.
 */
export type Metric = {
  value: string;
  label: string;
  /** Where the number is actually earned. The whole cell becomes the link. */
  href?: string;
  /** At most one: the figure sets in --sun, the board's one accent element. */
  accent?: boolean;
};

export const metrics: Metric[] = [
  {
    value: "Top 10%",
    label: "of YC Summer 2026 applicants",
    href: "/projects/checkpoint",
    accent: true,
  },
  { value: "<1%", label: "task failure rate at scale", href: "/projects/autonomous-app-crawler" },
  { value: "0.844", label: "AUROC on hypothesis verification", href: "/projects/clip-h" },
];
