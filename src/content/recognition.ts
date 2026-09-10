import type { Achievement } from "./types";

export const achievements: Achievement[] = [
  {
    label: "Y Combinator Summer 2026, top 10% of applicants",
    detail:
      "YC told our Checkpoint team that our Summer 2026 application ranked in the top 10% of the applicant pool. We didn’t get an interview.",
    year: "2026",
    kind: "startup",
    href: "/projects/checkpoint",
  },
  {
    label: "NeurIPS 2026 workshop submission, under review",
    detail:
      "CLIP-H, on interpretable clinical prediction, with Purdue and Harvard Business School faculty.",
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
    label: "Dean’s List and Semester Honors, 6 times",
    detail: "Six semesters at Purdue, carrying a 3.90 / 4.00 GPA in CS and AI.",
    year: "2023 to 2026",
    kind: "academic",
  },
  {
    label: "KVPY 2021, All India Rank 1638",
    detail:
      "The Kishore Vaigyanik Protsahan Yojana: a Department of Science and Technology fellowship for students going into basic-science research, run by IISc and discontinued after 2022. The 2021 cycle selected on the aptitude test alone.",
    year: "2021",
    kind: "academic",
  },
  {
    label: "Teaching assistant and workshop lead",
    detail:
      "TA for CS 24300 (Artificial Intelligence Basics), CS 471 (Introduction to Artificial Intelligence) and TDM 101, guiding 300+ students. Led weekly Machine Learning @ Purdue workshops mentoring 200+ students on building and deploying production AI systems.",
    year: "2024 to 2026",
    kind: "community",
  },
];
