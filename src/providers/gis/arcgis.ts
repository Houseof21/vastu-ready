import type { Pt, Ring } from "./geometry";

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

export async function geocode(address: string): Promise<GeocodeResult | null> {
  const j = await getJson<{ result?: { addressMatches?: GeoMatch[] } }>(CENSUS_GEOCODE, {
    address,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const m = j?.result?.addressMatches ?? [];
  if (!m.length) return null;
  return {
    matchedAddress: m[0]!.matchedAddress,
    lng: m[0]!.coordinates.x,
    lat: m[0]!.coordinates.y,
  };
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
};

function toRing(rings: number[][][] | undefined): Ring {
  const outer = rings?.[0] ?? [];
  return outer.map((p) => [p[0]!, p[1]!] as Pt);
}

/** The parcel containing a lon/lat point (WGS84), returned in NC State Plane feet. */
export async function parcelAtPoint(lng: number, lat: number): Promise<ParcelRecord | null> {
  const j = await getJson<{ features?: EsriFeature[] }>(PARCELS, {
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields:
      "SITE_ADDRESS,CITY_DECODE,ZIPNUM,DEED_ACRES,YEAR_BUILT,HEATEDAREA,TOTAL_VALUE_ASSD,TYPE_USE_DECODE",
    returnGeometry: "true",
    outSR: String(WAKE_SR),
    f: "json",
  });
  const f = j?.features?.[0];
  if (!f) return null;
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
  };
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

/** A north-up aerial image URL for a parcel (evidence the user can eyeball). */
export function aerialUrlForRing(ring: Ring, size = 560): string {
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
    bboxSR: String(WAKE_SR),
    imageSR: String(WAKE_SR),
    size: `${size},${size}`,
    format: "png",
    f: "image",
  }).toString();
  return `${WORLD_IMAGERY_EXPORT}?${qs}`;
}
