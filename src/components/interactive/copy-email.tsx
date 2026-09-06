"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "rest" | "copied" | "failed";

const LABEL: Record<CopyState, string> = {
  rest: "Click to copy",
  copied: "Copied",
  failed: "Select it manually",
};

/** How long "Copied" stays before the label returns (§7.1). */
const COPIED_MS = 1200;
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
 * The address is real text in Geist 500 display-m; the whole line is the
 * button. The meta label beside it is the only thing that changes, with no
 * transition (it is information, and words never animate). A polite live
 * region announces the state change to screen readers.
 */
export function CopyEmail({ email }: { email: string }) {
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
    <button type="button" className="copy-email" data-state={state} onClick={onClick}>
      <span ref={addressRef} className="copy-email-address text-display-m font-medium text-ink">
        {email}
      </span>
      <span className="copy-email-label meta" role="status" aria-live="polite">
        {LABEL[state]}
      </span>
    </button>
  );
}
