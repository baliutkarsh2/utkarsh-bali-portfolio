type ClassValue = string | number | false | null | undefined;

/**
 * Tiny class joiner. No variant merging needed, this codebase never
 * conditionally overrides the same Tailwind property twice.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/** "01", "02" … for editorial index numbering. */
export function ordinal(index: number): string {
  return String(index + 1).padStart(2, "0");
}
