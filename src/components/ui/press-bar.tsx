/**
 * The colour control strip printed on the trim edge of a real press sheet:
 * solid process inks, their two-colour overprints, and a grey step wedge the
 * operator reads density from.
 *
 * It is page furniture, not decoration for its own sake. It states the
 * palette the whole site is built from in one line.
 */
const INKS = [
  { name: "C", hex: "#00aeef" },
  { name: "M", hex: "#ec008c" },
  { name: "Y", hex: "#ffd400" },
  { name: "K", hex: "#14140f" },
  { name: "R", hex: "#c33d1c" },
];

const WEDGE = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

export function PressBar() {
  return (
    <div aria-hidden className="press-bar">
      <span className="meta press-bar-label">Colour bar</span>

      <div className="press-bar-inks">
        {INKS.map((ink) => (
          <span key={ink.name} className="press-swatch" style={{ background: ink.hex }}>
            <span className="press-swatch-key">{ink.name}</span>
          </span>
        ))}
      </div>

      <div className="press-bar-wedge">
        {WEDGE.map((step) => (
          <span
            key={step}
            className="press-step"
            style={{ background: `color-mix(in srgb, var(--ink) ${step * 100}%, transparent)` }}
          />
        ))}
      </div>

      <span className="meta press-bar-label press-bar-target">
        <span className="press-target" />
        Register
      </span>
    </div>
  );
}
