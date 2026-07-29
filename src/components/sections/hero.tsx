import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { now, profile, socials } from "@/content";
import { PlateWord } from "@/components/ui/plate-word";
import { HeroPortrait } from "./hero-portrait";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pt-14">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />

      <div className="shell relative pb-14 pt-12 sm:pt-16">
        {/* `.enter` is applied to each block individually and never to a
            wrapper containing the h1: `.enter > *` starts children at
            opacity 0, which would fade the LCP element. */}
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

        <div className="hero-spread mt-8">
          {/* LCP element, and it must paint on the first frame. The clip-path
              reveal that used to be here started the name fully clipped away,
              which cost about 2s of LCP once the fixed hero grid made this the
              largest element. The plates landing out of register is the actual
              signature moment and it never hides the text, so nothing is lost. */}
          <h1 className="hero-name text-display-xl font-display">
            <PlateWord>Utkarsh</PlateWord>
            <PlateWord>Bali</PlateWord>
          </h1>

          {/* Deliberately after the copy in the DOM. Above 80rem the grid
              places every child by line number so this is invisible there,
              but on a phone the stack follows source order, and a photograph
              wedged between the name and the tagline both reads badly and
              makes itself the LCP element ahead of the text. */}
          <div className="hero-body enter" style={{ "--stagger": 1 } as React.CSSProperties}>
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
              {profile.resume && (
                <a
                  href={profile.resume.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center border border-rule-strong px-5 text-sm font-medium transition-colors hover:bg-inset"
                >
                  R&eacute;sum&eacute;
                </a>
              )}
            </div>
          </div>

          <div className="hero-figure enter" style={{ "--stagger": 2 } as React.CSSProperties}>
            <HeroPortrait />
          </div>

          {/* The education line used to hang under the photo as an orphaned
              caption. It reads as a record here instead. The social list used
              to live inside the <dl>, which is invalid: a description list may
              only contain dt/dd groups. */}
          <div className="hero-meta enter" style={{ "--stagger": 3 } as React.CSSProperties}>
            <dl>
              {[
                { term: "Education", value: profile.education },
                { term: "Graduating", value: profile.graduation },
                { term: "Based in", value: profile.location },
              ].map((row) => (
                <div
                  key={row.term}
                  className="flex items-baseline justify-between gap-4 border-t border-rule py-2.5"
                >
                  <dt className="meta text-faint">{row.term}</dt>
                  <dd className="text-right text-sm">{row.value}</dd>
                </div>
              ))}
            </dl>

            <ul className="tap-list mt-5 flex flex-wrap items-center gap-x-5 gap-y-1">
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
        </div>
      </div>
    </section>
  );
}
