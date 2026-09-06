import type { Metadata } from "next";
import { DotBoard } from "@/components/interactive/dot-board";
import { Button } from "@/components/ui/button";

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
 * 404 (§7.8). "404" is set on the board in text mode: the same renderer, the
 * same dots and the same assembly as the face, dispersing on scroll and
 * taking the pin bed. Its canvas is viewport-fixed at z 0 inside this
 * section, so the copy sits in a `board-above` wrapper.
 *
 * Without JavaScript, or if the canvas cannot run (the board reports
 * `data-board="fallback"`), the board box hides and "404" is set in Geist
 * display-xl instead (`.not-found-*` in components.css). The visible figure
 * is decorative either way; the sr-only line is what a screen reader gets.
 *
 * No cleverness beyond the title: a lost visitor wants the way out, so the
 * two actions are the first focusable things after the header.
 */
export default function NotFound() {
  return (
    <section className="not-found shell" aria-labelledby="not-found-title">
      <div className="not-found-board">
        <DotBoard mode="text" text="404" alt="" />
      </div>
      <p className="not-found-fallback text-display-xl text-ink" aria-hidden="true">
        404
      </p>

      <div className="board-above mt-10">
        <p className="sr-only">Error 404: page not found.</p>
        <h1
          id="not-found-title"
          className="text-display-m font-medium text-balance text-ink"
        >
          The dots didn&rsquo;t connect.
        </h1>
        <p className="measure mt-4 text-small text-ink-2">
          The link may be out of date, or I may have moved something.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" href="/">
            Home
          </Button>
          <Button variant="secondary" href="/projects">
            All work
          </Button>
        </div>
      </div>
    </section>
  );
}
