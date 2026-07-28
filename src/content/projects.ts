import type { Project } from "./types";

export const projects: Project[] = [
  {
    slug: "checkpoint",
    name: "Checkpoint",
    eyebrow: "Agent reliability",
    tagline:
      "CI/CD for AI agents. Adversarial test suites that run before an agent ever meets a user.",
    year: "2026",
    sortDate: "2026-02-01",
    status: "ongoing",
    featured: true,
    metric: "Top 10%",
    metricLabel: "of YC Summer 2026 applicants",
    role: "Co-founder & CTO",
    org: "Checkpoint",
    highlight: "Adversarial test generation, sandboxed execution, LLM-judged scoring",
    problem:
      "Teams shipping LLM agents have unit tests for their code and almost nothing for the agent. The failures that matter are not exceptions. They are a tool called with the wrong argument, a policy boundary quietly crossed, a multi-turn conversation that drifts. None of that shows up in a green build.",
    story:
      "I co-founded Checkpoint with Ayushman Gupta and Aaditya Gaur and led engineering as CTO. The bet was that agents need a pre-production failure surface: somewhere to break the loop on purpose, before a user does it by accident. I'm at Recurly now and run it at lower intensity, but the product is live in private beta and the thesis hasn't changed.",
    built:
      "Engineers submit an agent config: prompts, tools, schemas. Checkpoint generates adversarial multi-turn test suites across five categories, runs them against stateful mocked tools in a sandbox, and scores the transcripts with an LLM judge working from a structured rubric rather than string matching.",
    architecture: [
      "Test generation across happy paths, edge cases, adversarial prompts, policy boundaries, and ambiguous inputs.",
      "Synthetic environments with mocked tool calls that hold state across turns, so multi-step failures are reproducible.",
      "LLM-judged scoring against structured rubrics, which catches semantic regressions that assertion-based tests miss.",
    ],
    stack: ["Next.js", "Python", "FastAPI", "OpenAI API", "AWS"],
    impact:
      "Y Combinator told us our Summer 2026 application ranked in the top 10% of the applicant pool. We didn't get an interview. The product is live in private beta, and the sandbox and test-generation work is still the clearest version of a thesis I hold: agents need somewhere to fail on purpose.",
    learnings: [
      "Adversarial generation is the easy half. Deciding what counts as a failure, and making that judgment reproducible, is the actual product.",
      "Stateful tool mocking mattered more than model choice. Most interesting agent bugs only appear on turn three or later.",
      "A strong application signal is not a business. Ranking well told us the problem was legible; it didn't tell us anyone would pay yet.",
    ],
    links: [{ label: "usecheckpoint.dev", href: "https://usecheckpoint.dev", kind: "site" }],
  },
  {
    slug: "autonomous-app-crawler",
    name: "App Crawler",
    eyebrow: "Agent infrastructure",
    tagline:
      "A GKE-distributed crawler that indexes Android apps into an org-wide knowledge base for downstream agents.",
    year: "2025",
    sortDate: "2025-12-01",
    status: "shipped",
    featured: true,
    metric: "<1%",
    metricLabel: "task failure rate at scale",
    role: "Software Engineer Intern",
    org: "QualGent (YC X25)",
    highlight: "DFS agent, Set-of-Marks, Vertex AI RAG corpus",
    problem:
      "AI agents are only as good as the state they can see. Mobile apps make that hard: screens are dynamic, flows branch, and failure states pile up quickly.",
    story:
      "At QualGent I architected App Crawler, reporting to the CTO. The hard part was never the crawling. It was keeping state, recovery, and scale sane while running across messy mobile flows that break in ways nobody designed for.",
    built:
      "A GKE-distributed Python system that indexes Android apps into an org-wide knowledge base, using a GPT-4o DFS agent with Set-of-Marks and uiautomator2 to traverse UIs via ADB and populate a Vertex AI RAG corpus.",
    architecture: [
      "GPT-4o depth-first agent using Set-of-Marks prompting and uiautomator2 to traverse app UIs through ADB.",
      "Event-driven backend: a Supabase-queue watcher spawning per-app Kubernetes Jobs, an AAB to APK converter, and remote emulator leasing from a managed GCE fleet.",
      "Self-healing CronJobs holding a sub-1% failure rate at scale, with the extracted state landing in a Vertex AI RAG corpus.",
    ],
    stack: ["Python", "GKE", "Kubernetes", "GCP", "Vertex AI", "GPT-4o", "ADB"],
    impact:
      "Held a sub-1% failure rate at production scale and became core infrastructure inside QualGent, feeding the knowledge base that the company's QA copilot reads from.",
    links: [],
    confidential: true,
  },
  {
    slug: "qualgent-ai-assistant",
    name: "QualGent AI Assistant",
    eyebrow: "Agent orchestration",
    tagline:
      "An enterprise QA copilot routing across 45+ tools and sub-agents from a single orchestrator.",
    year: "2025",
    sortDate: "2025-11-01",
    status: "shipped",
    featured: true,
    metric: "45+",
    metricLabel: "tools and sub-agents unified",
    role: "Software Engineer Intern",
    org: "QualGent (YC X25)",
    highlight: "Gemini 2.5 Pro orchestrator on Google ADK",
    problem:
      "QA teams had capability scattered across a dozen surfaces: test history in one place, tickets in another, app knowledge in a third. Every question meant stitching them together by hand.",
    story:
      "I built QualGent's flagship assistant: one orchestrator that could reach everything. The interesting engineering was in routing, not generation. With 45+ tools available, picking the right three is the whole problem.",
    built:
      "An enterprise QA copilot built as a Gemini 2.5 Pro orchestrator on Google ADK, routing across 45+ tools and sub-agents and deployed on Vertex AI Agent Engine through a gated Cloud Build pipeline.",
    architecture: [
      "Gemini 2.5 Pro orchestrator on Google ADK, routing across 45+ tools and sub-agents with shared state management.",
      "Tool surface spanning RAG retrieval, an MCP Postgres/pgvector Toolbox, and Jira and Linear through OAuth.",
      "Deployed to Vertex AI Agent Engine via gated Cloud Build, so agent changes ship through the same review gate as code.",
    ],
    stack: ["Google ADK", "Gemini 2.5 Pro", "Vertex AI", "MCP", "pgvector", "Cloud Build"],
    impact:
      "Unified 45+ autonomous agents and tools behind one interface, becoming the primary way QA engineers at QualGent queried app knowledge, test history, and issue trackers.",
    links: [],
    confidential: true,
  },
  {
    slug: "clip-h",
    name: "CLIP-H",
    eyebrow: "Interpretability research",
    tagline:
      "Clinical hypothesis verification on MIMIC-IV using sparse autoencoders and an LLM ensemble.",
    year: "2026",
    sortDate: "2026-01-01",
    status: "research",
    featured: true,
    metric: "0.844",
    metricLabel: "AUROC against a synthetic oracle",
    role: "Software Engineer, AI Research",
    org: "Purdue University",
    highlight: "Top-K SAEs, GPT/Claude ensemble, NeurIPS submission planned",
    problem:
      "Language models will generate clinical hypotheses all day. The hard question is which ones survive contact with the data, and whether you can show your work well enough for a reviewer to check it.",
    story:
      "I built CLIP-H with Purdue and Harvard Business School faculty. The goal was hypothesis verification you could actually audit: sparse features you can name, an ensemble that disagrees usefully, and a validation setup that doesn't quietly grade its own homework.",
    built:
      "A hypothesis verification pipeline over MIMIC-IV using Top-K sparse autoencoders to surface interpretable features, with a GPT and Claude ensemble scoring candidate hypotheses.",
    architecture: [
      "Top-K sparse autoencoders over MIMIC-IV representations, producing features sparse enough to be named and inspected.",
      "A GPT and Claude ensemble scoring candidate clinical hypotheses, where disagreement between models is signal rather than noise.",
      "Validation against a synthetic oracle with known ground truth, so verification accuracy is measurable rather than asserted.",
    ],
    stack: ["Python", "PyTorch", "Sparse autoencoders", "MIMIC-IV", "GPT", "Claude"],
    impact:
      "Reached 0.844 AUROC against the synthetic oracle and certified 14 hypotheses with Purdue and Harvard Business School faculty. The work is being prepared for a NeurIPS submission targeted for September 2026.",
    links: [
      {
        label: "Source",
        href: "https://github.com/baliutkarsh2/hypothesis_generation",
        kind: "repo",
      },
    ],
  },
  {
    slug: "multi-agent-qa",
    name: "LLM Multi-Agent QA System",
    eyebrow: "Agent QA",
    tagline:
      "Four agents (planner, executor, verifier, supervisor) driving Android UI flows to deterministic completion.",
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
      "I built a multi-agent QA system for Android flows. One agent plans, one executes, one checks state, and one handles recovery when the app does something unexpected. Splitting those roles mattered more than making any single one smarter.",
    built:
      "An agentic ADB pipeline that converts natural language into Android actions using episodic memory, with a planner, executor, verifier, and supervisor coordinating over a message bus.",
    architecture: [
      "Planner agent decomposes natural-language test goals into executable UI steps, replanning when the app diverges.",
      "Executor drives Android Debug Bridge with GPT-4o and OpenAI Vision reading the screen, while the verifier checks state transitions.",
      "Supervisor logs decisions and owns retries, failure recovery, and deterministic completion criteria.",
    ],
    stack: [
      "Python",
      "GPT-4o",
      "OpenAI Vision",
      "ADB",
      "UI Automator",
      "Android SDK",
    ],
    impact:
      "Achieved more than 99% deterministic execution across complex UI flows in internal benchmarks.",
    cover: {
      kind: "image",
      src: "/projects/qa-architecture.png",
      alt: "Architecture diagram of the multi-agent QA system, showing the planner, executor, verifier, and supervisor agents communicating over a message bus within an episode loop",
      width: 1600,
      height: 900,
    },
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
    slug: "clinical-ai-assistant",
    name: "Clinical AI Assistant",
    eyebrow: "Healthcare AI",
    tagline:
      "Self-hosted LLaMA and on-device speech, tested across Indiana hospitals under HIPAA constraints.",
    year: "2024 to 2025",
    sortDate: "2025-05-01",
    status: "research",
    featured: true,
    metric: "~40%",
    metricLabel: "less documentation overhead for nurses",
    role: "Software Engineer, AI Research",
    org: "Purdue University",
    highlight: "Private speech, local models, real hospital testing",
    problem:
      "Clinical AI has to be useful without being careless. Privacy, latency, and interpretability matter as much as the model does, and a nurse mid-shift will not wait on a round trip to someone else's API.",
    story:
      "I built a clinical assistant with hard privacy constraints: nothing leaves the device that doesn't have to. Local speech-to-text, self-hosted models, and an interface a nurse could use one-handed while doing something else.",
    built:
      "A Flutter and TypeScript clinical assistant tested across Indiana hospitals, running self-hosted LLaMA 3.2 and an on-device, HIPAA-compliant speech-to-text pipeline.",
    architecture: [
      "Flutter and TypeScript application layer built around voice-first clinical workflows: tasks, reminders, and patient vitals.",
      "Self-hosted LLaMA 3.2 with a zero-API, on-device speech pipeline, so protected health information never leaves the device.",
      "Deployed and tested across Indiana hospitals, then presented at the Purdue Spring Research Conference.",
    ],
    stack: ["Flutter", "TypeScript", "LLaMA 3.2", "PyTorch", "On-device STT"],
    impact:
      "Cut nurses' documentation overhead by roughly 40% in hospital testing, and was presented at the Purdue Spring Research Conference.",
    cover: {
      kind: "image",
      src: "/projects/clinical-cover.png",
      alt: "Three screens from the clinical assistant app: a voice prompt reading 'How can I help you today?', a task list, and a patient vitals view",
      width: 1600,
      height: 900,
    },
    media: [
      {
        kind: "image",
        src: "/projects/clinical-1.png",
        alt: "Home screen with a large microphone button under the prompt 'How can I help you today?', plus shortcuts to add a task or reminder and to view patient vitals",
        width: 700,
        height: 1482,
        caption: "Voice-first home screen. The microphone is the primary control.",
      },
      {
        kind: "image",
        src: "/projects/clinical-2.png",
        alt: "Task and reminder list screen in the clinical assistant",
        width: 700,
        height: 1482,
        caption: "Tasks and reminders, dictated hands-free during a shift.",
      },
      {
        kind: "image",
        src: "/projects/clinical-3.png",
        alt: "Patient vitals screen in the clinical assistant",
        width: 700,
        height: 1482,
        caption: "Patient vitals, captured without touching a keyboard.",
      },
    ],
    links: [{ label: "Source", href: "https://github.com/baliutkarsh2/nurse2", kind: "repo" }],
  },
  {
    slug: "wallex",
    name: "WalleX",
    eyebrow: "Consumer AI",
    tagline:
      "An AI wallpaper app with nine image models. My first product with real users in it.",
    year: "2024",
    sortDate: "2024-10-01",
    status: "shipped",
    featured: true,
    metric: "3K+",
    metricLabel: "users across 22+ countries",
    role: "Solo product build",
    highlight: "Nine image models, mobile app, monetization",
    problem:
      "I wanted to ship an AI product that real people would use, not just another weekend demo.",
    story:
      "WalleX was my first real consumer app. I owned the mobile UX, model integration, analytics, deployment, and monetization, then watched real users find it in countries I had never been to. It taught me more about product than any project before it.",
    built:
      "A cross-platform app with nine open-source text-to-image models, Firebase-backed analytics and remote config, and AdMob monetization.",
    architecture: [
      "Flutter client with Firebase-backed user flows, analytics, and remote configuration.",
      "Python model integration layer using Hugging Face and GCP services across nine text-to-image models.",
      "AdMob monetization and production feedback loops across a live mobile user base.",
    ],
    stack: ["Flutter", "Python", "Hugging Face", "Firebase", "GCP", "AdMob"],
    impact:
      "Grew to 3,000+ users across 22+ countries, with full ownership from product through deployment and monetization.",
    links: [{ label: "Source", href: "https://github.com/baliutkarsh2/wallex", kind: "repo" }],
  },
];
