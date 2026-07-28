/**
 * The most time-sensitive block on the site. `updated` renders in the UI so a
 * stale entry is visible rather than misleading. Revisit after 2026-08-31,
 * when the Recurly internship ends.
 */
export const now = {
  status: "Interning at Recurly",
  headline: "Building internal automation for subscription infrastructure.",
  org: "Recurly",
  role: "Software Engineer Intern",
  location: "Broomfield, CO",
  period: "May – Aug 2026",
  body: "I'm on Recurly's engineering team this summer, working on internal automation for the systems behind subscription management. It's the least glamorous and most instructive kind of work: real production surface area, real billing correctness constraints, and a codebase that predates me by years.",
  points: [
    "Writing internal automation for subscription management infrastructure.",
    "Learning how a mature SaaS platform handles correctness, migrations, and on-call.",
    "Still maintaining Checkpoint on the side — lower intensity, same thesis.",
  ],
  updated: "2026-07-27",
} as const;
