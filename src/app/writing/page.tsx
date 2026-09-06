import type { Metadata } from "next";
import { Contact } from "@/components/sections/contact";
import { Row } from "@/components/ui/row";
import { Tag } from "@/components/ui/tag";
import { formatPostDate, publishedPosts } from "@/lib/writing";
import { ordinal } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Occasional essays by Utkarsh Bali on software, life, art, and philosophy.",
  alternates: { canonical: "/writing" },
};

/**
 * The writing index (§7.5): a meta count, the h1, then every published post
 * as one <Row> in the site's single list grammar. A piece published elsewhere
 * (Medium today) opens in a new tab with the outward arrow and the sr-only
 * notice; a hosted post routes to /writing/[slug]. There is no RSS link in
 * the UI: the feed route still builds, and it comes back the day a post
 * lives here rather than elsewhere.
 *
 * Server component. Nothing on this page animates: rows are words.
 */
export default function WritingPage() {
  const posts = publishedPosts();
  const count = posts.length;

  return (
    <>
      <header className="shell pt-24 pb-10 md:pt-28">
        <p className="meta text-ink-3">
          Index · {count} {count === 1 ? "post" : "posts"}
        </p>
        <h1 className="mt-4 text-display-l text-ink">Writing.</h1>
      </header>

      <div className="shell">
        {count === 0 ? (
          <p className="hairline border-b border-line py-10 text-body text-ink-2">
            Nothing published yet. The first post is being written.
          </p>
        ) : (
          <ul className="rows m-0 list-none p-0">
            {posts.map((post, index) => {
              const external = Boolean(post.external);
              return (
                <li key={post.slug}>
                  <Row
                    index={ordinal(index)}
                    title={post.title}
                    titleAs="h2"
                    subtitle={post.summary || undefined}
                    // The date line is set in the `data` register (mixed case,
                    // 13px tabular mono, §7.5) inside the row's meta slot; the
                    // slot's own uppercase and tracking are reset on the span.
                    meta={
                      <span className="data normal-case">
                        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                        <span aria-hidden="true"> · </span>
                        {post.readingMinutes} min
                      </span>
                    }
                    trailing={
                      external || post.draft ? (
                        <span className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end">
                          {post.external && <Tag>{post.external.publisher}</Tag>}
                          {post.draft && <Tag>Draft</Tag>}
                        </span>
                      ) : undefined
                    }
                    href={post.href}
                    external={external}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* The index has no numbered sections, so the close is the first. */}
      <Contact />
    </>
  );
}
