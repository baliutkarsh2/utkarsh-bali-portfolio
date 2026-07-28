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
  education: "Purdue University — CS + AI",
  github: "https://github.com/baliutkarsh2",
  linkedin: "https://linkedin.com/in/ubali",
  x: "https://x.com/ubali07",
  /**
   * Null until a PDF is added to /public. Nav, contact, and the command palette
   * all read this — a null keeps those entries from rendering at all rather
   * than shipping a link that 404s.
   */
  resume: null as { href: string; updated: string } | null,
} as const;

export const socials: Social[] = [
  { label: "Email", href: `mailto:${profile.email}`, kind: "email" },
  { label: "GitHub", href: profile.github, kind: "github" },
  { label: "LinkedIn", href: profile.linkedin, kind: "linkedin" },
  { label: "X", href: profile.x, kind: "x" },
];

export const navItems = [
  { label: "About", href: "/#about" },
  { label: "Now", href: "/#now" },
  { label: "Work", href: "/#work" },
  { label: "Experience", href: "/#experience" },
  { label: "Recognition", href: "/#recognition" },
  { label: "Contact", href: "/#contact" },
];
