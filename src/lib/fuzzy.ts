/**
 * Subsequence matcher scored by contiguity, word-start alignment, and how
 * early the match begins. Returns the matched indices so the caller can
 * emphasise them. Roughly the behaviour of a fuzzy file-finder, at ~40 lines.
 */
export type FuzzyResult = {
  score: number;
  indices: number[];
};

export function fuzzyMatch(query: string, target: string): FuzzyResult | null {
  if (!query) return { score: 0, indices: [] };

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  const indices: number[] = [];
  let score = 0;
  let ti = 0;
  let streak = 0;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === " ") continue;

    const found = t.indexOf(ch, ti);
    if (found === -1) return null;

    // Contiguous runs are the strongest signal.
    streak = found === ti && qi > 0 ? streak + 1 : 0;
    score += 1 + streak * 4;

    // Word starts matter: "mq" should find "Multi-agent QA".
    const prev = found > 0 ? t[found - 1] : " ";
    if (prev === " " || prev === "-" || prev === "/" || prev === ".") score += 6;

    // Earlier matches rank higher.
    if (found < 12) score += 2;

    indices.push(found);
    ti = found + 1;
  }

  // Prefer shorter targets when scores are otherwise close.
  score -= Math.floor(t.length / 24);

  return { score, indices };
}
