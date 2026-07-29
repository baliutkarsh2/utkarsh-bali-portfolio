import type { Metadata, Viewport } from "next";
// Next aliases `react$` to its bundled copy, which exports ViewTransition.
// The type comes from @types/react's canary.d.ts, pulled in by src/types.
import { ViewTransition, type ReactNode } from "react";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SkipLink } from "@/components/layout/skip-link";
import { CommandPalette } from "@/components/interactive/command-palette";
import { PressCursor } from "@/components/interactive/press-cursor";
import { profile, socials } from "@/content";
import { publishedPosts } from "@/lib/writing";
import { jsonLd, personId, siteConfig } from "@/lib/seo";
import { PAPER_DARK, PAPER_LIGHT, THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display-src",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Geist({
  variable: "--font-sans-src",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono-src",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PAPER_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: PAPER_DARK },
  ],
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
  alumniOf: {
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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content={PAPER_LIGHT} />
        {/* Must run before first paint. React 19 hoists <script src> but not
            inline scripts, so <head> is written explicitly here. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(personSchema) }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <div aria-hidden className="paper-grain" />
        <PressCursor />
        <SkipLink />
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <ViewTransition>{children}</ViewTransition>
        </main>
        <SiteFooter />
        <CommandPalette
          posts={publishedPosts().map(({ slug, title, summary }) => ({
            slug,
            title,
            summary,
          }))}
        />
      </body>
    </html>
  );
}
