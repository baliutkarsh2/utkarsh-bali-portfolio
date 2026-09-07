import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ColumnRule } from "@/components/writing/column-rule";
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
 * A hosted post (§7.6), set as a column. Only posts with a body reach this
 * route — external pieces never enter generateStaticParams — so today it
 * builds zero pages and is ready for the first one that lives here.
 *
 * This is the only page on the site whose job is uninterrupted reading, so it
 * is the only one that indents. Three things follow from that and nothing
 * else on the site does any of them:
 *
 *   THE MEASURE     one column of about 68ch and no rail. Nothing sits beside
 *                   the text competing for the eye, because on this page
 *                   there is nothing to compete with: there is one thing to
 *                   do here and it is read.
 *
 *   THE DROP CAP    a Bodoni initial over about five lines of the first
 *                   paragraph. It is the mark that says the reading starts
 *                   HERE, which a page with one entry point can afford and an
 *                   index cannot.
 *
 *   THE MARGIN      notes and pull quotes hang in a column to the left of the
 *                   measure at the height of the sentence they answer,
 *                   because they are authored at that point in the MDX. The
 *                   hairline that separates the margin from the measure is
 *                   also the reading progress: it draws downward as the
 *                   reader scrolls (see ColumnRule). A progress bar would
 *                   have been a fifth element on a page whose whole argument
 *                   is that there are only two.
 *
 * Words never animate. The only thing on this page that moves is one
 * hairline, and it is scrubbed by scroll rather than timed.
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

      {/* The way back, and nothing else. The sub-bar used to carry the dotted
          progress row along its bottom edge; progress is the margin rule
          now, so the bar is a link on a sticky ground and the one accent it
          used to spend is spent nowhere. */}
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
            <span className="dot-underline">Writing</span>
          </Link>
        </div>
      </div>

      <article className="shell pt-16 pb-8 md:pt-20">
        <div className="column">
          <ColumnRule />

          <header className="column-head">
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

          <div className="column-body prose pt-12">
            <Body />
          </div>
        </div>
      </article>
    </>
  );
}
