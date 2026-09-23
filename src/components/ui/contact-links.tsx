import { ArrowUpRight } from "lucide-react";
import { profile, socials } from "@/content/profile";
import type { Social } from "@/content/types";

/** The handle each profile URL already carries, so the list says where it goes. */
function handle(social: Social): string {
  const path = new URL(social.href).pathname.replace(/^\/|\/$/g, "");
  return social.kind === "x" ? `@${path}` : path;
}

type Entry = {
  key: string;
  label: string;
  href: string;
  /** What the link resolves to, in the data face: a handle, an address, a format. */
  detail: string;
  /** Read after the label by assistive tech only. */
  note: string;
  newTab: boolean;
};

/**
 * Everywhere else he is, as a short index: one row per place, the name on
 * the left, the handle in the data face on the right, the outward arrow at
 * the end. The same index closes every page (the band on /, the footer
 * elsewhere) and fills the foot of the phone menu, so the site lists the same
 * places the same way wherever you meet them. Its own module, with no server
 * imports, because the header that renders the menu is a client component.
 *
 * The résumé is the last row. It used to be the last word of the footer's
 * route list, where it sat after "Writing" as if it were a page of the site;
 * it is a document you take away, the one a recruiter came for, and it
 * belongs with the other ways to reach him.
 *
 * `email` adds the address as the first row, for the one place it is not
 * already set large above the index: the phone menu, where a tap should open
 * the mail app rather than copy.
 */
export function ContactLinks({
  className,
  email = false,
}: {
  className?: string;
  email?: boolean;
}) {
  const entries: Entry[] = [
    ...(email
      ? [
          {
            key: "email",
            label: "Email",
            href: `mailto:${profile.email}`,
            detail: profile.email,
            note: "",
            newTab: false,
          },
        ]
      : []),
    ...socials
      .filter((social) => social.kind !== "email")
      .map((social) => ({
        key: social.kind,
        label: social.label,
        href: social.href,
        detail: handle(social),
        note: " (opens in a new tab)",
        newTab: true,
      })),
    ...(profile.resume
      ? [
          {
            key: "resume",
            label: "Résumé",
            href: profile.resume.href,
            detail: "PDF",
            note: " (PDF, opens in a new tab)",
            newTab: true,
          },
        ]
      : []),
  ];

  return (
    <ul
      className={className ? `contact-links ${className}` : "contact-links"}
      aria-label="Elsewhere"
    >
      {entries.map((entry) => (
        <li key={entry.key}>
          <a
            href={entry.href}
            {...(entry.newTab
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="contact-link"
          >
            <span className="contact-link-name text-small">{entry.label}</span>
            <span className="contact-link-handle data">{entry.detail}</span>
            <ArrowUpRight className="contact-link-arrow" aria-hidden="true" />
            {entry.note && <span className="sr-only">{entry.note}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
