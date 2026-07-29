/**
 * One word set as four process plates.
 *
 * The K plate is the real, readable text and carries no animation, so it is
 * still the LCP paint. The C, M and Y plates are decorative duplicates that
 * land out of register and pull in, settling at a fraction of a pixel off
 * true. That residual misregistration is the point: perfectly registered
 * colour looks digital, slightly off looks printed.
 */
export function PlateWord({ children }: { children: string }) {
  return (
    <span className="plate-word">
      <span aria-hidden className="plate plate-c">
        {children}
      </span>
      <span aria-hidden className="plate plate-m">
        {children}
      </span>
      <span aria-hidden className="plate plate-y">
        {children}
      </span>
      <span className="plate plate-k">{children}</span>
    </span>
  );
}
