import type { ReactNode } from "react";

type SectionHeadingProps = {
  /** Two-digit index, e.g. "01". Sets the editorial register. */
  index?: string;
  eyebrow: string;
  title: string;
  id?: string;
  children?: ReactNode;
};

/**
 * Left-aligned, numbered, rule above. Deliberately not centred, a centred
 * heading is the single strongest "template" tell.
 */
export function SectionHeading({ index, eyebrow, title, id, children }: SectionHeadingProps) {
  return (
    <div className="grid-editorial !mx-0 !max-w-none !px-0 border-t border-rule pt-5">
      <div className="col-span-full flex items-baseline gap-4 md:col-span-3 lg:col-span-4">
        {index && (
          <span aria-hidden className="meta text-accent-ink">
            {index}
          </span>
        )}
        <span className="meta text-faint">{eyebrow}</span>
      </div>

      <div className="col-span-full mt-4 md:col-span-5 md:mt-0 lg:col-span-8">
        <h2 id={id} className="type-track text-balance text-display-m">
          {title}
        </h2>
        {children && (
          <div className="measure mt-4 text-pretty text-lede text-muted">{children}</div>
        )}
      </div>
    </div>
  );
}
