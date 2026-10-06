import type { Cardinal8, Strictness } from "./types";

export type ConstructionPref = "new" | "older" | "any";
export type RenovationTolerance = "low" | "moderate" | "high";
export type PoolPreference = "want" | "avoid" | "any";
export type Importance = "low" | "moderate" | "high";
export type GaragePref = "side_entry" | "front_entry" | "any" | "none_needed";

/** Priorities the user can rank — these reweight the Overall Match score. */
export type Priority =
  | "large_lot"
  | "privacy"
  | "orientation"
  | "value"
  | "commute"
  | "move_in_ready"
  | "renovation_upside";

export const PRIORITY_LABEL: Record<Priority, string> = {
  large_lot: "Large lot",
  privacy: "Privacy",
  orientation: "Vastu orientation",
  value: "Value / price",
  commute: "Short commute",
  move_in_ready: "Move-in ready",
  renovation_upside: "Renovation upside",
};

/** Hard dealbreakers — a violation heavily caps the Overall Match. */
export type Dealbreaker =
  | "poor_orientation"
  | "over_budget"
  | "over_commute"
  | "below_min_lot"
  | "bathroom_ne"
  | "brahmasthan_obstructed"
  | "t_junction";

export const DEALBREAKER_LABEL: Record<Dealbreaker, string> = {
  poor_orientation: "Poor home orientation",
  over_budget: "Over budget",
  over_commute: "Commute too long",
  below_min_lot: "Lot below minimum",
  bathroom_ne: "Bathroom in the northeast",
  brahmasthan_obstructed: "Obstructed center (Brahmasthan)",
  t_junction: "T-junction road approach",
};

export type BuyerProfile = {
  name: string;
  maxBudget: number;
  minBudget: number | null;
  minBeds: number;
  minBaths: number;
  minSqft: number;
  minLotAcres: number;
  preferredLotAcres: number | null;
  preferredAreas: string[];
  destinationLabel: string;
  destinationCoords: { lat: number; lng: number };
  maxDriveMinutes: number;
  preferredStyles: string[];
  constructionPref: ConstructionPref;
  renovationTolerance: RenovationTolerance;
  poolPreference: PoolPreference;
  privacyImportance: Importance;
  garagePref: GaragePref;
  priorities: Priority[];
};

export type VastuPreferences = {
  strictness: Strictness;
  acceptableFacings: Cardinal8[];
  preferredEntrance: Cardinal8 | null;
  openSpaceNEImportant: boolean;
  dealbreakers: Dealbreaker[];
};

export type UserPreferences = {
  profile: BuyerProfile;
  vastu: VastuPreferences;
};
