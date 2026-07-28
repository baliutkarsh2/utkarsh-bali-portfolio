import Link from "next/link";
import { profile, socials } from "@/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="meta text-faint">{profile.name}</p>
          <p className="mt-2 text-sm text-muted">
            {profile.education} · {profile.location}
          </p>
        </div>

        <nav aria-label="Elsewhere">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
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
          </ul>
        </nav>
      </div>
    </footer>
  );
}
