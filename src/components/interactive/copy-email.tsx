"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyState = "rest" | "copied" | "failed";

const LABEL: Record<CopyState, string> = {
  rest: "Copy",
  copied: "Copied",
  failed: "Select it manually",
};

/**
 * How long "Copied" stays before the label returns (§7.1). Long enough to be
 * read after the click, now that nothing stays behind once it goes.
 */
const COPIED_MS = 1600;
/** The failure hint stays longer: it asks the reader to do something. */
const FAILED_MS = 2400;

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
 * The address is real text and it is the button, with its label beside it
 * INSIDE the same button: one target, one hover. The label used to be a
 * sibling floating 70px away, so "CLICK TO COPY" read as a stray caption
 * rather than as part of the control. Now it is a hairline chip ("Copy",
 * then "Copied" with a tick) whose width is fixed to its longest word, so it
 * never moves.
 *
 * There used to be a "chop" too: a 22px blind-stamped ring with his initials
 * that appeared beside the chip after a copy and stayed on every contact band
 * for the rest of the session. With no ink and 8px initials it read as a
 * disabled badge or a rendering leftover, and the inverted "Copied" chip and
 * the live region already say the copy worked.
 *
 * The chip is aria-hidden; the button's name is the address plus ", copy to
 * clipboard". The live region stays a sibling of the button, not a child: a
 * button's children are presentational, so a status inside it would be
 * flattened into its name and never announced.
 */
export function CopyEmail({ email, size = "large" }: { email: string; size?: "large" | "small" }) {
  const [state, setState] = useState<CopyState>("rest");
  const addressRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);

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
    timer.current = window.setTimeout(
      () => {
        setState("rest");
        timer.current = null;
      },
      ok ? COPIED_MS : FAILED_MS,
    );
  }

  return (
    <div className="copy-email" data-state={state} data-size={size}>
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
        </span>
      </button>
      {/* Only the change is spoken. With the resting hint in the region a
          screen reader heard "Copied", then "Click to copy" 1.6 s later, on
          top of the button's own name it had just read. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "rest" ? "" : LABEL[state]}
      </span>
    </div>
  );
}
