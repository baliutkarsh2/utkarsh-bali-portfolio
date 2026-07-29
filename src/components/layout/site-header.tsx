"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Menu, X } from "lucide-react";
import { navItems, profile } from "@/content";
import { ThemeToggle } from "@/components/interactive/theme-toggle";
import { Magnetic } from "@/components/interactive/magnetic";
import { SlideLabel } from "@/components/ui/slide-label";

export function SiteHeader() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDialogElement>(null);

  function openMenu() {
    menuRef.current?.showModal();
  }

  function closeMenu() {
    menuRef.current?.close();
  }

  /** Contact is an anchor into the shared outro and is never "active". */
  function isActive(href: string): boolean {
    if (href.includes("#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    // Named so it is captured as its own view-transition group. Without this
    // a fixed header gets pulled into the root snapshot and appears to slide
    // with the page on every navigation.
    <header
      style={{ viewTransitionName: "site-header" }}
      className="fixed inset-x-0 top-0 z-50 border-b border-rule bg-background/85 backdrop-blur-md"
    >
      <div className="shell flex h-14 items-center justify-between gap-4">
        {/* The wordmark is hidden below sm and the initials are decorative, so
            without this the home link has no accessible name on a phone. */}
        <Link
          href="/"
          aria-label={`${profile.name}, home`}
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
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`slide-trigger inline-block px-2.5 py-1.5 text-sm transition-colors ${
                      active ? "nav-active text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <SlideLabel>{item.label}</SlideLabel>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Magnetic className="hidden sm:inline-block">
            {/* No aria-label: the visible word is the accessible name, so a
                voice-control user saying "Search" actually hits it. An
                aria-label of "Open command palette" silently broke that. */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
              className="flex h-9 items-center gap-2 border border-rule px-2.5 text-muted transition-colors hover:border-rule-strong hover:text-foreground"
            >
              <span className="meta">Search</span>
              <kbd aria-hidden className="meta border border-rule px-1 py-0.5">
                ⌘K
              </kbd>
            </button>
          </Magnetic>

          <Magnetic>
            <ThemeToggle />
          </Magnetic>

          <Magnetic className="md:hidden">
            <button
              type="button"
              onClick={openMenu}
              aria-label="Open menu"
              className="inline-flex size-9 items-center justify-center border border-rule text-muted transition-colors hover:border-rule-strong hover:text-foreground"
            >
              <Menu className="size-4" aria-hidden />
            </button>
          </Magnetic>
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
