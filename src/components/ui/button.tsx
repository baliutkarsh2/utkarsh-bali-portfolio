import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = {
  variant: "primary" | "secondary" | "text";
  /** Internal ("/projects", "#work") renders <Link>; external renders <a>. */
  href?: string;
  /** Without an href the element is a real <button type="button">. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Opens in a new tab with the sr-only notice and the outward arrow. */
  external?: boolean;
  children: ReactNode;
  className?: string;
};

const isExternalHref = (href: string) => /^(https?:|mailto:|tel:)/.test(href);

/**
 * Three registers, one shape: 2.75rem, radius 0, Geist 500 small. Primary
 * fills --ink; secondary is a --line-strong hairline box; text is the dotted
 * underline. The element is chosen by what it does: <Link> for a route,
 * <a> for another origin or a mailto:, <button> for an action.
 */
export function Button({ variant, href, onClick, external, children, className }: ButtonProps) {
  const classes = cn("btn tap", className);
  const content =
    variant === "text" ? <span className="btn-label">{children}</span> : children;

  if (href) {
    // mailto:/tel: are "external" in element terms (never <Link>) but do not
    // open a tab, so they take the new-tab treatment only when asked.
    const outward = external ?? /^https?:/.test(href);
    if (isExternalHref(href) || outward) {
      return (
        <a
          className={classes}
          data-variant={variant}
          data-external={outward ? "" : undefined}
          href={href}
          target={outward ? "_blank" : undefined}
          rel={outward ? "noopener noreferrer" : undefined}
        >
          {content}
          {outward && (
            <>
              <ArrowUpRight className="btn-arrow" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </>
          )}
        </a>
      );
    }
    return (
      <Link className={classes} data-variant={variant} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} data-variant={variant} onClick={onClick}>
      {content}
    </button>
  );
}
