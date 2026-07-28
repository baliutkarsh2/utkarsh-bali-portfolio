import type { MetadataRoute } from "next";
import { orderedProjects } from "@/content";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = orderedProjects
    .map((project) => project.sortDate)
    .sort()
    .at(-1);

  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: absoluteUrl("/projects"),
      lastModified: newest ? new Date(newest) : new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...orderedProjects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: new Date(project.sortDate),
      changeFrequency: "yearly" as const,
      priority: project.featured ? 0.7 : 0.5,
    })),
  ];
}
