export type Project = {
  name: string;
  eyebrow: string;
  metric: string;
  role: string;
  highlight: string;
  problem: string;
  story: string;
  built: string;
  architecture: string[];
  stack: string[];
  impact: string;
  links: {
    label: string;
    href: string;
  }[];
};

export type Experience = {
  company: string;
  role: string;
  location: string;
  dates: string;
  summary: string;
  bullets: string[];
  tags: string[];
};

export type SkillGroup = {
  name: string;
  skills: string[];
};

export type Achievement = {
  label: string;
  detail: string;
};

export const profile = {
  name: "Utkarsh Bali",
  shortName: "Utkarsh",
  title: "CS + AI student building agent tools and startup products",
  email: "baliutkarsh2@gmail.com",
  location: "Purdue University",
  github: "https://github.com/baliutkarsh2",
  linkedin: "https://linkedin.com/in/ubali",
  x: "https://x.com/ubali07",
  resumeLabel: "Purdue CS + AI",
  photo: "/utkarsh-photo.jpg",
  sfPhoto: "/sf.jpg",
};

export const navItems = [
  { label: "About", href: "#about" },
  { label: "Now", href: "#now" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Recognition", href: "#achievements" },
  { label: "Contact", href: "#contact" },
];

export const achievements: Achievement[] = [
  {
    label: "Mary-Ann Neel CS Scholar",
    detail: "Awarded to a top Purdue CS student for academic performance and technical impact.",
  },
  {
    label: "Discovery Park Research Scholar",
    detail: "Recognized twice for interdisciplinary research and engineering work.",
  },
  {
    label: "Published AI researcher",
    detail: "Presented AI research at Purdue research expos and talks.",
  },
  {
    label: "KVPY Top 1%",
    detail: "All India Rank 1638 among 150,000+ candidates.",
  },
  {
    label: "Teaching + community",
    detail: "TA for AI/data courses and helped run technical workshops for 200+ students.",
  },
];

export const projects: Project[] = [
  {
    name: "Autonomous App Crawler",
    eyebrow: "Agent infrastructure",
    metric: "<1% failure rate",
    role: "QualGent (YC X25)",
    highlight: "Crawler, checkpoints, semantic UI state",
    problem:
      "AI agents are only as good as the state they can see. Mobile apps make that hard: screens are dynamic, flows branch, and failure states pile up quickly.",
    story:
      "At QualGent, I worked on a crawler that helped agents understand real Android apps. The hard part was keeping state, recovery, and scale sane while running across messy mobile flows.",
    built:
      "I built a distributed Android app crawler that extracts deep UI state and generates RAG-ready corpora for downstream agent workflows.",
    architecture: [
      "Dockerized Android emulator workers coordinated through Kubernetes on GCP.",
      "PostgreSQL-backed checkpointing, task recovery, and deterministic reconciliation.",
      "AAB-to-APK automation with semantic state extraction for downstream agent systems.",
    ],
    stack: ["Python", "TypeScript", "Docker", "Kubernetes", "GCP", "PostgreSQL", "RAG"],
    impact:
      "It reached below 1% task failure in production and became core infrastructure inside QualGent.",
    links: [],
  },
  {
    name: "LLM Multi-Agent QA System",
    eyebrow: "Agent QA",
    metric: ">99% deterministic execution",
    role: "Independent build",
    highlight: "Planner, executor, verifier, supervisor",
    problem:
      "Most agent tests fail in boring ways: a bad click, a missing state check, or a recovery path that was never designed.",
    story:
      "I built a small multi-agent QA system for Android flows: one agent plans, one executes, one checks state, and one handles recovery when the app does something unexpected.",
    built:
      "I built a multi-agent Android QA pipeline that plans flows, executes through ADB, verifies state, and supervises recovery loops.",
    architecture: [
      "Planner agent decomposes natural-language test goals into executable UI steps.",
      "Executor talks to Android Debug Bridge while verifier checks UI state transitions.",
      "Supervisor handles retries, failure recovery, and deterministic completion criteria.",
    ],
    stack: ["Python", "OpenAI API", "ADB", "LLMs", "Agent orchestration"],
    impact:
      "Achieved more than 99% deterministic execution across complex UI flows in internal benchmarks.",
    links: [
      { label: "Youtube demo", href: "https://youtu.be/d7lRN2lXeu0" },
      { label: "GitHub", href: "https://github.com/baliutkarsh2/multi_agent_qa_mark2" },
    ],
  },
  {
    name: "WalleX: AI Wallpapers",
    eyebrow: "Consumer AI",
    metric: "300+ users in 22+ countries",
    role: "Solo product build",
    highlight: "Nine image models, mobile app, monetization",
    problem:
      "I wanted to ship an AI product that real people would use, not just another weekend demo.",
    story:
      "WalleX was my first real consumer app. I owned the mobile UX, model integration, analytics, deployment, and monetization, then watched real users use it across countries.",
    built:
      "I built a cross-platform AI wallpaper app with nine open-source text-to-image models, analytics, remote config, and AdMob.",
    architecture: [
      "Flutter client with Firebase-backed user flows, analytics, and remote configuration.",
      "Python model integration layer using Hugging Face and GCP services.",
      "AdMob monetization and production feedback loops across mobile users.",
    ],
    stack: ["Flutter", "Python", "Hugging Face", "Firebase", "GCP", "AdMob"],
    impact:
      "Scaled to 300+ active users across 22+ countries with full ownership from product to deployment.",
    links: [],
  },
  {
    name: "Semantic Memory GC",
    eyebrow: "Agent memory",
    metric: "~35% faster retrieval",
    role: "Research prototype",
    highlight: "Vector memory pruning for long-running agents",
    problem:
      "Long-running agents collect too much memory. After a while, retrieval gets slower and context gets noisier.",
    story:
      "I built a pruning pipeline for vector memory stores so long-running agents could retrieve context faster without carrying every redundant memory forever.",
    built:
      "I built an asynchronous garbage collector for vector memory stores, with benchmarks for retrieval latency and memory quality.",
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
    name: "Clinical AI Assistant",
    eyebrow: "Healthcare AI",
    metric: "~40% less documentation overhead",
    role: "Purdue AI Research",
    highlight: "Private speech, local models, interpretable risk",
    problem:
      "Clinical AI has to be useful without being careless. Privacy, latency, and interpretability matter as much as the model.",
    story:
      "In Purdue research, I worked on clinical AI tools with privacy constraints: local speech-to-text, self-hosted models, and risk explanations that people could inspect.",
    built:
      "I helped build a clinical assistant app with self-hosted LLaMA, on-device speech-to-text, and interpretable ICU risk tooling.",
    architecture: [
      "Flutter and TypeScript application layer for clinical workflows.",
      "Self-hosted LLaMA 3.2 and zero-API speech pipeline for strict privacy.",
      "PyTorch Transformer model with SHAP-backed reasoning for ICU readmission risk.",
    ],
    stack: ["Flutter", "TypeScript", "LLaMA", "PyTorch", "TensorFlow", "SHAP"],
    impact:
      "Cut documentation overhead by roughly 40% in research testing and supported interpretable what-if analysis.",
    links: [
      { label: "GitHub", href: "https://github.com/baliutkarsh2/nurse2" },
    ],
  },
  {
    name: "LangSAM Robotic Organizer",
    eyebrow: "Vision to action",
    metric: "Real-time perception loop",
    role: "Robotics prototype",
    highlight: "Language-guided segmentation to robot control",
    problem:
      "Robotics gets interesting when language, vision, and physical action meet in the same loop.",
    story:
      "I connected language-guided segmentation to a robot control loop: detect the object, convert the mask into coordinates, and move the arm.",
    built:
      "I built a real-time object detection and segmentation pipeline using LangSAM to coordinate a robotic arm for autonomous organization tasks.",
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

export const experiences: Experience[] = [
  {
    company: "Recurly",
    role: "Software Engineer Intern",
    location: "Broomfield, CO",
    dates: "May 2026 - Aug 2026",
    summary:
      "As a member of Recurly's engineering team, working on internal automation software for subscription management infrastructure.",
    bullets: ["Incoming internship focused on shipping reliable product and platform systems."],
    tags: ["Software engineering", "SaaS", "Production systems"],
  },
  {
    company: "QualGent (YC X25)",
    role: "Software Engineer Intern",
    location: "San Francisco, CA",
    dates: "Sep 2025 - Dec 2025",
    summary:
      "Worked directly under the CTO on QualGent AI Assistant and App Crawler infrastructure, Android automation, and internal AI tooling. My main work was taking crawler and agent systems from prototype into production use.",
    bullets: [
      "Shipped a distributed Android app crawler from zero to production in under two months.",
      "Unified 45+ autonomous agents into the QualGent AI Assistant using Google ADK and shared state management.",
      "Hardened Kubernetes, Docker, PostgreSQL, and GCP infrastructure to reach below 1% production task failure.",
    ],
    tags: ["Agents", "Kubernetes", "GCP", "Python", "TypeScript"],
  },
  {
    company: "The Data Mine",
    role: "Microsoft Research Collab",
    location: "Purdue University",
    dates: "Aug 2024 - May 2025",
    summary:
      "Built LLM and Spark pipelines to analyze large-scale Minecraft community data. I focused on making the workflow cheaper, easier to query, and reliable enough for repeated analysis.",
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
    location: "Purdue University",
    dates: "Aug 2024 - Present",
    summary:
      "Built research prototypes for clinical assistants, private speech workflows, and ICU risk modeling. The work mixed applied ML with product constraints like privacy and interpretability.",
    bullets: [
      "Integrated self-hosted LLaMA and on-device speech-to-text into clinical assistant research prototypes.",
      "Built ICU readmission modeling tools with PyTorch Transformers, LLM tool-calling, and SHAP explanations.",
      "Presented AI research through Purdue research programs and public research talks.",
    ],
    tags: ["Research", "Healthcare AI", "PyTorch", "LLaMA", "Privacy"],
  },
];

export const skillGroups: SkillGroup[] = [
  {
    name: "AI / ML",
    skills: [
      "LLMs",
      "Agents",
      "Eval systems",
      "RAG",
      "Tool-calling",
      "PyTorch",
      "TensorFlow",
      "LangChain",
      "Hugging Face",
      "SHAP",
    ],
  },
  {
    name: "Backend",
    skills: [
      "Python",
      "TypeScript",
      "Node.js",
      "FastAPI",
      "Express",
      "gRPC",
      "REST",
      "GraphQL",
      "PostgreSQL",
      "Redis",
    ],
  },
  {
    name: "Frontend",
    skills: [
      "React",
      "Next.js",
      "Tailwind CSS",
      "Flutter",
      "Design systems",
      "Responsive UI",
      "Product polish",
    ],
  },
  {
    name: "Infra / DevTools",
    skills: [
      "Docker",
      "Kubernetes",
      "GCP",
      "Azure",
      "AWS",
      "Spark",
      "Databricks",
      "Kafka",
      "CI/CD",
      "Terraform",
    ],
  },
];
