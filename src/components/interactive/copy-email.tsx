"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import { profile } from "@/content/profile";

type CopyState = "rest" | "copied" | "failed";

const LABEL: Record<CopyState, string> = {
  rest: "Copy",
  copied: "Copied",
  failed: "Select it manually",
};

/** How long "Copied" stays before the label returns (§7.1). */
const COPIED_MS = 1200;
/** The failure hint stays longer: it asks the reader to do something. */
const FAILED_MS = 2400;

/* ── The chop ────────────────────────────────────────────────────────────────
   Copying the address is the one moment a visitor makes the press do
   something, and a word that says "Copied" and then unsays itself 1.2 s later
   is a screen's answer to it. A press has its own: the sheet takes a chop — a
   blind stamp, struck with NO INK AT ALL, so the mark is nothing but pressure
   in the paper. It is the only mark on this site that is not made of ink, it
   appears once, and it stays for the session, because a sheet that has been
   chopped stays chopped.

   The state is one flag, module-level rather than per-component, because the
   home page renders this control twice — the close and the footer — and one
   sheet takes one chop: strike it in the close and the footer's is already
   there when you scroll past it. sessionStorage carries it across navigations;
   every access is wrapped, since a private window, a locked-down browser or a
   storage quota all throw rather than return null.

   Only the instance that was actually clicked animates ("struck"); every other
   instance, and every later page, simply has it ("set"). Nothing here is the
   accessible feedback — the live region below is untouched and still says
   "Copied". The chop is aria-hidden, because a blind stamp is a thing you feel
   in the paper, and there is nothing to announce that has not been announced.
   ───────────────────────────────────────────────────────────────────────── */
const CHOP_KEY = "ub:chop";

let chopSet = false;
let chopRead = false;
const chopSubscribers = new Set<() => void>();

function subscribeChop(onChange: () => void) {
  chopSubscribers.add(onChange);
  return () => chopSubscribers.delete(onChange);
}

function notifyChop() {
  for (const onChange of chopSubscribers) onChange();
}

/** Once per document: has this session already chopped the sheet? */
function readChop() {
  if (chopRead) return;
  chopRead = true;
  try {
    if (window.sessionStorage.getItem(CHOP_KEY) === "1") {
      chopSet = true;
      notifyChop();
    }
  } catch {
    // No session storage: the chop is simply per-page.
  }
}

/** @returns true if this call is the strike, false if the sheet already had it. */
function strikeChop(): boolean {
  if (chopSet) return false;
  chopSet = true;
  try {
    window.sessionStorage.setItem(CHOP_KEY, "1");
  } catch {
    // Not persisted; still struck for this page.
  }
  notifyChop();
  return true;
}

/**
 * Clipboard with two fallbacks. The async API needs a secure context and a
 * user gesture; the legacy execCommand path covers older WebKit and some
 * embedded browsers; if both refuse, the address is selected so one keypress
 * copies it, and the label says so.
 */
async function copyText(text: string, source: HTMLElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (ok) return true;
  } catch {
    // fall through to manual selection
  }

  if (source) {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(source);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  return false;
}

/**
 * The blind stamp itself: a 22px ring and the sitter's initials, drawn with the
 * plate mark's own two strokes and nothing else — a 1px --line ring, and the
 * deboss highlight as a top arc one pixel below it, which is what
 * `inset 0 1px 0` is on the rectangular mark. Never a filled disc: a chop that
 * is a solid shape is a logo, and a logo is ink.
 *
 * An SVG rather than a `border-radius: 50%` span on purpose. The one radius on
 * this site is the plate mark's 2px, `scripts/check-tokens.mjs` fails the build
 * on any other, and a 22px circle drawn with a radius would be exactly the
 * "one rounded thing, just here" that the lock exists to catch. Stroked
 * geometry is not a radius.
 */
function Chop() {
  return (
    <span className="chop" aria-hidden="true">
      <svg className="chop-mark" viewBox="0 0 22 22" width="22" height="22" focusable="false">
        {/* Radius 10 about (11, 12): the ring's own circle, one pixel lower. */}
        <path className="chop-deboss" d="M2.2 7.25 A10 10 0 0 1 19.8 7.25" />
        <circle className="chop-ring" cx="11" cy="11" r="10" />
        <text className="chop-initials" x="11" y="11.5" textAnchor="middle" dominantBaseline="middle">
          {profile.initials}
        </text>
      </svg>
    </span>
  );
}

/**
 * The address is real text and it is the button, with its label beside it
 * INSIDE the same button: one target, one hover. The label used to be a
 * sibling floating 70px away, past a 22px slot reserved for a chop that is
 * invisible until someone copies, so "CLICK TO COPY" read as a stray caption
 * rather than as part of the control. Now it is a hairline chip ("Copy",
 * then "Copied" with a tick) whose width is fixed to its longest word, so it
 * never moves, and the chop is struck just past it without reserving space.
 *
 * The chip is aria-hidden; the button's name is the address plus ", copy to
 * clipboard". The live region stays a sibling of the button, not a child: a
 * button's children are presentational, so a status inside it would be
 * flattened into its name and never announced.
 */
export function CopyEmail({ email, size = "large" }: { email: string; size?: "large" | "small" }) {
  const [state, setState] = useState<CopyState>("rest");
  const [struck, setStruck] = useState(false);
  const addressRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);

  // Server and first client render agree on `false`, so nothing hydrates
  // differently and nothing moves; the effect below is what reads the session.
  const chopped = useSyncExternalStore(
    subscribeChop,
    () => chopSet,
    () => false,
  );

  useEffect(() => {
    readChop();
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function onClick() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    const ok = await copyText(email, addressRef.current);
    const next: CopyState = ok ? "copied" : "failed";
    setState(next);
    // Only a real copy chops the sheet, and only the first one is struck.
    if (ok && strikeChop()) setStruck(true);
    timer.current = window.setTimeout(
      () => {
        setState("rest");
        timer.current = null;
      },
      ok ? COPIED_MS : FAILED_MS,
    );
  }

  return (
    <div
      className="copy-email"
      data-state={state}
      data-size={size}
      data-chop={chopped ? (struck ? "struck" : "set") : undefined}
    >
      <button type="button" className="copy-email-button" onClick={onClick}>
        <span
          ref={addressRef}
          className={
            size === "small"
              ? "copy-email-address text-body font-medium text-ink"
              : "copy-email-address font-medium text-ink"
          }
        >
          {email}
        </span>
        <span className="sr-only">, copy to clipboard</span>
        <span className="copy-email-label meta" aria-hidden="true">
          {state === "copied" ? (
            <Check className="copy-email-icon" />
          ) : (
            <Copy className="copy-email-icon" />
          )}
          <span className="copy-email-word">{LABEL[state]}</span>
          {/* In the DOM from the first byte at opacity 0 and out of flow, so
              striking it shifts nothing. It hangs off the chip, whose width
              is fixed, so a mark pressed into paper does not slide when the
              word beside it changes. */}
          <Chop />
        </span>
      </button>
      {/* Only the change is spoken. With the resting hint in the region a
          screen reader heard "Copied", then "Click to copy" 1.2 s later, on
          top of the button's own name it had just read. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "rest" ? "" : LABEL[state]}
      </span>
    </div>
  );
}
