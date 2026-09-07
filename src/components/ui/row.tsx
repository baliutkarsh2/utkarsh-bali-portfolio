import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Led } from "@/components/ui/led";
import { cn } from "@/lib/utils";

type RowProps = {
  /** "01", "02" … meta in the gutter; --ink-3 at rest, --ink on hover. Decorative: aria-hidden. */
  index?: string;
  /** Gutter content that is data, not decoration (a year): rendered and read. */
  gutter?: ReactNode;
  /** The row's name in display-s (Bodoni 500). Pass text, or your own heading. */
  title: ReactNode;
  /** One line under the title, small --ink-2. */
  subtitle?: ReactNode;
  /** The meta line: "eyebrow · year · status". */
  meta?: ReactNode;
  /** Right slot: a <Numeral> with its label, or a <Tag>. 14rem at ≥ 48rem, 16rem at ≥ 80rem. */
  trailing?: ReactNode;
  href?: string;
  /** Opens in a new tab, outward arrow, sr-only notice. */
  external?: boolean;
  /** A 6 px LED beside the index: --sun for "live" (the ongoing project), --ink-3 for "off". */
  led?: "live" | "off";
  /** Screen-reader text for the LED ("Ongoing"). */
  ledLabel?: string;
  /** "compact" is the palette result row: label left, hint right, no hairline. */
  variant?: "default" | "compact";
  /** `view-transition-name` on the title, e.g. "project-checkpoint", shared with the case-study h1. */
  transitionName?: string;
  /** The heading element for the title. "h3" under a section h2; "h2" on index pages under the h1. */
  titleAs?: "h2" | "h3" | "div";
  /** Rendered under the subtitle: bullets, extra lines. */
  children?: ReactNode;
  className?: string;
};

/**
 * Every list on the site is this list (§12.9): selected work, the work
 * index, writing, recognition, prev/next and the palette results. The whole
 * row is the link: the title's anchor carries `stretch-link`, so there is
 * never an <a> inside an <a>, and any inner link opts out with
 * `relative z-10`. Hover fills --ground-2 out to the shell edges, the index
 * lights to --ink and the arrow moves 2 px; nothing else moves.
 *
 * The title's heading level is the consumer's call (`titleAs`, default h3),
 * because the same row sits under an h1 on index pages and under an h2
 * inside a Section. Inside a listbox the palette wraps the compact row in
 * its `role="option"` element; `aria-selected` on that wrapper drives the
 * active fill and the LED gutter (see .row[data-variant="compact"]).
 */
export function Row({
  index,
  gutter,
  title,
  subtitle,
  meta,
  trailing,
  href,
  external = false,
  led,
  ledLabel,
  variant = "default",
  transitionName,
  titleAs: TitleTag = "h3",
  children,
  className,
}: RowProps) {
  const compact = variant === "compact";
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

  return (
    <div
      className={cn("row", className)}
      data-variant={variant}
      data-link={href ? "" : undefined}
      data-external={external ? "" : undefined}
      data-trailing={trailing ? "" : undefined}
    >
      <div className="row-gutter meta">
        {index && <span aria-hidden="true">{index}</span>}
        {gutter}
        {led && <Led state={led} label={ledLabel} />}
      </div>

      <div className="row-main">
        <TitleTag
          className={cn(
            "row-title",
            compact ? "text-body" : "text-display-s font-medium text-balance",
          )}
          style={titleStyle}
        >
          {titleContent}
        </TitleTag>
        {subtitle && (
          <p className={cn("row-subtitle text-ink-2", compact ? "text-small" : "mt-1.5 text-small")}>
            {subtitle}
          </p>
        )}
        {meta && <p className={cn("row-meta meta text-ink-3", compact ? "mt-1" : "mt-2.5")}>{meta}</p>}
        {children}
      </div>

      {trailing && <div className="row-trailing">{trailing}</div>}

      {href && !compact && <Arrow className="row-arrow" aria-hidden="true" />}
    </div>
  );
}
