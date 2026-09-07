import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import codeTheme from "./src/lib/code-theme.json" with { type: "json" };

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * The build directory, overridable from the environment.
   *
   * `.next` is a single shared directory, so two builds of this repo at once
   * destroy each other: the running server's chunk hashes stop existing, every
   * asset 500s, and the page renders with no stylesheet at all — which looks
   * exactly like a CSS bug and is not one. That cost real time to diagnose
   * once. Set NEXT_DIST_DIR to give a parallel build its own directory:
   *
   *   NEXT_DIST_DIR=.next-probe npm run build
   *   NEXT_DIST_DIR=.next-probe npx next start -p 3260
   *
   * Unset — which is every real build, local and on Vercel — it is `.next`.
   *
   * One side effect to know about, because it is easy to commit by accident:
   * Next rewrites `next-env.d.ts` and the `include` list in `tsconfig.json` to
   * point at whatever directory it just built into. After a parallel build,
   * `git checkout -- next-env.d.ts tsconfig.json` (or one ordinary build) puts
   * them back. Committing them pointed at a scratch directory breaks the build
   * for everyone else, since the directory does not exist anywhere but here.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Both of these work around OneDrive's multi-lockfile detection. Do not remove.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  /**
   * /experience was two sections that answered the same question /about
   * answers, so it folded into it. A 308 rather than a 301: 308 is the one
   * permanent redirect that is guaranteed not to rewrite the method, and the
   * old URL has been linked from a résumé PDF that cannot be recalled.
   *
   * The fragment survives the redirect, so an old /experience link lands on
   * the section that used to be that page rather than at the top of a longer
   * one.
   */
  async redirects() {
    return [{ source: "/experience", destination: "/about#experience", permanent: true }];
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
          // One custom dark theme rather than a builtin: builtin themes assume
          // an editor background and several fail AA against --ground-2.
          // With a single theme rehype-pretty-code inlines token colours as
          // `style="color:…"`; there are no `--shiki-*` variables to map.
          theme: codeTheme,
          keepBackground: false,
          defaultLang: { block: "text", inline: "text" },
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
