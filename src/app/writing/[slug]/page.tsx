import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";
import { ScrollProgress } from "@/components/interactive/scroll-progress";
import { formatPostDate, getPost, hostedPosts } from "@/lib/writing";
import { absoluteUrl, jsonLd, personId } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return hostedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/writing/${slug}` },
    openGraph: {
      type: "article",
      url: `/writing/${slug}`,
      title: post.title,
      description: post.summary,
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.summary },
  };
}

export default async function PostPage({ params }: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Relative specifier, not "@/": path aliases inside a template literal are
  // the flakiest part of Turbopack's context-module building.
  const { default: Body } = await import(`../../../content/writing/${slug}.mdx`);

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${absoluteUrl(`/writing/${slug}`)}#post`,
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    keywords: post.tags.join(", "),
    url: absoluteUrl(`/writing/${slug}`),
    image: absoluteUrl(`/writing/${slug}/opengraph-image`),
    author: { "@id": personId },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />

      <div className="sticky top-14 z-40 border-b border-rule bg-background/85 backdrop-blur-md">
        <div className="shell flex h-11 items-center">
          <Link
            href="/writing"
            className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft
              aria-hidden
              className="size-3.5 transition-transform group-hover:-translate-x-1"
            />
            Writing
          </Link>
        </div>
        <ScrollProgress />
      </div>

      <article className="shell pt-14 sm:pt-20">
        <header className="enter border-b border-rule pb-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <time dateTime={post.date} className="meta text-faint">
              {formatPostDate(post.date)}
            </time>
            <span aria-hidden className="meta text-faint">
              /
            </span>
            <span className="meta text-faint">{post.readingMinutes} min read</span>
            {post.draft && (
              <span className="meta border border-rule px-1.5 py-1 text-faint">Draft</span>
            )}
          </div>

          <h1 className="mt-6 text-balance text-display-l font-display">{post.title}</h1>

          {post.summary && (
            <p
              className="measure mt-6 text-pretty text-lede text-muted"
              style={{ "--stagger": 1 } as React.CSSProperties}
            >
              {post.summary}
            </p>
          )}

          {post.tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex items-center border border-rule px-2 py-1 text-xs text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>

        <div className="prose py-12">
          <Body />
        </div>
      </article>

      <Reveal>
        <Contact />
      </Reveal>
    </>
  );
}
