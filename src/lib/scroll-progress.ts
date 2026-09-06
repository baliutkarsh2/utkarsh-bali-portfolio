import { motionAllowed, onMotionChange } from "./motion";

/**
 * Fallback writer for `--p`, the reading-progress number (spec §5.7).
 *
 * The progress row lights its dots from `--p` (0 at the top of the document,
 * 1 at the bottom). Where the browser has `animation-timeline: scroll(root)`
 * the CSS keyframes in components.css drive `--p` and this module does
 * nothing at all. Where it does not (Safari, Firefox without the flag), the
 * same number is written here from a passive scroll listener, so one set of
 * keyframes serves both and the row cannot drift between the two paths.
 *
 * Idle costs zero frames: nothing runs between scroll events, and each burst
 * of events collapses into a single requestAnimationFrame.
 */

let supported: boolean | undefined;

/** Whether CSS scroll-driven animations exist, cached after the first ask. */
export function supportsScrollTimeline(): boolean {
  if (supported === undefined) {
    supported =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline: scroll()");
  }
  return supported;
}

const noop = () => {};

/**
 * Starts writing `--p` on `target` and returns the function that stops it.
 * Safe to call during server rendering (returns a no-op) and on a browser
 * with native scroll timelines (also a no-op: CSS owns `--p` there).
 *
 * Under reduced motion, from either source, the row shows the finished
 * state, which is what the CSS path shows there too; the listener is
 * attached and detached live as the palette toggle changes.
 */
export function startScrollProgress(target: HTMLElement): () => void {
  if (typeof window === "undefined" || supportsScrollTimeline()) return noop;

  const html = document.documentElement;
  let frame = 0;
  let last = "";
  let live = false;

  // Three decimals is finer than a dot at any plausible row width, and
  // skipping unchanged values avoids a style recalc per scroll event.
  const write = (value: number) => {
    const next = value.toFixed(3);
    if (next === last) return;
    last = next;
    target.style.setProperty("--p", next);
  };

  const measure = () => {
    frame = 0;
    const range = html.scrollHeight - window.innerHeight;
    write(range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 1);
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };

  // Document height changes (images decoding, fonts swapping) move the
  // denominator without a scroll event; the body's box tracks them.
  const resize =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);

  const start = () => {
    if (live) return;
    live = true;
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    resize?.observe(document.body);
    schedule();
  };

  const stop = () => {
    if (!live) return;
    live = false;
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    resize?.disconnect();
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const apply = () => {
    if (motionAllowed()) {
      start();
    } else {
      stop();
      write(1);
    }
  };

  apply();
  const unsubscribe = onMotionChange(apply);

  return () => {
    unsubscribe();
    stop();
  };
}
