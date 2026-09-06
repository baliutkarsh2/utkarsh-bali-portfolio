type DotLeaderProps = {
  label: string;
  value?: string;
};

/**
 * Label, then a leader of dots at the pitch to the right edge (or to the
 * value). A table of contents, not a scoreboard (§7.2 Toolkit). The dots are
 * the `dot-leader` utility (globals.css); `leader-draw` (components.css)
 * draws them left to right on `data-in` from a wrapping <Reveal>. Without JS
 * or under reduced motion the leader is simply drawn.
 */
export function DotLeader({ label, value }: DotLeaderProps) {
  return (
    <div className="leader text-small">
      <span className="leader-label text-ink">{label}</span>
      <span className="dot-leader leader-draw" aria-hidden="true" />
      {value && <span className="leader-value data text-ink-2">{value}</span>}
    </div>
  );
}
