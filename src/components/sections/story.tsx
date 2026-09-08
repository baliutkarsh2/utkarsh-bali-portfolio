import { story } from "@/content";

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
 * then I did this" is the page labelling its own furniture; the list sits
 * directly under the lede it continues. It is a real `<ul>`, so a screen
 * reader still gets "list of 12 items" and can skip it.
 */
export function Story() {
  return (
    <section className="story shell" aria-label="Background">
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
