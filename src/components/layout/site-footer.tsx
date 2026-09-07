import Link from "next/link";
import { CopyEmail } from "@/components/interactive/copy-email";
import { profile, socials } from "@/content";
import { imprintLines } from "@/content/colophon";
import { MissionLine } from "@/components/ui/mission-line";
import { Reveal } from "@/components/interactive/reveal";

/**
 * Server component. Three rows on the shell under a top hairline:
 *  1. the last line, "Connecting the dots" and three real dots with a hairline
 *     drawn through them (the site's ellipsis), with the identity right-aligned;
 *  2. the links;
 *  3. the imprint.
 *
 * The imprint replaced a colophon that was a stack of tool names — "Next 16 on
 * Vercel", which is the single most common line in the genre and says nothing
 * about the object it is printed on. A printer's imprint says when the sheet
 * was pulled, which state of the plate it is, how many cells the plate carries,
 * what angle the screen is ruled at, how many inks went through the press and
 * which edge the sheet was laid to. Every one of those is true here, and three
 * of them are read from the bake rather than typed (src/content/colophon.ts).
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          {/* Reveal sets data-in once the footer enters view; the line's
              draw keys off it (see .mission-line in chrome.css). The words
              are in the HTML from the first frame and never move. */}
          <Reveal className="footer-mission">
            <p className="footer-mission-line meta">
              <span>Connecting the dots</span>
              <MissionLine dots={3} />
            </p>
          </Reveal>

          <div className="footer-identity text-small text-ink-2">
            <p>{profile.name}</p>
            <p>{profile.education}</p>
            <p>{profile.location}</p>
          </div>
        </div>

        {/* The close lives once, on the home page. Every other route ends
            here, so the address has to be reachable from the footer. */}
        <div className="footer-address">
          <CopyEmail email={profile.email} size="small" />
        </div>

        <nav aria-label="Footer" className="footer-links">
          <ul className="footer-links-list text-small">
            {socials.map((social) => {
              const external = social.kind !== "email";
              return (
                <li key={social.kind}>
                  <a
                    href={social.href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="footer-link dot-underline tap"
                  >
                    {social.label}
                    {external && <span className="sr-only"> (opens in a new tab)</span>}
                  </a>
                </li>
              );
            })}
            <li>
              <Link href="/projects" className="footer-link dot-underline tap">
                All work
              </Link>
            </li>
            <li>
              <Link href="/writing" className="footer-link dot-underline tap">
                Writing
              </Link>
            </li>
            {/* No RSS link. The route still builds, so the day a post lives
                on this site rather than elsewhere the feed is already real and
                this comes back. Advertising a feed whose only item points at
                Medium promises something the site does not yet deliver. */}
            {profile.resume && (
              <li>
                <a
                  href={profile.resume.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link dot-underline tap"
                >
                  Résumé
                  <span className="sr-only"> (PDF, opens in a new tab)</span>
                </a>
              </li>
            )}
          </ul>
        </nav>

        <p className="footer-imprint meta">
          {imprintLines().map((line) => (
            <span key={line} className="footer-imprint-line">
              {line}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
