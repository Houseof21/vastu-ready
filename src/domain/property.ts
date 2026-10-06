import type { Cardinal8, PropertyVastu } from "./types";

export type HomeType = "single_family" | "townhouse" | "condo" | "new_construction_plan";
export type GarageType = "side_entry" | "front_entry" | "detached" | "none";
export type PrivacyLevel = "high" | "moderate" | "low";

export type PropertyAddress = {
  line1: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
};

/** A comparable sale used to justify the estimated value (evidence for Value). */
export type Comp = {
  address: string;
  soldPrice: number;
  soldDate: string; // ISO date
  sqft: number;
  beds: number;
  baths: number;
  lotAcres: number;
  distanceMiles: number;
};

/**
 * A property. Factual listing data is distinct from Vastu attributes, which
 * carry their own confidence/source (see PropertyVastu). Addresses in the demo
 * are fictional so the development build never misrepresents a real listing.
 */
export type Property = {
  id: string;
  address: PropertyAddress;
  price: number;
  /** Fair-market estimate used for the Value score (demo stand-in for comps). */
  estimatedValue: number;
  beds: number;
  baths: number;
  sqft: number;
  lotAcres: number;
  yearBuilt: number;
  homeType: HomeType;
  style: string;
  newConstruction: boolean;
  pool: boolean;
  garageSpaces: number;
  garageType: GarageType;
  privacy: PrivacyLevel;
  heroImage: string;
  images: string[];
  coords: { lat: number; lng: number };
  /** Minutes to the buyer's default destination; filled by the maps provider. */
  driveMinutes: number | null;
  listingUrl: string | null;
  vastu: PropertyVastu;
  isDemo: boolean;
  source: "mock" | "manual" | "url";
  /** Comparable sales backing `estimatedValue` (empty for manual entries). */
  comps?: Comp[];
  /** Optional floor-plan the buyer uploaded (data URL), for manual entries. */
  floorPlanDataUrl?: string | null;
  /** When a manual entry was created (ms epoch). */
  createdAt?: number;
};

/** Compact summary for feed cards / comparison rows. */
export type PropertySummary = Pick<
  Property,
  "id" | "price" | "beds" | "baths" | "sqft" | "lotAcres" | "heroImage" | "address" | "driveMinutes"
> & { facing: Cardinal8 | null };
