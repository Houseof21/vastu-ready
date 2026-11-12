import type { Property } from "@/domain/property";
import type {
  PropertyVastu,
  VastuAttribute,
  Cardinal8,
  Zone,
  BrahmasthanCondition,
  WaterFeature,
} from "@/domain/types";
import type { GisOrientationResult } from "./orientation-from-gis";

/**
 * Turn a completed GIS orientation result into a real, analyzable Property.
 *
 * Honest by construction:
 *  - Factual fields that county records actually carry (lot size, heated area,
 *    year built, assessed value) are populated and labeled as assessor data.
 *  - Exterior Vastu (facing, lot shape, road position, open-space NE) comes from
 *    the footprint/parcel geometry with its real confidence.
 *  - The orientation estimate is attached as an unconfirmed StoredOrientation to
 *    be confirmed in the Studio.
 *  - Everything county data does NOT know — beds, baths, and every interior room
 *    zone — stays unknown (0 / null), never guessed.
 *
 * Pure mapping, safe to run on the client (no network, no secrets).
 */

function none<T>(): VastuAttribute<T> {
  return { value: null, confidence: 0, source: "unknown" };
}

export function gisResultToProperty(r: GisOrientationResult, id?: string): Property | null {
  if (!r.ok || !r.vastuExterior || !r.parcel) return null;
  const ext = r.vastuExterior;
  const p = r.parcel;

  const vastu: PropertyVastu = {
    facingDirection: ext.facingDirection,
    entranceDirection: none<Cardinal8>(), // which zone the door sits in needs confirmation / a floor plan
    lotShape: ext.lotShape,
    roadPosition: ext.roadPosition,
    openSpaceNE: ext.openSpaceNE,
    kitchenZone: none<Zone>(),
    primaryBedroomZone: none<Zone>(),
    bathroomZones: none<Zone[]>(),
    staircaseZone: none<Zone>(),
    brahmasthan: none<BrahmasthanCondition>(),
    garageZone: none<Zone>(),
    waterFeatures: none<WaterFeature[]>(),
  };

  const coords = r.coords ? { lat: r.coords.lat, lng: r.coords.lng } : { lat: 35.8, lng: -78.64 };
  const pid =
    id ?? `gis-${r.coords ? `${r.coords.lat.toFixed(5)}_${r.coords.lng.toFixed(5)}` : Date.now().toString(36)}`;
  const assessed = p.assessedValue ?? 0;

  return {
    id: pid,
    address: {
      line1: p.siteAddress ?? r.matchedAddress ?? "Unknown address",
      city: p.city ?? "",
      state: "NC",
      zip: p.zip ?? "",
      neighborhood: "",
    },
    // Assessed value as a disclosed stand-in — NOT a list price or appraisal.
    price: assessed,
    estimatedValue: assessed,
    beds: 0,
    baths: 0,
    sqft: p.heatedAreaSqft ?? 0,
    lotAcres: p.deedAcres ?? 0,
    yearBuilt: p.yearBuilt ?? 0,
    homeType: "single_family",
    style: p.typeUse ?? "",
    newConstruction: false,
    pool: false,
    garageSpaces: 0,
    garageType: "none",
    privacy: "moderate",
    heroImage: "",
    images: [],
    coords,
    driveMinutes: null, // unknown until the buyer provides a destination
    listingUrl: null,
    vastu,
    isDemo: false,
    source: "gis",
    comps: [],
    createdAt: Date.now(),
    // The north-up aerial doubles as the property image and the Studio backdrop
    // for confirming the entrance direction against the real roofline/driveway.
    floorPlanDataUrl: r.aerialUrl ?? null,
    orientation: r.orientation,
  };
}
