export type LinkKind = "repo" | "video" | "site";

export type ProjectLink = {
  label: string;
  href: string;
  kind: LinkKind;
};

/**
 * Optional media. Every consumer must handle these being undefined: there are
 * no placeholder plates, a project without a cover simply has no cover.
 */
export type MediaSlot = {
  kind: "image" | "video";
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export type ProjectStatus = "shipped" | "research" | "ongoing";

export type Project = {
  slug: string;
  name: string;
  eyebrow: string;
  /** One line for index rows. Distinct from `story` so cards never truncate prose. */
  tagline: string;
  year: string;
  /** ISO date, deterministic ordering and sitemap lastModified. */
  sortDate: string;
  status: ProjectStatus;
  featured: boolean;
  metric: string;
  /** What the number actually measures. Carries the hedge to the point of display. */
  metricLabel: string;
  role: string;
  org?: string;
  highlight: string;
  problem: string;
  story: string;
  built: string;
  architecture: string[];
  stack: string[];
  impact: string;
  learnings?: string[];
  links: ProjectLink[];
  cover?: MediaSlot;
  media?: MediaSlot[];
  /**
   * Why there is no public source, where there is none. "company" is an
   * employer's codebase, "lab" is a research group's; the two want different
   * sentences, which is why this is not a boolean.
   */
  confidential?: "company" | "lab";
};

export type Experience = {
  company: string;
  role: string;
  location: string;
  dates: string;
  sortDate: string;
  summary: string;
  bullets: string[];
};

export type Achievement = {
  label: string;
  detail: string;
  year: string;
  href?: string;
};

export type SocialKind = "email" | "github" | "linkedin" | "x";

export type Social = {
  label: string;
  href: string;
  kind: SocialKind;
};
