"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * One IntersectionObserver shared by every Reveal on the page, created
 * lazily. A target is unobserved the moment it lands, so nothing replays and
 * the observer holds no reference to anything that has already resolved.
 *
 * rootMargin trims 12 % off the bottom of the viewport: a numeral warms only
 * once it is properly on screen, not the instant a pixel of it appears.
 */
let observer: IntersectionObserver | null = null;

function land(el: HTMLElement) {
  el.dataset.in = "";
  observer?.unobserve(el);
}

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        // Already scrolled past on load (a reload mid-page, a hash link):
        // there is nothing to reveal, so resolve it now rather than leaving a
        // cold numeral or a half-masked image waiting for a scroll up.
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) land(el);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );
  return observer;
}

type RevealProps = {
  children: ReactNode;
  /** Extra delay in ms before the dots light, on top of any stagger. */
  delay?: number;
  className?: string;
  /**
   * Stagger step in ms. When set, each direct child gets `--i` = its index,
   * so siblings light `--i × stagger` apart (the numbers board flipping left
   * to right at 40 ms). Custom properties inherit, so a numeral nested inside
   * a grid cell still picks up its cell's `--i`.
   */
  stagger?: number;
};

/**
 * Sets `data-in` on its wrapper exactly once, when the wrapper enters view.
 * It is applied only to dot surfaces — numerals, dot masks, drawable
 * hairlines — never to words (rule 4). The CSS cold states are gated on
 * `:root.js` and motion-ok, so with JS off or motion reduced every child is
 * already in its finished state and this component is inert.
 *
 * Children stay server components: a client wrapper does not pull its
 * subtree across the boundary, so wrapping costs no extra JS.
 */
export function Reveal({ children, delay = 0, className, stagger }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // `--i` is written imperatively rather than by cloning children, so the
    // children can be any server-rendered node. It never changes the DOM
    // React reconciles (inline style custom properties are not diffed here).
    if (stagger) {
      Array.from(el.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty("--i", String(i));
      });
    }

    if (typeof IntersectionObserver === "undefined") {
      land(el);
      return;
    }

    const io = getObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, [stagger]);

  const style: CSSProperties | undefined =
    delay || stagger
      ? ({
          ...(delay ? { "--delay": `${delay}ms` } : null),
          ...(stagger ? { "--stagger": `${stagger}ms` } : null),
        } as CSSProperties)
      : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
