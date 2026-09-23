/**
 * A tag row: short entries set as one line joined by middots, wrapping only
 * between two entries (components.css, `.tag-row`).
 *
 * The middots are drawn by CSS and never read, so between two entries the
 * DOM carries a real ", " of its own. It is set at zero size, so it takes no
 * room, and hidden from assistive tech, which already has the list. Copying
 * the row or reading it as text (reader views, search) then gives "Next.js,
 * Python, AWS" instead of "Next.jsPythonAWS". Its space is also the only
 * place the line may break, which is how the CSS keeps the last two entries
 * together.
 *
 * `className` adds the consumer's own classes (type, spacing) to the list.
 */
export function TagList({
  items,
  className,
  label,
}: {
  items: readonly string[];
  className?: string;
  label?: string;
}) {
  const last = items.length - 1;
  return (
    <ul className={className ? `tag-row ${className}` : "tag-row"} aria-label={label}>
      {items.map((item, i) => (
        <li key={item}>
          {item}
          {i < last && (
            <span className="tag-break" aria-hidden="true">
              {", "}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
