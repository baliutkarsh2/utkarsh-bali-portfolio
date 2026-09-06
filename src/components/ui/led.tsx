type LedProps = {
  state: "live" | "off";
  /** Screen-reader text ("Ongoing"). Without it the disc is decorative and hidden. */
  label?: string;
};

/**
 * A 6 px disc, --sun when live and --ink-3 when off. It never blinks and its
 * colour never transitions (§6). Colour is never the only signal: pass a
 * label wherever the state means something, and the LED reads as text too.
 */
export function Led({ state, label }: LedProps) {
  return (
    <>
      <span className="led" data-state={state} aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
