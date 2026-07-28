import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section className="shell flex min-h-[70svh] flex-col justify-center py-24">
      <p className="meta text-faint">404</p>
      <h1 className="mt-6 text-balance text-display-l font-display">
        This page doesn&rsquo;t exist.
      </h1>
      <p className="measure mt-6 text-pretty text-lede text-muted">
        The link may be out of date, or I may have moved something. The work index is
        probably what you were after.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="group inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-88"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform group-hover:-translate-x-0.5"
          />
          Home
        </Link>
        <Link
          href="/projects"
          className="inline-flex h-11 items-center border border-rule-strong px-5 text-sm font-medium transition-colors hover:bg-inset"
        >
          View all work
        </Link>
      </div>
    </section>
  );
}
