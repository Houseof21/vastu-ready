import { analyzeVastu } from "./vastu/engine";
import { clamp, FACING_FAVORABILITY } from "./directions";
import type { Property } from "./property";
import {
  DEALBREAKER_LABEL,
  type BuyerProfile,
  type Dealbreaker,
  type Priority,
  type UserPreferences,
} from "./profile";
import type { VastuAnalysis } from "./types";

export const SCORING_VERSION = "scoring-1.0.0";

export type PropertyScores = {
  vastu: number;
  personalMatch: number;
  value: number;
  overall: number;
};

export type VerdictLevel = "strong_match" | "good_with_concerns" | "mixed" | "pass";

export type Verdict = {
  level: VerdictLevel;
  headline: string;
};

export type Violation = { dealbreaker: Dealbreaker; detail: string };

/** A stated hard requirement the home misses (not necessarily a dealbreaker). */
export type ConstraintKey =
  | "over_budget"
  | "over_commute"
  | "below_min_lot"
  | "below_min_beds"
  | "below_min_baths"
  | "below_min_sqft";
export type Constraint = { key: ConstraintKey; detail: string };

export const CONSTRAINT_LABEL: Record<ConstraintKey, string> = {
  over_budget: "Over budget",
  over_commute: "Commute too long",
  below_min_lot: "Lot below minimum",
  below_min_beds: "Too few beds",
  below_min_baths: "Too few baths",
  below_min_sqft: "Below minimum size",
};

export type PropertyAnalysis = {
  propertyId: string;
  scores: PropertyScores;
  verdict: Verdict;
  vastu: VastuAnalysis;
  correctabilityScore: number;
  violations: Violation[];
  /** Stated requirements the home fails (caps it out of "Strong Match"). */
  constraints: Constraint[];
  createdAt: string;
  scoringVersion: string;
};

const round = (n: number) => Math.round(clamp(n));

// ---- Personal Match ---------------------------------------------------------

function budgetFit(p: Property, b: BuyerProfile): number {
  if (p.price <= b.maxBudget) {
    if (b.minBudget != null && p.price < b.minBudget) return 86;
    return 100;
  }
  const over = (p.price - b.maxBudget) / b.maxBudget;
  return clamp(100 - over * 400);
}

function sizeFit(p: Property, b: BuyerProfile): number {
  const sub = (val: number, min: number) => (val >= min ? 100 : clamp((val / min) * 100 - 15));
  return (sub(p.beds, b.minBeds) + sub(p.baths, b.minBaths) + sub(p.sqft, b.minSqft)) / 3;
}

function lotFit(p: Property, b: BuyerProfile): number {
  const pref = b.preferredLotAcres ?? b.minLotAcres;
  if (p.lotAcres >= pref) return 100;
  if (p.lotAcres >= b.minLotAcres) {
    const span = Math.max(0.0001, pref - b.minLotAcres);
    return clamp(78 + ((p.lotAcres - b.minLotAcres) / span) * 22);
  }
  return clamp((p.lotAcres / b.minLotAcres) * 78);
}

function commuteFit(p: Property, b: BuyerProfile): number {
  if (p.driveMinutes == null) return 70;
  if (p.driveMinutes <= b.maxDriveMinutes) {
    return clamp(88 + (1 - p.driveMinutes / b.maxDriveMinutes) * 12);
  }
  return clamp(88 - ((p.driveMinutes - b.maxDriveMinutes) / b.maxDriveMinutes) * 120);
}

