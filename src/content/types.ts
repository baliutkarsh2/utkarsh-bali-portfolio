export type LinkKind = "repo" | "demo" | "video" | "site" | "paper";

export type ProjectLink = {
  label: string;
  href: string;
  kind: LinkKind;
};

/**
 * Slots for media the site does not have yet. Every consumer must handle these
 * being undefined — see `SpecPlate`, which renders a typographic panel at the
 * same aspect ratio so layout does not shift when a real image lands.
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
  /** ISO date — deterministic ordering and sitemap lastModified. */
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
  /** Work under NDA — suppresses any "view source" affordance. */
  confidential?: boolean;
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
