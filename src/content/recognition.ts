import type { Achievement } from "./types";

export const achievements: Achievement[] = [
  {
    label: "Y Combinator S26, top 10% of applicants",
    detail:
      "YC told our Checkpoint team that our Summer 2026 application ranked in the top 10% of the applicant pool. We didn't get an interview.",
    year: "2026",
    kind: "startup",
    href: "/projects/checkpoint",
  },
  {
    label: "NeurIPS submission in preparation on clinical hypothesis verification",
    detail:
      "Certified 14 hypotheses with CLIP-H at 0.844 AUROC. Being prepared for a NeurIPS submission targeted for September 2026, with Purdue and Harvard Business School faculty.",
    year: "2026",
    kind: "research",
    href: "/projects/clip-h",
  },
  {
    label: "Mary-Ann Neel Computer Science Scholar",
    detail:
      "Awarded to a top Purdue CS student for academic and technical excellence.",
    year: "2025",
    kind: "academic",
  },
  {
    label: "Discovery Park Research Scholar, 3 times",
    detail:
      "Recognized three times for high-impact interdisciplinary research and engineering.",
    year: "2024 to 2026",
    kind: "research",
  },
  {
    label: "Dean's List and Semester Honors, 6 times",
    detail: "Six semesters at Purdue, carrying a 3.90 / 4.00 GPA in CS and AI.",
    year: "2023 to 2026",
    kind: "academic",
  },
  {
    label: "KVPY, All India Rank 1638 (top 1%)",
    detail:
      "Nationally ranked among 150,000+ candidates for exceptional scientific aptitude.",
    year: "2022",
    kind: "academic",
  },
  {
    label: "Teaching assistant and workshop lead",
    detail:
      "TA for CS 471 (AI) and TDM 101, guiding 300+ students. Led weekly Machine Learning @ Purdue workshops mentoring 200+ more on building and deploying production AI systems.",
    year: "2024 to 2026",
    kind: "community",
  },
];
