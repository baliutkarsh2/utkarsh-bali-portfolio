# Utkarsh Bali, Portfolio

Live at **https://ubali.dev**

## What it is

The site is one field of dots at one pitch. The page is an unlit board, and
wherever there is something to say, dots light: into a face, into the numbers,
into the images, into a row that tracks how far you have read, and then they
return to the field between things. "Connecting the dots" is the first line on
the site and the last, and both times it is literal. The concept is called
Resolve; the design spec it was built from lists five rules that every file in
this repository is checked against (see *Things worth knowing* below).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript · MDX ·
deployed on Vercel. Fonts are Geist and Geist Mono through `next/font/google`
and a hand-subset Doto (numerals only) through `next/font/local`. Runtime
dependencies beyond Next, React and the MDX loader: `gray-matter`,
`lucide-react` (four icons), `server-only`. There is no animation library:
the only loop on the site is the portrait board, a dependency-free 2D canvas.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # runs scripts/check-glyphs.mjs first, then next build
npm run lint
npm start
```

## Structure

```
src/
  app/                  routes, metadata, OG images, sitemap, robots
    globals.css           tokens, @theme mapping, utilities, base, print, reduced motion
    board.css             the portrait board (owned by dot-board.tsx)
    components.css        primitives (row, section, numeral, prose …) and page layouts
    chrome.css            header, footer, menu, command palette
    about/  experience/  projects/  projects/[slug]/  writing/  writing/[slug]/
    not-found.tsx         the 404, "404" set in dots
    _fonts/               static TTFs for OG rendering only (never sent to a browser)
  components/
    layout/             site-header, site-footer, skip-link
    sections/           page sections, composed by the routes above
    project/            case-study pieces: number plate, body, rail, gallery, prev/next, inspection panel
    interactive/        the only "use client" files: dot-board, reveal, copy-email,
                        section-spy, progress-row, command-palette
    ui/                 primitives: numeral, row, section, spec-list, led,
                        button, tag, dot-mask, spine, mission-line, nine-dot-mark
  content/              all copy and data, plus the generated portrait fields
    writing/            MDX posts
  lib/                  board renderer, fonts, motion policy, scroll progress, seo, writing, og
  fonts/                Doto-numerals.woff2, the hand-subset dot face
  assets/portrait/      utkarsh-cutout.png, the committed source of the portrait
