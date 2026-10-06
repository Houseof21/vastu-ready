import type { Cardinal8 } from "./types";
import { CARDINALS } from "./types";

/**
 * Orientation math for Vastu Ready.
 *
 * CONVENTION (never reversed): "entrance-facing direction" is the direction a
 * person faces while standing INSIDE the home at the main entrance and looking
 * OUTSIDE through that entrance. We compute it from the *outward* vector — from
 * inside the home, through the doorway, toward outside — and the plan's north
 * reference. The direction a person faces while *entering* is the opposite of
 * this, and is only ever shown for clarity, never used for scoring.
 *
 * Compass bearings: 0° = N, 90° = E, 180° = S, 270° = W (clockwise).
 */

export type NorthType = "true" | "magnetic" | "grid" | "unknown";

export const NORTH_TYPE_LABEL: Record<NorthType, string> = {
  true: "True north",
  magnetic: "Magnetic north",
  grid: "Grid north",
  unknown: "North (type unspecified)",
};

/** Half-width (°) of each 8-way sector: a bearing within this of a boundary is ambiguous. */
export const SECTOR_HALF = 22.5;

/** Normalize to [0, 360). */
export function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Compass bearing of an outward vector drawn on the plan.
 *
 * Screen space has y increasing downward, so "up" on the plan is (0, -1).
 * `planNorthDeg` is the compass bearing that "up" on the (aligned/rotated) plan
 * points to — 0 when up = north. The on-screen angle is measured clockwise from
 * up, which maps directly onto compass convention.
 *
 * @param dx  outward vector x (screen right = +x)
 * @param dy  outward vector y (screen down = +y)
 * @param planNorthDeg  bearing that plan-up points to (default 0 = up is north)
 */
export function outwardBearing(dx: number, dy: number, planNorthDeg = 0): number | null {
  if (dx === 0 && dy === 0) return null;
  // atan2(east, up): up=(0,-1)→0°, right=(1,0)→90°, down=(0,1)→180°, left=(-1,0)→270°.
  const screenAngle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return normDeg(screenAngle + planNorthDeg);
}

/** Nearest 8-way compass direction for a bearing. */
export function bearingToCardinal8(deg: number): Cardinal8 {
  const idx = Math.round(normDeg(deg) / 45) % 8;
  return CARDINALS[idx]!;
}

/** Center bearing (°) of a cardinal direction. */
export function cardinalBearing(c: Cardinal8): number {
  return CARDINALS.indexOf(c) * 45;
}

/** Distance (°) from a bearing to the nearest sector boundary (boundaries at 22.5 + k·45). */
export function distanceToSectorBoundary(deg: number): number {
  const off = normDeg(deg + SECTOR_HALF) % 45; // 0 at a boundary
  return Math.min(off, 45 - off);
}

/**
 * Is this bearing close enough to a sector boundary that the 8-way direction is
 * ambiguous within the given uncertainty? When true, the cardinal could flip.
 */
export function isNearSectorBoundary(deg: number, uncertaintyDeg = SECTOR_HALF / 2): boolean {
  return distanceToSectorBoundary(deg) <= uncertaintyDeg;
}

/** The two candidate directions when a bearing (± uncertainty) straddles a boundary. */
export function candidateCardinals(deg: number, uncertaintyDeg: number): Cardinal8[] {
  const set = new Set<Cardinal8>([
    bearingToCardinal8(deg),
    bearingToCardinal8(deg - uncertaintyDeg),
    bearingToCardinal8(deg + uncertaintyDeg),
  ]);
  return [...set];
}

/** The direction faced while *entering* (opposite of facing). Display only. */
export function enteringBearing(facingBearing: number): number {
  return normDeg(facingBearing + 180);
}

/** Apply a declination (°) to convert magnetic → true (east declination positive). */
export function magneticToTrue(magneticBearing: number, declinationDeg: number): number {
  return normDeg(magneticBearing + declinationDeg);
}

export type OrientationSource = "manual" | "ai" | "inference" | "unknown";

/**
 * A resolved orientation estimate. `confirmed` is true ONLY when a person
 * confirmed it; AI/auto estimates are never confirmed. Keep machine estimates
 * and user-confirmed values distinct — never label an estimate "verified".
 */
