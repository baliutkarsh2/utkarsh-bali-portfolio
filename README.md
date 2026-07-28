# Utkarsh Bali — Portfolio

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
    projects/[slug]/    case studies (static, one per project)
    _fonts/             static font files for OG rendering only
  components/
    layout/       header, footer, skip link
    sections/     homepage sections
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
| `now.ts` | The "Now" section — current role and its `updated` date |
| `projects.ts` | All projects; each becomes `/projects/<slug>` automatically |
| `experience.ts` | Work history |
| `recognition.ts` | Awards and rankings |
| `skills.ts` | Toolkit columns |
| `personal.ts` | About copy, beliefs, reading, music, interests |

---

## Adding the things that aren't in yet

### Project screenshots

Every project renders a `SpecPlate` — a typographic panel at the same 16:9 box a
screenshot would occupy — until you give it a real image. Adding one changes the
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

## Things worth knowing before you change them

- **`@theme inline` in `globals.css` must stay `inline`.** It inlines
  `var(--paper)` into each emitted utility so colours re-resolve under `.dark`.
  Drop the keyword and dark mode silently stops working.
- **Don't animate the hero `<h1>` opacity.** It's the LCP element. It uses a
  `clip-path` reveal specifically because that paints immediately; a fade or an
  `animation-delay` would push LCP by the full duration.
- **OG fonts must be static, not variable.** Satori's parser crashes on variable
  fonts. `src/app/_fonts/` holds static instances and is build-time only — those
  files are never sent to a browser.
- **Metrics carry a `metricLabel`.** It's where the hedge lives ("internal
  benchmark", "research testing"). Keep them attached when the number moves.
- **`now.updated` renders on the page.** Update it when the Now section changes
  so a stale entry is visible rather than misleading.
- Six components are `"use client"`; everything else is a server component.
  `<Reveal>` wraps server children without pulling them across the boundary.

## Deployment

Pushes to `master` deploy via Vercel. Set `NEXT_PUBLIC_SITE_URL` only if the
canonical domain changes — `src/lib/seo.ts` is the single source of truth for
every absolute URL (canonical tags, OG, sitemap, JSON-LD).
