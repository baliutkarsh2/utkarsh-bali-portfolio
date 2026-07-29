import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";
import { formatPostDate, publishedPosts } from "@/lib/writing";
import { ordinal } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Occasional essays by Utkarsh Bali on software, life, art, and philosophy.",
  alternates: { canonical: "/writing" },
};

export default function WritingPage() {
  const posts = publishedPosts();

  return (
    <>
      <header className="shell pb-12 pt-14 sm:pt-20">
        <div className="enter">
          <p className="meta text-faint">Writing</p>
          <h1 className="mt-6 text-balance text-display-l font-display">
            Things worth thinking about twice.
          </h1>
          <p
            className="measure mt-6 text-pretty text-lede text-muted"
            style={{ "--stagger": 1 } as React.CSSProperties}
          >
            Occasional essays on software, life, art, and philosophy. Pieces published
            elsewhere are marked and link out.
          </p>
        </div>
      </header>

      <div className="shell">
        {posts.length === 0 ? (
          <p className="border-t border-rule py-10 text-muted">
            Nothing published yet. The first post is being written.
          </p>
        ) : (
          <ul>
            {posts.map((post, index) => (
              <li key={post.slug} className="index-row border-t border-rule last:border-b">
                <div className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-6 md:grid-cols-[3rem_minmax(0,1fr)_9rem_1.5rem] md:gap-x-6 md:py-7">
                  <span aria-hidden className="row-num meta">
                    {ordinal(index)}
                  </span>

                  <div className="min-w-0">
                    <h2 className="text-display-s font-display">
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
                    </h2>
                    {post.summary && (
                      <p className="mt-1.5 max-w-lg text-pretty text-sm leading-6 text-muted">
                        {post.summary}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.external && (
                        <span className="meta inline-block border border-rule px-1.5 py-1 text-faint">
                          {post.external.publisher}
                        </span>
                      )}
                      {post.draft && (
                        <span className="meta inline-block border border-rule px-1.5 py-1 text-faint">
                          Draft
                        </span>
                      )}
                    </div>
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
        )}
      </div>

      <Reveal>
        <Contact />
      </Reveal>
    </>
  );
}
