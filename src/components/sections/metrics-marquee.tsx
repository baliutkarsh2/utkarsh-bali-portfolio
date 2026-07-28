import { metrics } from "@/content";

/**
 * Replaces the old affiliations strip, which was 11px mono in the lowest
 * contrast token and read as an accident rather than a decision.
 *
 * Server component. The scroll is pure CSS: two identical tracks translating
 * by exactly -50% of the pair, which loops seamlessly. The second track is
 * `aria-hidden` so a screen reader hears each figure once.
 */
export function MetricsMarquee() {
  return (
    <section aria-label="Selected numbers" className="marquee">
      <div className="marquee-track">
        <MetricList />
        <MetricList aria-hidden />
      </div>
    </section>
  );
}

function MetricList({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) {
  return (
    <ul className="marquee-list" aria-hidden={ariaHidden}>
      {metrics.map((metric) => (
        <li key={metric.value + metric.label} className="marquee-item">
          <span
            className={`font-display text-2xl leading-none tabular ${
              metric.accent ? "text-accent" : ""
            }`}
          >
            {metric.value}
          </span>
          <span className="meta text-faint">{metric.label}</span>
        </li>
      ))}
    </ul>
  );
}
