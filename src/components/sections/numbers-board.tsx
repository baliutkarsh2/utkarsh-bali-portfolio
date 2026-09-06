import { Reveal } from "@/components/interactive/reveal";
import { Numeral } from "@/components/ui/numeral";
import { metrics } from "@/content";
import { isDotSafe } from "@/lib/fonts";

/**
 * The numbers board (§7.1, `#proof`): the eight metrics as a hairlined grid,
 * 4 × 2 from 64rem, two columns from 40rem, one column of rows below. Each
 * cell is a numeral top-left with its label bottom-left; on a phone the cell
 * is a 5rem row with the numeral left and the label right.
 *
 * The Reveal wraps the grid itself so the cells are its direct children: it
 * writes `--i` on each, and the numerals inherit it, so they warm 400 → 700
 * forty milliseconds apart, left to right, a departures board flipping. The
 * labels are words and never move. The accent figure ("Top 10%") is the one
 * --sun element of this screen.
 *
 * Doto may only set DOT_GLYPHS; a value with any other character falls back
 * to Geist display-m rather than rendering tofu (the dev-mode throw in
 * <Numeral> is for content bugs, and this keeps production honest too).
 */
export function NumbersBoard() {
  return (
    <section id="proof" aria-labelledby="proof-title" className="shell section-y">
      <h2 id="proof-title" className="sr-only">
        Selected numbers
      </h2>

      <Reveal
        stagger={40}
        className="grid grid-cols-1 gap-x-(--gutter) border-b border-line sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.map((metric) => (
          <p
            key={metric.label}
            className="flex min-h-20 items-baseline justify-between gap-4 border-t border-line py-3 sm:min-h-36 sm:flex-col sm:items-start sm:py-4"
          >
            {isDotSafe(metric.value) ? (
              <Numeral value={metric.value} size="m" accent={metric.accent} />
            ) : (
              <span className="text-display-m text-ink">{metric.value}</span>
            )}
            <span className="meta min-w-0 text-right text-ink-2 sm:text-left">{metric.label}</span>
          </p>
        ))}
      </Reveal>
    </section>
  );
}
