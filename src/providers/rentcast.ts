import type { Property, HomeType } from "@/domain/property";
import type {
  BrahmasthanCondition,
  Cardinal8,
  LotShape,
  PropertyVastu,
  Quality,
  RoadPosition,
  VastuAttribute,
  WaterFeature,
  Zone,
} from "@/domain/types";
import type { PropertyDataProvider, ManualPropertyInput, ListingIngestResult } from "./property";
import { MockPropertyProvider } from "./property";
import { getMapsProvider } from "./maps";

/**
 * RentCast adapter — real, licensed property facts behind the PropertyDataProvider
 * seam. This is a stopgap while MLS access is sorted: it pulls genuine active
 * for-sale listings (address, price, beds/baths, size, lot, year) for a market,
 * so the demo shows REAL homes instead of fictional ones.
 *
 * Honesty guarantees this adapter keeps:
 *   - No scraping. All data comes from RentCast's licensed API.
 *   - Vastu is NEVER fabricated. No listing feed carries a home's true entrance
 *     orientation or room placement, so every Vastu attribute stays `unknown`
 *     (confidence 0) and the app shows "needs verification" until a person
 *     confirms orientation per home in the Orientation Studio.
 *   - `estimatedValue` is set to the list price (an honest, disclosed stand-in),
 *     not an independent AVM, so we don't imply a valuation we didn't compute.
 *
 * Quota: the RentCast free tier is ~50 requests/month, so results are cached in
 * memory for the process (TTL below) and a whole feed costs ONE request.
 *
 * Docs: https://developers.rentcast.io/reference/sale-listings
 */

const API_BASE = "https://api.rentcast.io/v1";
const DEST = { lat: 35.8366, lng: -78.6414 }; // default commute anchor (downtown Raleigh)

function cfg() {
  return {
    apiKey: process.env.RENTCAST_API_KEY ?? "",
    city: process.env.RENTCAST_MARKET_CITY ?? "Raleigh",
    state: process.env.RENTCAST_MARKET_STATE ?? "NC",
    limit: clampInt(process.env.RENTCAST_LISTING_LIMIT, 12, 1, 100),
    ttlMs: clampInt(process.env.RENTCAST_CACHE_HOURS, 6, 0, 720) * 60 * 60 * 1000,
  };
}

function clampInt(raw: string | undefined, dflt: number, min: number, max: number): number {
  const n = raw != null ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

export function isRentcastConfigured(): boolean {
  return !!(process.env.RENTCAST_API_KEY && process.env.RENTCAST_API_KEY.trim());
}

// --- RentCast response shape (only the fields we map) -------------------------

type RentcastListing = {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number; // square feet
  yearBuilt?: number;
  price?: number;
  status?: string;
  daysOnMarket?: number;
  builder?: { name?: string } | null;
};

// --- In-memory cache (conserves the free-tier quota) --------------------------

let cache: { at: number; props: Property[] } | null = null;
let inFlight: Promise<Property[]> | null = null;

function unknownVastu(): PropertyVastu {
  const none = <T>(): VastuAttribute<T> => ({ value: null, confidence: 0, source: "unknown" });
  return {
    facingDirection: none<Cardinal8>(),
    entranceDirection: none<Cardinal8>(),
    lotShape: none<LotShape>(),
    roadPosition: none<RoadPosition>(),
    openSpaceNE: none<Quality>(),
    kitchenZone: none<Zone>(),
    primaryBedroomZone: none<Zone>(),
    bathroomZones: none<Zone[]>(),
    staircaseZone: none<Zone>(),
    brahmasthan: none<BrahmasthanCondition>(),
    garageZone: none<Zone>(),
    waterFeatures: none<WaterFeature[]>(),
  };
}

function mapHomeType(propertyType?: string): HomeType {
  switch ((propertyType ?? "").toLowerCase()) {
    case "townhouse":
      return "townhouse";
    case "condo":
    case "apartment":
      return "condo";
    case "single family":
    case "manufactured":
    case "multi-family":
    default:
      return "single_family";
  }
}

async function mapListing(l: RentcastListing): Promise<Property | null> {
  // Skip records without the minimum factual basis for an honest card.
  if (l.price == null || l.price <= 0) return null;
  const addressLine1 = l.addressLine1 || l.formattedAddress || "Address unavailable";
  const coords =
    l.latitude != null && l.longitude != null ? { lat: l.latitude, lng: l.longitude } : DEST;
  const driveMinutes = await getMapsProvider().driveMinutes(coords, DEST);
  const lotAcres = l.lotSize && l.lotSize > 0 ? Math.round((l.lotSize / 43560) * 100) / 100 : 0;
  const rawId = l.id || `${addressLine1}-${l.zipCode ?? ""}`;

  return {
    id: `rentcast-${rawId}`.replace(/\s+/g, "-"),
    address: {
      line1: addressLine1,
      city: l.city ?? cfg().city,
      state: l.state ?? cfg().state,
      zip: l.zipCode ?? "",
      neighborhood: l.county ? l.county.replace(/ County$/i, "") : (l.city ?? ""),
    },
    price: Math.round(l.price),
    // Honest stand-in: list price, NOT an independent AVM (disclosed in UI).
    estimatedValue: Math.round(l.price),
    beds: l.bedrooms ?? 0,
    baths: l.bathrooms ?? 0,
    sqft: l.squareFootage ?? 0,
    lotAcres,
    yearBuilt: l.yearBuilt ?? 0,
    homeType: mapHomeType(l.propertyType),
    style: l.propertyType ?? "unknown",
    newConstruction: !!l.builder?.name,
    pool: false, // not in the listings feed — left false rather than guessed
    garageSpaces: 0,
    garageType: "none",
    privacy: "moderate",
    heroImage: "",
    images: [],
    coords,
    driveMinutes,
    listingUrl: null,
    vastu: unknownVastu(), // never fabricated — stays "needs verification"
    isDemo: false,
    source: "rentcast",
    comps: [],
  };
}

async function fetchListings(): Promise<Property[]> {
  const c = cfg();
  if (!c.apiKey) return [];
  const url =
    `${API_BASE}/listings/sale?city=${encodeURIComponent(c.city)}` +
    `&state=${encodeURIComponent(c.state)}&status=Active&limit=${c.limit}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": c.apiKey, Accept: "application/json" },
    // Next server-side cache; our own in-memory cache is the primary guard.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`RentCast ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as RentcastListing[] | { listings?: RentcastListing[] };
  const rows = Array.isArray(data) ? data : (data.listings ?? []);
  const mapped = await Promise.all(rows.map((r) => mapListing(r)));
  return mapped.filter((p): p is Property => p != null);
}

async function load(): Promise<Property[]> {
  const ttl = cfg().ttlMs;
  if (cache && Date.now() - cache.at < ttl) return cache.props;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const props = await fetchListings();
      cache = { at: Date.now(), props };
      return props;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export const RentcastPropertyProvider: PropertyDataProvider = {
  id: "rentcast",
  isMock: false,

  async list(): Promise<Property[]> {
    return load();
  },

  async get(id: string): Promise<Property | null> {
    const all = await load();
    return all.find((p) => p.id === id) ?? null;
  },

  // Manual entry and URL ingestion are source-agnostic: reuse the shared,
  // non-fabricating implementations.
  async fromListingUrl(url: string): Promise<ListingIngestResult> {
    return MockPropertyProvider.fromListingUrl(url);
  },
  async fromManualEntry(input: ManualPropertyInput): Promise<Property> {
    return MockPropertyProvider.fromManualEntry(input);
  },
};
