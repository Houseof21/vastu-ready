import type { Cardinal8, LotShape, Quality, RoadPosition, PropertyVastu, VastuAttribute } from "@/domain/types";
import type { StoredOrientation, NeedsConfirmationReason } from "@/domain/orientation";
import {
  bearingToCardinal8,
  isNearSectorBoundary,
  emptyEstimate,
} from "@/domain/orientation";
import {
  ringCentroid,
  nearestOnPaths,
  pathHeadingNear,
  mapBearing,
  frontageFromStreet,
  openSpaceByDirection,
  openSpaceQuality,
  classifyLotShape,
  ringAreaSqFt,
} from "./geometry";
import {
  geocode,
  parcelAtPoint,
  footprintForParcel,
  streetsNearParcel,
  aerialUrlForRing,
} from "./arcgis";

/**
 * Layer 1 of the orientation system: derive a home's EXTERIOR orientation from
 * county GIS — building footprint + parcel + street centerlines — with honest
 * confidence. This never fabricates the interior: entrance-facing is an estimate
 * (the street-facing façade) that a person confirms in the Orientation Studio,
 * and room zones are left unknown because no GIS layer carries them.
 */

export type GisDerived = {
  facing: Cardinal8;
  facingBearingDeg: number;
  frontage: Cardinal8;
  streetName: string | null;
  streetHeadingDeg: number | null;
  lotShape: LotShape;
  roadPosition: RoadPosition;
  openSpace: Record<Cardinal8, number>;
  openSpaceNE: Quality;
  snapDeg: number;
  elongation: number;
  streetDistanceFt: number;
  footprintAreaSqFt: number;
};

export type GisOrientationResult = {
  ok: boolean;
  stage: "geocode" | "parcel" | "footprint" | "complete";
  message: string;
  matchedAddress?: string;
  coords?: { lng: number; lat: number };
  parcel?: {
    siteAddress: string | null;
    city: string | null;
    zip: string | null;
    deedAcres: number | null;
    yearBuilt: number | null;
    heatedAreaSqft: number | null;
    assessedValue: number | null;
    typeUse: string | null;
  };
  derived?: GisDerived;
  orientation?: StoredOrientation;
  vastuExterior?: Pick<PropertyVastu, "facingDirection" | "lotShape" | "roadPosition" | "openSpaceNE">;
  aerialUrl?: string;
};

const sat = <T>(value: T | null, confidence: number): VastuAttribute<T> => ({
  value,
  confidence,
  source: "satellite",
});
const inferred = <T>(value: T | null, confidence: number): VastuAttribute<T> => ({
  value,
  confidence,
  source: "inference",
});

