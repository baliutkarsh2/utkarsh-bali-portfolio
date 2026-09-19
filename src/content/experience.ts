import type { Experience } from "./types";

/**
 * The employment record behind the constellation on /about.
 *
 * Every lane here except Microsoft has a case study, and the numbered index
 * sits directly above this on the page, so the depth lives there and these
 * entries stay at the level a record is for: who, when, where, and what the
 * work was. The bullets used to be lifted straight off a résumé -- forty-word
 * sentences of stacked proper nouns, restating a case study a reader could
 * already click. Written as sentences now, and only where they say something
 * the case study does not lead with.
 */
export const experiences: Experience[] = [
  {
    company: "Recurly",
    role: "Software Engineer Intern",
    location: "Broomfield, CO",
    dates: "May 2026 to Aug 2026",
    sortDate: "2026-05-01",
    current: false,
    summary:
      "A summer on internal agent tooling for the engineering and go-to-market teams.",
    bullets: [
      "Three things shipped, none of them customer-facing: the platform that takes a written requirement to merged pull requests, a Slack assistant that researches an account before a call, and a pipeline that answers an inbound form with a written analysis of that prospect’s business.",
    ],
  },
  {
    company: "QualGent",
    role: "Software Engineer Intern",
    location: "San Francisco, CA",
    dates: "Sep 2025 to Dec 2025",
    sortDate: "2025-09-01",
    current: false,
    summary:
      "Reported to the CTO at a YC X25 company, taking agent infrastructure from prototype into production.",
    bullets: [
      "Built App Crawler, which walks an Android app screen by screen and writes down how it works, and the backend that runs it unattended across a fleet of emulators.",
      "Built the QA assistant the company sells on: one chat box over 45 tools and sub-agents.",
    ],
  },
  {
    company: "Purdue University",
    role: "Software Engineer, AI Research",
    location: "West Lafayette, IN",
    dates: "Aug 2024 to Present",
    sortDate: "2024-08-15",
    current: true,
    summary:
      "Applied ML research where interpretability, privacy and whether a clinician would trust the answer matter as much as accuracy.",
    bullets: [
      "CLIP-H, on interpretable clinical prediction, with Purdue and Harvard Business School faculty. Under review at a NeurIPS 2026 workshop, so it stays at that level here.",
      "A clinical assistant nurses tested across Indiana hospitals. About 40% less documentation time, and it runs on the hospital’s own hardware.",
      "Presented at the Purdue Spring Research Conference.",
    ],
  },
  {
    company: "Microsoft",
    role: "Software Engineer, Microsoft Research Collaboration",
    location: "West Lafayette, IN",
    dates: "Aug 2024 to May 2025",
    sortDate: "2024-08-01",
    current: false,
    summary:
      "Owned the LLM pipeline and the distributed infrastructure under it.",
    bullets: [
      "Read a few million social posts about Minecraft and A Minecraft Movie for sentiment. The results went to Microsoft product and marketing leadership.",
    ],
  },
];
