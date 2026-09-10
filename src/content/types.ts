export type LinkKind = "repo" | "demo" | "video" | "site" | "paper";

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

export type ProjectStatus = "shipped" | "archived" | "research" | "ongoing";

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
  /** Work under NDA, suppresses any "view source" affordance. */
  /**
   * Why there is no public source, where there is none. "company" is an
   * employer's codebase under NDA; "lab" is a research group's, which is not
   * under NDA but is not mine to publish either. The two want different
   * sentences and different index labels -- "NDA" is wrong for a lab -- which
   * is why this is not a boolean.
   */
  confidential?: "company" | "lab";
};

export type Experience = {
  company: string;
  role: string;
  location: string;
  dates: string;
  sortDate: string;
  current: boolean;
  summary: string;
  bullets: string[];
  tags: string[];
};

export type SkillGroup = {
  name: string;
  skills: string[];
};

export type AchievementKind = "academic" | "research" | "startup" | "community";

export type Achievement = {
  label: string;
  detail: string;
  year: string;
  kind: AchievementKind;
  href?: string;
};

export type SocialKind = "email" | "github" | "linkedin" | "x";

export type Social = {
  label: string;
  href: string;
  kind: SocialKind;
};