function lifestyleFit(p: Property, b: BuyerProfile): number {
  const styleFit = b.preferredStyles.some((s) =>
    p.style.toLowerCase().includes(s.toLowerCase()),
  )
    ? 100
    : b.preferredStyles.length === 0
      ? 85
      : 70;

  let constructionFit: number;
  if (b.constructionPref === "any") constructionFit = 90;
  else if (b.constructionPref === "new") constructionFit = p.newConstruction ? 100 : 66;
  else constructionFit = p.newConstruction ? 66 : 100;
  if (b.renovationTolerance === "high") constructionFit = Math.max(constructionFit, 82);

  let poolFit: number;
  if (b.poolPreference === "any") poolFit = 90;
  else if (b.poolPreference === "want") poolFit = p.pool ? 100 : 62;
  else poolFit = p.pool ? 58 : 100;

  const privacyFit =
    b.privacyImportance === "high"
      ? p.privacy === "high"
        ? 100
        : p.privacy === "moderate"
          ? 72
          : 45
      : b.privacyImportance === "moderate"
        ? p.privacy === "high"
          ? 96
          : p.privacy === "moderate"
            ? 85
            : 66
        : 90;

  let garageFit: number;
  if (b.garagePref === "any" || b.garagePref === "none_needed") garageFit = 90;
  else if (b.garagePref === "side_entry")
    garageFit = p.garageType === "side_entry" ? 100 : p.garageType === "front_entry" ? 68 : 60;
  else garageFit = p.garageType === "front_entry" ? 100 : 80;

  return (styleFit + constructionFit + poolFit + privacyFit + garageFit) / 5;
}

export function personalMatch(p: Property, b: BuyerProfile): number {
  return round(
    0.22 * budgetFit(p, b) +
      0.18 * sizeFit(p, b) +
      0.18 * lotFit(p, b) +
      0.14 * commuteFit(p, b) +
      0.28 * lifestyleFit(p, b),
  );
}

// ---- Value ------------------------------------------------------------------

export function valueScore(p: Property): number {
  const diff = (p.price - p.estimatedValue) / p.estimatedValue;
  let v = 82 - diff * 180;
  if (p.lotAcres >= 1) v += 3;
  return round(v);
}

// ---- Dealbreakers -----------------------------------------------------------

export function detectViolations(p: Property, prefs: UserPreferences): Violation[] {
  const out: Violation[] = [];
  const facing = p.vastu.facingDirection.value;
  const baths = p.vastu.bathroomZones.value ?? [];
  const road = p.vastu.roadPosition.value;
  const brahm = p.vastu.brahmasthan.value;

  for (const db of prefs.vastu.dealbreakers) {
    const add = (detail: string) => out.push({ dealbreaker: db, detail });
    switch (db) {
      case "poor_orientation":
        // Only flag when facing is confirmed (never penalize on unknown data).
        if (facing && (!prefs.vastu.acceptableFacings.includes(facing) || FACING_FAVORABILITY[facing] < 55))
          add(`Faces ${facing}, outside your acceptable orientations.`);
        break;
      case "over_budget":
        if (p.price > prefs.profile.maxBudget) add("Priced above your maximum budget.");
        break;
      case "over_commute":
        if (p.driveMinutes != null && p.driveMinutes > prefs.profile.maxDriveMinutes)
          add("Commute exceeds your maximum.");
        break;
      case "below_min_lot":
        if (p.lotAcres < prefs.profile.minLotAcres) add("Lot is below your minimum size.");
        break;
      case "bathroom_ne":
        if (baths.includes("NE")) add("A bathroom sits in the northeast.");
        break;
      case "brahmasthan_obstructed":
        if (brahm === "obstructed") add("The center of the home appears obstructed.");
        break;
      case "t_junction":
        if (road === "t_junction") add("The home sits at a T-junction.");
        break;
    }
  }
  return out;
}

/**
 * Stated requirements the home fails. A buyer's stated maximum/minimum is a real
 * constraint: exceeding it can't read as a "Strong Match" even if other scores
 * are high. These are softer than dealbreakers (which force a Pass) — they cap
 * the verdict and surface as visible flags. Something already caught as a
 * dealbreaker isn't repeated here.
 */
