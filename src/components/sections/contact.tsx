import { ArrowUpRight } from "lucide-react";
import { CopyEmail } from "@/components/interactive/copy-email";
import { DotBoard } from "@/components/interactive/dot-board";
import { profile, socials } from "@/content";
import { recentPosts } from "@/lib/writing";

const TITLE = "Get in touch";

/**
 * The close of every page: the title, the address as one click-to-copy
 * line, the three socials, and from 64rem the afterimage: the hero window at
 * half its size (a 48 x 60 box) drawn once at a third of its ink on the rail,
 * beside the title, with the address lining up on its bottom edge. Release:
 * the dots let go.
 *
 * Its own grid rather than <Section> (`.contact` in components.css): the
 * board spans the head row and the body row, which the primitive's
 * head-then-body stack cannot do, and a close must never leave a rail's
 * worth of empty ground under its title. Below 64rem the board is not
 * rendered. The figure is decorative (`alt=""` gives it aria-hidden) and
 * runs no loop.
 *
 * `index` is only the SectionSpy's hook now; nothing renders it.
 */
export function Contact({ index }: { index?: string }) {
  // The close now renders once, on the home page, which always passes an index.
  const sectionIndex = index ?? "";
  // One essay, published on Medium. One line, not a section of its own.
  const [essay] = recentPosts(1);

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      data-section-index={sectionIndex}
      data-section-title="Contact"
      className="contact shell section-y"
    >
      <div className="section-head contact-head">
        <h2
          id="contact-title"
          className="text-display-m font-medium text-balance text-ink"
        >
          {TITLE}
        </h2>
      </div>

      <div className="contact-body">
        <CopyEmail email={profile.email} />

        <ul
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-1 text-small"
          aria-label="Elsewhere"
        >
          {socials
            .filter((social) => social.kind !== "email")
            .map((social) => (
              <li key={social.kind}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dot-underline tap text-ink-2 hover:text-ink"
                >
                  {social.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
        </ul>

        {essay && (
          <p className="mt-8 text-small text-ink-2">
            Also{" "}
            <a
              href={essay.href}
              target="_blank"
              rel="noopener noreferrer"
              className="dot-underline tap text-ink"
            >
              an essay
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <ArrowUpRight
              className="inline-block size-[0.9em] align-[-0.1em] text-ink-3"
              aria-hidden="true"
            />{" "}
            on {essay.external?.publisher ?? "the web"}: {essay.title}.
          </p>
        )}
      </div>

      <div className="contact-board">
        <DotBoard mode="afterimage" source="contact" alt="" />
      </div>

      {/* The colophon. Every interior route ends on the footer's imprint, which
          is the machine version of these facts in eleven-pixel mono; the home
          page is the title page, and a title page carries the real thing — a
          book's colophon, in prose, in the reading face, saying how the object
          in your hands was made. It is the last thing on the sheet before the
          trim, and it exists here only. Text and every figure in it come from
          src/content/colophon.ts, which reads the bake rather than repeating
          it. */}
      <div className="colophon">
        <div className="colophon-rule" />
      </div>
    </section>
  );
}
