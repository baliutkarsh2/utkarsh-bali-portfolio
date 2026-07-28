import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

export type Post = {
  slug: string;
  title: string;
  summary: string;
  date: string; // ISO
  tags: string[];
  draft: boolean;
  readingMinutes: number;
};

const POSTS_DIR = join(process.cwd(), "src/content/writing");

/** ~200 wpm on the prose body, floored at one minute. */
function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function parse(filename: string): Post {
  const slug = filename.replace(/\.mdx$/, "");
  const raw = readFileSync(join(POSTS_DIR, filename), "utf8");
  const { data, content } = matter(raw);

  if (!data.title || !data.date) {
    throw new Error(`Post "${slug}" is missing a required title or date in its frontmatter.`);
  }

  return {
    slug,
    title: String(data.title),
    summary: String(data.summary ?? ""),
    date: String(data.date),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: data.draft === true,
    readingMinutes: readingMinutes(content),
  };
}

/**
 * The same .mdx file is read two ways: the bundler imports it for the
 * component, and this reads its frontmatter for the index, RSS, sitemap, OG
 * images and generateStaticParams. One source of truth, no codegen step.
 */
function allPosts(): Post[] {
  let files: string[];
  try {
    files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  } catch {
    return []; // no posts directory yet
  }
  return files.map(parse).sort((a, b) => b.date.localeCompare(a.date));
}

/** Drafts render in dev so they can be previewed, and never in production. */
export function publishedPosts(): Post[] {
  const posts = allPosts();
  return process.env.NODE_ENV === "development" ? posts : posts.filter((p) => !p.draft);
}

export function getPost(slug: string): Post | undefined {
  return publishedPosts().find((p) => p.slug === slug);
}

export function recentPosts(count: number): Post[] {
  return publishedPosts().slice(0, count);
}

export function allTags(): string[] {
  return [...new Set(publishedPosts().flatMap((p) => p.tags))].sort();
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
