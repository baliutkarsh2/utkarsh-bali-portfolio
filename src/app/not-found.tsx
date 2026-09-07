import type { Metadata } from "next";
import Link from "next/link";
import { SpoiledPlate } from "@/components/interactive/spoiled-plate";

/**
 * Next collects metadata from the not-found convention when it renders a 404
 * (resolve-metadata's `errorConvention`), and the build's type validator only
 * checks page, layout and route files, so this export is both honoured and
 * safe. The layout's template turns it into "Not found | Utkarsh Bali".
 */
export const metadata: Metadata = {
  title: "Not found",
  description: "The link may be out of date, or I may have moved something.",
  robots: { index: false, follow: true },
  // Drop the layout's canonical: a 404 is not a copy of the home page.
  alternates: { canonical: null },
};

/**
 * 404 (§7.8) — the spoiled sheet.
 *
 * This is the one route that keeps the dark ground, and it earns it rather
 * than borrowing it: every other page on this site is paper, and a 404 is not
 * a page, it is a failed pull off the press. So the route runs on --plate,
 * the ground a copper plate is inked on, and the whole palette comes across
 * as a token remap (`html:has(.spoiled)` in plates.css) so the header, the
 * footer, the palette and the focus ring arrive on the dark without any of
 * them being told about it.
 *
 * The figure is the argument: "404" assembled out of dots by the same
 * renderer that draws his face, stopped 470 ms into an 1100 ms pull. Because
 * the assembly radiates outward from the centre of the field, a half-finished
 * one is not a random half — it is solid in the middle and starved at the
 * edges, which is what a plate that did not take actually looks like. It
 * never completes and there is no state after it.
 *
 * The register mark beside the plate is the one vermilion on these four
 * pages. A printer sets one in the margin to check the sheet came through
 * square. This one did not.
 *
 * No cleverness beyond the metaphor: a lost visitor wants the way out, so the
 * two links are the first focusable things in the page.
 */
export default function NotFound() {
  return (
    <section className="spoiled shell" aria-labelledby="not-found-title">
      <p className="sr-only">Error 404: page not found.</p>

      <SpoiledPlate />
      {/* Without JavaScript, or where the canvas cannot run, the figure is
          set in type in the same place at the same size. */}
      <p className="spoiled-fallback" aria-hidden="true">
        404
      </p>

      <div className="spoiled-copy">
        <h1 id="not-found-title" className="spoiled-title text-display-m text-balance">
          The plate didn&rsquo;t take.
        </h1>

        <p className="spoiled-lede text-body">
          The sheet came through the press with nothing on it. The link may be out of
          date, or I may have moved something.
        </p>

        <div className="spoiled-actions text-body">
          <Link href="/">Home</Link>
          <Link href="/projects">All work</Link>
        </div>

        <p className="spoiled-imprint meta">HTTP 404 · no page at this address</p>
      </div>
    </section>
  );
}
