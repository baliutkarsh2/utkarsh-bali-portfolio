"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { navItems } from "@/lib/content";

const overview = { label: "Overview", href: "#home" };

export function PersistentRails() {
  const sections = useMemo(() => [overview, ...navItems], []);
  const [active, setActive] = useState("home");
  const manualActive = useRef("home");
  const scrollSpyLocked = useRef(false);
  const unlockTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (scrollSpyLocked.current) {
        setActive(manualActive.current);
        return;
      }

      const viewportAnchor = window.scrollY + Math.min(window.innerHeight * 0.34, 260);
      let current = "home";

      for (const section of sections) {
        const id = section.href.slice(1);
        const element = document.getElementById(id);
        if (element && element.offsetTop <= viewportAnchor) {
          current = id;
        }
      }

      setActive((previous) => (previous === current ? previous : current));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    requestAnimationFrame(onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (unlockTimer.current) {
        window.clearTimeout(unlockTimer.current);
      }
    };
  }, [sections]);

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const element = document.getElementById(id);

    manualActive.current = id;
    scrollSpyLocked.current = true;
    if (unlockTimer.current) {
      window.clearTimeout(unlockTimer.current);
    }
    unlockTimer.current = window.setTimeout(() => {
      scrollSpyLocked.current = false;
      window.dispatchEvent(new Event("scroll"));
    }, 900);
    setActive(id);
    if (element) {
      const top = Math.max(element.offsetTop - 120, 0);
      window.history.pushState(null, "", `#${id}`);
      window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
    }
  }

  return (
    <div className="pointer-events-none fixed inset-y-0 left-1/2 z-30 hidden w-full max-w-[86rem] -translate-x-1/2 xl:block">
      <aside className="rail-shell pointer-events-auto absolute bottom-4 left-0 top-28 w-56 overflow-y-auto rounded-xl border border-border/80 bg-background/95 shadow-lg shadow-black/5 ring-1 ring-black/5 backdrop-blur-2xl">
        <div className="sticky top-0 z-10 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">
            Current Vibe
          </p>
        </div>
        <RailBlock title="Currently reading">
          <div className="flex flex-col gap-2.5">
            <div className="group relative rounded-md border border-border/80 bg-surface/60 p-3 transition-all hover:border-border hover:bg-card hover:shadow-md">
              <p className="text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-accent">
                Zero to One
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground/90">
                by Peter Thiel
              </p>
            </div>
            <div className="group relative rounded-md border border-border/80 bg-surface/60 p-3 transition-all hover:border-border hover:bg-card hover:shadow-md">
              <p className="text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-accent">
                Cashflow Quadrant
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground/90">
                by Robert Kiyosaki
              </p>
            </div>
            <div className="group relative rounded-md border border-border/80 bg-surface/60 p-3 transition-all hover:border-border hover:bg-card hover:shadow-md">
              <p className="text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-accent">
                Ashtavakra Gita
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground/90">
                Ancient classic
              </p>
            </div>
          </div>
        </RailBlock>

        <RailBlock title="Music rotation">
          <ul className="flex flex-col gap-2">
            {[
              "Indian Indie artists",
              "Charlie Puth & other pop",
              "Nusrat Fateh Ali Khan's Qawwalis",
              "Random beautiful songs on my feed"
            ].map((music) => (
              <li 
                key={music} 
                className="flex items-start gap-2.5 rounded-md border border-border/40 bg-surface/40 px-3 py-2 text-xs font-medium leading-snug text-foreground/80 transition-all hover:border-border/80 hover:bg-surface/80 hover:text-foreground"
              >
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/80" />
                <span>{music}</span>
              </li>
            ))}
          </ul>
        </RailBlock>
      </aside>

      <aside className="rail-shell pointer-events-auto absolute bottom-4 right-0 top-28 w-57 overflow-y-auto rounded-xl border border-border/80 bg-background/95 shadow-lg shadow-black/5 ring-1 ring-black/5 backdrop-blur-2xl">
        <div className="sticky top-0 z-10 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-accent">
            Navigation
          </p>
        </div>
        <div className="border-b border-border/80 p-3 pt-3">
          <nav className="grid gap-1.5 text-sm font-semibold">
            {sections.map((item) => {
              const id = item.href.slice(1);
              const isActive = active === id;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  onClick={(event) => handleNavClick(event, id)}
                  className={`grid grid-cols-[0.55rem_1fr] items-center gap-2.5 rounded-md px-3 py-2 transition-all ${
                    isActive
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-foreground/70 hover:bg-surface/80 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      isActive ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "bg-border/80"
                    }`}
                  />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <RailBlock title="Interests">
          <div className="flex flex-wrap gap-2">
            {[
              "Startups",
              "Artificial Intelligence",
              "Travelling",
              "Art",
            ].map((item) => (
              <span key={item} className="inline-flex items-center rounded-md border border-border/80 bg-surface/50 px-3 py-1.5 text-xs font-semibold text-foreground/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card hover:text-foreground">
                {item}
              </span>
            ))}
          </div>
        </RailBlock>

        <RailBlock title="What's my mission">
          <div className="rounded-md border border-border/80 bg-surface/50 p-4 font-serif text-sm italic leading-relaxed text-foreground/90 shadow-inner">
            "Connecting the dots..."
          </div>
        </RailBlock>
      </aside>
    </div>
  );
}

function RailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border/80 p-4 pt-4.5">
      <h2 className="mb-3.5 flex items-center gap-2.5 text-[10.5px] font-black uppercase tracking-[0.22em] text-foreground/80">
        <div className="h-px w-2.5 bg-accent/40" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
