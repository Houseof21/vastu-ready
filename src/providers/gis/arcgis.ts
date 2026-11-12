import type { Pt, Ring } from "./geometry";
import { nearestOnPaths } from "./geometry";

/**
 * Server-side GIS client. Pulls a parcel, its building footprint, and nearby
 * street centerlines from public, authoritative sources — no scraping, no key:
 *
 *   - Geocoding:  US Census (nationwide, free)
 *   - Parcels:    Wake County GIS (maps.wake.gov) — daily-updated, authoritative
 *   - Footprints: Raleigh/Wake open building footprints (ML + municipal)
 *   - Streets:    City of Raleigh maintained streets
 *
 * Everything is returned in NC State Plane feet (wkid 102719) so the geometry
 * module can do planar math. This runs only on the server (it reaches the open
 * internet, which Vercel functions can do); it is never bundled to the client.
 *
 * This is a Wake-County proof of concept. The national version swaps these hosts
 * for Microsoft/Overture footprints + Regrid parcels + TIGER roads behind the
 * same shape.
 */

export const WAKE_SR = 102719;

const CENSUS_GEOCODE =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const PARCELS =
  "https://maps.wake.gov/arcgis/rest/services/Property/Parcels/MapServer/0/query";
const FOOTPRINTS =
  "https://services.arcgis.com/v400IkDOw1ad7Yad/ArcGIS/rest/services/Building_Footprints/FeatureServer/0/query";
const STREETS =
  "https://services.arcgis.com/v400IkDOw1ad7Yad/ArcGIS/rest/services/COR_Maintained_Streets/FeatureServer/0/query";
export const WORLD_IMAGERY_EXPORT =
  "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export";
/** National building footprints (FEMA/Oak Ridge USA Structures) — queryable by point. */
const FEMA_STRUCTURES =
  "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0/query";
/** Web Mercator — used for the national path (planar, conformal; grid≈true north). */
export const WEB_MERCATOR_SR = 3857;

const TIMEOUT_MS = 12_000;

type EsriError = { error?: { code?: number; message?: string } };
type EsriFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { rings?: number[][][]; paths?: number[][][] };
};
type GeoMatch = { matchedAddress: string; coordinates: { x: number; y: number } };

async function getJson<T>(url: string, params: Record<string, string>): Promise<T & EsriError> {
  const qs = new URLSearchParams(params).toString();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}?${qs}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as T & EsriError;
    if (j && j.error) throw new Error(`service error ${j.error.code ?? ""}`.trim());
    return j;
  } finally {
    clearTimeout(t);
  }
}

export type GeocodeResult = { matchedAddress: string; lng: number; lat: number };

async function geocodeCensus(address: string): Promise<GeocodeResult | null> {
  try {
    const j = await getJson<{ result?: { addressMatches?: GeoMatch[] } }>(CENSUS_GEOCODE, {
      address,
      benchmark: "Public_AR_Current",
      format: "json",
    });
    const m = j?.result?.addressMatches ?? [];
    if (!m.length) return null;
    return { matchedAddress: m[0]!.matchedAddress, lng: m[0]!.coordinates.x, lat: m[0]!.coordinates.y };
  } catch {
    return null;
  }
}

