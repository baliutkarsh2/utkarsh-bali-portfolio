import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatPostDate, publishedPosts } from "@/lib/writing";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Occasional essays by Utkarsh Bali on software, life, art, and philosophy.",
  alternates: { canonical: "/writing" },
};

/**
 * The writing index (§7.5), which today is not an index.
 *
 * There is one essay and it lives on Medium. A grid of one is a lie, a list
 * of one is furniture built around a single line, and either would have been
 * the fourth page on this site shaped "copy with a right rail". So the page
 * is the essay: the title at display-l across most of the width, the
 * standfirst under it, a rule the full measure of the page, and one machine
 * line of publisher / date / read time beneath the rule, which is where a
 * broadside puts its imprint. Nothing else above the fold.
 *
 * `n = 1` is said out loud in the masthead, in the register this site keeps
 * for counts and axis values. It is the honest thing to say and it stops the
 * page pretending to be a library.
 *
 * The composition does not change when a second essay arrives: the newest
 * becomes the lead, everything behind it lists under the fold in the
 * plainest form the site has, and the count in the masthead goes up.
 *
 * Server component. Nothing here animates.
 */
export default function WritingPage() {
  const posts = publishedPosts();
  const [lead, ...rest] = posts;

  if (!lead) {
    return (
      <header className="shell pt-24 pb-16 md:pt-28">
        <p className="data text-ink-3">Writing · n = 0</p>
        <h1 className="mt-6 text-display-l text-ink">Nothing published yet.</h1>
        <p className="broadside-note caption">The first essay is being written.</p>
      </header>
    );
  }

  const external = lead.external;

  const title = external ? (
    <a href={lead.href} target="_blank" rel="noopener noreferrer">
      {lead.title}
      <ArrowUpRight aria-hidden="true" className="broadside-arrow" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={lead.href}>{lead.title}</Link>
  );

  return (
    <>
      <header className="shell broadside pt-24 pb-6 md:pt-28">
        <p className="data text-ink-3">
          Writing · n = {posts.length}
        </p>

        {/* The essay's title is the page's h1, because the essay is the
            page. The masthead line above says which room you are in. */}
        <h1 className="broadside-title mt-8 text-display-l">{title}</h1>

        {lead.summary && (
          <p className="broadside-standfirst text-lede">{lead.summary}</p>
        )}

        <hr className="broadside-rule" />

        <div className="broadside-imprint meta">
          <p>{external ? external.publisher : "Here"}</p>
          <p>
            <time dateTime={lead.date}>{formatPostDate(lead.date)}</time>
          </p>
          <p>{lead.readingMinutes} min read</p>
        </div>
      </header>

      <div className="shell broadside pb-8">
        <p className="broadside-note caption">
          {posts.length === 1
            ? "One essay, published where it was written. This page points at it rather than reprinting it, so the piece keeps its own readers and its own statistics."
            : "Published where they were written. This page points at them rather than reprinting them, so each piece keeps its own readers and its own statistics."}
        </p>

        {rest.length > 0 && (
          <ul className="broadside-rest">
            {rest.map((post) => (
              <li key={post.slug}>
                <h2 className="broadside-rest-title text-display-s font-medium">
                  {post.external ? (
                    <a href={post.href} target="_blank" rel="noopener noreferrer">
                      {post.title}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link href={post.href}>{post.title}</Link>
                  )}
                </h2>
                <p className="broadside-rest-meta meta">
                  {post.external ? post.external.publisher : "Here"} ·{" "}
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time> ·{" "}
                  {post.readingMinutes} min read
                  {post.draft ? " · Draft" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
