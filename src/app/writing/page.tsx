import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DotBoard } from "@/components/interactive/dot-board";
import { plateById } from "@/content/plates";
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
 * The masthead used to read "Writing · n = 1", and under the fold a sentence
 * explained that the page points at the essay rather than reprinting it "so
 * the piece keeps its own readers and its own statistics". Both are gone. A
 * reader can see there is one essay, and a page that stops to justify its own
 * design is talking about itself instead of the writing.
 *
 * The composition does not change when a second essay arrives: the newest
 * becomes the lead, everything behind it lists under the fold in the
 * plainest form the site has, and the count in the masthead goes up.
 *
 * Server component. Nothing here animates.
 */
export default function WritingPage() {
  const posts = publishedPosts();
  const sky = plateById.get("sky")!;
  const [lead, ...rest] = posts;

  if (!lead) {
    return (
      <header className="shell pt-24 pb-16 md:pt-28">
        <p className="meta text-ink-3">Writing</p>
        <h1 className="mt-6 text-display-l text-ink">Nothing published yet.</h1>
        <p className="broadside-note caption">
          The first essay is being written.
        </p>
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
      <header className="shell broadside pt-20 pb-6 md:pt-24">
        {/* The type is one grid child so the plate beside it can be the other.
            Without the wrapper the figure has to span rows it cannot name --
            `grid-row: 1 / -1` resolves against the EXPLICIT grid, which has no
            rows here, so it collapses to a single row and stretches it to the
            plate's full height, pushing the title 600px down the sheet. */}
        <div className="broadside-type">
          <p className="meta text-ink-3">Writing</p>

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
        </div>

        {/* The plate: the sky that was actually over him the night this was
            published, computed from a catalogue for that place and that hour.
            It earns the page rather than filling it -- the essay is about a
            quiet mind, God, family and infinity, and this is the only object
            on the site that is a picture of the thing the words are about.

            It is also the site's one INVERTED plate. Every other picture here
            is ink emerging from bare paper; this is a solid field of ink with
            2,307 stars punched out of it as holes of paper. Same screen, same
            transfer, opposite polarity -- which is why it belongs beside the
            portrait rather than looking like a different site. */}
        <figure className="broadside-plate">
          <DotBoard
            mode="still"
            source={sky.id}
            alt={sky.alt}
            fallback={sky.still}
            className="sky-board"
          />
          <figcaption className="caption">
            {sky.title}. {sky.subject}.
          </figcaption>
        </figure>
      </header>

      <div className="shell broadside pb-8">
        {rest.length > 0 && (
          <ul className="broadside-rest">
            {rest.map((post) => (
              <li key={post.slug}>
                <h2 className="broadside-rest-title text-display-s font-medium">
                  {post.external ? (
                    <a
                      href={post.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {post.title}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link href={post.href}>{post.title}</Link>
                  )}
                </h2>
                <p className="broadside-rest-meta meta">
                  {post.external ? post.external.publisher : "Here"} ·{" "}
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>{" "}
                  · {post.readingMinutes} min read
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
