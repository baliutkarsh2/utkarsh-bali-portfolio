"use client";

import { Moon, Sun } from "lucide-react";
import { PAPER_DARK, PAPER_LIGHT, THEME_STORAGE_KEY } from "@/lib/theme-script";

export function toggleTheme() {
  const root = document.documentElement;
  const next = root.classList.contains("dark") ? "light" : "dark";
  root.classList.toggle("dark", next === "dark");
  root.style.colorScheme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* private mode — the class swap still applies for this session */
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", next === "dark" ? PAPER_DARK : PAPER_LIGHT);
}

/**
 * The icon swap is driven purely by CSS and the label never changes, so there
 * is no server/client mismatch and no `mounted` gate — and therefore no flash.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Switch colour theme"
      title="Switch colour theme"
      className={`inline-flex size-9 items-center justify-center border border-rule text-muted transition-colors hover:border-rule-strong hover:text-foreground ${className}`}
    >
      <Sun className="size-4 dark:hidden" aria-hidden />
      <Moon className="hidden size-4 dark:block" aria-hidden />
    </button>
  );
}
