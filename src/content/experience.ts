import type { Experience } from "./types";

export const experiences: Experience[] = [
  {
    company: "Recurly",
    role: "Software Engineer Intern",
    location: "Broomfield, CO",
    dates: "May 2026 to Aug 2026",
    sortDate: "2026-05-01",
    current: true,
    summary:
      "Built internal agent infrastructure for Recurly's engineering and go-to-market teams, from the platform that turns product requirements into merged pull requests to the tooling that researches inbound prospects.",
    bullets: [
      "Built the core PDLC automation platform using specialized Claude agents (planner, decomposer, a Sonnet/Opus coder pair, and a PR responder) deployed as isolated Kubernetes Jobs via the Agent SDK. Drives PRD to merged PRs through five human checkpoints, accelerating shipping about 3x.",
      "Shipped an AI SDR Slack bot (async Python, 3-tier Claude routing) querying BigQuery, 6sense, ZoomInfo, and SFDC to research, qualify, and audit account and call history. Returns source-cited briefs and outreach drafts in about 25 seconds.",
      "Automated a Prospect Report Card pipeline (n8n to FastAPI on Cloud Run to Claude Opus) that turns an inbound marketing form-fill into a personalized PDF analysis of the prospect's subscription business and emails it back.",
    ],
    tags: ["Claude Agent SDK", "Kubernetes", "Python", "FastAPI", "BigQuery"],
  },
  {
    company: "QualGent",
    role: "Software Engineer Intern",
    location: "San Francisco, CA",
    dates: "Sep 2025 to Dec 2025",
    sortDate: "2025-09-01",
    current: false,
    summary:
      "Reported to the CTO on App Crawler and the QualGent AI Assistant, taking agent infrastructure from prototype into production inside a YC X25 company.",
    bullets: [
      "Architected App Crawler, a GKE-distributed Python system indexing Android apps into an org-wide knowledge base, using a GPT-4o DFS agent with Set-of-Marks and uiautomator2 to traverse UIs via ADB and populate a Vertex AI RAG corpus.",
      "Engineered the event-driven backend that runs it hands-off: a Supabase-queue watcher spawning per-app Kubernetes Jobs, an AAB to APK converter, and remote emulator leasing from a managed GCE fleet, holding a sub-1% failure rate at scale via self-healing CronJobs.",
      "Built the flagship QualGent AI Assistant, an enterprise QA copilot: a Gemini 2.5 Pro orchestrator on Google ADK routing across 45+ tools and sub-agents (RAG, MCP Postgres/pgvector Toolbox, Jira and Linear via OAuth), deployed on Vertex AI Agent Engine through gated Cloud Build.",
    ],
    tags: ["Google ADK", "GKE", "Vertex AI", "Python", "RAG"],
  },
  {
    company: "Purdue University",
    role: "Software Engineer, AI Research",
    location: "West Lafayette, IN",
    dates: "Aug 2024 to Present",
    sortDate: "2024-08-15",
    current: true,
    summary:
      "Applied ML research where the product constraints matter as much as the model: interpretability, privacy, and whether a clinician would actually trust the output.",
    bullets: [
      "Built CLIP-H for clinical hypothesis verification on MIMIC-IV using Top-K sparse autoencoders and a GPT/Claude ensemble. Validated against a synthetic oracle at 0.844 AUROC, certifying 14 hypotheses for an AAAI submission with Purdue and Harvard Business School faculty.",
      "Developed a Flutter and TypeScript clinical assistant tested across Indiana hospitals that cuts nurses' documentation overhead by about 40%, running self-hosted LLaMA 3.2 and an on-device, HIPAA-compliant speech-to-text pipeline.",
      "Presented the work at the Purdue Spring Research Conference.",
    ],
    tags: ["Research", "MIMIC-IV", "Interpretability", "LLaMA", "Flutter"],
  },
  {
    company: "Microsoft",
    role: "Software Engineer, Microsoft Research Collaboration",
    location: "The Data Mine at Purdue",
    dates: "Aug 2024 to May 2025",
    sortDate: "2024-08-01",
    current: false,
    summary:
      "Owned the LLM pipeline and the distributed infrastructure under it, turning raw social chatter about Minecraft into insights that reached Microsoft product and marketing leadership.",
    bullets: [
      "Owned a Python LLM sentiment pipeline (LLaMA 4) that processed millions of social posts across Minecraft and A Minecraft Movie.",
      "Designed the distributed Azure Databricks and Spark workflows underneath it, with SQL-optimized schemas across ingestion, inference, evaluation, and monitoring under strict cost and latency SLAs.",
      "Cut compute spend by about 25% with no loss in accuracy.",
    ],
    tags: ["LLaMA", "Spark", "Databricks", "Azure", "Evaluation"],
  },
];
