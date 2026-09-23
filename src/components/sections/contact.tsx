import { ArrowUpRight } from "lucide-react";
import { CopyEmail } from "@/components/interactive/copy-email";
import { ContactLinks } from "@/components/ui/contact-links";
import { profile } from "@/content";
import { recentPosts } from "@/lib/writing";

const TITLE = "Get in touch";

/**
 * The close of the home page: the title, the address as one click-to-copy
 * control and the loudest line of the band, the index of everywhere else, and
 * the essay as a postscript.
 *
 * A tinted band that runs to the trim (the absence of `shell`, never 100vw,
 * which would count the scrollbar). The footer shares its tint, so the close
 * and the colophon read as one back cover separated by a single hairline.
 * The band's edge is its own divider, so the section carries no hairline of
 * its own.
 *
 * Its own grid rather than <Section>: from 64rem the index stands in a right
 * column beside the title, the address and the postscript, which the
 * primitive's head-then-body stack cannot do. On a phone the three stack in
 * reading order with the postscript AFTER the index: before it, the index's
 * closing hairline landed 48px above the footer's, two rules with nothing
 * between them.
 */
export function Contact() {
  // One essay, published on Medium. One line, not a section of its own.
  const [essay] = recentPosts(1);

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      data-section-index=""
      data-section-title="Contact"
      className="contact-band"
    >
      <div className="contact shell">
        <div className="contact-main">
          <h2
            id="contact-title"
            className="text-display-m font-medium text-balance text-ink"
          >
            {TITLE}
          </h2>

          <div className="contact-address">
            <CopyEmail email={profile.email} />
          </div>
        </div>

        <ContactLinks className="contact-aside" />

        {/* An inline link in a sentence, so no `tap`: on a touch screen that
            utility makes the anchor a 44px inline-flex box, which opened the
            paragraph's lines to 34px apart around it. The arrow is inside the
            link, a hair off the word: outside it, it touched the "y" with a
            full space after it, and the focus ring cut through it. */}
        {essay && (
          <p className="contact-essay text-small text-ink-2">
            Also{" "}
            <a
              href={essay.href}
              target="_blank"
              rel="noopener noreferrer"
              className="dot-underline text-ink"
            >
              an essay
              <ArrowUpRight
                className="inline-block size-[0.9em] align-[-0.1em] ml-[0.15em] text-ink-3"
                aria-hidden="true"
              />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            on {essay.external?.publisher ?? "the web"}: {essay.title}.
          </p>
        )}
      </div>
    </section>
  );
}
