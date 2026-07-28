import type { Experience } from "./types";

export const experiences: Experience[] = [
  {
    company: "Recurly",
    role: "Software Engineer Intern",
    location: "Broomfield, CO",
    dates: "May 2026 — Aug 2026",
    sortDate: "2026-05-01",
    current: true,
    summary:
      "On Recurly's engineering team, building internal automation for the systems behind subscription management.",
    bullets: [
      "Building internal automation tooling for subscription management infrastructure.",
      "Working inside a mature production SaaS codebase where billing correctness is the constraint that matters.",
    ],
    tags: ["Software engineering", "SaaS", "Production systems"],
  },
  {
    company: "QualGent",
    role: "Software Engineer Intern",
    location: "San Francisco, CA",
    dates: "Sep 2025 — Dec 2025",
    sortDate: "2025-09-01",
    current: false,
    summary:
      "Worked directly under the CTO on the QualGent AI Assistant and App Crawler infrastructure. My main work was taking crawler and agent systems from prototype into production.",
    bullets: [
      "Shipped a distributed Android app crawler from zero to production in under two months.",
      "Unified 45+ autonomous agents into the QualGent AI Assistant using Google ADK and shared state management.",
      "Hardened Kubernetes, Docker, PostgreSQL, and GCP infrastructure to reach below 1% production task failure.",
    ],
    tags: ["Agents", "Kubernetes", "GCP", "Python", "TypeScript"],
  },
  {
    company: "The Data Mine",
    role: "Microsoft Research Collaboration",
    location: "Purdue University",
    dates: "Aug 2024 — May 2025",
    sortDate: "2024-08-15",
    current: false,
    summary:
      "Built LLM and Spark pipelines to analyze large-scale Minecraft community data, focused on making the workflow cheaper, easier to query, and reliable enough to run repeatedly.",
    bullets: [
      "Processed millions of posts through LLaMA-powered inference workflows.",
      "Designed Databricks and Spark pipelines with evaluation, monitoring, and SQL-optimized schemas.",
      "Reduced compute spend by roughly 25% while preserving accuracy under cost and latency constraints.",
    ],
    tags: ["LLMs", "Spark", "Databricks", "Azure", "Evaluation"],
  },
  {
    company: "Purdue University",
    role: "AI Researcher",
    location: "West Lafayette, IN",
    dates: "Aug 2024 — Present",
    sortDate: "2024-08-01",
    current: true,
    summary:
      "Research prototypes for clinical assistants, private speech workflows, and ICU risk modeling — applied ML under product constraints like privacy and interpretability.",
    bullets: [
      "Integrated self-hosted LLaMA and on-device speech-to-text into clinical assistant research prototypes.",
      "Built ICU readmission modeling tools with PyTorch Transformers, LLM tool-calling, and SHAP explanations.",
      "Presented AI research through Purdue research programs and public research talks.",
    ],
    tags: ["Research", "Healthcare AI", "PyTorch", "LLaMA", "Privacy"],
  },
];
