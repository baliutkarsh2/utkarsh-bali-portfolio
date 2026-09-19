import { story } from "@/content";
import { cn } from "@/lib/utils";

/**
 * The home page's spine: who he is, in order, one fact a line.
 *
 * It is the plainest block on the site and that is the whole point. Everything
 * else here — the case studies, the chart, the record on /about — answers "what
 * did he build". None of them answered "who is this", and a visitor asks that
 * first. A list of twelve sentences does, in about twenty seconds, and it does
 * it without a heading announcing that it is about to.
 *
 * Unheaded on purpose. A `<h2>Story</h2>` over twelve lines of "I did this,
 * then I did this" is the page labelling its own furniture. It is a real
 * `<ul>`, so a screen reader still gets "list of 12 items" and can skip it.
 *
 * It lives in the hero's first column now, beside the portrait, rather than
 * as a section under it. The hero is two columns and the left one had run out
 * of things to say: a name, one line and three buttons against a 720px plate
 * left about 400px of bare paper with nothing in it. The list is the right
 * height to fill that, and it belongs next to his face rather than below it.
 * `className` is how the caller says where it is -- `shell` when it is a
 * section of its own, nothing when it is already inside one.
 */
export function Story({ className }: { className?: string }) {
  return (
    <section className={cn("story", className)} aria-label="Background">
      <ul className="story-list">
        {story.map((line) => (
          <li key={line} className="story-line text-body text-ink-2">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
