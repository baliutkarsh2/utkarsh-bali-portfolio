import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { now, profile, socials } from "@/content";
import portrait from "@/assets/utkarsh.jpg";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pt-14">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />

      <div className="shell relative pb-16 pt-12 sm:pb-20 sm:pt-20">
        {/* Status line */}
        <div className="enter flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            <span className="meta text-muted">{now.status}</span>
          </span>
          <span aria-hidden className="meta text-faint">
            /
          </span>
          <span className="meta text-faint">{now.location}</span>
        </div>

        {/* Name — LCP element. Clip-path reveal paints immediately; it is
            never faded from opacity 0 and carries no animation-delay. */}
        <h1 className="enter-clip mt-8 text-display-xl font-display">
          <span className="block">Utkarsh</span>
          <span className="block">Bali</span>
        </h1>

        <div className="enter mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
          <div style={{ "--stagger": 1 } as React.CSSProperties}>
            <p className="measure text-pretty text-display-s font-display text-foreground">
              {profile.tagline}
            </p>

            <p className="measure mt-5 text-pretty text-lede text-muted">
              Right now I&rsquo;m a software engineering intern at Recurly. Before that I
              built agent infrastructure at{" "}
              <span className="text-foreground">QualGent (YC X25)</span>, and I
              co-founded{" "}
              <Link href="/projects/checkpoint" className="link-underline text-foreground">
                Checkpoint
              </Link>
              , where I&rsquo;m CTO.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="#work"
                className="group inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-88"
              >
                View work
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex h-11 items-center border border-rule-strong px-5 text-sm font-medium transition-colors hover:bg-inset"
              >
                Get in touch
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              {socials
                .filter((social) => social.kind !== "email")
                .map((social) => (
                  <li key={social.kind}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
            </ul>
          </div>

          <div
            className="w-full max-w-[16rem] lg:mt-1"
            style={{ "--stagger": 2 } as React.CSSProperties}
          >
            <div className="relative aspect-[3/4] overflow-hidden border border-rule bg-inset">
              <Image
                src={portrait}
                alt={`Portrait of ${profile.name}`}
                fill
                priority
                placeholder="blur"
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 40vw, 70vw"
                className="object-cover object-center"
              />
            </div>
            <p className="meta mt-3 text-faint">{profile.education}</p>
          </div>
        </div>
      </div>

      {/* Affiliations rule — type-set, no logos. */}
      <div className="shell relative">
        <div className="rule-draw h-px w-full bg-rule" />
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
          {["Recurly", "QualGent · YC X25", "Microsoft Research collab", "Purdue University"].map(
            (item) => (
              <li key={item} className="meta text-faint">
                {item}
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
