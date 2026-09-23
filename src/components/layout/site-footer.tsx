import Link from "next/link";
import { CopyEmail } from "@/components/interactive/copy-email";
import { ContactLinks } from "@/components/ui/contact-links";
import { NineDotMark } from "@/components/ui/nine-dot-mark";
import { profile } from "@/content";

/** The build year. Pages are static, so this is the year of the deploy. */
const YEAR = new Date().getFullYear();

/** The routes, in the header's order, plus the one the header does not carry. */
const ROUTES = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/projects" },
  { label: "Writing", href: "/writing" },
];

/**
 * The back cover of every page: one tinted panel that runs to the trim.
 *
 * On / it follows the close, which has the same tint, so the two read as one
 * cover and the footer is only its last line. Every other route has no close
 * of its own, so the footer carries a compact one first: the address as the
 * same click-to-copy control, and the same index of profiles and the résumé
 * the close uses. Nothing is listed twice on any page: the footer's contact
 * block stands down wherever the close exists (`.footer-contact` in
 * chrome.css), and the résumé lives in that index rather than among the
 * routes.
 *
 * The last line is a colophon: the mark and the name, where he is, and the
 * routes in the header's order, with Writing, which the header leaves out.
 * On a phone the three facts stack flush under the name instead of wrapping
 * with a separator dangling at the end of each line.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-contact">
          <div className="footer-contact-main">
            <h2 className="footer-kicker text-display-s font-medium text-ink">
              Get in touch
            </h2>
            <div className="footer-address">
              <CopyEmail email={profile.email} size="small" />
            </div>
          </div>
          <ContactLinks className="footer-links-index" />
        </div>

        <div className="footer-bar">
          <div className="footer-colophon text-small">
            <Link
              href="/"
              className="footer-mark"
              aria-label={`${profile.name}, home`}
            >
              <NineDotMark />
            </Link>
            <p className="footer-facts">
              <span className="text-ink">
                © {YEAR} {profile.name}
              </span>
              <span className="footer-sep" aria-hidden="true" />
              <span>{profile.education}</span>
              <span className="footer-sep" aria-hidden="true" />
              <span>{profile.location}</span>
            </p>
          </div>

          <nav aria-label="Footer" className="footer-nav">
            <ul className="footer-nav-list text-small">
              {/* No RSS link. The route still builds, so the day a post lives
                  on this site rather than elsewhere the feed is already real
                  and it comes back. Advertising a feed whose only item points
                  at Medium promises something the site does not yet deliver. */}
              {ROUTES.map((route) => (
                <li key={route.href}>
                  <Link href={route.href} className="footer-link">
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
