# Vastu Ready — Architecture

Vastu Ready is an AI-powered real-estate *discovery* app: it reads every listing
through a buyer's priorities and Vastu principles and returns a clear verdict —
tour it, or pass — with the reasoning and the data provenance behind it.

The MVP ships **Raleigh, NC + Vastu only**, but every market- and framework-specific
decision sits behind an interface so additional markets and frameworks (Feng Shui,
Bayfield, etc.) can be added without touching the UI.

## Stack

- **Next.js 16 (App Router, Turbopack)** + **React 19** + **TypeScript**
- **Tailwind v4** design tokens (no config file; tokens live in `globals.css`)
- Self-hosted variable fonts (Manrope, Fraunces) via `@fontsource-variable`
- **Supabase** (Postgres + Auth + RLS) for persistence — optional; the app runs
  fully without it
- **vitest** for pure-domain tests

## Layering (strict, one direction)

```
  domain/            pure, deterministic, no IO, no React
    types.ts         core types + the VastuAttribute<T> provenance wrapper
    directions.ts    direction/zone labels, verification derivation
    vastu/engine.ts  the Vastu scoring engine (weighted, strictness-aware)
    scoring.ts       the 4-score orchestrator (priority-weighted overall)
    profile.ts       buyer profile + Vastu preference types
    labels.ts        enum → display-string maps
        │
  providers/         swappable IO behind interfaces (all mock-first)
    property.ts      PropertyDataProvider (MLS / data provider / manual / URL)
    maps.ts          MapsProvider (drive time; Mapbox/Google later)
  ai/                AIProvider (explains + compares; never scores)
        │
  lib/               env, supabase clients, formatting, demo analysis
        │
  components/        presentation (ui primitives + vastu components)
        │
  app/               routes (landing, auth, onboarding, app shell + pages)
```

**The domain never imports from providers, ai, lib, or components.** This keeps
scoring pure and unit-testable, and means the engine behaves identically on the
server, in tests, and (for comparison) on the client.

## The trust model (the product's backbone)

Every Vastu datum is a `VastuAttribute<T> = { value, confidence, source }`. From
`confidence` + `source` the engine derives a `VerificationStatus`:
`verified | likely | needs_verification | potential_concern`. **The app never
presents inferred data as verified fact** — the UI shows the status on every
category, the compass diagram labels inferred placements "Approximate — requires
verification," and the AI advisor is handed the status and phrases accordingly
("is confirmed" vs. "should be verified").

## AI vs. the engine

The deterministic engine computes all numbers. The `AIProvider` only *explains*
the numbers (conversational recommendation) and *compares* homes. This separation
means scores are reproducible and auditable, and swapping in a real LLM never
changes a score — only the prose. The `MockAIProvider` is grounded in the analysis
and runs with zero credentials.

## Provider abstractions

- `PropertyDataProvider` — `list / get / fromListingUrl / fromManualEntry`.
  The MVP uses `MockPropertyProvider` over the seeded Raleigh set. **There is no
  scraper**: `fromListingUrl` is an honest stub that explains a licensed MLS/data
  feed is required and hands off to manual entry, so nothing about a real home is
  ever fabricated.
  - `RentcastPropertyProvider` (`providers/rentcast.ts`) plugs in behind the same
    interface when `RENTCAST_API_KEY` is set: it pulls **real** active for-sale
    listings for the configured market (`RENTCAST_MARKET_CITY/STATE`) from
    RentCast's licensed API — a stopgap until MLS access is in place. Factual
    fields (price, beds/baths, size, lot, year) are real; **Vastu is never
    fabricated** — no listing feed carries a home's true orientation or room
    placement, so every Vastu attribute stays `unknown` (confidence 0) and reads
    "needs verification" until confirmed per home. `estimatedValue` is the list
    price, a disclosed stand-in rather than an independent AVM. Results are cached
    in memory (TTL `RENTCAST_CACHE_HOURS`) so a whole feed costs one request,
    respecting the free tier (~50/month). On any error it falls back to the demo
    set, and the UI shows the correct disclosure (real listings vs. sample data).
    The catalog is resolved server-side in `(app)/layout.tsx` and handed to the
    client feed via `CatalogProvider`.
- `MapsProvider` — drive time; mock uses a deterministic haversine estimate.
- `AIProvider` — recommendation + comparison; mock is grounded + deterministic.

Each has a `getX()` resolver that branches on env and falls back to the mock.

## Persistence

Supabase is optional. When unconfigured, the browser keeps saved/feedback/compare
state in a small external store (localStorage-backed) — the same shape Supabase
replaces in production. `src/lib/supabase/{client,server}.ts` return `null` when
no credentials are present, and only ever use the publishable anon key on the
client. Schema + RLS live in `supabase/migrations/0001_init.sql`.

## Business model (structure only, no billing yet)

`account_tier` enum (`free`, `premium_buyer`, `realtor_pro`, `professional_report`,
`builder`) is on the `users` table, ready for Stripe-gated features. A
"Vastu Ready Verified" badge is a placeholder in the component layer.
