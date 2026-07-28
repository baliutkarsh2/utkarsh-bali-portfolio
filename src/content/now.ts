/**
 * The most time-sensitive block on the site. `updated` renders in the UI so a
 * stale entry is visible rather than misleading. Revisit after 2026-08-31,
 * when the Recurly internship ends.
 */
export const now = {
  status: "Interning at Recurly",
  headline: "Building the agent platform that ships Recurly's code.",
  org: "Recurly",
  role: "Software Engineer Intern",
  location: "Broomfield, CO",
  period: "May 2026 to Aug 2026",
  body: "I built Recurly's core PDLC automation platform: specialized Claude agents (planner, decomposer, a Sonnet/Opus coder pair, and a PR responder) deployed as isolated Kubernetes Jobs through the Agent SDK. It drives a PRD all the way to merged pull requests across five human checkpoints, and it has roughly tripled how fast that path moves.",
  points: [
    "PDLC automation platform: PRD to merged PRs via specialized Claude agents running as isolated Kubernetes Jobs, with five human checkpoints. About 3x faster shipping.",
    "AI SDR Slack bot in async Python with 3-tier Claude routing, querying BigQuery, 6sense, ZoomInfo, and SFDC. Returns source-cited briefs and outreach drafts in about 25 seconds.",
    "Prospect Report Card pipeline (n8n to FastAPI on Cloud Run to Claude Opus) that turns an inbound form-fill into a personalized PDF analysis and emails it back.",
  ],
  updated: "2026-07-28",
} as const;
