import Link from "next/link";
import { CopyEmail } from "@/components/interactive/copy-email";
import { profile, socials } from "@/content";

/**
 * Server component. Two rows on the shell under a top hairline: the last line
 * with the identity right-aligned, then the links.
 *
 * Two things have been cut from here for the same reason: a printer's imprint
 * in roman numerals, and a "Connecting the dots" line that drew itself as the
 * footer scrolled in. Both were true to the site's own metaphor and neither was
 * for the reader. A visitor wants to know who this is, what he built and how to
 * reach him.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
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
