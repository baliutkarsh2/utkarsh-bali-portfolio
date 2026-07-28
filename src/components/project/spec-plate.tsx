import type { Project } from "@/content";

/**
 * Stands in for a cover image that does not exist yet.
 *
 * It renders at the same 16:9 box a screenshot would occupy, so dropping a real
 * image into `project.cover` later changes the picture without moving a single
 * pixel of surrounding layout. Typographic by design — it should read as an
 * intentional spec panel, not as a missing asset.
 */
export function SpecPlate({ project }: { project: Project }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden border border-rule bg-inset">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-6 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <span className="meta text-faint">{project.eyebrow}</span>
          <span className="meta text-right text-faint">{project.year}</span>
        </div>

        <div className="flex items-end justify-between gap-8">
          <div className="min-w-0">
            <p className="font-display text-5xl leading-none tabular sm:text-7xl">
              {project.metric}
            </p>
            <p className="meta mt-3 max-w-xs text-faint">{project.metricLabel}</p>
          </div>

          <ul className="hidden shrink-0 text-right sm:block">
            {project.stack.slice(0, 5).map((item) => (
              <li key={item} className="meta py-0.5 text-faint">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
