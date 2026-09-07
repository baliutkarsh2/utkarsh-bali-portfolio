import Link from "next/link";
import { CopyEmail } from "@/components/interactive/copy-email";
import { profile, socials } from "@/content";
import { MissionLine } from "@/components/ui/mission-line";
import { Reveal } from "@/components/interactive/reveal";

/**
 * Server component. Two rows on the shell under a top hairline: the last line
 * with the identity right-aligned, then the links.
 *
 * There used to be a third row -- a printer's imprint giving the date in roman
 * numerals, the state of the plate, the cell count, the screen angle and which
 * edge the sheet was laid to. Every line of it was true and not one of them was
 * for the reader. A visitor wants to know who this is, what he built and how to
 * reach him; a footer that instead performs the metaphor the site is built on
 * is the site talking to itself. It is gone, and so is the sentence about the
 * plate that used to close the home page.
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

      </div>
    </footer>
  );
}
