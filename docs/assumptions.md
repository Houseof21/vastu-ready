# Vastu Ready — Assumptions & decisions

Documented so they're easy to revisit as the product grows.

## Product scope
- **MVP = Raleigh, NC + Vastu only**, but market and framework are behind
  interfaces/config (`config/brand.ts`, the provider resolvers) so more can be
  added without UI changes.
- The app is a **discovery advisor**, not a Vastu calculator: the headline output
  is a verdict + reasoning, not a raw number.

## Trust & ethics (non-negotiable)
- **Never present inferred data as verified fact.** Every datum carries
  confidence + source; every finding carries a verification status, surfaced in
  the UI and in the AI prose.
- **Vastu is a cultural/traditional framework.** Scores reflect alignment with
  Vastu principles and the buyer's stated preferences — explicitly **not** a
  prediction of financial, health, or life outcomes. This disclaimer appears in
  the footer and on the landing page.
- **No scraping.** Listing-URL ingestion is a stub that explains a licensed MLS/
  data feed is required and hands off to manual entry. We never fabricate a real
  home's details or lot geometry; unknown geometry is drawn as "Approximate —
  requires verification."

## Scoring
- Weights, zone favorability maps, and the strictness multiplier are first-pass
  expert heuristics (see `docs/scoring.md`), chosen to be reasonable and legible,
  and version-stamped so they can evolve without silently changing history.
- `estimatedValue` stands in for a comps/AVM feed in the demo.
- A hard dealbreaker ⇒ **Pass** verdict (a dealbreaker is disqualifying by
  definition), while still storing a capped overall so the home can appear in
  comparisons.
- Overall Match is priority-weighted and dealbreaker-capped — deliberately **not**
  a simple average.

## Data / demo
- 10 **fictional** Raleigh-area homes with synthetic addresses; the build never
  misrepresents a real listing. Distribution spans all four verdict tiers
  (2 strong + 2 strong-with-flags, 2 good, 2 worth-a-look, 2 pass) so the demo
  exercises the full range.
- `p-marshfern` is the **low-verification showcase**: several zones are unknown/
  inferred, so it reads "strong match, but verify these details" — demonstrating
  the trust model.
- Default demo buyer: $1.2M budget, North Hills commute ≤ 20 min, 4+ beds,
  3000+ sqft, 0.5+ acre (1+ preferred), N/NE/E facing, large-lot + privacy +
  orientation priorities, high renovation tolerance, side-entry garage, Balanced
  strictness, hard dealbreaker = poor orientation.

## Persistence / auth
- Supabase is **optional**. Unconfigured ⇒ saved/feedback/compare live in a
  localStorage-backed external store; auth screens are demo flows that route into
  the app without creating a real account.
- Only the **publishable anon key** is ever used client-side; secrets are guarded
  by `serverSecret()` which throws if called in the browser.

## Technical
- Next 16 request APIs (`params`, `cookies()`) are async and awaited.
- Google Fonts is blocked in this environment, so fonts are **self-hosted** via
  `@fontsource-variable/*`.
- Property detail pages are statically generated (`generateStaticParams`) from the
  deterministic demo data.
- Images in the demo are deterministic architectural placeholders — **no real
  listing photos** — consistent with the honesty principle.

## Manual analysis, preferences & trust (v1 of the buyer flow)
- **Manual entry** (`/analyze/manual`) is a full multi-step form: home facts,
  orientation with an explicit North-confirmation step, a distinct entrance
  direction (the way you face looking out, separate from the building's facing),
  an optional floor-plan upload with preview, and room/lot locations with
  **"Unknown" allowed everywhere** — nothing is inferred to fill gaps. The review
  step lets the buyer correct anything before generating. Automated floor-plan
  extraction is not available, so rooms are confirmed manually (no unlabeled
  machine guesses). Reports persist in the store and can be reopened, edited,
  recalculated, saved, and compared. Creation routes through
  `PropertyDataProvider.fromManualEntry` — the integration boundary is intact and
  there is no scraping.
- **Preferences** are an editable, validated form persisted to the store, and
  scoring runs against them everywhere (feed, reports, compare) via a shared
  client layer — so edits re-rank live. A stated maximum/minimum is **enforced**:
  missing it caps a home out of "Strong Match" and shows as a flag (fixes the
  24-minute-commute bug).
- **Trust**: each finding shows its evidence (source + confidence), scoring rule,
  and ideal; "Verified" never appears without that evidence. Value is backed by
  comparable sales. The fictional-data disclosure is a banner on the feed and
  every demo report, not just the footer.
- Scoring moved to a shared **client** layer so stored preferences apply
  everywhere; the engine stays pure/deterministic. Supabase remains the
  production seam (same shapes).

## Known gaps / next steps
- Wire persistence (preferences + manual properties + feedback/compare) to
  Supabase; seed the catalog via the service role.
- Real AI adapter behind `AIProvider` (Anthropic/OpenAI); mock stays as fallback.
- Real maps adapter (Mapbox/Google) behind `MapsProvider`; real comps/AVM feed.
- Floor-plan OCR/auto-zone-detection (would surface as clearly-labeled,
  unconfirmed suggestions the buyer confirms).
- Stripe gating on `account_tier`; "Vastu Ready Verified" badge issuance.
