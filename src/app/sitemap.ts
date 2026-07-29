import type { MetadataRoute } from "next";
import { orderedProjects } from "@/content";
import { hostedPosts, publishedPosts } from "@/lib/writing";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = publishedPosts();
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
      url: absoluteUrl("/about"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/experience"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
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
    ...(posts.length > 0
      ? [
          {
            url: absoluteUrl("/writing"),
            lastModified: new Date(posts[0].date),
            changeFrequency: "weekly" as const,
            priority: 0.8,
          },
        ]
      : []),
    // Only pages this site actually serves. An external piece is not our URL.
    ...hostedPosts().map((post) => ({
      url: absoluteUrl(`/writing/${post.slug}`),
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
