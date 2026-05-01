import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://utkarshbali.com"),
  title: {
    default: "Utkarsh Bali | AI Agent Infrastructure Builder",
    template: "%s | Utkarsh Bali",
  },
  description:
    "Purdue CS + AI student building Checkpoint, AI agent tooling, developer tools, and startup projects.",
  keywords: [
    "Utkarsh Bali",
    "AI agents",
    "agent infrastructure",
    "AI testing",
    "developer tools",
    "Purdue Computer Science",
    "YC startups",
    "LLM evaluation",
  ],
  authors: [{ name: "Utkarsh Bali", url: "https://linkedin.com/in/ubali" }],
  creator: "Utkarsh Bali",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Utkarsh Bali | AI Agent Infrastructure Builder",
    description:
      "Purdue CS + AI student building Checkpoint, agent testing tools, and startup projects.",
    url: "https://utkarshbali.com",
    siteName: "Utkarsh Bali",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Utkarsh Bali",
    description:
      "Building Checkpoint and AI agent testing tools.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070d" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
