import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  children?: ReactNode;
};

export function SectionHeading({ eyebrow, title, children }: SectionHeadingProps) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
        {eyebrow}
      </p>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {children ? (
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          {children}
        </p>
      ) : null}
    </div>
  );
}
