"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navItems, profile, socials } from "@/content/profile";
import { NineDotMark } from "@/components/ui/nine-dot-mark";
import { SectionSpy } from "@/components/interactive/section-spy";
import { ThemeToggle } from "@/components/interactive/theme-toggle";

/** Scroll distance after which the bottom hairline fades in. */
const SCROLL_THRESHOLD = 8;

/** The nav collapses into the menu below this; matches the `md` breakpoint. */
const NAV_QUERY = "(min-width: 48rem)";

/**
 * Fixed 3.5rem bar. States: `top` (no rule) → `[data-scrolled]` (rule fades
 * in after 8px) → `[data-menu-open]` (< 48rem, the menu dialog is up).
 * Named `site-header` for view transitions in chrome.css, so it is captured
 * as its own group and never slides with the page.
 *
 * The right-hand readout (`#section-readout`) is empty here on purpose: the
 * SectionSpy writes the section in view into it with `textContent`, so this
 * component never re-renders on scroll.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Contact is an anchor into the shared outro and is never "active".
   *
   * The selected segment rather than the pathname: every 404 is served from
   * one prerendered /_not-found document, so usePathname() returned
   * "/_not-found" on the server and the real URL on the client. On
   * /writing/anything that lit a nav item the server had not rendered, React
   * threw the tree away and rebuilt it, which cost the `js` class and the
   * platform flag set before first paint and left two copies of the JSON-LD
   * in <head>. The segment comes from the router tree, so both sides agree
   * and a 404 correctly lights nothing.
   */
  function isActive(href: string): boolean {
    if (href.includes("#")) return false;
    return segment !== null && href === `/${segment}`;
  }

  // Scrolled state goes straight to the DOM, not through React state: a
  // re-render of the whole header per scroll event for a one-bit change is
  // waste, and a state-driven attribute would mismatch on hydration when the
  // page loads already scrolled. The listener is passive and writes only when
  // the bit flips, so an idle page costs nothing.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let scrolled = false;
    const update = () => {
      const next = window.scrollY > SCROLL_THRESHOLD;
      if (next === scrolled) return;
      scrolled = next;
      if (next) header.dataset.scrolled = "";
      else delete header.dataset.scrolled;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // The layout persists across navigations, so a menu left open while the
  // browser's back button changes the route would still be open on the new
  // page. Route links close it on click; this covers every other path.
  useEffect(() => {
    if (pathname) menuRef.current?.close();
  }, [pathname]);

  // A modal <dialog> makes the rest of the page inert even when CSS hides
  // it, so if the viewport grows past the breakpoint where the nav returns
  // the menu must actually close, not merely disappear.
  useEffect(() => {
    const query = window.matchMedia(NAV_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) menuRef.current?.close();
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function openMenu() {
    const dialog = menuRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setMenuOpen(true);
  }

  function closeMenu() {
    // `onClose` below clears the state, so Esc and close() stay in sync.
    menuRef.current?.close();
  }

  const homeLink = (
    <Link
      href="/"
      aria-label={`${profile.name}, home`}
      onClick={closeMenu}
      className="site-mark tap"
    >
      <NineDotMark />
      <span className="text-small font-medium">{profile.name}</span>
    </Link>
  );

  return (
    <header
      ref={headerRef}
      className="site-header"
      data-menu-open={menuOpen ? "" : undefined}
    >
      <div className="site-header-inner shell">
        {homeLink}

        <nav aria-label="Primary" className="site-nav">
          <ul className="site-nav-list">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="nav-link text-small tap"
                  >
                    {/* The LED is the one accent element the header may
                        show; aria-current carries the meaning, so it is
                        decorative. Its slot is reserved in the padding, so
                        labels sit in the same place on every route. */}
                    {active && <span aria-hidden className="nav-led" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="site-tools">
          {/* Written by the SectionSpy. Hidden from assistive tech: it echoes
              the heading in view, which a screen reader already has, and it
              changes on scroll, which must never be announced. */}
          <span
            id="section-readout"
            className="readout meta"
            aria-hidden="true"
          />
          {/* The spy renders nothing. It lives here, next to the element it
              writes, because the header is the one persistent client
              component; it re-arms itself on every route. */}
          <SectionSpy />

          <ThemeToggle />

          <button
            type="button"
            onClick={openMenu}
            aria-haspopup="dialog"
            className="menu-button meta tap"
          >
            Menu
          </button>
        </div>
      </div>

      {/* <dialog> gives focus trapping, Esc, and focus restore for free. The
          menu is full-screen on the ground, so it needs no backdrop. */}
      <dialog
        ref={menuRef}
        aria-label="Menu"
        className="menu"
        onClose={() => setMenuOpen(false)}
      >
        <div className="menu-bar shell">
          {homeLink}
          <button
            type="button"
            onClick={closeMenu}
            className="menu-close meta tap"
          >
            Close
          </button>
        </div>

        <nav aria-label="Primary" className="menu-nav shell">
          <ul className="menu-nav-list">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMenu}
                    className="menu-route text-display-l font-medium"
                  >
                    {active && <span aria-hidden className="nav-led" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <ul className="menu-socials shell meta">
          {socials.map((social) => {
            const external = social.kind !== "email";
            return (
              <li key={social.kind}>
                <a
                  href={social.href}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="menu-social tap"
                >
                  {social.label}
                  {external && (
                    <span className="sr-only"> (opens in a new tab)</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </dialog>
    </header>
  );
}
