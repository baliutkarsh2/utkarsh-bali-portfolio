import { ArrowUpRight } from "lucide-react";
import { profile, socials } from "@/content";

/**
 * Shared by the homepage and every case study. The closing ink spread: the
 * scoped `dark` class flips the tokens, and the email is the biggest type on
 * the page after the name, because it is the one action that matters here.
 */
export function Contact({ index }: { index?: string }) {
  return (
    <section id="contact" aria-labelledby="contact-title" className="dark ink-band">
      <div className="shell section-y">
        <div className="flex items-baseline gap-4">
          {index && (
            <span aria-hidden className="meta text-accent-ink">
              {index}
            </span>
          )}
          <span className="meta text-faint">Contact</span>
        </div>

        <h2 id="contact-title" className="mt-10 text-balance text-display-l font-display">
          Building something in this world? Let&rsquo;s talk.
        </h2>
        <p className="measure mt-6 text-pretty text-lede text-muted">
          I&rsquo;m always up for a conversation about agents, developer tools, or a
          product you think should exist. The fastest way to reach me is email.
        </p>

        <a
          href={`mailto:${profile.email}`}
          className="group contact-email slide-trigger mt-14 inline-flex max-w-full items-center gap-[0.35em]"
        >
          <span className="link-slide min-w-0">
            <span>{profile.email}</span>
            <span aria-hidden>{profile.email}</span>
          </span>
          <ArrowUpRight
            aria-hidden
            className="size-[0.5em] shrink-0 text-accent transition-transform group-hover:translate-x-[0.08em] group-hover:-translate-y-[0.08em]"
          />
        </a>

        <ul className="tap-list mt-16 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-rule pt-6">
          {socials
            .filter((social) => social.kind !== "email")
            .map((social) => (
              <li key={social.kind}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline text-sm text-muted transition-colors hover:text-foreground"
                >
                  {social.label}
                </a>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
