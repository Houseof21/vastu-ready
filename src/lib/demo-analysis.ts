import { DEMO_PROPERTIES, DEMO_PREFERENCES, getDemoProperty } from "@/data/demo";
import { analyzeProperty, type PropertyAnalysis } from "@/domain/scoring";
import type { Property } from "@/domain/property";
import type { UserPreferences } from "@/domain/profile";

/**
 * Fixed analysis timestamp so the demo is deterministic across renders
 * (no hydration mismatch, reproducible scores).
 */
export const DEMO_ANALYZED_AT = "2026-01-01T00:00:00.000Z";

export type Scored = { property: Property; analysis: PropertyAnalysis };

export function scoreProperty(
  p: Property,
  prefs: UserPreferences = DEMO_PREFERENCES,
): Scored {
  return { property: p, analysis: analyzeProperty(p, prefs, DEMO_ANALYZED_AT) };
}

/** All demo properties scored and sorted by overall match (desc). */
export function scoredFeed(prefs: UserPreferences = DEMO_PREFERENCES): Scored[] {
  return DEMO_PROPERTIES.map((p) => scoreProperty(p, prefs)).sort(
    (a, b) => b.analysis.scores.overall - a.analysis.scores.overall,
  );
}

export function scoredById(id: string, prefs: UserPreferences = DEMO_PREFERENCES): Scored | null {
  const p = getDemoProperty(id);
  return p ? scoreProperty(p, prefs) : null;
}

export function scoredForIds(ids: string[], prefs: UserPreferences = DEMO_PREFERENCES): Scored[] {
  return ids
    .map((id) => scoredById(id, prefs))
    .filter((x): x is Scored => x != null);
}
