/**
 * Light and dark, and the one place either is decided.
 *
 * The dark palette is not new. It has existed since the arrival was built:
 * `:root[data-arrival="plate"]` in globals.css §11 remaps every token to the
 * copper plate, and the 404 has lived on it permanently. Every ratio in it was
 * measured against #16140f at the time. So a dark theme is not a second design
 * to maintain, it is that same remap held open instead of stepped through, and
 * `[data-theme="dark"]` is listed beside it on the same rule.
 *
 * THREE STATES, NOT TWO. `system` is the default and is the absence of the
 * attribute, so a visitor who has never touched the control follows their OS
 * and keeps following it when it changes at sunset. Choosing light or dark
 * stamps the attribute and pins it. The control cycles system → dark → light →
 * system, so there is always a way back to "whatever my machine says" without
 * clearing site data.
 *
 * WHY AN ATTRIBUTE AND NOT A CLASS. CSS needs a selector that can be negated:
 * `:root:not([data-theme="light"])` under `prefers-color-scheme: dark` is what
 * lets the OS win only while the visitor has not overridden it.
 */

export type Theme = "light" | "dark" | "system";

/** localStorage key. Shared with the boot script below; change both or neither. */
export const THEME_STORAGE_KEY = "theme";

/** Fired on <html> when the choice changes, so the board can re-read its ink. */
export const THEME_EVENT = "themechange";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs inline in <head> before first paint, next to the motion boot script.
 * Without it a dark visitor gets one white frame on every navigation, which is
 * the single most visible bug a theme toggle can have.
 *
 * Wrapped in try/catch because Safari throws on localStorage in some
 * private-browsing configurations; the catch leaves the attribute unset, which
 * is `system`, which is the right answer when the choice cannot be read.
 */
export const THEME_BOOT_SCRIPT =
  `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');` +
  `if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

function root(): HTMLElement | null {
  return typeof document === "undefined" ? null : document.documentElement;
}

/** The visitor's own choice. `system` when they have not made one. */
export function getTheme(): Theme {
  const t = root()?.dataset.theme;
  return t === "dark" || t === "light" ? t : "system";
}

/**
 * What is actually on screen right now, which is what the board needs: with
 * `system` selected the answer comes from the OS, not from the attribute.
 * Client-only. On the server there is no document and no media query, so it
 * answers "light" rather than guessing, and the boot script corrects the
 * markup before anything paints.
 */
export function resolvedTheme(): "light" | "dark" {
  const choice = getTheme();
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Applies a choice immediately, persists it, and tells the page. */
export function setTheme(next: Theme): void {
  const html = root();
  if (!html) return;
  if (next === "system") delete html.dataset.theme;
  else html.dataset.theme = next;
  try {
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* private mode: the choice holds for this page, just not the next one */
  }
  html.dispatchEvent(new CustomEvent(THEME_EVENT));
}

/**
 * Calls back whenever what is on screen changes, from either source: the
 * control, or the OS while the choice is `system`. Returns its own teardown.
 *
 * Both are needed. Watching only the event misses a visitor whose machine
 * switches to dark at sunset; watching only the query misses the control.
 */
export function onThemeChange(fn: () => void): () => void {
  const html = root();
  if (!html || typeof window === "undefined") return () => {};
  const media = window.matchMedia(DARK_QUERY);
  const onMedia = () => {
    if (getTheme() === "system") fn();
  };
  html.addEventListener(THEME_EVENT, fn);
  media.addEventListener("change", onMedia);
  return () => {
    html.removeEventListener(THEME_EVENT, fn);
    media.removeEventListener("change", onMedia);
  };
}