export function detectConstraints(p: Property, prefs: UserPreferences): Constraint[] {
  const b = prefs.profile;
  const dbs = new Set(prefs.vastu.dealbreakers);
  const out: Constraint[] = [];
  if (!dbs.has("over_budget") && p.price > b.maxBudget)
    out.push({ key: "over_budget", detail: `Priced ${pct(p.price, b.maxBudget)} over your ${usd(b.maxBudget)} max.` });
  if (!dbs.has("over_commute") && p.driveMinutes != null && p.driveMinutes > b.maxDriveMinutes)
    out.push({ key: "over_commute", detail: `${p.driveMinutes}-min commute exceeds your ${b.maxDriveMinutes}-min limit.` });
  if (!dbs.has("below_min_lot") && p.lotAcres < b.minLotAcres)
    out.push({ key: "below_min_lot", detail: `${p.lotAcres.toFixed(2)}-ac lot is under your ${b.minLotAcres}-ac minimum.` });
  if (p.beds < b.minBeds)
    out.push({ key: "below_min_beds", detail: `${p.beds} beds is under your ${b.minBeds}-bed minimum.` });
  if (p.baths < b.minBaths)
    out.push({ key: "below_min_baths", detail: `${p.baths} baths is under your ${b.minBaths}-bath minimum.` });
  if (p.sqft < b.minSqft)
    out.push({ key: "below_min_sqft", detail: `${p.sqft.toLocaleString()} sq ft is under your ${b.minSqft.toLocaleString()} minimum.` });
  return out;
}

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
function pct(a: number, b: number): string {
  return `${Math.round(((a - b) / b) * 100)}%`;
}

/** Cap applied when a stated requirement is missed — keeps it out of "Strong". */
const CONSTRAINT_CAP = 84;

// ---- Overall (priority-weighted, dealbreaker-capped) ------------------------

function overallWeights(priorities: Priority[]): { vastu: number; personal: number; value: number } {
  const w = { vastu: 0.33, personal: 0.37, value: 0.3 };
  for (const pr of priorities) {
    if (pr === "orientation") w.vastu += 0.06;
    else if (pr === "value") w.value += 0.06;
    else w.personal += 0.035; // large_lot, privacy, commute, move_in_ready, renovation_upside
  }
  const sum = w.vastu + w.personal + w.value;
  return { vastu: w.vastu / sum, personal: w.personal / sum, value: w.value / sum };
}

export function overallScore(
  scores: Omit<PropertyScores, "overall">,
  profile: BuyerProfile,
  violations: Violation[],
  constraints: Constraint[] = [],
): number {
  const w = overallWeights(profile.priorities);
  let overall = scores.vastu * w.vastu + scores.personalMatch * w.personal + scores.value * w.value;
  // A missed stated requirement keeps it out of "Strong Match".
  if (constraints.length > 0) {
    overall = Math.min(overall, CONSTRAINT_CAP - (constraints.length - 1) * 5);
  }
  // A hard dealbreaker caps much harder (→ Pass).
  if (violations.length > 0) {
    overall = Math.min(overall, 54 - (violations.length - 1) * 4);
  }
  return round(overall);
}

function verdictFor(overall: number, violations: Violation[]): Verdict {
  // A hard dealbreaker is disqualifying by definition — the buyer told us so.
  if (violations.length > 0) {
    return { level: "pass", headline: "I'd Pass on This One" };
  }
  if (overall >= 85) return { level: "strong_match", headline: "Strong Match — I'd Tour This One" };
  if (overall >= 72) return { level: "good_with_concerns", headline: "Good Match — A Few Things to Verify" };
  if (overall >= 58) return { level: "mixed", headline: "Worth a Look — Notable Trade-offs" };
  return { level: "pass", headline: "I'd Pass on This One" };
}

// ---- Orchestrator -----------------------------------------------------------

export function analyzeProperty(
  p: Property,
  prefs: UserPreferences,
  createdAt: string,
): PropertyAnalysis {
  const vastu = analyzeVastu(p.vastu, prefs.vastu.strictness);
  const personal = personalMatch(p, prefs.profile);
  const value = valueScore(p);
  const violations = detectViolations(p, prefs);
  const constraints = detectConstraints(p, prefs);
  const overall = overallScore(
    { vastu: vastu.vastuScore, personalMatch: personal, value },
    prefs.profile,
    violations,
    constraints,
  );
  const verdict = verdictFor(overall, violations);

  return {
    propertyId: p.id,
    scores: { vastu: vastu.vastuScore, personalMatch: personal, value, overall },
    verdict,
    vastu,
    correctabilityScore: vastu.correctabilityScore,
    violations,
    constraints,
    createdAt,
    scoringVersion: SCORING_VERSION,
  };
}

export { DEALBREAKER_LABEL };
