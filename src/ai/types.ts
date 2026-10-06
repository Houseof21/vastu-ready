import type { Property } from "@/domain/property";
import type { UserPreferences } from "@/domain/profile";
import type { PropertyAnalysis } from "@/domain/scoring";

/**
 * AI provider abstraction. The AI explains and compares; the deterministic
 * engine computes the scores. The AI must never present inferred data as
 * verified fact — it is given the per-category verification status and must
 * phrase accordingly.
 */

export type RecommendationContext = {
  property: Property;
  analysis: PropertyAnalysis;
  prefs: UserPreferences;
};

export type CompareContext = {
  items: { property: Property; analysis: PropertyAnalysis }[];
  prefs: UserPreferences;
};

export type AIRecommendation = {
  headline: string;
  reasoning: string[];
  provider: string;
  isMock: boolean;
};

export type AICompareResult = {
  pickPropertyId: string | null;
  reasoning: string[];
  provider: string;
  isMock: boolean;
};

export interface AIProvider {
  readonly id: string;
  readonly isMock: boolean;
  generateRecommendation(ctx: RecommendationContext): Promise<AIRecommendation>;
  compareProperties(ctx: CompareContext): Promise<AICompareResult>;
}
