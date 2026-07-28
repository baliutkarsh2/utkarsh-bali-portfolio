import type { Project } from "./types";

export const projects: Project[] = [
  {
    slug: "checkpoint",
    name: "Checkpoint",
    eyebrow: "Agent reliability",
    tagline:
      "CI/CD for AI agents — adversarial test suites that run before an agent ever meets a user.",
    year: "2025 – present",
    sortDate: "2026-02-01",
    status: "ongoing",
    featured: true,
    metric: "Top 10%",
    metricLabel: "of YC Summer 2026 applicants",
    role: "Co-founder & CTO",
    org: "Checkpoint",
    highlight: "Adversarial test generation, sandboxed execution, LLM-judged scoring",
    problem:
      "Teams shipping LLM agents have unit tests for their code and almost nothing for the agent. The failures that matter are not exceptions — they are a tool called with the wrong argument, a policy boundary quietly crossed, a multi-turn conversation that drifts. None of that shows up in a green build.",
    story:
      "I co-founded Checkpoint with Ayushman Gupta and Aaditya Gaur and led engineering as CTO. The bet was that agents need a pre-production failure surface: somewhere to break the loop on purpose, before a user does it by accident. I'm at Recurly now and run it at lower intensity, but the product is live in private beta and the thesis hasn't changed.",
    built:
      "Engineers submit an agent config — prompts, tools, schemas. Checkpoint generates adversarial multi-turn test suites across five categories, runs them against stateful mocked tools in a sandbox, and scores the transcripts with an LLM judge working from a structured rubric rather than string matching.",
    architecture: [
      "Test generation across happy paths, edge cases, adversarial prompts, policy boundaries, and ambiguous inputs.",
      "Synthetic environments with mocked tool calls that hold state across turns, so multi-step failures are reproducible.",
      "LLM-judged scoring against structured rubrics, which catches semantic regressions that assertion-based tests miss.",
    ],
    stack: ["TypeScript", "Python", "LLM orchestration", "Sandboxed execution", "PostgreSQL"],
    impact:
      "Y Combinator told us our Summer 2026 application ranked in the top 10% of the applicant pool. We didn't get an interview. The product is live in private beta, and the sandbox and test-generation work is still the clearest version of a thesis I hold: agents need somewhere to fail on purpose.",
    learnings: [
      "Adversarial generation is the easy half. Deciding what counts as a failure — and making that judgment reproducible — is the actual product.",
      "Stateful tool mocking mattered more than model choice. Most interesting agent bugs only appear on turn three or later.",
      "A strong application signal is not a business. Ranking well told us the problem was legible; it didn't tell us anyone would pay yet.",
    ],
    links: [{ label: "usecheckpoint.dev", href: "https://usecheckpoint.dev", kind: "site" }],
  },
  {
    slug: "autonomous-app-crawler",
    name: "Autonomous App Crawler",
    eyebrow: "Agent infrastructure",
    tagline:
      "A distributed Android crawler that extracts deep UI state and feeds RAG corpora to downstream agents.",
    year: "2025",
    sortDate: "2025-12-01",
    status: "shipped",
    featured: true,
    metric: "<1%",
    metricLabel: "task failure rate in production",
    role: "Software Engineer Intern",
    org: "QualGent (YC X25)",
    highlight: "Crawler, checkpointing, semantic UI state",
    problem:
      "AI agents are only as good as the state they can see. Mobile apps make that hard: screens are dynamic, flows branch, and failure states pile up quickly.",
    story:
      "At QualGent I worked on a crawler that helped agents understand real Android apps. The hard part was never the crawling — it was keeping state, recovery, and scale sane while running across messy mobile flows that break in ways no one designed for.",
    built:
      "A distributed Android app crawler that extracts deep UI state and generates RAG-ready corpora for downstream agent workflows. It went from zero to production in under two months.",
    architecture: [
      "Dockerized Android emulator workers coordinated through Kubernetes on GCP.",
      "PostgreSQL-backed checkpointing, task recovery, and deterministic reconciliation.",
      "AAB-to-APK automation with semantic state extraction for downstream agent systems.",
    ],
    stack: ["Python", "TypeScript", "Docker", "Kubernetes", "GCP", "PostgreSQL", "RAG"],
    impact:
      "Reached below 1% task failure in production and became core infrastructure inside QualGent.",
    links: [],
    confidential: true,
  },
  {
    slug: "multi-agent-qa",
    name: "LLM Multi-Agent QA System",
    eyebrow: "Agent QA",
    tagline:
      "Four agents — planner, executor, verifier, supervisor — driving Android UI flows to deterministic completion.",
    year: "2025",
    sortDate: "2025-08-01",
    status: "shipped",
    featured: true,
    metric: ">99%",
    metricLabel: "deterministic execution, internal benchmark",
    role: "Independent build",
    highlight: "Planner, executor, verifier, supervisor",
    problem:
      "Most agent tests fail in boring ways: a bad click, a missing state check, or a recovery path that was never designed.",
    story:
      "I built a small multi-agent QA system for Android flows. One agent plans, one executes, one checks state, and one handles recovery when the app does something unexpected. Splitting those roles turned out to matter more than making any single one smarter.",
    built:
      "A multi-agent Android QA pipeline that plans flows, executes through ADB, verifies state transitions, and supervises recovery loops.",
    architecture: [
      "Planner agent decomposes natural-language test goals into executable UI steps.",
      "Executor talks to Android Debug Bridge while the verifier checks UI state transitions.",
      "Supervisor handles retries, failure recovery, and deterministic completion criteria.",
    ],
    stack: ["Python", "OpenAI API", "ADB", "LLMs", "Agent orchestration"],
    impact:
      "Achieved more than 99% deterministic execution across complex UI flows in internal benchmarks.",
    links: [
      { label: "Watch the demo", href: "https://youtu.be/d7lRN2lXeu0", kind: "video" },
      {
        label: "Source",
        href: "https://github.com/baliutkarsh2/multi_agent_qa_mark2",
        kind: "repo",
      },
    ],
  },
  {
    slug: "wallex",
    name: "WalleX",
    eyebrow: "Consumer AI",
    tagline:
      "An AI wallpaper app with nine open-source image models — my first product with real users in it.",
    year: "2024",
    sortDate: "2024-10-01",
    status: "shipped",
    featured: true,
    metric: "300+",
    metricLabel: "active users across 22+ countries",
    role: "Solo product build",
    highlight: "Nine image models, mobile app, monetization",
    problem:
      "I wanted to ship an AI product that real people would use, not just another weekend demo.",
    story:
      "WalleX was my first real consumer app. I owned the mobile UX, model integration, analytics, deployment, and monetization — then watched real users find it in countries I had never been to. It taught me more about product than any project before it.",
    built:
      "A cross-platform AI wallpaper app with nine open-source text-to-image models, analytics, remote config, and AdMob monetization.",
    architecture: [
      "Flutter client with Firebase-backed user flows, analytics, and remote configuration.",
      "Python model integration layer using Hugging Face and GCP services.",
      "AdMob monetization and production feedback loops across mobile users.",
    ],
    stack: ["Flutter", "Python", "Hugging Face", "Firebase", "GCP", "AdMob"],
    impact:
      "Scaled to 300+ active users across 22+ countries, with full ownership from product through deployment.",
    links: [],
  },
  {
    slug: "clinical-ai-assistant",
    name: "Clinical AI Assistant",
    eyebrow: "Healthcare AI",
    tagline:
      "Self-hosted LLaMA, on-device speech, and SHAP-backed ICU risk tooling — built under real privacy constraints.",
    year: "2024 – 25",
    sortDate: "2025-05-01",
    status: "research",
    featured: true,
    metric: "~40%",
    metricLabel: "less documentation overhead, research testing",
    role: "AI Researcher",
    org: "Purdue University",
    highlight: "Private speech, local models, interpretable risk",
    problem:
      "Clinical AI has to be useful without being careless. Privacy, latency, and interpretability matter as much as the model does.",
    story:
      "In Purdue research I worked on clinical AI tools with hard privacy constraints: local speech-to-text, self-hosted models, and risk explanations a clinician could actually inspect and argue with.",
    built:
      "A clinical assistant app with self-hosted LLaMA, on-device speech-to-text, and interpretable ICU readmission risk tooling.",
    architecture: [
      "Flutter and TypeScript application layer for clinical workflows.",
      "Self-hosted LLaMA 3.2 and a zero-API speech pipeline for strict privacy.",
      "PyTorch Transformer model with SHAP-backed reasoning for ICU readmission risk.",
    ],
    stack: ["Flutter", "TypeScript", "LLaMA", "PyTorch", "TensorFlow", "SHAP"],
    impact:
      "Cut documentation overhead by roughly 40% in research testing and supported interpretable what-if analysis.",
    links: [{ label: "Source", href: "https://github.com/baliutkarsh2/nurse2", kind: "repo" }],
  },
  {
    slug: "semantic-memory-gc",
    name: "Semantic Memory GC",
    eyebrow: "Agent memory",
    tagline:
      "An asynchronous garbage collector for vector memory, so long-running agents stop drowning in their own context.",
    year: "2025",
    sortDate: "2025-06-01",
    status: "research",
    featured: false,
    metric: "~35%",
    metricLabel: "faster retrieval on benchmarked workloads",
    role: "Research prototype",
    highlight: "Vector memory pruning for long-running agents",
    problem:
      "Long-running agents collect too much memory. After a while, retrieval gets slower and context gets noisier — and the agent gets worse for reasons that look like model regression but aren't.",
    story:
      "I built a pruning pipeline for vector memory stores so long-running agents could retrieve context faster without carrying every redundant memory forever.",
    built:
      "An asynchronous garbage collector for vector memory stores, with a benchmark harness for retrieval latency and memory quality.",
    architecture: [
      "Similarity clustering for redundant context detection across vector stores.",
      "Asynchronous pruning pipeline that avoids blocking agent runtime paths.",
      "Benchmark harness for retrieval latency and memory quality regressions.",
    ],
    stack: ["Python", "LLMs", "Vector databases", "Embeddings", "Evaluation"],
    impact:
      "Improved long-term retrieval latency by roughly 35% on benchmarked agent memory workloads.",
    links: [],
  },
  {
    slug: "langsam-robotic-organizer",
    name: "LangSAM Robotic Organizer",
    eyebrow: "Vision to action",
    tagline:
      "Language-guided segmentation wired straight into a robot arm's control loop.",
    year: "2024",
    sortDate: "2024-04-01",
    status: "research",
    featured: false,
    metric: "Real-time",
    metricLabel: "perception-to-action loop",
    role: "Robotics prototype",
    highlight: "Language-guided segmentation to robot control",
    problem:
      "Robotics gets interesting when language, vision, and physical action meet in the same loop.",
    story:
      "I connected language-guided segmentation to a robot control loop: name the object, detect it, convert the mask into coordinates, and move the arm.",
    built:
      "A real-time object detection and segmentation pipeline using LangSAM to coordinate a robotic arm for autonomous organization tasks.",
    architecture: [
      "Language-guided segmentation identifies target objects from camera input.",
      "Vision pipeline translates masks into actionable coordinates for manipulation.",
      "Control loop bridges perception output with physical arm movement.",
    ],
    stack: ["Python", "Computer vision", "LangSAM", "Robotics", "Segmentation"],
    impact:
      "Demonstrated an end-to-end perception-to-action workflow for autonomous physical organization.",
    links: [],
  },
];
