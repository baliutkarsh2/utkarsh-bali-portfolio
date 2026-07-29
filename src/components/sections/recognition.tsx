import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { achievements } from "@/content";

export function Recognition({ index = "02" }: { index?: string }) {
  return (
    <section id="recognition" aria-labelledby="recognition-title" className="shell section-y">
      <SectionHeading
        index={index}
        eyebrow="Recognition"
        title="Awards, rankings, and a near miss."
        id="recognition-title"
      />

      <ul className="mt-12">
        {achievements.map((item) => {
          const content = (
            <div className="grid gap-y-2 py-6 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-x-8">
              <span className="meta pt-1.5 text-faint">{item.year}</span>
              <div>
                <div className="flex items-start gap-2">
                  <h3 className="text-lg font-sans font-medium">{item.label}</h3>
                  {item.href && (
                    <ArrowUpRight
                      aria-hidden
                      className="row-arrow mt-1.5 size-4 shrink-0 text-faint"
                    />
                  )}
                </div>
                <p className="measure mt-2 text-pretty text-sm leading-6 text-muted">
                  {item.detail}
                </p>
              </div>
            </div>
          );

          return (
            <li
              key={item.label}
              className={`border-t border-rule last:border-b ${item.href ? "index-row" : ""}`}
            >
              {item.href ? (
                <Link href={item.href} className="block">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
