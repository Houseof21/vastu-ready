/**
 * Core domain types for Vastu Ready.
 *
 * TRUST PRINCIPLE (critical): the app must never present inferred data as
 * verified fact. Every meaningful property attribute is wrapped in a
 * `VastuAttribute` carrying value + confidence + source + verification status,
 * so the UI can always show how much to trust a finding.
 */

export type Cardinal8 = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type Zone = Cardinal8 | "CENTER";

export const CARDINALS: Cardinal8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Where a piece of property data came from. */
export type DataSource =
  | "mls"
  | "floorplan"
  | "satellite"
  | "inference"
  | "manual"
  | "demo"
  | "unknown";

/** How much to trust a finding (shown prominently in the UX). */
export type VerificationStatus =
  | "verified"
  | "likely"
  | "needs_verification"
  | "potential_concern";

/** Vastu quality of a finding (display language, never moral/guaranteeing). */
export type FindingStatus = "strong" | "favorable" | "neutral" | "consideration" | "concern";

export type Severity = "none" | "minor" | "moderate" | "major";

/** How realistically a Vastu issue can be corrected. */
export type Correctability = "easy" | "moderate" | "major_structural" | "not_practical";

export type Strictness = "flexible" | "balanced" | "strict";

/** A single property attribute with full provenance (the trust wrapper). */
export type VastuAttribute<T> = {
  value: T | null;
  /** 0..1 */
  confidence: number;
  source: DataSource;
};

export type LotShape = "regular" | "slightly_irregular" | "irregular" | "triangular";
export type RoadPosition =
  | "mid_block"
  | "cul_de_sac"
  | "corner"
  | "t_junction"
  | "dead_end";
export type Quality = "open" | "moderate" | "obstructed";
export type BrahmasthanCondition = "open" | "partial" | "obstructed" | "unknown";

export type WaterFeature = {
  kind: "pool" | "pond" | "fountain" | "creek";
  direction: Cardinal8 | null;
};

/** The Vastu-relevant physical characteristics of a property. */
export type PropertyVastu = {
  facingDirection: VastuAttribute<Cardinal8>;
  entranceDirection: VastuAttribute<Cardinal8>;
  lotShape: VastuAttribute<LotShape>;
  roadPosition: VastuAttribute<RoadPosition>;
  openSpaceNE: VastuAttribute<Quality>;
  kitchenZone: VastuAttribute<Zone>;
  primaryBedroomZone: VastuAttribute<Zone>;
  bathroomZones: VastuAttribute<Zone[]>;
  staircaseZone: VastuAttribute<Zone>;
  brahmasthan: VastuAttribute<BrahmasthanCondition>;
  garageZone: VastuAttribute<Zone>;
  waterFeatures: VastuAttribute<WaterFeature[]>;
};

export type VastuCategoryKey =
  | "entrance_orientation"
  | "lot"
  | "kitchen"
  | "primary_bedroom"
  | "bathrooms"
  | "brahmasthan"
  | "staircase"
  | "garage"
  | "water";

/** The provenance behind one finding — what it was based on and how sure. */
export type CategorySource = {
  label: string;
  value: string;
  source: DataSource;
  confidence: number; // 0..1
};

export type CategoryResult = {
  key: VastuCategoryKey;
  label: string;
  score: number; // 0..100
  findingStatus: FindingStatus;
  severity: Severity;
  verification: VerificationStatus;
  explanation: string;
  /** Null when there is no issue to correct. */
  correctability: Correctability | null;
  correctable: boolean;
  weight: number;
  /** Supporting evidence (sources + confidence) shown in the report. */
  sources: CategorySource[];
  /** Plain-language scoring rule for this category. */
  rule: string;
  /** The ideal placement/condition for this category, if applicable. */
  ideal: string | null;
};

export type VastuAnalysis = {
  vastuScore: number; // 0..100 weighted
  correctabilityScore: number; // 0..100 — how fixable the issues are
  categories: CategoryResult[];
  /** Methodology version so historical analyses stay reproducible. */
  methodologyVersion: string;
  strictness: Strictness;
};
