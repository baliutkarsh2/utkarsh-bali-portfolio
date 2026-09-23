import type { Experience } from "./types";

/**
 * The employment record behind the constellation on /about.
 *
 * Every lane here except Microsoft has a case study, and the record on /about
 * links each one beside the entry it came out of, so the depth lives there and
 * these entries stay at the level a record is for: who, when, where, and what
 * the work was. The bullets used to be lifted straight off a résumé -- forty-word
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
    summary:
      "Owned the LLM pipeline and the distributed infrastructure under it.",
    bullets: [
      "Read a few million social posts about Minecraft and A Minecraft Movie for sentiment. The results went to Microsoft product and marketing leadership.",
    ],
  },
];

/**
 * The two lanes on the /about chart that are not employers: the company he
 * founded, and the work he built on his own. The chart only needs their
 * projects; the record under it needs them written as entries, in the same
 * shape as the four above so the six read as one list.
 *
 * Deliberately NOT in `experiences`: the chart draws an employment band for
 * every entry there, and neither of these is employment. Every sentence is
 * the owner's, from projects.ts and the story in personal.ts: the Checkpoint
 * lede is the first sentence of its case study (in the present tense, since
 * the company is), the YC line is his story's, and the two independent
 * builds are their taglines and his story's line about WalleX. `key` is the lane
 * the work sits in: a project's `org`, or "Independent" where there is none.
 */
export const otherWork: (Experience & { key: string })[] = [
  {
    key: "Checkpoint",
    company: "Checkpoint",
    role: "Co-founder & CTO",
    location: "",
    dates: "Feb 2026 to Present",
    sortDate: "2026-02-01",
    summary:
      "I co-founded Checkpoint with Ayushman Gupta and Aaditya Gaur, and I lead its engineering.",
    bullets: [
      "CI/CD for AI agents: adversarial test suites that run before an agent ever meets a user.",
      "YC told us we were in the top 10% of Summer 2026 applicants, then didn’t interview us. It’s live in private beta.",
    ],
  },
  {
    key: "Independent",
    company: "Independent",
    role: "",
    location: "",
    dates: "Oct 2024 to Aug 2025",
    sortDate: "2024-10-01",
    summary: "Built on my own, start to finish.",
    bullets: [
      "WalleX, an AI wallpaper app with nine image models. 3,000+ people in 22 countries used it, the first thing I made that had real users in it.",
      "A multi-agent QA system: give it a plain-English task on an Android phone and it does it, with four agents to plan, execute, verify and supervise the run.",
    ],
  },
];