scripts/                segment.py, bake-portrait.py (run by hand), check-glyphs.mjs (prebuild)
public/portrait/        dots-96@2x.webp, dots-64@2x.webp, dots-about@2x.webp (generated fallbacks)
```

### The portrait pipeline

The photograph itself is never served. It becomes data in two offline steps,
both Python (Pillow + NumPy; `segment.py` also needs `rembg`), run by hand,
with every output committed. Vercel runs none of this.

1. `python scripts/segment.py path/to/photo.jpg` cuts the subject out of the
   original photograph (which is not committed), crops the cutout to the
   subject's bounding box, quantises it to a 256-colour palette PNG and writes
   `src/assets/portrait/utkarsh-cutout.png` plus `CUTOUT_ORIGIN.txt` (the
   crop's top-left in the original frame), so the windows in the bake script
   stay in photograph coordinates.
2. `python scripts/bake-portrait.py` samples that cutout onto four dot grids
   and writes:
   - `src/content/portrait-field-96.ts` (192 × 240 cells: the hero from
     48rem, a 96 × 120 lattice box at double density), `portrait-field-64.ts`
     (128 × 160: the phone hero, a 64 × 80 box), `portrait-field-about.ts`
     (128 × 160, a tighter face crop for About) and
     `portrait-field-contact.ts` (96 × 120: the Contact afterimage, the hero
     window at half size in a 48 × 60 box).
     Portrait cells are half the page pitch, so every second cell sits on a
     page dot; unlit cells are drawn only where a page dot is, which keeps the
     unlit part of the portrait pixel-identical to the lattice around it. Each is one base64 string plus the lit count, the datum
     (the always-orange eye dot), the face centre and the rim indices.
   - `src/content/portrait-meta.ts` with `DOT_COUNT`, which the footer
     colophon imports (never type the number).
   - `src/content/portrait-og.ts`, a 48 × 60 downsample as circles for the
     share cards.
   - `public/portrait/dots-*.webp`, the settled frame for `<noscript>`,
     print and browsers without a canvas.
   `--preview DIR` also writes review PNGs. The crop windows, the datum and
   the tone curve are constants at the top of the script, chosen by eye.

Re-run the bake only when the photograph changes. After it, update `alt` in
`src/content/portrait.ts` if the picture is different, and commit everything
it wrote.

## Editing content

Everything you would want to edit is in `src/content/`. No copy is hardcoded
in components.

| File | What's in it |
|---|---|
| `profile.ts` | Name, tagline, email, socials, nav, résumé slot |
| `now.ts` | The "Now" section: current role, body, points and its `updated` date |
| `metrics.ts` | The eight numbers on the home page; one may carry `accent: true` |
| `projects.ts` | All projects; each becomes `/projects/<slug>` automatically |
| `experience.ts` | Work history (the spine page) |
| `recognition.ts` | Awards and rankings |
| `skills.ts` | The toolkit groups |
| `personal.ts` | About copy, beliefs, reading, music, interests, the mission line |
| `portrait.ts` | The portrait's `alt` and fallback paths; re-exports the generated fields |

### Adding a project

Add an entry to `src/content/projects.ts`. The slug is the URL, the record
drives the index row, the case study, the inspection panel, the sitemap, the
command palette and the OG card; nothing else needs touching.

- `metric` and `metricLabel` are the one number the project is judged by and
  the hedge that goes with it ("internal benchmark", "research testing").
  The number is set in Doto, so it may only use the characters in
  `DOT_GLYPHS` (`src/lib/fonts.ts`): digits, `. , % < > ~ + x K` and the
  word `Top`. `npm run build` fails on anything else; add a glyph there and
  re-subset the font (see below).
- `status: "ongoing"` gives the row the page's one orange LED. Only one
  project should be ongoing at a time.
- `cover` (16:9) and `media` (a gallery) are optional. Drop the file in
  `public/projects/` and give it real `width`, `height` and `alt`; every
  picture resolves through a dot mask and the box is reserved from the
  dimensions, so nothing shifts when it loads. There are no placeholder
  plates: a project without a screenshot simply has none.
- `learnings` adds a sixth section, "What I'd do differently".
- `confidential: true` shows "NDA" where a source link would be.

### Adding a post

Posts are MDX files in `src/content/writing/`. Create one, commit, deploy.

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
- To list a piece published somewhere else, add `external` and `publisher`
  and skip the body. `readingMinutes` is required then, because there is no
  body to measure:

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

  The row links out in a new tab with the publisher as its tag, and the piece
  is kept out of `generateStaticParams`, the sitemap and the per-post OG route.
- `draft: true` renders in `npm run dev` and is excluded from production, the
  sitemap and RSS.
- Give pictures their dimensions (`<img src="/…" width="1600" height="900" />`
  or a markdown image a plugin has sized); the box is reserved from them.
  An image with a `title` gets it as a caption.
- Code blocks are highlighted with the single dark theme in
  `src/lib/code-theme.json`. Highlight lines with ` ```ts {2,5-7} ` and add a
  filename with ` ```ts title="server.ts" `.
- Everything else is automatic: the index, the home-page row, RSS at
  `/writing/rss.xml`, the sitemap, the command palette and the OG image.

## Things worth knowing before you change them

- **One pitch.** `--pitch` is a single integer pixel value (5px, 6px from
  80rem). The page field, the portrait grid, the Doto numerals, dotted
  underlines, image masks, the progress row, the spine and the
  view-transition mask all use it. Nothing dotted exists off the pitch; if a
  new dotted thing is needed, build it from `var(--pitch)`. The portrait fields are the one sanctioned exception: they are baked at half the pitch (double density) so the face reads, and every second cell still lands on the page lattice.

- **Doto sets numbers, Geist sets words.** `<Numeral>` (`ui/numeral.tsx`) is
  the only component that reaches the dot face, at two sizes (10 × and 20 × the
  pitch, so the glyphs' own dots sit on the page lattice). An ESLint rule in
  `eslint.config.mjs` fails any other file that names `font-dot` or
  `text-dot-`. The font is hand-subset to exactly `DOT_GLYPHS`
  (`src/fonts/Doto-numerals.woff2`, about 2 KB); to add a glyph, extend
  `DOT_GLYPHS` in `src/lib/fonts.ts` and re-subset from the Google Fonts
  variable file:
  `pyftsubset "Doto[ROND,wght].ttf" --text="<DOT_GLYPHS>" --flavor=woff2 --layout-features='*'`.
  `scripts/check-glyphs.mjs` runs before every build and rejects a figure in
  `src/content` that the subset cannot set.
- **One accent per screen.** `--sun` is the sunset on his face; as a UI colour
  it appears at most once per 1440 × 900 screen, never on hover. The
  sanctioned elements are: the hero status LED, the accent numeral on the
  numbers board, the ongoing project's row LED on the work index, the
  experience spine's leading dot, the progress row's leading dot on case
  studies and posts, the active row's LED in the command palette, and focus
  rings. Everything else that might want orange (the header's active-route
  LED, the case-study masthead LED, the number plate, the inspection panel)
  is `--ink` on purpose. The portrait's rim and datum are the light source,
  not UI, and do not count.
- **Words never animate.** No fade, slide or blur on any text, ever. Only dots
  move: numerals warm from 400 to 700, dot masks resolve, hairlines draw, the
  portrait assembles and disperses. `<Reveal>` wraps dot surfaces only (a
  numeral, a `<DotMask>`, a mission line); wrapping copy in it is a bug.
  Colour transitions on links are fine; they are not motion.
- **The hero canvas is `position: fixed`** behind the page while the hero is
  on screen, so dispersing dots can leave the board and settle onto the fixed
  page lattice behind the name. It sits at `z-index: 0`; `main > *` is
  `position: relative; z-index: 1`, and anything inside the hero or the 404
  that must paint above the canvas carries the `board-above` class. The
  figure box (`role="img"`) is only the layout anchor and the accessible name.
- **Portrait fields never cross the server boundary.** `<DotBoard>` takes a
  `source` ("hero", "about", "contact") and imports the matching
  `portrait-field-*.ts` module on the client, so each field is one hashed,
  cached chunk rather than base64 inlined in every page's HTML and RSC
  payload. Server components pass only what markup needs (the count for the
  caption, the WebP paths for print and no-canvas). Client components import
  `@/content/profile`, never the `@/content` barrel, which carries every case
  study's prose.
- **Idle costs zero frames.** The board schedules a frame only while
  something is moving (assembly, a live spring under the pointer, a scroll)
  and stops the frame after the last dot rests. Every other movement is a CSS
  transition on a font axis, a mask radius or a background size, or a
  scroll-driven animation. Do not add a loop.
- **The field answers the pointer everywhere.** `src/components/interactive/field-light.tsx` is one fixed canvas behind every page that lights lattice dots near a fine pointer and stops drawing the moment the light settles. It skips the hero board's box (the board lights itself) and is off on touch devices and under reduced motion.
- **Frame zero is CSS.** The page field is `body::before`, a fixed SVG tile at
  the pitch; the board box is transparent until the canvas mounts and draws
  the same unlit dots, so nothing changes on screen at mount. The `h1` is the
  LCP element on every viewport; there is no hero image outside `<noscript>`.
- **Reduced motion has two switches**: the OS setting and the command
  palette's "Reduce motion" action, which persists `localStorage["motion"]`
  and sets `data-motion="reduce"` on `<html>`. The inline boot script in
  `layout.tsx` restores it before first paint and adds the `.js` class that
  the unlit-until-revealed CSS is gated on, so a visitor without JavaScript
  sees every dot surface finished. `src/lib/motion.ts` is the only JS that
  reads either switch.
- **Scroll-driven CSS (`animation-timeline`) has no Firefox support**, so
  nothing behind those `@supports` blocks may carry meaning; the fallback is
  always the finished state, and `src/lib/scroll-progress.ts` writes the
  progress row's `--p` where the timeline is missing.
- **OG fonts must be static, not variable.** Satori cannot parse variable
  fonts, so `src/app/_fonts/` holds `Geist-Medium.ttf` and
  `GeistMono-Medium.ttf`, build-time only. There is no Doto on a share card;
  the dots come from `portrait-og.ts`. One `renderOgCard()` in `src/lib/og.tsx`
  serves every route.
- **One dark theme, no toggle.** `color-scheme: dark` on the root, no `.dark`
  class and no `dark:` utilities anywhere. `@theme inline` in `globals.css`
  must stay `inline`: the numeral sizes are calcs on the pitch and have to
  re-resolve at the element. `@media print` is the only second palette (ink
  on white, board hidden, links spelled out).
- **`now.updated` renders on the page.** Update it when the Now section
  changes so a stale entry is visible rather than misleading.
- **Metrics carry a `metricLabel`.** It is where the hedge lives. Keep it
  attached when the number moves.
- **MDX plugin options must be plain JSON.** Turbopack passes loader options
  across a Rust boundary, so functions are impossible: no `getHighlighter`,
  no `transformers`, no `onVisit*` callbacks. `pageExtensions` is deliberately
  unset (posts are imported, not routed), and the post route imports with a
  relative specifier, not `@/`, because aliases inside a template literal are
  the flakiest part of context-module building.
- View transitions come from Next's bundled React, which exports
  `ViewTransition`; `src/types/react-canary.d.ts` exists only to pull in the
  type. The kill switch is one line in `next.config.ts`. Project names share
  `view-transition-name: project-{slug}` between the index row and the
  case-study `h1`.
- Six files are `"use client"` (`components/interactive/*`), plus the header
  and the inspection panel. Everything else is a server component. `<Reveal>`
  wraps server children without pulling them across the boundary.

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
(canonical tags, OG, sitemap, JSON-LD); the share cards always print
`ubali.dev` so a preview deployment never advertises a `vercel.app` host.
