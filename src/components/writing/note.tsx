import type { ReactNode } from "react";

type NoteProps = {
  children: ReactNode;
  /**
   * "note" (the default) is an aside: small, --ink-3, right-aligned against
   * the margin rule. "quote" is a voice rather than an aside — the reading
   * serif's italic at the lede size, in full ink.
   */
  kind?: "note" | "quote";
};

/**
 * Marginalia for a hosted post.
 *
 * A note is authored in the MDX at the point of the text it belongs to, which
 * is the whole trick: its vertical position is not computed by anything, it is
 * simply where the flow put it. The CSS (`.column-note` in plates.css) then
 * hangs it into the margin column by a negative margin, so it is outside the
 * measure and no line box is ever shortened — the text column stays a
 * rectangle and the notes sit beside it.
 *
 * It is a float rather than an absolutely positioned box for one reason: two
 * notes written close together have to stack instead of overlapping, and
 * stacking is what floats do for free. Below 64rem there is no margin to hang
 * in, so the same element becomes a quiet indented aside in the flow.
 *
 * Registered in src/mdx-components.tsx, so a post can write:
 *
 *     <Note>Everything after this ran on one box.</Note>
 *     <Note kind="quote">The failures that matter are not exceptions.</Note>
 *
 * with no import.
 */
export function Note({ children, kind = "note" }: NoteProps) {
  return (
    <aside className="column-note" data-kind={kind}>
      {children}
    </aside>
  );
}
