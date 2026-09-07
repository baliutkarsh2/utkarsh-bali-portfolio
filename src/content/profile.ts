import type { Social } from "./types";

export const profile = {
  name: "Utkarsh Bali",
  shortName: "Utkarsh",
  initials: "UB",
  role: "Software engineer",
  tagline:
    "I build the infrastructure agents run on, and the thing that breaks them before a user does.",
  email: "baliutkarsh2@gmail.com",
  location: "West Lafayette, IN",
  education: "Purdue University, CS + AI",
  educationDetail: "B.S. Computer Science & Artificial Intelligence, minor in Psychology",
  enrolled: "Aug 2023",
  graduation: "Dec 2026",
  gpa: "3.90 / 4.00",
  github: "https://github.com/baliutkarsh2",
  linkedin: "https://linkedin.com/in/ubali",
  x: "https://x.com/ubali07",
  resume: { href: "/utkarsh-bali-resume.pdf", updated: "2026-09-06" } as {
    href: string;
    updated: string;
  } | null,
} as const;

export const socials: Social[] = [
  { label: "Email", href: `mailto:${profile.email}`, kind: "email" },
  { label: "GitHub", href: profile.github, kind: "github" },
  { label: "LinkedIn", href: profile.linkedin, kind: "linkedin" },
  { label: "X", href: profile.x, kind: "x" },
];

/**
 * The site is multi-page: every nav item is a route except Contact, which
 * anchors to the closing section on the homepage and therefore works from
 * anywhere. Route links take aria-current="page".
 *
 * Writing is deliberately not here. There is one post and it lives on Medium,
 * so a nav item would lead to a page that leads off the site. The route, the
 * feed and the MDX pipeline all still exist, the footer still links it, and
 * the day a second post lands here this is a one-line change.
 */
export const navItems: { label: string; href: string }[] = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/projects" },
  { label: "Contact", href: "/#contact" },
];
