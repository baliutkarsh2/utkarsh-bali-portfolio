import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatPostDate, publishedPosts, recentPosts } from "@/lib/writing";
import { ordinal } from "@/lib/utils";

export function Writing({ index = "03" }: { index?: string }) {
  const posts = recentPosts(3);
  if (posts.length === 0) return null;

  const total = publishedPosts().length;

  return (
    <section id="writing" aria-labelledby="writing-title" className="shell section-y">
      <SectionHeading
        index={index}
        eyebrow="Writing"
        title="Things worth thinking about twice."
        id="writing-title"
      />

      {/* Reuses .index-row verbatim, so this costs no new CSS and reads as
          part of the same system as the work index. */}
      <ul className="mt-12">
        {posts.map((post, index) => (
          <li key={post.slug} className="index-row border-t border-rule last:border-b">
            <div className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-6 md:grid-cols-[3rem_minmax(0,1fr)_9rem_1.5rem] md:gap-x-6 md:py-7">
              <span aria-hidden className="row-num meta">
                {ordinal(index)}
              </span>

              <div className="min-w-0">
                <h3 className="text-display-s font-display">
                  {post.external ? (
                    <a
                      href={post.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="stretch-link"
                    >
                      {post.title}
                    </a>
                  ) : (
                    <Link href={post.href} className="stretch-link">
                      {post.title}
                    </Link>
                  )}
                </h3>
                {post.summary && (
                  <p className="mt-1.5 max-w-lg text-pretty text-sm leading-6 text-muted">
                    {post.summary}
                  </p>
                )}
                {post.external && (
                  <span className="meta mt-2 inline-block border border-rule px-1.5 py-1 text-faint">
                    {post.external.publisher}
                  </span>
                )}
              </div>

              <div className="hidden md:block">
                <time dateTime={post.date} className="meta block text-faint">
                  {formatPostDate(post.date)}
                </time>
                <span className="meta mt-1.5 block text-faint">
                  {post.readingMinutes} min read
                </span>
              </div>

              <ArrowUpRight
                aria-hidden
                className="row-arrow size-4 shrink-0 justify-self-end text-faint"
              />
            </div>
          </li>
        ))}
      </ul>

      {total > posts.length && (
        <Link
          href="/writing"
          className="tap group mt-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <span className="link-underline">All writing ({total} posts)</span>
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </section>
  );
}
