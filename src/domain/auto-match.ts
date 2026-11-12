import type { Property } from "./property";
import type { PropertyAnalysis } from "./scoring";
import type { Cardinal8 } from "./types";
import type { SavedSearch, FacingMode } from "./search";
import { matchesHard } from "./search";

/**
 * Auto-match engine: rank available inventory against a buyer's saved criteria,
 * with the home's FACING treated per the client's chosen mode.
 *
 *  - Non-facing hard requirements (budget, beds, baths, sqft, lot, commute) are
 *    always ENFORCED — a home that misses one is never surfaced.
 *  - Facing:
 *      "required"  → a home that doesn't face an acceptable direction (or whose
 *                    facing is unknown) is excluded.
 *      "preferred" → off-facing / unknown-facing homes still appear, but ranked
 *                    lower by a penalty, so acceptable-facing homes lead.
 *  - Ranking is by the deterministic overall score (facing-adjusted). Nothing is
 *    invented: a home with unknown facing is labeled as such, never assumed to fit.
 *
 * Pure and deterministic — unit-tested without any feed.
 */

export type FacingFit = "match" | "off" | "unknown" | "any";

export type AutoMatch = {
  property: Property;
  analysis: PropertyAnalysis;
  /** Facing-adjusted ranking score (0..100). */
  rankScore: number;
  facingFit: FacingFit;
};

export type ScoredCandidate = { property: Property; analysis: PropertyAnalysis };

// Ranking penalties when facing is a preference, not a hard cutoff.
const OFF_FACING_PENALTY = 18;
const UNKNOWN_FACING_PENALTY = 10;

/** How a home's facing relates to the buyer's acceptable set. */
export function facingFit(acceptable: Cardinal8[], facing: Cardinal8 | null): FacingFit {
  if (acceptable.length === 0) return "any";
  if (facing == null) return "unknown";
  return acceptable.includes(facing) ? "match" : "off";
}

/** The same hard criteria with the facing constraint removed (mode handles it). */
function withoutFacingConstraint(s: SavedSearch): SavedSearch {
  return { ...s, hard: { ...s.hard, acceptableFacings: [] } };
}

export function autoMatch(
  search: SavedSearch,
  candidates: ScoredCandidate[],
  opts?: { facingMode?: FacingMode; limit?: number },
): AutoMatch[] {
  const mode: FacingMode = opts?.facingMode ?? search.facingMode ?? "required";
  const base = withoutFacingConstraint(search);
  const acceptable = search.hard.acceptableFacings;

  const out: AutoMatch[] = [];
  for (const { property, analysis } of candidates) {
    const facing = property.vastu.facingDirection.value;
    // Enforce every non-facing hard requirement.
    if (!matchesHard(base, property, facing)) continue;

    const fit = facingFit(acceptable, facing);
    if (mode === "required" && (fit === "off" || fit === "unknown")) continue;

    let rank = analysis.scores.overall;
    if (mode === "preferred") {
      if (fit === "off") rank -= OFF_FACING_PENALTY;
      else if (fit === "unknown") rank -= UNKNOWN_FACING_PENALTY;
    }
    out.push({ property, analysis, rankScore: Math.max(0, Math.min(100, Math.round(rank))), facingFit: fit });
  }

  out.sort((a, b) => b.rankScore - a.rankScore || a.property.id.localeCompare(b.property.id));
  return opts?.limit != null ? out.slice(0, opts.limit) : out;
}

export const FACING_FIT_LABEL: Record<FacingFit, string> = {
  match: "Facing match",
  off: "Off preferred facing",
  unknown: "Facing to confirm",
  any: "Any facing",
};
