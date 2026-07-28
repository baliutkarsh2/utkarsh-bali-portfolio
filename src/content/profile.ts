import type { Social } from "./types";

export const profile = {
  name: "Utkarsh Bali",
  shortName: "Utkarsh",
  initials: "UB",
  role: "Software engineer",
  tagline:
    "I build agent infrastructure, developer tools, and products people actually use.",
  email: "baliutkarsh2@gmail.com",
  location: "West Lafayette, IN",
  education: "Purdue University, CS + AI",
  educationDetail: "B.S. Computer Science & Artificial Intelligence, minor in Psychology",
  graduation: "Dec 2026",
  gpa: "3.90 / 4.00",
  github: "https://github.com/baliutkarsh2",
  linkedin: "https://linkedin.com/in/ubali",
  x: "https://x.com/ubali07",
  resume: { href: "/utkarsh-bali-resume.pdf", updated: "2026-07-28" } as {
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
 * Two kinds of navigation with genuinely different semantics. Section anchors
 * are scrollspy targets and take aria-current="location"; route links take
 * aria-current="page". Keeping them in one list would also feed "/writing" to
 * getElementById, which returns null and silently drops it from the spy.
 */
export const sectionNav = [
  { label: "About", href: "/#about" },
  { label: "Now", href: "/#now" },
  { label: "Work", href: "/#work" },
  { label: "Experience", href: "/#experience" },
  { label: "Recognition", href: "/#recognition" },
  { label: "Contact", href: "/#contact" },
] as const;

export const routeNav = [{ label: "Writing", href: "/writing" }] as const;

/** Header order: Writing sits directly after Work, where it belongs. */
export const navItems: { label: string; href: string }[] = [
  ...sectionNav.slice(0, 3),
  ...routeNav,
  ...sectionNav.slice(3),
];
