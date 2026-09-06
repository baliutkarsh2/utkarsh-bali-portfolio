import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Row } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { formatPostDate, recentPosts } from "@/lib/writing";
import { ordinal } from "@/lib/utils";

/**
 * Section 03 (§7.1): the most recent post as one row — title, summary, and a
 * meta line "date · N min · publisher ↗" when the piece lives elsewhere — then
 * "All writing". External rows open in a new tab (the Row adds the sr-only
 * notice and the outward arrow). Server component: `recentPosts` reads the
 * MDX frontmatter from disk through the server-only writing lib.
 *
 * Full width like Selected work (§12.9: every list is the same list), via the
 * same `section-wide` class on the section.
 */
export function Writing({ index = "03" }: { index?: string }) {
  const posts = recentPosts(1);
  if (posts.length === 0) return null;

  return (
    <Section index={index} title="Writing" id="writing" className="section-wide">
      <ul className="rows">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <Row
              index={ordinal(i)}
              title={post.title}
              subtitle={post.summary || undefined}
              meta={
                <>
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  {" · "}
                  {post.readingMinutes} min
                  {post.external && (
                    <>
                      {" · "}
                      {post.external.publisher}{" "}
                      <ArrowUpRight
                        className="inline-block size-[0.9em] align-[-0.1em]"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </>
              }
              href={post.href}
              external={Boolean(post.external)}
              titleAs="h3"
            />
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button variant="text" href="/writing">
          All writing
        </Button>
      </div>
    </Section>
  );
}
