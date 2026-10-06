import type {
  Cardinal8,
  DataSource,
  VastuAttribute,
  VerificationStatus,
  Zone,
} from "./types";

export const DIRECTION_LABEL: Record<Cardinal8, string> = {
  N: "North",
  NE: "Northeast",
  E: "East",
  SE: "Southeast",
  S: "South",
  SW: "Southwest",
  W: "West",
  NW: "Northwest",
};

export function zoneLabel(zone: Zone): string {
  return zone === "CENTER" ? "Center (Brahmasthan)" : DIRECTION_LABEL[zone];
}

/**
 * Favorability (0..100) of a facing/entrance direction under the Vastu Ready
 * balanced methodology. North/Northeast/East are most favored; South/Southwest
 * carry the most considerations. This is a cultural/traditional framework, not
 * a prediction of outcomes.
 */
export const FACING_FAVORABILITY: Record<Cardinal8, number> = {
  NE: 95,
  N: 88,
  E: 88,
  NW: 72,
  W: 64,
  SE: 60,
  S: 52,
  SW: 46,
};

/** Clamp helper shared across the engine. */
export function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Derive how much to trust an attribute from its source + confidence.
 * A null value is always "needs verification" (we never guess a fact).
 */
export function verificationOf<T>(attr: VastuAttribute<T>): VerificationStatus {
  if (attr.value == null) return "needs_verification";
  const strongSources: DataSource[] = ["mls", "manual", "floorplan"];
  if (attr.confidence >= 0.88 && strongSources.includes(attr.source)) return "verified";
  if (attr.confidence >= 0.62) return "likely";
  return "needs_verification";
}

export const SOURCE_LABEL: Record<DataSource, string> = {
  mls: "MLS listing",
  floorplan: "Floor plan",
  satellite: "Satellite imagery",
  inference: "AI inference",
  manual: "Manually entered",
  unknown: "Unknown",
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  likely: "Likely",
  needs_verification: "Needs verification",
  potential_concern: "Potential concern",
};
