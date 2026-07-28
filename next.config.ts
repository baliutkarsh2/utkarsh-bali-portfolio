import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import codeThemes from "./src/lib/code-theme.json" with { type: "json" };

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Both of these work around OneDrive's multi-lockfile detection. Do not remove.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  // Same-document view transitions, Baseline since Oct 2025 (Chrome/Edge 111,
  // Firefox 144, Safari 18). Verified not to require React's experimental
  // channel: Next's bundled React exports ViewTransition and `react$` is
  // aliased to it. Kill switch: delete this line.
  experimental: { viewTransition: true },
};

/**
 * Posts live in src/content/writing and are imported, they are not file-based
 * routes, so `pageExtensions` is deliberately NOT set. The Turbopack rule
 * registered here matches on file path regardless, and leaving pageExtensions
 * alone means a stray .mdx file can never accidentally become a route.
 *
 * Every plugin below is a string and every option is plain JSON. Turbopack
 * passes loader options across a Rust boundary, so functions are impossible
 * here: no getHighlighter (Shiki cannot be language-subset), no transformers,
 * no onVisit callbacks.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: [
      "remark-frontmatter",
      ["remark-mdx-frontmatter", { name: "frontmatter" }],
      "remark-gfm",
    ],
    rehypePlugins: [
      "rehype-slug",
      [
        "rehype-autolink-headings",
        { behavior: "wrap", properties: { className: ["heading-anchor"] } },
      ],
      [
        "rehype-pretty-code",
        {
          // Custom themes rather than builtins: builtin themes assume an
          // editor background and several fail AA against the paper token.
          theme: { light: codeThemes.light, dark: codeThemes.dark },
          keepBackground: false,
          defaultLang: { block: "text", inline: "text" },
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
