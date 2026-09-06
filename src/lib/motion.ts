/**
 * Motion policy.
 *
 * There is one dark theme and no theme toggle, but motion has two switches:
 * the operating system's reduced-motion setting and the palette's
 * "Reduce motion" action. Both are read here and nowhere else in JS; CSS
 * reads the same two signals through the `motion-ok` custom variant.
 *
 * The palette's choice is persisted in localStorage and mirrored as
 * `data-motion="reduce"` on <html>, which is what CSS can see. The inline
 * boot script (MOTION_BOOT_SCRIPT, rendered in layout.tsx) restores the
 * attribute before first paint, so a returning visitor never sees a frame of
 * the assembly they asked not to see.
 */

export type MotionMode = "reduce" | "auto";

/** localStorage key. Shared with the boot script below; change both or neither. */
export const MOTION_STORAGE_KEY = "motion";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Runs inline in <head> before first paint. Two jobs: mark the document as
 * script-capable (`.js`, which the unlit-until-revealed CSS is gated on, so
 * a visitor without JavaScript is never shown dim numerals), and restore a
 * persisted "reduce" choice. Storage access is wrapped because Safari throws
 * in some private-browsing configurations.
 */
export const MOTION_BOOT_SCRIPT =
  "document.documentElement.classList.add('js');" +
  `try{if(localStorage.getItem('${MOTION_STORAGE_KEY}')==='reduce')document.documentElement.dataset.motion='reduce'}catch(e){}`;

function root(): HTMLElement | null {
  return typeof document === "undefined" ? null : document.documentElement;
}

/**
 * False if either switch says reduce. Client-only: on the server there is no
 * document and the answer is false, which is the safe default for the three
 * consumers (board, section spy, scroll progress). Call it from effects, not
 * from render, or the server and client will disagree.
 */
export function motionAllowed(): boolean {
  const html = root();
  if (!html) return false;
  if (html.dataset.motion === "reduce") return false;
  return !window.matchMedia(REDUCE_QUERY).matches;
}

/** The visitor's own choice, independent of the OS setting. */
export function getMotion(): MotionMode {
  return root()?.dataset.motion === "reduce" ? "reduce" : "auto";
}

/**
 * Applies a choice immediately (the attribute is what CSS and motionAllowed
 * read) and persists it for the next visit.
 */
export function setMotion(mode: MotionMode): void {
  const html = root();
  if (!html) return;
  if (mode === "reduce") {
    html.dataset.motion = "reduce";
  } else {
    delete html.dataset.motion;
  }
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, mode);
  } catch {
    // Storage is unavailable; the attribute still applies for this page view.
  }
}

/**
 * Notifies when the answer to motionAllowed() may have changed, from either
 * source: the OS query flipping, or data-motion being set or removed by the
 * palette (observed on the attribute itself, so any writer counts, including
 * devtools). Returns the unsubscribe function. The board uses this to stop
 * its loop mid-session; scroll progress uses it to detach its listener.
 */
export function onMotionChange(listener: (allowed: boolean) => void): () => void {
  const html = root();
  if (!html) return () => {};

  const notify = () => listener(motionAllowed());
  const media = window.matchMedia(REDUCE_QUERY);
  media.addEventListener("change", notify);

  const observer = new MutationObserver(notify);
  observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });

  return () => {
    media.removeEventListener("change", notify);
    observer.disconnect();
  };
}
