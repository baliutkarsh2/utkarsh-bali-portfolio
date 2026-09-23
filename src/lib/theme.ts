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
 * The page grounds, mirrored from `--ground` in globals.css: paper, and the
 * plate the dark theme prints on. Browser chrome (the address bar, the tab
 * strip on Android) reads them from `<meta name="theme-color">`, not from CSS.
 * The layout declares the pair keyed to the system preference, which is what
 * `system` follows; a pinned choice adds the pin below.
 */
export const GROUND = { light: "#faf8f4", dark: "#16140f" } as const;

/**
 * A theme-color meta of our own, first in <head>, for a pinned choice.
 *
 * The media-keyed pair follows the OS, so a light-OS visitor who chose dark
 * got a paper toolbar over the plate, and the reverse. The pair is not edited
 * in place: Next re-renders its own metas on every soft navigation and the
 * edit is lost. A foreign meta survives them, and the first matching meta in
 * tree order is the one the browser uses. `system` removes it, and the pair
 * takes over again.
 *
 * Its colour is spelled rgb(), never the hex the pair uses. React adopts any
 * unowned <meta> in the document whose name and content equal one it is about
 * to render: at hydration it took a "#16140f" pin as Next's dark meta, and
 * removed it with the rest on the first soft navigation. The same colour in
 * another spelling can never match.
 */
const PIN_ID = "theme-color-pin";

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
}

const PIN_COLOR = { light: rgb(GROUND.light), dark: rgb(GROUND.dark) } as const;

/**
 * Runs inline in <head> before first paint, next to the motion boot script.
 * Without it a dark visitor gets one white frame on every navigation, which is
 * the single most visible bug a theme toggle can have. A pinned choice also
 * pins the toolbar colour here, before the browser first tints it.
 *
 * Wrapped in try/catch because Safari throws on localStorage in some
 * private-browsing configurations; the catch leaves the attribute unset, which
 * is `system`, which is the right answer when the choice cannot be read.
 */
export const THEME_BOOT_SCRIPT =
  `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');` +
  `if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;` +
  `var m=document.createElement('meta');m.name='theme-color';m.id='${PIN_ID}';` +
  `m.content=t==='dark'?'${PIN_COLOR.dark}':'${PIN_COLOR.light}';` +
  `document.head.prepend(m)}}catch(e){}`;

/** Pins the toolbar colour to a chosen theme, or unpins it for `system`. */
function pinThemeColor(next: Theme): void {
  let pin = document.getElementById(PIN_ID) as HTMLMetaElement | null;
  if (next === "system") {
    pin?.remove();
    return;
  }
  if (!pin) {
    pin = document.createElement("meta");
    pin.name = "theme-color";
    pin.id = PIN_ID;
  }
  pin.content = PIN_COLOR[next];
  document.head.prepend(pin);
}

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
  pinThemeColor(next);
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
