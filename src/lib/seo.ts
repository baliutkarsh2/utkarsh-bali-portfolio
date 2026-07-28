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
  title: "Utkarsh Bali | Engineer, agent infrastructure and developer tools",
  description:
    "Purdue CS + AI. Software engineering intern at Recurly. Previously agent infrastructure at QualGent (YC X25); co-founder and CTO of Checkpoint.",
  locale: "en_US",
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
