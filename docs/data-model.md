# Vastu Ready — Data model

Schema: `supabase/migrations/0001_init.sql`. Postgres via Supabase, with Row Level
Security on every user-owned table.

## Principle: provenance everywhere

Every Vastu datum stores **value + confidence + source**, and every derived
finding stores a **verification status**. The app must never present inferred data
as verified fact, so the database preserves the provenance the UI and AI depend on.

## Tables

### Identity & preferences (one per user, RLS: own row)
- **users** — mirrors `auth.users`; `tier` (account_tier) for the business model.
- **buyer_profiles** — budget, beds/baths/sqft, lot min/preferred, areas,
  destination + coords, max commute, styles, construction/renovation/pool/privacy/
  garage preferences, priorities[].
- **vastu_preferences** — strictness, acceptable facings[], preferred entrance,
  NE-open importance, dealbreakers[].

### Catalog (shared, RLS: public read / service-role write)
- **properties** — listing facts + Vastu attributes, each attribute carried as a
  `*_value`, `*_confidence`, `*_source` triple (facing, entrance, lot shape, road
  position, NE open space, kitchen, primary bedroom, bathrooms, staircase,
  brahmasthan, garage).
- **property_images**, **property_rooms**, **water_features** — child records,
  rooms/water also confidence + source.

### Analyses (engine output, auditable)
- **property_analysis** — the four scores + correctability + verdict, stamped with
  `scoring_version` and `methodology_version`. `user_id` null = a shared analysis;
  set = a user-specific one (scored against their prefs).
- **vastu_analysis** — one row per category: score, finding status, severity,
  verification, correctability, correctable, weight, explanation.
- **analysis_sources** — per-finding provenance (source + confidence + note).
- **recommendations** — the AI headline + reasoning[], with `provider` + `is_mock`.

### Activity (RLS: own row)
- **saved_properties** — (user, property).
- **property_feedback** — (user, property) → love / consider / pass / dealbreaker.
- **saved_searches** — named criteria (jsonb) + alert cadence.
- **comparisons** — named set of property_ids.

## Enums

`data_source` (mls/floorplan/satellite/inference/manual/unknown/url),
`verification_status`, `finding_status`, `severity`, `correctability`,
`strictness`, `verdict_level`, `home_type`, `feedback_kind`, `account_tier`.

These mirror the TypeScript unions in `src/domain/types.ts` so the engine output
maps 1:1 onto storage.

## RLS summary

- Catalog tables (`properties` and children, `vastu_analysis`, `analysis_sources`,
  `recommendations`): `select using (true)` — readable by anon so the demo works;
  writes go through the service role (seed/ETL), never the anon key.
- User tables: `using (auth.uid() = user_id)` for all operations.
- `property_analysis`: readable if shared (`user_id is null`) or owned; insert only
  for your own `user_id`.
- `handle_new_user()` trigger mirrors new `auth.users` into `public.users`.

## Demo vs. production

The demo reads the seeded set from `src/data/demo.ts` (10 fictional Raleigh homes
+ a default buyer) — no database required. To go live, seed `properties` via the
service role and point `PropertyDataProvider` at Supabase (or a licensed MLS feed);
the UI and engine are unchanged.
