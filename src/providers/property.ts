import type { Property } from "@/domain/property";
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
import { DEMO_PROPERTIES, getDemoProperty } from "@/data/demo";
import { getMapsProvider } from "./maps";
import { RentcastPropertyProvider, isRentcastConfigured } from "./rentcast";

/**
 * Property data abstraction. The app never depends on a scraper: this interface
 * is the single seam behind which real sources plug in later —
 *   - MLS / RESO Web API (licensed)
 *   - real-estate data providers (ATTOM, Estated, etc.)
 *   - manual entry (buyer/realtor types the facts in)
 *   - listing-URL ingestion (via a licensed provider, not fragile scraping)
 *
 * The mock implementation serves the seeded Raleigh demo set so the whole
 * experience works with zero credentials.
 */

export type ListingIngestResult = {
  property: Property;
  /** User-facing explanation of what is/isn't known and why. */
  notice: string;
  /** True when the facts are synthetic placeholders needing verification. */
  needsVerification: boolean;
};

export type ManualPropertyInput = {
  id?: string;
  address: Property["address"];
  price: number;
  estimatedValue?: number;
  beds: number;
  baths: number;
  sqft: number;
  lotAcres: number;
  yearBuilt: number;
  homeType: Property["homeType"];
  style: string;
  newConstruction: boolean;
  pool: boolean;
  garageSpaces: number;
  garageType: Property["garageType"];
  privacy: Property["privacy"];
  coords?: { lat: number; lng: number };
  heroImage?: string;
  images?: string[];
  listingUrl?: string | null;
  /** Buyer-supplied commute minutes; used as-is when provided. */
  driveMinutes?: number | null;
  floorPlanDataUrl?: string | null;
  vastu: PropertyVastu;
  orientation?: import("@/domain/orientation").StoredOrientation;
};

export interface PropertyDataProvider {
  readonly id: string;
  readonly isMock: boolean;
  /** All available properties for the active market. */
  list(): Promise<Property[]>;
  /** A single property by id, or null if unknown. */
  get(id: string): Promise<Property | null>;
  /** Ingest a pasted listing URL (no scraping — licensed provider or stub). */
  fromListingUrl(url: string): Promise<ListingIngestResult>;
  /** Build a property from manually entered facts. */
  fromManualEntry(input: ManualPropertyInput): Promise<Property>;
}

/** Vastu attributes default to unknown so nothing is fabricated. */
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

/** Deterministic hash → stable synthetic ids for URL ingestion. */
function hashString(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export const MockPropertyProvider: PropertyDataProvider = {
  id: "mock",
  isMock: true,

  async list() {
    return DEMO_PROPERTIES;
  },

  async get(id) {
    return getDemoProperty(id) ?? null;
  },

  async fromListingUrl(url) {
    // Intentionally NOT a scraper. Real ingestion goes through a licensed MLS/
    // data provider keyed off the listing. Here we produce an honest, clearly
    // unverified placeholder so the analyzer flow is demonstrable end-to-end.
    const id = `url-${hashString(url)}`;
    const existing = getDemoProperty(id);
    if (existing) {
      return { property: existing, notice: "Loaded a previously analyzed listing.", needsVerification: false };
    }
    const property: Property = {
      id,
      address: {
        line1: "Pasted listing",
        city: "Raleigh",
        state: "NC",
        zip: "",
        neighborhood: "Unknown",
      },
      price: 0,
      estimatedValue: 0,
      beds: 0,
      baths: 0,
      sqft: 0,
      lotAcres: 0,
      yearBuilt: 0,
      homeType: "single_family",
      style: "unknown",
      newConstruction: false,
      pool: false,
      garageSpaces: 0,
      garageType: "none",
      privacy: "moderate",
      heroImage: "",
      images: [],
      coords: { lat: 35.8366, lng: -78.6414 },
      driveMinutes: null,
      listingUrl: url,
      vastu: unknownVastu(),
      isDemo: true,
      source: "url",
    };
    return {
      property,
      notice:
        "Automated listing scraping isn't enabled — it requires a licensed MLS or data-provider feed. " +
        "To analyze this home now, confirm its details with manual entry. Nothing here is assumed or fabricated.",
      needsVerification: true,
    };
  },

  async fromManualEntry(input) {
    const coords = input.coords ?? { lat: 35.8366, lng: -78.6414 };
    const id = input.id ?? `manual-${hashString(`${input.address.line1}|${input.address.zip}|${Date.now()}`)}`;
    // Use the buyer's stated commute when given; otherwise estimate via maps.
    const driveMinutes =
      input.driveMinutes != null
        ? input.driveMinutes
        : await getMapsProvider().driveMinutes(coords, { lat: 35.8366, lng: -78.6414 });
    return {
      id,
      address: input.address,
      price: input.price,
      estimatedValue: input.estimatedValue ?? input.price,
      beds: input.beds,
      baths: input.baths,
      sqft: input.sqft,
      lotAcres: input.lotAcres,
      yearBuilt: input.yearBuilt,
      homeType: input.homeType,
      style: input.style,
      newConstruction: input.newConstruction,
      pool: input.pool,
      garageSpaces: input.garageSpaces,
      garageType: input.garageType,
      privacy: input.privacy,
      heroImage: input.heroImage ?? "",
      images: input.images ?? [],
      coords,
      driveMinutes,
      listingUrl: input.listingUrl ?? null,
      vastu: input.vastu,
      isDemo: false,
      source: "manual",
      floorPlanDataUrl: input.floorPlanDataUrl ?? null,
      createdAt: Date.now(),
      comps: [],
      orientation: input.orientation,
    };
  },
};

export function getPropertyProvider(): PropertyDataProvider {
  // MLS/RESO/data-provider adapters branch on env here; mock otherwise.
  // RentCast provides real, licensed listing facts when a key is configured.
  if (isRentcastConfigured()) {
    return RentcastPropertyProvider;
  }
  return MockPropertyProvider;
}
