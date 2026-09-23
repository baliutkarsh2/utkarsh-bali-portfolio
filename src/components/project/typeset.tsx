import { Fragment, type ReactNode } from "react";

/**
 * A display line, set by hand where the font will not set it.
 *
 * Two things Bodoni Moda gets wrong at display size, and CSS cannot reach
 * either, because both are about one pair of letters or one word:
 *
 *   · Its kern table barely closes W against a lowercase letter. On the 84px
 *     /projects title the W's ink ended 17px before the o began while every
 *     other gap in the word was 2 to 11px, so it read "W ork" -- and "W hat",
 *     "W alleX". A word-initial W before a lowercase letter is pulled in:
 *     0.06em over a round letter, which tucks the o under the W's arm, and
 *     0.045em over an ascender, whose stem would otherwise touch it.
 *
 *   · A hyphenated compound breaks at its hyphen, and "LLM Multi-" /
 *     "Agent QA System" left a dangling hyphen at the end of a display line.
 *     U+2011 would forbid the break, but the served Bodoni subsets have no
 *     glyph for it and it would fall back to another face. So the compound
 *     is one unbreakable run and moves down whole.
 *
 * Server-safe and allocation-light; the text itself is never changed, so a
 * screen reader and a copy-paste get exactly the string they were given.
 */
const COMPOUND = /(\S+-\S+)/;
const ASCENDER = /[bdfhijklt]/;

export function Typeset({ children }: { children: string }) {
  return children.split(COMPOUND).map((part, i) => {
    if (!part) return null;
    const set = kern(part, i);
    return COMPOUND.test(part) ? (
      <span key={i} className="whitespace-nowrap">
        {set}
      </span>
    ) : (
      <Fragment key={i}>{set}</Fragment>
    );
  });
}

function kern(text: string, key: number): ReactNode[] {
  const out: ReactNode[] = [];
  const pair = /(^|\s)W(?=[a-z])/g;
  let from = 0;
  for (let m = pair.exec(text); m; m = pair.exec(text)) {
    const at = m.index + m[1].length;
    if (at > from) out.push(text.slice(from, at));
    const tall = ASCENDER.test(text[at + 1]);
    out.push(
      <span key={`${key}-${at}`} className={tall ? "kern-w kern-w-tall" : "kern-w"}>
        W
      </span>,
    );
    from = at + 1;
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}
