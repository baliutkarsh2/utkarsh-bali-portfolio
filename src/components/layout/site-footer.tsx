import Link from "next/link";
import { profile, socials } from "@/content";
import { PressBar } from "@/components/ui/press-bar";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="shell border-b border-rule py-5">
        <PressBar />
      </div>

      <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="meta text-faint">{profile.name}</p>
          <p className="mt-2 text-sm text-muted">
            {profile.education} · {profile.location}
          </p>
        </div>

        <nav aria-label="Elsewhere">
          <ul className="tap-list flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            {socials.map((social) => (
              <li key={social.kind}>
                <a
                  href={social.href}
                  {...(social.kind !== "email"
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="link-underline text-muted transition-colors hover:text-foreground"
                >
                  {social.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/projects" className="link-underline text-muted hover:text-foreground">
                All work
              </Link>
            </li>
            <li>
              <Link href="/writing" className="link-underline text-muted hover:text-foreground">
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
                  className="link-underline text-muted transition-colors hover:text-foreground"
                >
                  Résumé
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
