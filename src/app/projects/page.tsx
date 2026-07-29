import type { Metadata } from "next";
import { ProjectRow } from "@/components/project/project-row";
import { FeatureSpread } from "@/components/project/feature-spread";
import { WorkPreview } from "@/components/interactive/work-preview";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";
import { orderedProjects } from "@/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Every project: agent infrastructure, developer tools, consumer AI, and research prototypes, each with a full write-up.",
  alternates: { canonical: "/projects" },
};

/** The top three keep their magazine spreads; the rest are index rows. */
const SPREAD_COUNT = 3;

export default function ProjectsPage() {
  const spreads = orderedProjects.slice(0, SPREAD_COUNT);
  const rows = orderedProjects.slice(SPREAD_COUNT);

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

      <div className="shell mt-10 space-y-24 lg:space-y-32">
        {spreads.map((project, index) => (
          <FeatureSpread key={project.slug} project={project} index={index} />
        ))}
      </div>

      {rows.length > 0 && (
        <div className="shell">
          <p className="meta mt-24 border-t border-rule pt-5 text-faint lg:mt-32">
            More work
          </p>
          <WorkPreview>
            <ul className="mt-6">
              {rows.map((project, index) => (
                <ProjectRow
                  key={project.slug}
                  project={project}
                  index={index + SPREAD_COUNT}
                />
              ))}
            </ul>
          </WorkPreview>
        </div>
      )}

      <Reveal>
        <Contact />
      </Reveal>
    </>
  );
}
