import type { Metadata } from "next";
import { ProjectRow } from "@/components/project/project-row";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";
import { orderedProjects } from "@/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Every project — agent infrastructure, developer tools, consumer AI, and research prototypes, each with a full write-up.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <>
      <header className="shell pb-12 pt-14 sm:pt-20">
        <div className="enter">
          <p className="meta text-faint">Work</p>
          <h1 className="mt-6 text-balance text-display-l font-display">
            Everything I&rsquo;ve built worth writing up.
          </h1>
          <p
            className="measure mt-6 text-pretty text-lede text-muted"
            style={{ "--stagger": 1 } as React.CSSProperties}
          >
            {orderedProjects.length} projects, from production agent infrastructure to
            research prototypes. Each one covers the problem, the architecture, and what
            it actually proved.
          </p>
        </div>
      </header>

      <div className="shell">
        <ul>
          {orderedProjects.map((project, index) => (
            <ProjectRow key={project.slug} project={project} index={index} />
          ))}
        </ul>
      </div>

      <Reveal>
        <Contact />
      </Reveal>
    </>
  );
}
