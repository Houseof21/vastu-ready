"use client";

import * as React from "react";
import { DEMO_PROPERTIES, DEMO_PREFERENCES } from "@/data/demo";
import { analyzeProperty, type PropertyAnalysis } from "@/domain/scoring";
import type { Property } from "@/domain/property";
import type { UserPreferences } from "@/domain/profile";
import { useUserState } from "@/components/providers/user-state";
import { DEMO_ANALYZED_AT } from "@/lib/demo-analysis";

export type Scored = { property: Property; analysis: PropertyAnalysis };

/** The buyer's active preferences (their saved edits, or the demo default). */
export function usePreferences(): UserPreferences {
  const { preferences } = useUserState();
  return preferences ?? DEMO_PREFERENCES;
}

export function useHasCustomPreferences(): boolean {
  const { preferences } = useUserState();
  return preferences != null;
}

/** Demo catalog + the buyer's manually-entered homes. */
export function useAllProperties(): Property[] {
  const { properties } = useUserState();
  return React.useMemo(() => [...Object.values(properties), ...DEMO_PROPERTIES], [properties]);
}

function analyzedAt(p: Property): string {
  return p.createdAt ? new Date(p.createdAt).toISOString() : DEMO_ANALYZED_AT;
}

function score(p: Property, prefs: UserPreferences): Scored {
  return { property: p, analysis: analyzeProperty(p, prefs, analyzedAt(p)) };
}

/** Every property scored against current preferences, ranked by overall. */
export function useScoredFeed(): Scored[] {
  const prefs = usePreferences();
  const all = useAllProperties();
  return React.useMemo(
    () => all.map((p) => score(p, prefs)).sort((a, b) => b.analysis.scores.overall - a.analysis.scores.overall),
    [all, prefs],
  );
}

export function useScoredProperty(id: string): Scored | null {
  const prefs = usePreferences();
  const all = useAllProperties();
  return React.useMemo(() => {
    const p = all.find((x) => x.id === id);
    return p ? score(p, prefs) : null;
  }, [all, id, prefs]);
}

export function useScoredForIds(ids: string[]): Scored[] {
  const prefs = usePreferences();
  const all = useAllProperties();
  return React.useMemo(() => {
    return ids
      .map((id) => all.find((x) => x.id === id))
      .filter((p): p is Property => p != null)
      .map((p) => score(p, prefs));
  }, [all, ids, prefs]);
}
