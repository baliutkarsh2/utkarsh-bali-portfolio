"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { navItems, profile } from "@/content";
import { ThemeToggle } from "@/components/interactive/theme-toggle";

const SECTION_IDS = navItems.map((item) => item.href.replace("/#", ""));

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [observedId, setObservedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDialogElement>(null);

  // Derived, not stored, avoids a state reset (and cascading render) on route change.
  const activeId = isHome ? observedId : null;

  /**
   * Scrollspy is presentation only, the anchors navigate natively so focus
   * management stays with the browser. `scroll-padding-top` handles offset.
   */
  useEffect(() => {
    if (!isHome) return;

    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Topmost visible section wins, so the marker never jumps backwards.
        const first = SECTION_IDS.find((id) => visible.has(id));
        setObservedId(first ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  function openMenu() {
    menuRef.current?.showModal();
  }

  function closeMenu() {
    menuRef.current?.close();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-rule bg-background/85 backdrop-blur-md">
      <div className="shell flex h-14 items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-sm font-medium tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-7 place-items-center border border-foreground font-mono text-[0.65rem] font-medium"
          >
            {profile.initials}
          </span>
          <span className="link-underline hidden sm:inline">{profile.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const id = item.href.replace("/#", "");
              const isActive = isHome && activeId === id;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "location" : undefined}
                    className={`px-2.5 py-1.5 text-sm transition-colors ${
                      isActive ? "text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            aria-label="Open command palette"
            className="hidden h-9 items-center gap-2 border border-rule px-2.5 text-muted transition-colors hover:border-rule-strong hover:text-foreground sm:flex"
          >
            <span className="meta">Search</span>
            <kbd aria-hidden className="meta border border-rule px-1 py-0.5">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />

          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            className="inline-flex size-9 items-center justify-center border border-rule text-muted transition-colors hover:border-rule-strong hover:text-foreground md:hidden"
          >
            <Menu className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* <dialog> gives focus trapping, Esc, and focus restore for free. */}
      <dialog
        ref={menuRef}
        aria-label="Menu"
        onClick={(event) => {
          if (event.target === menuRef.current) closeMenu();
        }}
        className="m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px] md:hidden"
      >
        <div className="fixed inset-x-0 top-0 border-b border-rule bg-background">
          <div className="shell flex h-14 items-center justify-between">
            <span className="meta text-faint">Menu</span>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="inline-flex size-9 items-center justify-center border border-rule text-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <nav aria-label="Mobile" className="shell pb-6">
            <ul>
              {/* Deliberately unnumbered: the sections carry their own index,
                  and a second, different numbering here would contradict it. */}
              {navItems.map((item) => (
                <li key={item.href} className="border-t border-rule">
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className="block py-3.5 font-display text-2xl"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </header>
  );
}
