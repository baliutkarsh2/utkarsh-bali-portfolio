import { CopyEmail } from "@/components/interactive/copy-email";
import { DotBoard } from "@/components/interactive/dot-board";
import { Section } from "@/components/ui/section";
import { profile, socials } from "@/content";
import { portraitField64 } from "@/content/portrait";

/**
 * The close of every page (§7.1 04): "Building something? Let's talk.", the
 * address as one click-to-copy line, the three socials as small dotted links,
 * and from 64rem the afterimage — the 64-field drawn once at 10 % in the rail,
 * the same place the hero had the face. Release: the dots let go.
 *
 * The rail is hidden below 64rem at the section level (`max-lg:` on the
 * primitive's `.section-rail`) so the grid drops the empty row and its gap,
 * and the board's own wrapper is hidden too, belt and braces. The figure is
 * decorative (`alt=""` gives it aria-hidden) and runs no loop.
 *
 * No ink band, no dark class: one theme, and the field shows through.
 * Signature kept: every page passes its own `index`; the home's is "04".
 */
export function Contact({ index }: { index?: string }) {
  return (
    <Section
      index={index ?? "04"}
      title="Building something? Let's talk."
      id="contact"
      className="max-lg:[&_.section-rail]:hidden"
      rail={
        <div className="hidden lg:block">
          <DotBoard mode="afterimage" field={portraitField64} alt="" />
        </div>
      }
    >
      <CopyEmail email={profile.email} />

      <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-1 text-small" aria-label="Elsewhere">
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
    </Section>
  );
}
