import type { Achievement } from "./types";

export const achievements: Achievement[] = [
  {
    label: "Y Combinator S26 — top 10% of applicants",
    detail:
      "YC told our Checkpoint team that our Summer 2026 application ranked in the top 10% of the applicant pool. We didn't get an interview.",
    year: "2026",
    kind: "startup",
    href: "/projects/checkpoint",
  },
  {
    label: "Mary-Ann Neel CS Scholar",
    detail:
      "Awarded to a top Purdue CS student for academic performance and technical impact.",
    year: "2025",
    kind: "academic",
  },
  {
    label: "Discovery Park Research Scholar",
    detail: "Recognized twice for interdisciplinary research and engineering work.",
    year: "2024 – 25",
    kind: "research",
  },
  {
    label: "Published AI researcher",
    detail: "Presented AI research at Purdue research expos and public talks.",
    year: "2024 – 25",
    kind: "research",
  },
  {
    label: "KVPY — top 1%",
    detail: "All India Rank 1638 among 150,000+ candidates.",
    year: "2022",
    kind: "academic",
  },
  {
    label: "Teaching and community",
    detail:
      "TA for AI and data courses; helped run technical workshops for 200+ students.",
    year: "2024 – 25",
    kind: "community",
  },
];
