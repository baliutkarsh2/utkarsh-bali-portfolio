"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Floats a project's cover image alongside the cursor while a row is hovered.
 *
 * Design notes that matter:
 * - One delegated listener on the container, never one per row.
 * - Transforms only. Writing top/left would force layout on every frame.
 * - The rAF loop stops scheduling once the card has settled, so an idle
 *   pointer costs nothing.
 * - Hidden on scroll rather than repositioned: the pointer does not move but
 *   the page does, so the anchor would silently desync.
 * - Server children stay server components, exactly like `Reveal`.
 */

const CARD_W = 300;
const CARD_H = 190;
const OFFSET_X = 26;
const EASE = 0.16;

export function WorkPreview({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    if (!root || !card) return;

    // Coarse pointers have no hover, and reduced motion should not get a
    // element chasing the cursor. Both opt out entirely.
    const fine = window.matchMedia("(pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || calm.matches) return;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    let active = false;

    const render = () => {
      const dx = targetX - x;
      const dy = targetY - y;
      x += dx * EASE;
      y += dy * EASE;
      card.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      // Stop scheduling once it has effectively arrived.
      if (active && (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4)) {
        frame = requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const show = (row: HTMLElement) => {
      const src = row.dataset.previewSrc ?? "";
      const name = row.dataset.previewName ?? "";
      const meta = row.dataset.previewMeta ?? "";

      if (labelRef.current) labelRef.current.textContent = name;
      if (metaRef.current) metaRef.current.textContent = meta;

      const img = imgRef.current;
      if (img) {
        if (src) {
          if (img.getAttribute("src") !== src) img.setAttribute("src", src);
          img.hidden = false;
        } else {
          // Projects with no cover get the typographic card, not an empty box.
          img.hidden = true;
          img.removeAttribute("src");
        }
      }
      card.dataset.hasImage = src ? "true" : "false";
      card.dataset.visible = "true";
      active = true;
    };

    const hide = () => {
      active = false;
      delete card.dataset.visible;
    };

    const onPointerMove = (event: PointerEvent) => {
      const row = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-preview-row]",
      );
      if (!row) {
        if (active) hide();
        return;
      }

      const bounds = root.getBoundingClientRect();
      let nx = event.clientX - bounds.left + OFFSET_X;
      let ny = event.clientY - bounds.top - CARD_H / 2;

      // Flip to the other side of the cursor rather than overflow the row.
      if (nx + CARD_W > bounds.width) nx = event.clientX - bounds.left - CARD_W - OFFSET_X;
      ny = Math.max(0, Math.min(ny, bounds.height - CARD_H));

      // First appearance should not fly in from the previous position.
      if (!active) {
        x = nx;
        y = ny;
        card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      targetX = nx;
      targetY = ny;

      if (!active || card.dataset.previewFor !== row.dataset.previewName) {
        card.dataset.previewFor = row.dataset.previewName ?? "";
        show(row);
      }
      schedule();
    };

    const onLeave = () => hide();

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onLeave, { passive: true });

    return () => {
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="work-preview-root">
      {children}

      <div ref={cardRef} aria-hidden className="work-preview-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} alt="" className="work-preview-image" hidden />
        <div className="work-preview-body">
          <div ref={labelRef} className="font-display text-lg leading-tight" />
          <div ref={metaRef} className="meta mt-1.5 text-faint" />
        </div>
      </div>
    </div>
  );
}
