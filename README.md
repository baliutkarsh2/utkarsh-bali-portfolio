# Utkarsh Bali, Portfolio

Live at **https://ubali.dev**

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript · deployed on Vercel.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

---

## Structure

```
src/
  app/            routes, metadata, OG images, sitemap, robots
    about/              About + toolkit + off-hours
    experience/         work history + recognition
    projects/           the full work index (spreads + rows)
    projects/[slug]/    case studies (static, one per project)
    writing/            MDX blog
    _fonts/             static font files for OG rendering only
  components/
    layout/       header, footer, skip link
    sections/     page sections, composed by the routes above
    project/      case-study pieces
    interactive/  the only "use client" components
    ui/           shared primitives
  content/        ← all copy and data lives here
  lib/            seo, theme script, fuzzy matcher, utils
  assets/         images imported by code (enables blur placeholders)
```

**Everything you'd want to edit is in `src/content/`.** No copy is hardcoded in
components.

| File | What's in it |
|---|---|
| `profile.ts` | Name, tagline, email, socials, nav, résumé slot |
| `now.ts` | The "Now" section: current role and its `updated` date |
| `projects.ts` | All projects; each becomes `/projects/<slug>` automatically |
| `experience.ts` | Work history |
| `recognition.ts` | Awards and rankings |
| `skills.ts` | Toolkit columns |
| `personal.ts` | About copy, beliefs, reading, music, interests |

---

## Adding the things that aren't in yet

### Project screenshots

Every project renders a `SpecPlate`, a typographic panel at the same 16:9 box a
screenshot would occupy, until you give it a real image. Adding one changes the
picture without shifting any surrounding layout.

1. Drop the file in `public/projects/`.
2. Add a `cover` to that project in `src/content/projects.ts`:

```ts
cover: {
  kind: "image",
  src: "/projects/checkpoint-dashboard.png",
  alt: "Checkpoint dashboard showing a failed multi-turn test run",
  width: 2400,
  height: 1350,
},
```

For extra images further down the case study, add a `media: [...]` array using
the same shape. The gallery section renders only when that array exists.

> Write a real `alt`. It's the description a screen-reader user gets, and it's
> also what a recruiter's screenshot-less preview falls back to.

### Résumé PDF

1. Put the PDF in `public/`, e.g. `public/utkarsh-bali-resume.pdf`.
2. In `src/content/profile.ts`:

```ts
resume: { href: "/utkarsh-bali-resume.pdf", updated: "2026-08-01" },
```

It's `null` today, which is why no résumé link appears anywhere. Setting it turns
on the command-palette entry. Nothing 404s in the meantime.

### More Checkpoint detail

`src/content/projects.ts` → the `checkpoint` entry. `architecture` and
`learnings` are arrays; add entries and the case study grows to fit.

---

## Writing a blog post

Posts are MDX files in `src/content/writing/`. Create one, commit, deploy. That
is the whole workflow.

```mdx
---
title: "Your title"
summary: "One or two sentences. Used on the index, in RSS, and on the OG card."
date: "2026-08-14"
tags: ["agents", "testing"]
draft: false
---

Body copy here. Standard markdown, plus any React component you import.
```

- **The filename is the URL.** `my-post.mdx` becomes `/writing/my-post`.
- `title` and `date` are required; the build fails loudly if either is missing.
- **To list a piece published somewhere else**, add `external` and `publisher`
  and skip the body:

  ```mdx
  ---
  title: "The title as published"
  summary: "One or two sentences."
  date: "2025-07-11"
  external: "https://medium.com/@you/the-post"
  publisher: "Medium"
  readingMinutes: 3
  ---
  ```

  The canonical copy stays where it was published, so the row links out, gets a
  publisher badge, and is deliberately kept out of `generateStaticParams`, the
  sitemap and the per-post OG route. RSS points subscribers at the real
  article. `readingMinutes` is required here because there is no body to
  measure, and the build says so if you forget it.
- `draft: true` renders in `npm run dev` and is excluded from production, the
  sitemap, and RSS.
- Reading time is computed from the body, not stored.
- Code blocks get syntax highlighting from a custom theme in
  `src/lib/code-theme.json` that matches the paper palette. Highlight lines with
  ` ```ts {2,5-7} ` and add a filename with ` ```ts title="server.ts" `.
- Everything else is automatic: the index page, the homepage section, RSS at
  `/writing/rss.xml`, the sitemap, the command palette, and a generated OG image.

## Things worth knowing before you change them

- **The site is multi-page.** The homepage is a landing (hero, marquee, Now,
  top-three spreads, recent writing, outro); About, Work, and Experience are
  routes. Section components take an `index` prop so numbering restarts per
  page, and an `as="h1"` prop when a section opens its own page. The Contact
  nav item is the one anchor (`/#contact`), it targets the shared outro.
- **Photo-less projects use the compact plate.** `SpecPlate` accepts
  `compact`, which renders 21:9 instead of 16:9. Spreads and case-study
  mastheads pass it automatically when `cover` is missing, so adding a real
  screenshot restores the full-height box by itself.
