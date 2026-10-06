import type {
  Correctability,
  FindingStatus,
  Severity,
  VerificationStatus,
} from "@/domain/types";
import type { VerdictLevel } from "@/domain/scoring";

/** Tone names align with the Badge variants in ui/primitives. */
export type Tone =
  | "neutral"
  | "forest"
  | "sage"
  | "gold"
  | "strong"
  | "good"
  | "caution"
  | "concern"
  | "info";

export function scoreTone(score: number): Tone {
  if (score >= 85) return "strong";
  if (score >= 72) return "good";
  if (score >= 58) return "caution";
  return "concern";
}

/** Hex for SVG stroke (score ring). Mirrors scoreTone. */
export function scoreColor(score: number): string {
  if (score >= 85) return "var(--color-strong)";
  if (score >= 72) return "var(--color-good)";
  if (score >= 58) return "var(--color-caution)";
  return "var(--color-concern)";
}

export const FINDING_TONE: Record<FindingStatus, Tone> = {
  strong: "strong",
  favorable: "good",
  neutral: "neutral",
  consideration: "caution",
  concern: "concern",
};

export const FINDING_LABEL: Record<FindingStatus, string> = {
  strong: "Strong",
  favorable: "Favorable",
  neutral: "Neutral",
  consideration: "Consideration",
  concern: "Concern",
};

export const VERIFICATION_TONE: Record<VerificationStatus, Tone> = {
  verified: "strong",
  likely: "good",
  needs_verification: "caution",
  potential_concern: "concern",
};

export const CORRECTABILITY_TONE: Record<Correctability, Tone> = {
  easy: "strong",
  moderate: "good",
  major_structural: "caution",
  not_practical: "concern",
};

export const CORRECTABILITY_LABEL: Record<Correctability, string> = {
  easy: "Easy Fix",
  moderate: "Moderate Fix",
  major_structural: "Major Structural",
  not_practical: "Not Practical",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  none: "No issue",
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
};

export const VERDICT_TONE: Record<VerdictLevel, Tone> = {
  strong_match: "strong",
  good_with_concerns: "good",
  mixed: "caution",
  pass: "concern",
};

export const VERDICT_SHORT: Record<VerdictLevel, string> = {
  strong_match: "Strong Match",
  good_with_concerns: "Good Match",
  mixed: "Worth a Look",
  pass: "Pass",
};
