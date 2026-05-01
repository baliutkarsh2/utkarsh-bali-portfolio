import { ArrowRight, BriefcaseBusiness, Code2, Mail } from "lucide-react";
import { profile } from "@/lib/content";

export function Contact() {
  return (
    <section id="contact" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] border-2 border-foreground bg-foreground text-background shadow-soft">
        <div className="relative p-8 sm:p-10 lg:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,188,255,0.28),transparent_34%),linear-gradient(120deg,rgba(0,88,79,0.32),transparent_45%)]" />
          <div className="relative max-w-3xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-background/65">
              Contact
            </p>
            <h2 className="text-balance text-5xl font-semibold leading-none tracking-[-0.055em] text-background sm:text-7xl">
              Reach out if you&apos;re building in this world.
            </h2>
            <p className="mt-5 text-pretty text-lg leading-8 text-background/72">
              I&apos;m always happy to talk about agent tooling, devtools, startups,
              internships, or teams that care about shipping carefully.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground transition hover:-translate-y-0.5"
              >
                Start a conversation
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-background/20 bg-background/10 px-6 text-sm font-semibold text-background backdrop-blur transition hover:-translate-y-0.5 hover:bg-background/15"
              >
                <Code2 className="h-4 w-4" />
                GitHub
              </a>
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-background/20 bg-background/10 px-6 text-sm font-semibold text-background backdrop-blur transition hover:-translate-y-0.5 hover:bg-background/15"
              >
                <BriefcaseBusiness className="h-4 w-4" />
                LinkedIn
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm text-background/62">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-background/80" />
                {profile.email}
              </span>
              <span>·</span>
              <span>Purdue University · CS + AI</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
