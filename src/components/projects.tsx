import { ArrowUpRight, Code2 } from "lucide-react";
import { projects } from "@/lib/content";
import { SectionHeading } from "@/components/ui/section-heading";

export function Projects() {
  return (
    <section id="projects" className="section-shell">
      <SectionHeading eyebrow="Projects" title="A few things I have built.">
        These are the projects that best show how I think: build the core loop,
        make it usable, and learn from where it breaks.
      </SectionHeading>

      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
        {projects.slice(0, 5).map((project) => (
          <article
            key={project.name}
            className="rounded-[1.35rem] border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-foreground/15 bg-surface px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-accent">
                {project.eyebrow}
              </span>
              <span className="rounded-full bg-highlight px-2.5 py-1 text-xs font-black text-foreground">
                {project.metric}
              </span>
            </div>

            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {project.name}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {project.story}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {project.stack.slice(0, 4).map((tech) => (
                <span key={tech} className="tech-chip">
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {project.links.slice(0, 2).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-foreground"
                >
                  {link.label.toLowerCase().includes("github") ? (
                    <Code2 className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                  {link.label}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