export type OrientationEstimate = {
  /** Outward (inside→outside) compass bearing, or null if unknown. */
  bearingDeg: number | null;
  cardinal: Cardinal8 | null;
  northType: NorthType;
  /** ± degrees of uncertainty around the bearing. */
  uncertaintyDeg: number;
  /** True only when a person confirmed it. */
  confirmed: boolean;
  source: OrientationSource;
};

export function emptyEstimate(): OrientationEstimate {
  return {
    bearingDeg: null,
    cardinal: null,
    northType: "unknown",
    uncertaintyDeg: 0,
    confirmed: false,
    source: "unknown",
  };
}

/** Build an estimate from an outward vector + plan north, carrying uncertainty/provenance. */
export function estimateFromVector(
  dx: number,
  dy: number,
  planNorthDeg: number,
  opts: { northType?: NorthType; uncertaintyDeg?: number; confirmed?: boolean; source?: OrientationSource } = {},
): OrientationEstimate {
  const bearingDeg = outwardBearing(dx, dy, planNorthDeg);
  return {
    bearingDeg,
    cardinal: bearingDeg == null ? null : bearingToCardinal8(bearingDeg),
    northType: opts.northType ?? "unknown",
    uncertaintyDeg: opts.uncertaintyDeg ?? 0,
    confirmed: opts.confirmed ?? false,
    source: opts.source ?? "manual",
  };
}

/** Reasons an orientation needs confirmation before it can be trusted. */
export type NeedsConfirmationReason =
  | "no_north"
  | "no_entrance"
  | "documents_conflict"
  | "possibly_mirrored"
  | "footprint_unaligned"
  | "plat_only"
  | "near_sector_boundary";

export const NEEDS_CONFIRMATION_LABEL: Record<NeedsConfirmationReason, string> = {
  no_north: "North direction is missing or ambiguous",
  no_entrance: "The main entrance couldn't be identified",
  documents_conflict: "Uploaded documents disagree",
  possibly_mirrored: "The plan may be mirrored",
  footprint_unaligned: "The building footprint couldn't be aligned",
  plat_only: "The plat shows only parcel boundaries, not the home",
  near_sector_boundary: "The direction sits near a compass-sector boundary and could flip",
};

// ---------------------------------------------------------------------------
// Stored orientation record — every direction concept kept separate.
// ---------------------------------------------------------------------------

export type EvidenceKind = "floor_plan" | "plat_survey" | "aerial" | "property_map" | "map_screenshot";

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  floor_plan: "Floor plan",
  plat_survey: "Plat / survey",
  aerial: "Aerial imagery",
  property_map: "Property map",
  map_screenshot: "Map screenshot",
};

export type OrientationEvidence = {
  id: string;
  kind: EvidenceKind;
  name: string;
  /** image/PDF data URL (manual uploads) or a provider URL. */
  dataUrl: string | null;
  /** For plats: an actual built footprint vs a proposed one vs parcel-only. */
  footprint: "actual" | "proposed" | "parcel_only" | "unknown";
  note?: string;
};

export type OrientationActivity = {
  at: number;
  by: "buyer" | "realtor" | "system";
  action: string;
};

/**
 * The full orientation record for a property. Each direction concept is stored
 * independently and must never be conflated:
 *  - entranceFacing: the OUTWARD doorway bearing (the Vastu-relevant one).
 *  - entranceLocationZone: the ZONE of the home where the door sits.
 *  - buildingFrontage: the way the building's front elevation faces.
 *  - streetDirection: the bearing of the street the parcel fronts.
 *  - enteringDirection (derived): opposite of entranceFacing; display only.
 */
export type StoredOrientation = {
  entranceFacing: OrientationEstimate;
  entranceLocationZone: Cardinal8 | "CENTER" | null;
  buildingFrontage: Cardinal8 | null;
  streetDirection: Cardinal8 | null;
  /** The reference frame the bearing is expressed in. */
  northType: NorthType;
  /** Plan rotation the user confirmed: bearing that plan-up points to. */
  planNorthDeg: number | null;
  needsConfirmation: NeedsConfirmationReason[];
  evidence: OrientationEvidence[];
  activity: OrientationActivity[];
};

export function emptyOrientation(): StoredOrientation {
  return {
    entranceFacing: emptyEstimate(),
    entranceLocationZone: null,
    buildingFrontage: null,
    streetDirection: null,
    northType: "unknown",
    planNorthDeg: null,
    needsConfirmation: [],
    evidence: [],
    activity: [],
  };
}
