import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProgressRow } from "@/components/interactive/progress-row";
import { Tag, TagRow } from "@/components/ui/tag";
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

/**
 * A hosted post (§7.6). Only posts with a body reach this route: external
 * pieces never enter generateStaticParams, so today it builds zero pages and
 * is ready for the first one that lives here.
 *
 * Structure, top to bottom: a sticky sub-bar under the header ("← Writing"
 * and the progress row of dots along its bottom edge, the one --sun element
 * on a post screen), then the article on the prose column: the data row,
 * the h1, the summary as lede, the tags as one meta line, and the MDX body
 * inside `.prose`. Contact closes the page as it does everywhere.
 *
 * Words never animate. The only thing on this page that moves is the
 * progress row, and it is scrubbed by scroll, not timed.
 */
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

      {/* Sub-bar: the case study's `.case-bar`, in flow under the 3.5rem
          fixed header (hence mt-14) and then sticky at its bottom edge, the
          ground at 80 % with no blur (the header and the palette scrim are
          the only two blurred surfaces on the site, §2). The underline draws
          on the label span, not the anchor, because `transition-colors` on
          the same element would reset the underline's transition. The
          progress row is in flow as the bar's bottom edge, so its dots are
          never painted over the link. */}
      <div className="case-bar mt-14">
        <div className="shell flex h-11 items-center">
          <Link
            href="/writing"
            className="group tap inline-flex items-center gap-2 text-small text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
            />
            <span className="dot-underline group-hover:[--u:100%] group-focus-visible:[--u:100%]">
              Writing
            </span>
          </Link>
        </div>
        <ProgressRow />
      </div>

      <article className="shell pt-16 md:pt-20">
        <header className="max-w-prose border-b border-line pb-8">
          <p className="data flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-3">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
            {/* Drafts are only in publishedPosts() in development, so the
                tag is a dev-only marker without any extra gating here. */}
            {post.draft && <Tag>Draft</Tag>}
          </p>

          <h1 className="mt-6 text-display-l text-ink">{post.title}</h1>

          {post.summary && <p className="mt-6 text-lede text-ink-2">{post.summary}</p>}

          {post.tags.length > 0 && (
            <div className="mt-6">
              <TagRow items={post.tags} label="Tags" />
            </div>
          )}
        </header>

        <div className="prose py-12">
          <Body />
        </div>
      </article>

      {/* A post has no numbered sections, so the close is the first. */}
    </>
  );
}
