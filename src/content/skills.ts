import type { SkillGroup } from "./types";

export const skillGroups: SkillGroup[] = [
  {
    name: "Languages",
    skills: ["Python", "TypeScript", "JavaScript", "Go", "C++", "C", "Java", "SQL"],
  },
  {
    name: "AI / ML & agents",
    skills: [
      "Claude Agent SDK",
      "Google ADK",
      "MCP",
      "PyTorch",
      "TensorFlow",
      "LangChain",
      "RAG",
      "Multi-agent orchestration",
      "SHAP",
    ],
  },
  {
    name: "Backend & APIs",
    skills: [
      "FastAPI",
      "Gin",
      "Node.js",
      "Express",
      "React",
      "Next.js",
      "Flutter",
      "gRPC",
      "REST",
      "GraphQL",
      "WebSockets",
    ],
  },
  {
    name: "Data & infrastructure",
    skills: [
      "BigQuery",
      "Spark",
      "Kafka",
      "PostgreSQL / pgvector",
      "Elasticsearch",
      "Redis",
      "Supabase",
      "Firebase",
      "MongoDB",
    ],
  },
  {
    name: "Cloud & DevOps",
    skills: [
      "GCP (GKE, Cloud Run, Vertex AI)",
      "AWS",
      "Azure",
      "Kubernetes",
      "Docker",
      "Helm",
      "Terraform",
      "n8n",
      "CI/CD",
    ],
  },
];