/** OpenStreetMap/Nominatim fallback — broader coverage + often rooftop-precise. */
async function geocodeNominatim(address: string): Promise<GeocodeResult | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({ q: address, format: "json", limit: "1", countrycodes: "us" }).toString();
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
      signal: ctrl.signal,
      // Nominatim requires an identifying User-Agent.
      headers: { "User-Agent": "VastuReady/1.0 (address orientation lookup)", Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (!arr.length) return null;
    return { matchedAddress: arr[0]!.display_name, lng: Number(arr[0]!.lon), lat: Number(arr[0]!.lat) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Geocode an address: US Census first (free, unlimited), Nominatim as fallback. */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  return (await geocodeCensus(address)) ?? (await geocodeNominatim(address));
}

export type ParcelRecord = {
  siteAddress: string | null;
  city: string | null;
  zip: string | null;
  deedAcres: number | null;
  yearBuilt: number | null;
  heatedAreaSqft: number | null;
  assessedValue: number | null;
  typeUse: string | null;
  ring: Ring; // outer ring, wkid 102719
  /** True when the geocoded point missed every parcel and we snapped to the nearest. */
  approxMatch: boolean;
};

const PARCEL_FIELDS =
  "OBJECTID,SITE_ADDRESS,CITY_DECODE,ZIPNUM,DEED_ACRES,YEAR_BUILT,HEATEDAREA,TOTAL_VALUE_ASSD,TYPE_USE_DECODE";

function toRing(rings: number[][][] | undefined): Ring {
  const outer = rings?.[0] ?? [];
  return outer.map((p) => [p[0]!, p[1]!] as Pt);
}

function toRecord(f: EsriFeature, approxMatch: boolean): ParcelRecord {
  const a = f.attributes ?? {};
  const str = (k: string) => (a[k] == null ? null : String(a[k]));
  const num = (k: string) => (typeof a[k] === "number" ? (a[k] as number) : a[k] == null ? null : Number(a[k]));
  return {
    siteAddress: str("SITE_ADDRESS"),
    city: str("CITY_DECODE"),
    zip: str("ZIPNUM"),
    deedAcres: num("DEED_ACRES"),
    yearBuilt: num("YEAR_BUILT"),
    heatedAreaSqft: num("HEATEDAREA"),
    assessedValue: num("TOTAL_VALUE_ASSD"),
    typeUse: str("TYPE_USE_DECODE"),
    ring: toRing(f.geometry?.rings),
    approxMatch,
  };
}

async function parcelQuery(params: Record<string, string>): Promise<EsriFeature[]> {
  const j = await getJson<{ features?: EsriFeature[] }>(PARCELS, {
    outFields: PARCEL_FIELDS,
    returnGeometry: "true",
    f: "json",
    ...params,
  });
  return j?.features ?? [];
}

/**
 * The parcel at a lon/lat point (WGS84), returned in NC State Plane feet.
 * Street-interpolated geocodes can land just off the lot (in the road), so if the
 * exact point hits no parcel we snap to the nearest parcel within ~90 ft.
 */
export async function parcelAtPoint(lng: number, lat: number): Promise<ParcelRecord | null> {
  // 1) Exact: the parcel that actually contains the point.
  const exact = await parcelQuery({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outSR: String(WAKE_SR),
  });
  if (exact.length) return toRecord(exact[0]!, false);

  // 2) Fallback: nearest parcel within a small buffer. Fetch candidates in 4326
  //    so we can rank by distance to the geocoded point, then refetch the winner
  //    in State Plane feet for the geometry math.
  const candidates = await parcelQuery({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    distance: "90",
    units: "esriSRUnit_Foot",
    spatialRel: "esriSpatialRelIntersects",
    outSR: "4326",
    resultRecordCount: "12",
  });
  if (!candidates.length) return null;

  let bestOid: number | null = null;
  let bestDist = Infinity;
  for (const f of candidates) {
    const ring = toRing(f.geometry?.rings);
    if (ring.length < 3) continue;
    const near = nearestOnPaths([lng, lat], [ring]);
    const oid = typeof f.attributes?.OBJECTID === "number" ? (f.attributes.OBJECTID as number) : null;
    if (near && oid != null && near.distance < bestDist) {
      bestDist = near.distance;
      bestOid = oid;
    }
  }
  if (bestOid == null) return null;

  const winner = await parcelQuery({ where: `OBJECTID=${bestOid}`, outSR: String(WAKE_SR) });
  return winner.length ? toRecord(winner[0]!, true) : null;
}

/** The largest building footprint intersecting a parcel polygon (the main house). */
export async function footprintForParcel(parcelRing: Ring): Promise<{ ring: Ring; areaSqFt: number } | null> {
  const geometry = JSON.stringify({ rings: [parcelRing], spatialReference: { wkid: WAKE_SR } });
  const j = await getJson<{ features?: EsriFeature[] }>(FOOTPRINTS, {
    geometry,
    geometryType: "esriGeometryPolygon",
    inSR: String(WAKE_SR),
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OBJECTID,Shape__Area",
    returnGeometry: "true",
    outSR: String(WAKE_SR),
    f: "json",
  });
  const feats = j?.features ?? [];
  if (!feats.length) return null;
  const area = (f: EsriFeature) => (typeof f.attributes?.Shape__Area === "number" ? (f.attributes.Shape__Area as number) : 0);
  feats.sort((x, y) => area(y) - area(x));
  const best = feats[0]!;
  return { ring: toRing(best.geometry?.rings), areaSqFt: Math.round(area(best)) };
}

export type StreetLine = { name: string | null; paths: Pt[][] };

/** Street centerlines within `padFt` of a parcel's bounding box. */
export async function streetsNearParcel(parcelRing: Ring, padFt = 180): Promise<StreetLine[]> {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of parcelRing) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const env = {
    xmin: minX - padFt,
    ymin: minY - padFt,
    xmax: maxX + padFt,
    ymax: maxY + padFt,
    spatialReference: { wkid: WAKE_SR },
  };
  const j = await getJson<{ features?: EsriFeature[] }>(STREETS, {
    geometry: JSON.stringify(env),
    geometryType: "esriGeometryEnvelope",
    inSR: String(WAKE_SR),
    spatialRel: "esriSpatialRelIntersects",
    outFields: "STREET",
    returnGeometry: "true",
    outSR: String(WAKE_SR),
    f: "json",
  });
  return (j?.features ?? []).map((f) => ({
    name: f.attributes?.STREET == null ? null : String(f.attributes.STREET),
    paths: (f.geometry?.paths ?? []).map((pa: number[][]) => pa.map((p) => [p[0]!, p[1]!] as Pt)),
  }));
}

