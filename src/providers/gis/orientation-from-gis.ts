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
  footprintNearPoint,
  project4326to3857,
  WEB_MERCATOR_SR,
  type GeocodeResult,
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
  /** Which data tier produced this: full county (Wake) or national footprint-only. */
  coverage?: "wake" | "national";
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
    // Outside the full-fidelity county coverage — fall back to the national
    // footprint-only path (facing from the building footprint + geocode point).
    return deriveNationalOrientation(geo);
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
    message:
      "Exterior orientation derived from county GIS. Entrance-facing is an estimate — confirm per home." +
      (parcel.approxMatch
        ? " (The geocode landed just off the lot, so we snapped to the nearest parcel — verify it's the right home.)"
        : ""),
    matchedAddress: geo.matchedAddress,
    coords: { lng: geo.lng, lat: geo.lat },
    parcel: parcelOut,
    derived,
    orientation,
    vastuExterior,
    aerialUrl: aerialUrlForRing(parcel.ring),
    coverage: "wake",
  };
}

/**
 * National fallback: derive facing from the FEMA/USA-Structures footprint and the
 * street-interpolated geocode point (no parcels or county streets). Lower
 * fidelity — lot shape, road position, and open-space stay unknown, and the
 * uncertainty is wider — but it works anywhere in the US. Still an estimate to
 * confirm; nothing is fabricated.
 */
async function deriveNationalOrientation(geo: GeocodeResult): Promise<GisOrientationResult> {
  const fp = await footprintNearPoint(geo.lng, geo.lat);
  if (!fp || fp.ring.length < 3) {
    return {
      ok: false,
      stage: "footprint",
      message:
        "No building footprint found near that address in the national dataset. Try a more specific address, or add county coverage for this area.",
      matchedAddress: geo.matchedAddress,
      coords: { lng: geo.lng, lat: geo.lat },
    };
  }
  const centroid = ringCentroid(fp.ring);
  const pt = project4326to3857(geo.lng, geo.lat); // same CRS as the footprint (3857)
  const towardStreet = mapBearing(pt[0] - centroid[0], pt[1] - centroid[1]);
  const frontage = frontageFromStreet(fp.ring, towardStreet);

  // The geocode-point proxy is noisier than a road centerline → wider uncertainty.
  const uncertaintyDeg = 20 + Math.min(35, frontage.snapDeg);
  const needs: NeedsConfirmationReason[] = ["no_entrance"];
  if (frontage.snapDeg > 30) needs.push("footprint_unaligned");
  if (isNearSectorBoundary(frontage.bearingDeg, uncertaintyDeg)) needs.push("near_sector_boundary");

  const sqft = Math.round(fp.areaSqM * 10.7639);
  const orientation: StoredOrientation = {
    entranceFacing: {
      ...emptyEstimate(),
      bearingDeg: frontage.bearingDeg,
      cardinal: frontage.cardinal,
      northType: "true", // Web Mercator grid ≈ true north along meridians
      uncertaintyDeg,
      confirmed: false,
      source: "gis",
    },
    entranceLocationZone: null,
    buildingFrontage: frontage.cardinal,
    streetDirection: null,
    northType: "true",
    planNorthDeg: 0,
    needsConfirmation: Array.from(new Set(needs)),
    evidence: [
      {
        id: "gis-footprint",
        kind: "property_map",
        name: "National building footprint (USA Structures)",
        dataUrl: aerialUrlForRing(fp.ring, 560, WEB_MERCATOR_SR),
        footprint: "actual",
        note: "Street-facing façade derived from the footprint vs. the geocoded street location.",
      },
    ],
    activity: [
      { at: Date.now(), by: "system", action: "Derived facing from the national building footprint (no parcel/streets)" },
    ],
  };

  const derived: GisDerived = {
    facing: frontage.cardinal,
    facingBearingDeg: Math.round(frontage.bearingDeg),
    frontage: frontage.cardinal,
    streetName: null,
    streetHeadingDeg: null,
    lotShape: "regular", // unknown at this tier; placeholder not scored (vastuExterior omits it)
    roadPosition: "mid_block",
    openSpace: {} as Record<Cardinal8, number>,
    openSpaceNE: "moderate",
    snapDeg: Math.round(frontage.snapDeg),
    elongation: Math.round(frontage.elongation * 100) / 100,
    streetDistanceFt: -1,
    footprintAreaSqFt: sqft,
  };

  return {
    ok: true,
    stage: "complete",
    message:
      "Facing derived from the national building footprint (lower fidelity — lot, road, and open-space aren't available outside full county coverage). Confirm the entrance per home.",
    matchedAddress: geo.matchedAddress,
    coords: { lng: geo.lng, lat: geo.lat },
    // Only facing is known at the national tier; everything else stays unknown.
    vastuExterior: {
      facingDirection: sat<Cardinal8>(frontage.cardinal, 0.5),
      lotShape: { value: null, confidence: 0, source: "unknown" },
      roadPosition: { value: null, confidence: 0, source: "unknown" },
      openSpaceNE: { value: null, confidence: 0, source: "unknown" },
    },
    orientation,
    derived,
    aerialUrl: aerialUrlForRing(fp.ring, 560, WEB_MERCATOR_SR),
    coverage: "national",
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
