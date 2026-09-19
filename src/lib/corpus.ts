import "server-only";

import { type Project } from "@/content";

/**
 * The sections a case study renders, stated once.
 *
 * This file used to compute a rare-book collation formula for every project --
 * plate number, movement count, stage count, word count, pull date, all in
 * roman. It was accurate and it told a reader nothing they came for. The page
 * that printed it is gone; so is everything here that fed it.
 */

export const MOVEMENTS = ["Problem", "Approach", "How it works", "Impact"] as const;

/** The fifth movement, on the projects that have learnings to close on. */
export const CODA = "What I’d do differently";

export function hasCoda(project: Project): boolean {
  return (project.learnings?.length ?? 0) > 0;
}
