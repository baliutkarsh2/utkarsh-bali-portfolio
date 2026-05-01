"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { navItems } from "@/lib/content";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-[0.9rem] border border-border bg-background/90 px-4 py-3 shadow-soft backdrop-blur-xl">
        <a
          href="#home"
          className="group inline-flex items-center gap-3 rounded-full text-sm font-semibold text-foreground"
          aria-label="Go to home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
            UB
          </span>
          <span className="hidden sm:inline">Utkarsh Bali</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/72 transition hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground backdrop-blur transition hover:text-foreground md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="mx-4 mt-2 grid gap-1 rounded-3xl border border-border bg-background/95 p-3 shadow-2xl backdrop-blur-xl md:hidden">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </header>
  );
}
