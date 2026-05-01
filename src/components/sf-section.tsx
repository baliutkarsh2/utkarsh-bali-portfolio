import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { profile } from "@/lib/content";

export function SanFranciscoSection() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-soft">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-accent">
              San Francisco
            </p>
            <h2 className="text-balance text-4xl font-semibold leading-none tracking-[-0.055em] text-foreground sm:text-6xl">
              Building toward the teams I want to be around.
            </h2>
            <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">
              I want to work with people who ship quickly, talk to users, and
              care about the details. Checkpoint is the center of that work for
              me right now.
            </p>
            <a
              href="#contact"
              className="mt-8 inline-flex items-center gap-2 rounded-md border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:-translate-y-0.5"
            >
              Get in touch
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="relative min-h-[22rem] border-t border-border lg:border-l lg:border-t-0">
            <Image
              src={profile.sfPhoto}
              alt="San Francisco skyline at golden hour"
              fill
              priority
              sizes="(min-width: 1024px) 620px, 100vw"
              className="object-cover object-bottom"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,244,239,0.02),rgba(22,22,22,0.34))]" />
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/20 bg-black/45 p-4 text-white backdrop-blur">
              <p className="text-sm font-semibold">Purdue now, San Francisco for the next chapter.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