- **The press is hand-written WebGL, and that is deliberate.** `src/lib/halftone.ts`
  is one fragment shader that separates the portrait into CMYK and screens each
  ink on its traditional angle (C 15, M 75, Y 0, K 45). Those angles are the
  only reason it produces a rosette instead of a moire. It is about 3.5 KB
  gzipped with no library; three.js would have cost 160 KB to run the same
  shader. Do not "upgrade" it to a framework.
- **The shader must never become the LCP element.** `HalftoneLayer` is a canvas
  laid over the real `next/image`, and it only fades in once WebGL has
  compiled, the texture has decoded, and a frame is on screen. Any failure at
  all leaves the plain photograph, which is the correct result.
- **GLSL lives in a JS template literal, so it may not contain backticks.**
  A backtick inside a shader comment terminates the string and produces
  syntax errors pointing at seemingly unrelated lines.
- **The display name is four plates, and only K is real text.** C, M and Y are
  aria-hidden duplicates that carry the misregistration. They never reach true
  register, because a perfect fit reads as digital. K carries no animation
  because it is the LCP paint.
- **The custom cursor hides the native one, so it only mounts when it can
  fully replace it**: fine pointer, motion allowed. Text inputs always keep a
  real caret cursor.
- **The accent is print red and it is rationed.** `--accent` may colour display
  type, hairlines, numerals, marks, selection, active nav, and focus rings.
  It must never colour body or meta text; small accent text uses the darker
  `--accent-ink`, which clears 4.5:1 on paper and on the row-hover inset fill.
  If a screenshot reads "red website" rather than "paper site with a red
  pulse", something used it that shouldn't have.
- **Ink bands work by scoping the `dark` class** (`<section class="dark ink-band">`).
  Two traps: `--band-bg` must stay OUT of the `.dark` token block (the band
  matches `.dark` itself and would self-override in both themes; the dark value
  lives on `:root.dark`), and `.ink-band` must declare `color: var(--ink)`,
  because children without a colour utility inherit the computed colour from
  `<body>`, which was resolved in the light scope.
- **`@theme inline` in `globals.css` must stay `inline`.** It inlines
  `var(--paper)` into each emitted utility so colours re-resolve under `.dark`.
  Drop the keyword and dark mode silently stops working.
- **Don't animate the hero `<h1>` opacity.** It's the LCP element. It uses a
  `clip-path` reveal specifically because that paints immediately; a fade or an
  `animation-delay` would push LCP by the full duration.
- **OG fonts must be static, not variable.** Satori's parser crashes on variable
  fonts. `src/app/_fonts/` holds static instances and is build-time only, so those
  files are never sent to a browser.
- **Metrics carry a `metricLabel`.** It's where the hedge lives ("internal
  benchmark", "research testing"). Keep them attached when the number moves.
- **`now.updated` renders on the page.** Update it when the Now section changes
  so a stale entry is visible rather than misleading.
- Seven components are `"use client"`; everything else is a server component.
  `<Reveal>` and `<WorkPreview>` wrap server children without pulling them
  across the boundary.
- **No em dashes anywhere**, including source comments. Check with a script, not
  `grep`: a multibyte character class matches individual UTF-8 bytes and gives
  false positives on the box-drawing characters used in the CSS section
  separators.
- **MDX plugin options must be plain JSON.** Turbopack passes loader options
  across a Rust boundary, so functions are impossible. That rules out Shiki's
  `getHighlighter` (the language set cannot be trimmed), `transformers`, and all
  `onVisit*` callbacks.
- **`pageExtensions` is deliberately unset.** Posts are imported, not routed, so
  the Turbopack rule already matches them. Leaving it alone means a stray `.mdx`
  file can never accidentally become a page.
- The post route imports with a **relative** specifier, not `@/`. Path aliases
  inside a template literal are the flakiest part of context-module building.
- View transitions come from Next's **bundled** React, which exports
  `ViewTransition` even though `react@19.2.5` does not. `src/types/react-canary.d.ts`
  exists only to pull in the type. Kill switch is one line in `next.config.ts`.
- Scroll-driven CSS (`animation-timeline`) has **no Firefox support at all**, so
  nothing behind that `@supports` block may carry meaning. `Reveal` is the
  universal baseline.
- The paper grain is `position: fixed` at `z-index: -1` so it never repaints
  during scroll. Do not make it a scrolling background.

## Deployment

Pushes to `master` deploy to production automatically; every other branch gets
a preview URL. The Vercel project is linked to this repository, so no local
step is needed.

If that link is ever lost (a new clone shows "To deploy every commit
automatically, connect a Git Repository"), restore it with:

```bash
npx vercel git connect
npx vercel deploy --prod --yes   # one-off manual deploy
```

Set `NEXT_PUBLIC_SITE_URL` only if the canonical domain changes.
`src/lib/seo.ts` is the single source of truth for every absolute URL
(canonical tags, OG, sitemap, JSON-LD).
