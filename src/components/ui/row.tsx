import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type RowProps = {
  /** "01", "02" … meta in the gutter; --ink-3 at rest, --ink on hover. Decorative: aria-hidden. */
  index?: string;
  /** Gutter content that is data, not decoration (a year): rendered and read. */
  gutter?: ReactNode;
  /** The row's name in display-s (Bodoni 500). Pass text, or your own heading. */
  title: ReactNode;
  /** One line under the title, --ink-2. */
  subtitle?: ReactNode;
  /** The subtitle's register: `small` (16px, the default) or `body` (18px). */
  subtitleSize?: "small" | "body";
  /**
   * The result, in the reading face under the subtitle: a figure and what it
   * counts, set as /projects sets it (`.row-figure` on the figure).
   */
  result?: ReactNode;
  /** The machine line: short labels in mono capitals, never a clause. */
  meta?: ReactNode;
  href?: string;
  /** Opens in a new tab, outward arrow, sr-only notice. */
  external?: boolean;
  /**
   * What the link opens, said beside the arrow on hover ("Case study").
   * Decorative: the title is the link's name.
   */
  cta?: string;
  /** `view-transition-name` on the title, e.g. "project-checkpoint", shared with the case-study h1. */
  transitionName?: string;
  /** The heading element for the title. "h3" under a section h2; "h2" on index pages under the h1. */
  titleAs?: "h2" | "h3" | "div";
};

/**
 * Every list on the site is this list (§12.9): selected work, the work
 * index, writing, recognition and prev/next. The whole
 * row is the link: the title's anchor carries `stretch-link`, so there is
 * never an <a> inside an <a>, and any inner link opts out with
 * `relative z-10`. Hover fills --ground-2 out to the shell edges, the gutter
 * lights to --ink and the arrow moves; nothing else moves.
 *
 * The gutter column exists only when something is in it (`data-gutter`). A
 * row without one used to keep an empty 3rem column and a 1.5rem gap anyway,
 * so its title sat 72px in from the heading above it for no visible reason.
 *
 * The title's heading level is the consumer's call (`titleAs`, default h3),
 * because the same row sits under an h1 on index pages and under an h2
 * inside a section.
 */
export function Row({
  index,
  gutter,
  title,
  subtitle,
  subtitleSize = "small",
  result,
  meta,
  href,
  external = false,
  cta,
  transitionName,
  titleAs: TitleTag = "h3",
}: RowProps) {
  const titleStyle = transitionName
    ? ({ viewTransitionName: transitionName } as CSSProperties)
    : undefined;

  const linkClass = "row-link stretch-link";
  const titleContent = href ? (
    external ? (
      <a className={linkClass} href={href} target="_blank" rel="noopener noreferrer">
        {title}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <Link className={linkClass} href={href}>
        {title}
      </Link>
    )
  ) : (
    title
  );

  const Arrow = external ? ArrowUpRight : ArrowRight;
  const hasGutter = Boolean(index || gutter);

  return (
    <div
      className="row"
      data-link={href ? "" : undefined}
      data-external={external ? "" : undefined}
      data-gutter={hasGutter ? "" : undefined}
    >
      {hasGutter && (
        <div className="row-gutter meta">
          {index && <span aria-hidden="true">{index}</span>}
          {gutter}
        </div>
      )}

      <div className="row-main">
        <TitleTag
          className={cn(
            "row-title",
            "text-display-s font-medium text-balance",
          )}
          style={titleStyle}
        >
          {titleContent}
        </TitleTag>
        {subtitle && (
          <p
            className={cn(
              "row-subtitle text-ink-2",
              subtitleSize === "body" ? "mt-2 text-body" : "mt-1.5 text-small",
            )}
          >
            {subtitle}
          </p>
        )}
        {result && (
          <p className="row-result text-small text-ink-2">{result}</p>
        )}
        {meta && (
          <p className={cn("row-meta meta text-ink-3", result ? "mt-2.5" : "mt-3")}>
            {meta}
          </p>
        )}
      </div>

      {href && (
        <span className="row-end" aria-hidden="true">
          {cta && <span className="row-cta meta">{cta}</span>}
          <Arrow className="row-arrow" />
        </span>
      )}
    </div>
  );
}
