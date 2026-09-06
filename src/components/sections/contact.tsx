import { CopyEmail } from "@/components/interactive/copy-email";
import { DotBoard } from "@/components/interactive/dot-board";
import { profile, socials } from "@/content";

const TITLE = "Building something? Let\u2019s talk.";

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
 * Signature kept: every page passes its own `index`; the home's is "04".
 */
export function Contact({ index }: { index?: string }) {
  const sectionIndex = index ?? "04";

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      data-section-index={sectionIndex}
      data-section-title={TITLE}
      className="contact shell section-y"
    >
      <div className="section-head contact-head">
        <span className="meta text-ink-3" aria-hidden="true">
          {sectionIndex}
        </span>
        <h2 id="contact-title" className="text-display-m font-medium text-balance text-ink">
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
      </div>

      <div className="contact-board">
        <DotBoard mode="afterimage" source="contact" alt="" />
      </div>
    </section>
  );
}
