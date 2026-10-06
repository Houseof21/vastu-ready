# Vastu Ready — Scoring methodology

All scoring is **deterministic**: no randomness, no time, no IO, no LLM. The same
inputs always produce the same scores, which makes results reproducible and
auditable. Versions are stamped on every analysis (`methodology_version`,
`scoring_version`).

Scores are integers 0–100. Higher is better. A score is always shown with a label
or numeral — meaning never depends on color alone.

## The four scores

| Score | What it measures | Source |
|------|------------------|--------|
| **Vastu** | Alignment with Vastu principles | `domain/vastu/engine.ts` |
| **Personal Match** | Fit with the buyer's practical needs | `personalMatch()` |
| **Value** | Price vs. estimated fair value | `valueScore()` |
| **Overall Match** | Weighted blend, capped by dealbreakers | `overallScore()` |

### Vastu score

Nine weighted categories (weights sum to 1.0):

| Category | Weight | Ideal |
|---|---|---|
| Entrance & Orientation | 0.22 | NE/N/E facing |
| Lot | 0.18 | Regular shape, NE open, no T-junction |
| Kitchen | 0.12 | SE (agni), NW secondary |
| Primary Bedroom | 0.12 | SW |
| Bathrooms | 0.10 | NW/W/S; flag NE & center |
| Brahmasthan (center) | 0.10 | Open |
| Staircase | 0.06 | SW/S/W |
| Garage | 0.05 | NW/SE |
| Water | 0.05 | NE |

Each category yields a raw score, a `finding_status`, a `severity`, a
`verification` status (from the data's confidence/source), and — where it's a
concern — a `correctability`.

**Strictness** widens or narrows deviation from a neutral baseline (70):
`score = 70 + (raw − 70) × m`, where `m = 1.25` (strict), `1.0` (balanced),
`0.8` (flexible). Strict is more opinionated in *both* directions: it rewards
ideal placement more and penalizes poor placement more.

### Correctability score

A differentiator. Each concern is classified `easy | moderate | major_structural |
not_practical`, weighted `100 / 60 / 28 / 5`. The correctability score is the
average over concern categories (100 when there are no concerns). It tells a buyer
how practical it is to *fix* a home's issues — an easy, low-cost fix is very
different from a structural one.

### Personal Match

```
personal = 0.22·budgetFit + 0.18·sizeFit + 0.18·lotFit
         + 0.14·commuteFit + 0.28·lifestyleFit
```
`lifestyleFit` blends style, construction preference, renovation tolerance, pool,
privacy, and garage preferences.

### Value

```
value = 82 − ((price − estimatedValue) / estimatedValue) × 180  (+3 if ≥1 acre)
```
A home priced under its estimate scores above 82; an overpriced home drops fast.
(`estimatedValue` is a comps stand-in in the demo.)

### Overall Match — **not an average**

```
overall = vastu·w_v + personal·w_p + value·w_val
```
Base weights `0.33 / 0.37 / 0.30` are nudged by the buyer's **priorities**
(e.g. an `orientation` priority adds weight to Vastu) and renormalized.

Then two caps apply. **Unmet stated requirements** (see below) cap the result at
`84 − (k−1)·5` for `k` constraints — so a home that misses something the buyer
asked for can never read as a "Strong Match". **Dealbreakers** cap much harder:
with `n` violations, `overall = min(overall, 54 − (n−1)·4)`, and any violation
produces a **Pass** verdict.

### Stated requirements (constraints)

A buyer's stated maximum or minimum is a real constraint, not a suggestion.
`detectConstraints` flags a home that is over budget, over the max commute, below
the minimum lot, or below the minimum beds/baths/sqft (when that isn't already a
hard dealbreaker). Each constraint is shown prominently on the report and keeps
the home out of "Strong Match." This is what prevents, e.g., a 24-minute commute
from scoring "Strong Match" against a 20-minute maximum.

## Verdicts

| Level | Condition |
|---|---|
| **Pass** | any dealbreaker violation, or overall < 58 |
| **Worth a Look** (mixed) | 58–71, no violations |
| **Good Match** | 72–84, no violations (and any home missing a stated requirement) |
| **Strong Match** | ≥ 85, no violations, all stated requirements met |

## Evidence & transparency

Every Vastu category carries its **sources** (each underlying datum's value,
source, and confidence), a plain-language **scoring rule**, and the **ideal** —
all surfaced in the report's per-category evidence drawer. Nothing is labeled
"Verified" without that evidence shown beside it. The **Value** score is backed
by **comparable sales** displayed in the report; the estimate is bracketed by
those comps rather than asserted. Manually-entered homes have no comps, so their
Value is explicitly presented as "based on your estimate — confirm against recent
sales."

## Why this is trustworthy

- Pure functions → unit-tested for determinism, range, monotonicity, and the
  dealbreaker cap (`tests/scoring.test.ts`).
- Provenance in, provenance out: a category built on inferred data is labeled
  `needs_verification`, and that label flows all the way to the recommendation
  prose.
- Vastu is treated as a cultural/traditional framework — **scores reflect
  alignment with those principles and the buyer's preferences, not a prediction
  of financial, health, or life outcomes.**
