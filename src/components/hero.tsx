import Image from "next/image";
import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  Mail,
} from "lucide-react";
import { profile } from "@/lib/content";

export function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden px-4 pb-0 pt-20 sm:px-6 sm:pt-24"
    >
      <div className="relative z-10 mx-auto w-full">
        <div className="langfuse-frame mx-auto max-w-5xl border-y p-0 animate-rise">
          <div className="flex flex-col border-b border-border text-xs sm:flex-row sm:text-sm">
            <div className="flex flex-1 items-center justify-center gap-2.5 border-b border-border py-4 text-foreground/80 transition-colors hover:bg-surface/30 sm:border-b-0 sm:border-r sm:py-3 cursor-default font-serif italic text-sm sm:text-base">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent"></span>
              </span>
              From idea to product
            </div>
            <div className="flex flex-1 items-center justify-center gap-2 border-b border-border py-4 text-foreground/80 transition-colors hover:bg-surface/30 sm:border-b-0 sm:border-r sm:py-3 cursor-default font-serif italic text-sm sm:text-base">
              Agents · DevTools · Startups
            </div>
            <div className="flex flex-1 items-center justify-center py-4 text-foreground/80 transition-colors hover:bg-surface/30 sm:py-3 cursor-default font-serif italic text-sm sm:text-base">
              Engineer · Product-minded
            </div>
          </div>

          <div className="grid items-start gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[1fr_19rem] lg:px-14 lg:py-16">
            <div className="text-center lg:text-left">
              <h1 className="text-balance text-5xl font-semibold leading-[0.9] tracking-[-0.06em] text-foreground sm:text-7xl lg:text-[6.4rem]">
                <span className="highlight-mark">{profile.name}</span>
              </h1>
              <p className="mt-7 max-w-2xl text-pretty text-lg font-medium leading-8 text-foreground/72 sm:text-xl">
                I build products and infra around AI agents, developer
                tools, and startups. Right now I am working on Checkpoint,
                an agent testing platform for dev teams.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href="#projects"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-md border border-foreground bg-foreground px-6 text-sm font-bold text-background shadow-sm transition hover:-translate-y-0.5"
                >
                  View projects
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#contact"
                  className="inline-flex h-13 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-bold text-foreground shadow-sm transition hover:-translate-y-0.5"
                >
                  Contact / collaborate
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground lg:justify-start">
                <a className="social-link" href={`mailto:${profile.email}`}>
                  <Mail className="h-4 w-4" />
                  Email
                </a>
                <a className="social-link" href={profile.github} target="_blank" rel="noreferrer">
                  <Code2 className="h-4 w-4" />
                  GitHub
                </a>
                <a className="social-link" href={profile.linkedin} target="_blank" rel="noreferrer">
                  <BriefcaseBusiness className="h-4 w-4" />
                  LinkedIn
                </a>
                <a className="social-link" href={profile.x} target="_blank" rel="noreferrer">
                  <BriefcaseBusiness className="h-4 w-4" />
                  X (Twitter)
                </a>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[19rem] lg:mx-0">
              <div className="relative overflow-hidden rounded-[1.35rem] border border-border bg-surface p-2 shadow-soft">
                <div className="relative aspect-[235/317] overflow-hidden rounded-[1rem] bg-card">
                  <Image
                    src={profile.photo}
                    alt="Portrait of Utkarsh Bali"
                    fill
                    priority
                    sizes="(min-width: 1024px) 304px, 80vw"
                    className="object-contain object-center"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
