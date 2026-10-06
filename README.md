# Vastu Ready

An AI-powered real-estate **discovery** app — Zillow meets an intelligent Vastu +
lifestyle advisor. Every listing gets a clear verdict (*tour this one* / *I'd
pass*), four scores, a Vastu breakdown, a correctability rating, and reasoning —
with the **data provenance** behind every claim. MVP market: **Raleigh, NC**.

## Quick start

```bash
npm install
npm run dev     # http://localhost:3000
```

**No configuration is required.** The app runs fully in demo mode: a grounded mock
AI advisor, 10 seeded (fictional) Raleigh homes, a default buyer profile, and
browser-local saved/compare/feedback state.

```bash
npm run build       # production build (property pages are statically generated)
npm run test        # vitest — scoring determinism, ranges, dealbreaker caps
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

## What to look at

- **/** — landing page
- **/feed** — scored property feed with filters/sort
- **/property/[id]** — the AI analysis page (verdict, 4 scores, Vastu categories,
  compass/lot diagram, correctability, feedback). Try `p-cardinal` (strong),
  `p-marshfern` (strong but lots to verify — the trust model), `p-thistle` (pass).
- **/compare** — side-by-side with an AI pick
- **/analyze** — paste-a-listing flow (honest no-scraping stub)
- **/onboarding**, **/saved**, **/searches**, **/preferences**

## Enabling Supabase + a real AI provider

Copy `.env.example` → `.env.local` and fill in values. With Supabase configured,
auth + persistence turn on; without it, the demo keeps working.

1. Create a Supabase project; run `supabase/migrations/0001_init.sql` in the SQL
   editor (tables, enums, RLS, new-user trigger).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable
   key only on the client). Keep `SUPABASE_SERVICE_ROLE_KEY` server-side for seeding.
3. Optionally set `AI_PROVIDER` + `AI_API_KEY` for a real advisor (the mock is the
   fallback).

## Deploy (Vercel)

```bash
# with the Vercel CLI, from your own authenticated account:
vercel           # preview
vercel --prod    # production
```

Or push to GitHub and import the repo at vercel.com/new. Add the env vars from
`.env.example` in the Vercel project settings. The app builds and runs with **no**
env vars (demo mode), so a first deploy works immediately.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — layers, trust model, providers
- [`docs/scoring.md`](docs/scoring.md) — the four scores + methodology
- [`docs/data-model.md`](docs/data-model.md) — schema + RLS
- [`docs/assumptions.md`](docs/assumptions.md) — decisions, gaps, next steps

## A note on Vastu

Vastu is a traditional architectural and cultural framework. Vastu Ready's scores
reflect alignment with those principles and your stated preferences — they are
**not** a prediction of financial, health, or life outcomes. Inferred details are
always labeled and should be independently verified before you make an offer.
