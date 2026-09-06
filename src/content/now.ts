/**
 * The most time-sensitive block on the site. `updated` renders in the UI so a
 * stale entry is visible rather than misleading. The Recurly internship ended
 * in August 2026; this now reads as the most recent work. Revisit at
 * graduation (December 2026) or when the next role starts.
 */
export const now = {
  status: "Final semester at Purdue",
  headline: "This summer I built the agent platform that ships Recurly's code.",
  org: "Recurly",
  role: "Software Engineer Intern",
  location: "Broomfield, CO",
  period: "May 2026 to Aug 2026",
  body: "Three things shipped at Recurly between May and August, all of them agent infrastructure for the engineering and go-to-market teams.",
  points: [
    "A PDLC automation platform: PRD to merged pull requests through specialized Claude agents (planner, decomposer, a Sonnet/Opus coder pair, a PR responder) running as isolated Kubernetes Jobs via the Agent SDK, with five human checkpoints. Shipping got about 3x faster.",
    "An AI SDR Slack bot in async Python with three-tier Claude routing over BigQuery, 6sense, ZoomInfo, and SFDC. Source-cited briefs and outreach drafts in about 25 seconds.",
    "A Prospect Report Card pipeline (n8n to FastAPI on Cloud Run to Claude Opus) that turns an inbound form-fill into a personalized PDF analysis and emails it back.",
  ],
  updated: "2026-09-06",
} as const;
