import type { Metadata, Viewport } from "next";
// Next aliases `react$` to its bundled copy, which exports ViewTransition.
// The type comes from @types/react's canary.d.ts, pulled in by src/types.
import { ViewTransition, type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SkipLink } from "@/components/layout/skip-link";
import { profile, socials } from "@/content";
import { display, mono, text } from "@/lib/fonts";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion";
import { GROUND, THEME_BOOT_SCRIPT } from "@/lib/theme";
import { jsonLd, personId, siteConfig } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | Utkarsh Bali",
  },
  description: siteConfig.description,
  keywords: [
    "Utkarsh Bali",
    "software engineer",
    "AI agents",
    "agent infrastructure",
    "developer tools",
    "LLM evaluation",
    "Purdue Computer Science",
  ],
  authors: [{ name: profile.name, url: profile.linkedin }],
  creator: profile.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: profile.name,
    title: siteConfig.title,
    description: siteConfig.description,
    locale: siteConfig.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    creator: "@ubali07",
  },
};

/**
 * Browser chrome (the address bar, the tab strip on Android) takes the page
 * ground from these metas, keyed to the system preference, which is what
 * `system`, the default theme, follows; a pinned light or dark choice adds a
 * meta of its own ahead of them (lib/theme.ts). `color-scheme: light dark`
 * lets the canvas take the right ground before the stylesheet arrives.
 *
 * This was a single #0A0A0B with `color-scheme: dark`, left from the dark
 * dot-board build: a cold black bar over a paper page.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: GROUND.light },
    { media: "(prefers-color-scheme: dark)", color: GROUND.dark },
  ],
  colorScheme: "light dark",
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": personId,
  name: profile.name,
  url: siteConfig.url,
  email: `mailto:${profile.email}`,
  jobTitle: "Software Engineer",
  description: siteConfig.description,
  // Still enrolled (graduating Dec 2026), so an affiliation, not alumniOf.
  affiliation: {
    "@type": "CollegeOrUniversity",
    name: "Purdue University",
  },
  knowsAbout: [
    "AI agents",
    "Agent infrastructure",
    "Developer tools",
    "LLM evaluation",
    "Distributed systems",
  ],
  sameAs: socials.filter((s) => s.kind !== "email").map((s) => s.href),
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the boot script adds `.js` and may set
    // data-motion before React hydrates, and both are expected to differ
    // from the server-rendered attributes.
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before first paint. React 19 hoists <script src> but not
            inline scripts, so <head> is written explicitly here. */}
        <script
          dangerouslySetInnerHTML={{
            __html: MOTION_BOOT_SCRIPT + THEME_BOOT_SCRIPT,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(personSchema) }}
        />
      </head>
      {/* No class on <body>: colour, type and the field are base styles, and
          a background here would paint over the lattice (see globals.css §4). */}
      <body>
        <SkipLink />
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <ViewTransition>{children}</ViewTransition>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
