"use client";

import { useEffect, useState } from "react";
import {
  getTheme,
  onThemeChange,
  resolvedTheme,
  setTheme,
  type Theme,
} from "@/lib/theme";

const NEXT: Record<Theme, Theme> = {
  system: "dark",
  dark: "light",
  light: "system",
};

const LABEL: Record<Theme, string> = {
  system: "Theme: follows your system",
  dark: "Theme: dark",
  light: "Theme: light",
};

/**
 * The theme control: one hairline chip in the header, in the site's data
 * grammar, cycling system → dark → light → system.
 *
 * The MARK IS THE STATE, not a picture of the action. A filled square is the
 * plate, a hollow one is the paper, and a half-filled one is "whatever the
 * machine says" — the same filled/hollow/half vocabulary the constellation
 * already uses for shipped, research and ongoing, so it is a mark this site
 * has taught the reader once already. There is no sun and no crescent: this
 * direction has one radius, and it belongs to the plate mark.
 *
 * It renders nothing until mounted. The server cannot know the theme (it is in
 * localStorage and in a media query), so rendering a guess would either flash
 * the wrong state or force the markup to disagree with the boot script's
 * attribute. `suppressHydrationWarning` on <html> covers the attribute; this
 * covers the control.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Theme | null>(null);
  const [shown, setShown] = useState<"light" | "dark">("light");

  useEffect(() => {
    const read = () => {
      setChoice(getTheme());
      setShown(resolvedTheme());
    };
    read();
    return onThemeChange(read);
  }, []);

  if (choice === null) {
    // The slot is held so the header row never reflows when this arrives.
    return <span className="theme-toggle-slot" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      className="theme-toggle tap"
      onClick={() => setTheme(NEXT[choice])}
      aria-label={`${LABEL[choice]}. Switch to ${LABEL[NEXT[choice]].replace("Theme: ", "")}.`}
      title={LABEL[choice]}
      data-choice={choice}
      data-shown={shown}
    >
      <span className="theme-mark" aria-hidden="true" />
    </button>
  );
}
