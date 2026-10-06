import type { HomeType, GarageType, PrivacyLevel } from "./property";
import type {
  ConstructionPref,
  RenovationTolerance,
  PoolPreference,
  GaragePref,
  Importance,
} from "./profile";
import type { Strictness } from "./types";

export const HOME_TYPE_LABEL: Record<HomeType, string> = {
  single_family: "Single-family",
  townhouse: "Townhouse",
  condo: "Condo",
  new_construction_plan: "New-construction plan",
};

export const GARAGE_TYPE_LABEL: Record<GarageType, string> = {
  side_entry: "Side-entry garage",
  front_entry: "Front-entry garage",
  detached: "Detached garage",
  none: "No garage",
};

export const PRIVACY_LABEL: Record<PrivacyLevel, string> = {
  high: "High privacy",
  moderate: "Moderate privacy",
  low: "Low privacy",
};

export const CONSTRUCTION_LABEL: Record<ConstructionPref, string> = {
  any: "No preference",
  new: "Prefer new construction",
  older: "Prefer established homes",
};

export const RENOVATION_LABEL: Record<RenovationTolerance, string> = {
  low: "Light updates ok",
  moderate: "Some renovation ok",
  high: "Major renovation ok",
};

export const POOL_LABEL: Record<PoolPreference, string> = {
  any: "No preference",
  want: "Would like a pool",
  avoid: "Prefer no pool",
};

export const GARAGE_PREF_LABEL: Record<GaragePref, string> = {
  side_entry: "Side-entry preferred",
  front_entry: "Front-entry ok",
  any: "No preference",
  none_needed: "Garage not needed",
};

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export const STRICTNESS_LABEL: Record<Strictness, string> = {
  flexible: "Flexible",
  balanced: "Balanced",
  strict: "Strict",
};

export const STRICTNESS_DESC: Record<Strictness, string> = {
  flexible: "Vastu is one factor among many; minor misalignments barely move the score.",
  balanced: "A measured weighting of Vastu alongside your practical priorities.",
  strict: "Traditional alignment matters a lot; deviations are penalized more.",
};
