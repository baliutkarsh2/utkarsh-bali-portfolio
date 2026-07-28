/**
 * Char-slide hover label. Renders the text twice, stacked; when an ancestor
 * carrying `.slide-trigger` is hovered or focused, both copies translate up
 * one line. The duplicate is aria-hidden, so assistive tech reads it once.
 */
export function SlideLabel({ children }: { children: string }) {
  return (
    <span className="link-slide">
      <span>{children}</span>
      <span aria-hidden>{children}</span>
    </span>
  );
}
