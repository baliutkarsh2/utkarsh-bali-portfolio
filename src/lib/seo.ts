/**
 * Single source of truth for anything that needs an absolute URL:
 * metadataBase, sitemap, robots, JSON-LD, OG images.
 *
 * The site is served from ubali.dev. Vercel preview deployments get their own
 * hostname so links inside a preview stay inside that preview.
 */

function resolveUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV === "production") return "https://ubali.dev";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://ubali.dev";
}

export const siteConfig = {
  url: resolveUrl(),
  name: "Utkarsh Bali",
  title: "Utkarsh Bali | Agent infrastructure and developer tools",
  description:
    "Software engineer building agent infrastructure. Purdue CS and AI, finishing December 2026. Recurly, QualGent (YC X25), and Checkpoint.",
  locale: "en_US",
} as const;

/**
 * The Open Graph fields every page carries. Next does not merge `openGraph`:
 * a page that sets any field of it replaces the layout's whole object, so
 * /about, /projects and /writing each shipped a share with no og:type,
 * og:site_name or og:locale. Every `openGraph` on the site spreads this first.
 * `type` is the default; a case study or a post overrides it with "article".
 */
export const openGraphBase = {
  type: "website",
  siteName: siteConfig.name,
  locale: siteConfig.locale,
} as const;

/** Person node @id, referenced by CreativeWork author on every case study. */
export const personId = `${siteConfig.url}/#person`;

export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

/**
 * JSON-LD must never emit a raw `</script>` sequence, which would close the
 * surrounding script tag and turn the rest of the payload into markup.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
