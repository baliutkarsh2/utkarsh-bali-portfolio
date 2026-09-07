import Link from "next/link";
import { Reveal } from "@/components/interactive/reveal";
import { Numeral } from "@/components/ui/numeral";
import { metrics } from "@/content";

/**
 * The numbers (§7.1, `#proof`): three figures as a hairlined row, three columns
 * from 48rem and stacked below. Each is a different kind of proof and each is a
 * link to the page where it is earned, so the board is a way into the work
 * rather than a wall of statistics.
 *
 * The Reveal wraps the row so the cells are its direct children: it writes
 * `--i` on each, and the numerals inherit it, so they warm 400 -> 700 forty
 * milliseconds apart, left to right, a departures board flipping. The labels
 * are words and never move. The accent figure ("Top 10%") is the one --sun
 * element of this screen.
 *
 * The figures set in Bodoni Moda at 700 with lining tabular numerals. They used
 * to set in Doto, a hand-subset of twenty-three glyphs, which meant every metric
 * on the site had to be spellable in `0123456789.,%<>~+xKTop` and a prebuild
 * script failed the build when it was not. A Didone has the whole alphabet, so a
 * metric can now say whatever it honestly says.
 */
export function NumbersBoard() {
  return (
    <section id="proof" aria-labelledby="proof-title" className="shell section-y">
      <h2 id="proof-title" className="sr-only">
        Three numbers
      </h2>

      <Reveal
        stagger={40}
        className="grid grid-cols-1 gap-x-(--gutter) border-b border-line sm:grid-cols-3"
      >
        {metrics.map((metric) => {
          const figure = <Numeral value={metric.value} size="m" accent={metric.accent} />;

          return (
            <p key={metric.label} className="proof-cell">
              {metric.href ? (
                <Link href={metric.href} className="proof-link">
                  {figure}
                  <span className="meta mt-2 block text-ink-2">{metric.label}</span>
                </Link>
              ) : (
                <>
                  {figure}
                  <span className="meta mt-2 block text-ink-2">{metric.label}</span>
                </>
              )}
            </p>
          );
        })}
      </Reveal>
    </section>
  );
}