/** WGS84 lon/lat → Web Mercator (EPSG:3857) meters. */
export function project4326to3857(lng: number, lat: number): Pt {
  const x = (lng * 20037508.34) / 180;
  const y = (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * (20037508.34 / 180);
  return [x, y];
}

function ringAreaAbs(ring: Ring): number {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/**
 * National fallback: the largest building footprint near a lon/lat point, from
 * FEMA/Oak Ridge USA Structures, returned in Web Mercator meters (EPSG:3857).
 * No parcels or county streets — used to derive facing anywhere in the US.
 */
export async function footprintNearPoint(lng: number, lat: number): Promise<{ ring: Ring; areaSqM: number } | null> {
  // Geocodes can land in the street or next door, so widen the search in steps
  // until a footprint is found (keeps the nearest/largest; avoids false hits far away).
  for (const distance of ["45", "90", "150"]) {
    const j = await getJson<{ features?: EsriFeature[] }>(FEMA_STRUCTURES, {
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      distance,
      units: "esriSRUnit_Meter",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "BUILD_ID",
      returnGeometry: "true",
      outSR: String(WEB_MERCATOR_SR),
      f: "json",
    });
    const rings = (j?.features ?? []).map((f) => toRing(f.geometry?.rings)).filter((r) => r.length >= 3);
    if (rings.length) {
      rings.sort((a, b) => ringAreaAbs(b) - ringAreaAbs(a));
      return { ring: rings[0]!, areaSqM: Math.round(ringAreaAbs(rings[0]!)) };
    }
  }
  return null;
}

/** A north-up aerial image URL for a ring. `sr` is the ring's spatial reference. */
export function aerialUrlForRing(ring: Ring, size = 560, sr = WAKE_SR): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  // pad to a square with a margin so the whole lot + street show
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max(maxX - minX, maxY - minY) / 2 + 70;
  const bbox = `${cx - half},${cy - half},${cx + half},${cy + half}`;
  const qs = new URLSearchParams({
    bbox,
    bboxSR: String(sr),
    imageSR: String(sr),
    size: `${size},${size}`,
    format: "png",
    f: "image",
  }).toString();
  return `${WORLD_IMAGERY_EXPORT}?${qs}`;
}
