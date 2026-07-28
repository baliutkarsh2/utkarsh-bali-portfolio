import { ArrowUpRight } from "lucide-react";
import { profile, socials } from "@/content";

/** Shared by the homepage and every case study. */
export function Contact({ index }: { index?: string }) {
  return (
    <section id="contact" aria-labelledby="contact-title" className="shell section-y">
      <div className="border-t border-rule pt-5">
        <div className="flex items-baseline gap-4">
          {index && (
            <span aria-hidden className="meta text-faint">
              {index}
            </span>
          )}
          <span className="meta text-faint">Contact</span>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h2 id="contact-title" className="text-balance text-display-l font-display">
              Building something in this world? Let&rsquo;s talk.
            </h2>
            <p className="measure mt-6 text-pretty text-lede text-muted">
              I&rsquo;m always up for a conversation about agents, developer tools, or a
              product you think should exist. The fastest way to reach me is email.
            </p>

            <a
              href={`mailto:${profile.email}`}
              className="group mt-8 inline-flex items-center gap-3 font-display text-display-s"
            >
              <span className="link-underline">{profile.email}</span>
              <ArrowUpRight
                aria-hidden
                className="size-6 shrink-0 text-faint transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </a>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 lg:flex-col lg:items-end lg:gap-2">
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
      </div>
    </section>
  );
}
