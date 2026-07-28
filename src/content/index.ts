import { projects } from "./projects";
import type { Project } from "./types";

export * from "./types";
export { profile, socials, navItems } from "./profile";
export { now } from "./now";
export { projects } from "./projects";
export { experiences } from "./experience";
export { achievements } from "./recognition";
export { skillGroups } from "./skills";
export * from "./personal";

/** Featured first, then newest first. Stable, drives routing and sitemap order. */
export const orderedProjects: Project[] = [...projects].sort((a, b) => {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return b.sortDate.localeCompare(a.sortDate);
});

export const featuredProjects: Project[] = orderedProjects.filter((p) => p.featured);

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/** Previous/next in `orderedProjects`, wrapping at both ends. */
export function adjacentProjects(slug: string): { prev: Project; next: Project } | null {
  const i = orderedProjects.findIndex((p) => p.slug === slug);
  if (i === -1 || orderedProjects.length < 2) return null;
  const len = orderedProjects.length;
  return {
    prev: orderedProjects[(i - 1 + len) % len],
    next: orderedProjects[(i + 1) % len],
  };
}

export const statusLabel: Record<Project["status"], string> = {
  shipped: "Shipped",
  archived: "Archived",
  research: "Research",
  ongoing: "Ongoing",
};