export async function deriveOrientationFromAddress(address: string): Promise<GisOrientationResult> {
  const geo = await geocode(address);
  if (!geo) {
    return { ok: false, stage: "geocode", message: "Address couldn't be geocoded." };
  }
  const parcel = await parcelAtPoint(geo.lng, geo.lat);
  if (!parcel || parcel.ring.length < 3) {
    return {
      ok: false,
      stage: "parcel",
      message:
        "No Wake County parcel found at that location. This proof of concept covers Wake County (Raleigh and nearby) only.",
      matchedAddress: geo.matchedAddress,
      coords: { lng: geo.lng, lat: geo.lat },
    };
  }
  // Footprint and streets both depend only on the parcel — fetch in parallel.
  const [footprint, streets] = await Promise.all([
    footprintForParcel(parcel.ring),
    streetsNearParcel(parcel.ring),
  ]);

  const parcelOut = {
    siteAddress: parcel.siteAddress,
    city: parcel.city,
    zip: parcel.zip,
    deedAcres: parcel.deedAcres,
    yearBuilt: parcel.yearBuilt,
    heatedAreaSqft: parcel.heatedAreaSqft,
    assessedValue: parcel.assessedValue,
    typeUse: parcel.typeUse,
  };

  if (!footprint || footprint.ring.length < 3) {
    return {
      ok: false,
      stage: "footprint",
      message:
        "Found the parcel but no building footprint on it (vacant lot, or the footprint isn't published). Lot facts are available; orientation needs a footprint.",
      matchedAddress: geo.matchedAddress,
      coords: { lng: geo.lng, lat: geo.lat },
      parcel: parcelOut,
      aerialUrl: aerialUrlForRing(parcel.ring),
    };
  }

  // --- Geometry -------------------------------------------------------------
  const allPaths = streets.flatMap((s) => s.paths);
  const centroid = ringCentroid(footprint.ring);
  const near = allPaths.length ? nearestOnPaths(centroid, allPaths) : null;

  // "Toward the street": prefer the nearest road centerline; fall back to the
  // vector from the building to the parcel centroid (the lot opens to the street).
  let towardStreet: number;
  let streetDistanceFt = Infinity;
  if (near) {
    towardStreet = mapBearing(near.point[0] - centroid[0], near.point[1] - centroid[1]);
    streetDistanceFt = Math.round(near.distance);
  } else {
    const pc = ringCentroid(parcel.ring);
    towardStreet = mapBearing(pc[0] - centroid[0], pc[1] - centroid[1]);
  }

  const frontage = frontageFromStreet(footprint.ring, towardStreet);
  const streetHeadingDeg = allPaths.length ? pathHeadingNear(centroid, allPaths) : null;
  const streetName = nearestStreetName(centroid, streets);
  const setbacks = openSpaceByDirection(parcel.ring, footprint.ring);
  const openNE = openSpaceQuality(setbacks, "NE");
  const lotShape = classifyLotShape(parcel.ring);
  const roadPosition = inferRoadPosition(streets);

  const derived: GisDerived = {
    facing: frontage.cardinal,
    facingBearingDeg: Math.round(frontage.bearingDeg),
    frontage: frontage.cardinal,
    streetName,
    streetHeadingDeg: streetHeadingDeg != null ? Math.round(streetHeadingDeg) : null,
    lotShape,
    roadPosition,
    openSpace: roundRecord(setbacks),
    openSpaceNE: openNE,
    snapDeg: Math.round(frontage.snapDeg),
    elongation: Math.round(frontage.elongation * 100) / 100,
    streetDistanceFt: Number.isFinite(streetDistanceFt) ? streetDistanceFt : -1,
    footprintAreaSqFt: Math.round(ringAreaSqFt(footprint.ring)),
  };

  // --- Honest confidence + flags -------------------------------------------
  const uncertaintyDeg = 12 + Math.min(30, frontage.snapDeg);
  const needs: NeedsConfirmationReason[] = ["no_entrance"]; // entrance is always inferred here
  if (frontage.snapDeg > 35) needs.push("footprint_unaligned");
  if (!near) needs.push("no_entrance"); // no road → weaker frontage
  if (isNearSectorBoundary(frontage.bearingDeg, uncertaintyDeg)) needs.push("near_sector_boundary");

  const orientation: StoredOrientation = {
    entranceFacing: {
      ...emptyEstimate(),
      bearingDeg: frontage.bearingDeg,
      cardinal: frontage.cardinal,
      northType: "true", // SP grid north ≈ true north in Wake (< 0.25°)
      uncertaintyDeg,
      confirmed: false,
      source: "gis",
    },
    entranceLocationZone: null, // which zone the door sits in needs a floor plan
    buildingFrontage: frontage.cardinal,
    streetDirection: streetHeadingDeg != null ? bearingToCardinal8(streetHeadingDeg) : null,
    northType: "true",
    planNorthDeg: 0,
    needsConfirmation: Array.from(new Set(needs)),
    evidence: [
      {
        id: "gis-footprint",
        kind: "property_map",
        name: "County building footprint + parcel (Wake GIS)",
        dataUrl: aerialUrlForRing(parcel.ring),
        footprint: "actual",
        note: `Street-facing façade derived from footprint vs. ${streetName ?? "nearest street"}.`,
      },
    ],
    activity: [
      {
        at: Date.now(),
        by: "system",
        action: "Derived exterior orientation from county GIS (footprint + parcel + street)",
      },
    ],
  };

  const vastuExterior = {
    facingDirection: sat<Cardinal8>(frontage.cardinal, 0.62),
    lotShape: sat<LotShape>(lotShape, 0.7),
    roadPosition: inferred<RoadPosition>(roadPosition, 0.55),
    openSpaceNE: sat<Quality>(openNE, 0.5),
  };

  return {
    ok: true,
    stage: "complete",
    message: "Exterior orientation derived from county GIS. Entrance-facing is an estimate — confirm per home.",
    matchedAddress: geo.matchedAddress,
    coords: { lng: geo.lng, lat: geo.lat },
    parcel: parcelOut,
    derived,
    orientation,
    vastuExterior,
    aerialUrl: aerialUrlForRing(parcel.ring),
  };
}

function roundRecord(r: Record<Cardinal8, number>): Record<Cardinal8, number> {
  const out = {} as Record<Cardinal8, number>;
  (Object.keys(r) as Cardinal8[]).forEach((k) => (out[k] = Math.round(r[k])));
  return out;
}

function nearestStreetName(centroid: [number, number], streets: { name: string | null; paths: [number, number][][] }[]): string | null {
  let best: { name: string | null; dist: number } | null = null;
  for (const s of streets) {
    const n = nearestOnPaths(centroid, s.paths);
    if (n && (!best || n.distance < best.dist)) best = { name: s.name, dist: n.distance };
  }
  return best?.name ?? null;
}

function inferRoadPosition(streets: { name: string | null }[]): RoadPosition {
  const names = new Set(streets.map((s) => (s.name ?? "").trim().toUpperCase()).filter(Boolean));
  if (names.size >= 2) return "corner";
  return "mid_block";
}
