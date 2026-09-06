"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** The header readout element (§5.2), rendered by the chrome. */
const READOUT_ID = "section-readout";
/** The readout exists only at ≥ 64rem; below that the spy does nothing. */
const WIDE = "(min-width: 64rem)";
/**
 * The band a section must occupy to be "in view": from just under the
 * 3.5rem header to 20 % of the viewport. IntersectionObserver margins are
 * px or %, so the header height is written in px at the 16 px root.
 *
 * The band is deliberately shallow. At 45 % a section's padded box entered it
 * long before its title did, so the readout named the close while the reader
 * was still on the index's h1, and lagged a section behind on the way down.
 */
const ROOT_MARGIN = "-56px 0px -80% 0px";

type Tracked = {
  index: string;
  title: string;
  intersecting: boolean;
  /** True once the section has left the band upwards (it has been read). */
  passed: boolean;
};

/** The index is optional: an index page's close carries a title alone. */
function readoutText(index: string, title: string): string {
  return [index, title].filter(Boolean).join(" ").toUpperCase();
}

/**
 * Watches every `[data-section-index]` on the page and writes
 * "02 SELECTED WORK" into the header readout with `textContent` — no React
 * state, no transition, the only live text outside the hero. Re-armed on
 * every route, since the sections are the page's. Renders nothing.
 *
 * The current section is the last one intersecting the band, so the readout
 * flips the moment a new section's top edge crosses it rather than waiting
 * for the previous one to clear; between sections (or below the last) it is
 * the last one that has scrolled past; above the first (the hero) the readout
 * is empty, which the chrome hides.
 */
export function SectionSpy() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || typeof matchMedia === "undefined") return;

    const media = matchMedia(WIDE);
    let io: IntersectionObserver | null = null;

    const arm = () => {
      disarm();
      const readout = document.getElementById(READOUT_ID);
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-section-index]"),
      );
      if (!readout || sections.length === 0) return;

      const tracked = new Map<Element, Tracked>();
      for (const section of sections) {
        tracked.set(section, {
          index: section.dataset.sectionIndex ?? "",
          title: section.dataset.sectionTitle ?? "",
          intersecting: false,
          passed: false,
        });
      }

      const write = (text: string) => {
        // textContent is compared first so an unchanged readout costs no
        // DOM mutation and no style recalc.
        if (readout.textContent !== text) readout.textContent = text;
      };

      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const t = tracked.get(entry.target);
            if (!t) continue;
            t.intersecting = entry.isIntersecting;
            if (!entry.isIntersecting) {
              // Leaving upwards means the section's top is above the band's
              // top edge; leaving downwards means it is below.
              const bandTop = entry.rootBounds?.top ?? 0;
              t.passed = entry.boundingClientRect.top < bandTop;
            }
          }

          // Map preserves insertion order, which is DOM order, so the last
          // intersecting entry is the furthest down the page.
          let current: Tracked | null = null;
          for (const t of tracked.values()) {
            if (t.intersecting) current = t;
          }
          if (!current) {
            for (const t of tracked.values()) {
              if (t.passed) current = t;
            }
          }
          write(current ? readoutText(current.index, current.title) : "");
        },
        { rootMargin: ROOT_MARGIN, threshold: 0 },
      );
      for (const section of sections) io.observe(section);
    };

    const disarm = () => {
      io?.disconnect();
      io = null;
      const readout = document.getElementById(READOUT_ID);
      if (readout && readout.textContent !== "") readout.textContent = "";
    };

    const onChange = () => (media.matches ? arm() : disarm());
    onChange();
    media.addEventListener("change", onChange);

    return () => {
      media.removeEventListener("change", onChange);
      disarm();
    };
  }, [pathname]);

  return null;
}
