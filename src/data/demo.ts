import type { Comp, Property } from "@/domain/property";
import type { UserPreferences } from "@/domain/profile";
import type { DataSource, VastuAttribute, PropertyVastu, Zone } from "@/domain/types";

/** Compact constructor for a provenance-wrapped attribute. */
function attr<T>(value: T | null, confidence: number, source: DataSource): VastuAttribute<T> {
  return { value, confidence, source };
}
const mls = (v: unknown, c = 0.95) => attr(v as never, c, "mls");
const sat = (v: unknown, c = 0.7) => attr(v as never, c, "satellite");
const inf = (v: unknown, c = 0.6) => attr(v as never, c, "inference");
const fp = (v: unknown, c = 0.9) => attr(v as never, c, "floorplan");
const unknown = <T = never>(): VastuAttribute<T> => ({ value: null, confidence: 0, source: "unknown" });

/**
 * Demo buyer profile — makes the app immediately useful on launch.
 * (From the product spec's first demo user.)
 */
export const DEMO_PREFERENCES: UserPreferences = {
  profile: {
    name: "Demo Buyer",
    maxBudget: 1_200_000,
    minBudget: null,
    minBeds: 4,
    minBaths: 3,
    minSqft: 3000,
    minLotAcres: 0.5,
    preferredLotAcres: 1.0,
    preferredAreas: ["North Hills", "North Ridge", "Six Forks", "Falls Lake"],
    destinationLabel: "North Hills, Raleigh",
    destinationCoords: { lat: 35.8366, lng: -78.6414 },
    maxDriveMinutes: 20,
    preferredStyles: ["modern", "transitional", "luxury"],
    constructionPref: "any",
    renovationTolerance: "high",
    poolPreference: "any",
    privacyImportance: "high",
    garagePref: "side_entry",
    priorities: ["large_lot", "privacy", "orientation"],
  },
  vastu: {
    strictness: "balanced",
    acceptableFacings: ["N", "NE", "E"],
    preferredEntrance: "NE",
    openSpaceNEImportant: true,
    dealbreakers: ["poor_orientation"],
  },
};

const RA = "Raleigh";
const NC = "NC";

/** 10 fictional Raleigh-area properties. Addresses are synthetic. */
export const DEMO_PROPERTIES: Property[] = [
  // ---------- 2 excellent matches ----------
  {
    id: "p-cardinal",
    address: { line1: "112 Meridian Ridge Ct", city: RA, state: NC, zip: "27614", neighborhood: "North Ridge" },
    price: 985_000,
    estimatedValue: 1_030_000,
    beds: 5,
    baths: 4.5,
    sqft: 4300,
    lotAcres: 1.08,
    yearBuilt: 2016,
    homeType: "single_family",
    style: "Transitional",
    newConstruction: false,
    pool: false,
    garageSpaces: 3,
    garageType: "side_entry",
    privacy: "high",
    heroImage: "p-cardinal",
    images: [],
    coords: { lat: 35.874, lng: -78.63 },
    driveMinutes: 14,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("NE"),
      entranceDirection: mls("NE", 0.9),
      lotShape: mls("regular"),
      roadPosition: mls("cul_de_sac"),
      openSpaceNE: sat("open", 0.78),
      kitchenZone: fp("SE" as Zone),
      primaryBedroomZone: fp("SW" as Zone),
      bathroomZones: fp(["NW", "W"] as Zone[]),
      staircaseZone: fp("S" as Zone, 0.82),
      brahmasthan: fp("open", 0.85),
      garageZone: sat("NW", 0.72),
      waterFeatures: mls([]),
    },
  },
  {
    id: "p-stillwater",
    address: { line1: "8 Thornbury Pl", city: RA, state: NC, zip: "27615", neighborhood: "Falls Lake" },
    price: 1_150_000,
    estimatedValue: 1_190_000,
    beds: 5,
    baths: 5,
    sqft: 4650,
    lotAcres: 1.62,
    yearBuilt: 2019,
    homeType: "single_family",
    style: "Modern",
    newConstruction: false,
    pool: true,
    garageSpaces: 3,
    garageType: "side_entry",
    privacy: "high",
    heroImage: "p-stillwater",
    images: [],
    coords: { lat: 35.905, lng: -78.66 },
    driveMinutes: 19,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("N"),
      entranceDirection: mls("N", 0.9),
      lotShape: mls("regular"),
      roadPosition: mls("mid_block"),
      openSpaceNE: sat("open", 0.8),
      kitchenZone: fp("SE" as Zone),
      primaryBedroomZone: fp("SW" as Zone),
      bathroomZones: fp(["W", "NW"] as Zone[]),
      staircaseZone: fp("W" as Zone, 0.8),
      brahmasthan: fp("open", 0.88),
      garageZone: sat("NW", 0.7),
      waterFeatures: mls([{ kind: "pool", direction: "NE" }]),
    },
  },

  // ---------- 3 good but imperfect ----------
  {
    id: "p-birchwood",
    address: { line1: "240 Oakmont Dr", city: RA, state: NC, zip: "27609", neighborhood: "Six Forks" },
    price: 925_000,
    estimatedValue: 905_000,
    beds: 4,
    baths: 3.5,
    sqft: 3400,
    lotAcres: 0.62,
    yearBuilt: 2008,
    homeType: "single_family",
    style: "Craftsman",
    newConstruction: false,
    pool: false,
    garageSpaces: 2,
    garageType: "front_entry",
    privacy: "moderate",
    heroImage: "p-birchwood",
    images: [],
    coords: { lat: 35.846, lng: -78.64 },
    driveMinutes: 11,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("E"),
      entranceDirection: sat("E", 0.68),
      lotShape: mls("regular"),
      roadPosition: mls("corner"),
      openSpaceNE: sat("moderate", 0.6),
      kitchenZone: inf("NW" as Zone, 0.55),
      primaryBedroomZone: inf("S" as Zone, 0.58),
      bathroomZones: inf(["SE"] as Zone[], 0.5),
      staircaseZone: unknown(),
      brahmasthan: inf("partial", 0.5),
      garageZone: sat("SE", 0.66),
      waterFeatures: mls([]),
    },
  },
  {
    id: "p-hadley",
    address: { line1: "55 Wren Hollow Ln", city: RA, state: NC, zip: "27613", neighborhood: "Stonehenge" },
    price: 840_000,
    estimatedValue: 862_000,
    beds: 4,
    baths: 3,
    sqft: 3150,
    lotAcres: 0.55,
    yearBuilt: 2004,
    homeType: "single_family",
    style: "Traditional",
    newConstruction: false,
    pool: false,
    garageSpaces: 2,
    garageType: "front_entry",
    privacy: "moderate",
    heroImage: "p-hadley",
    images: [],
    coords: { lat: 35.882, lng: -78.69 },
    driveMinutes: 16,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("NE"),
      entranceDirection: mls("NE", 0.88),
      lotShape: mls("slightly_irregular"),
      roadPosition: mls("mid_block"),
      openSpaceNE: sat("moderate", 0.62),
      kitchenZone: fp("E" as Zone, 0.82),
      primaryBedroomZone: fp("SW" as Zone, 0.82),
      bathroomZones: fp(["N", "W"] as Zone[], 0.8),
      staircaseZone: fp("NW" as Zone, 0.78),
      brahmasthan: fp("open", 0.8),
      garageZone: sat("N", 0.66),
      waterFeatures: mls([]),
    },
  },
  {
    id: "p-marshfern",
    address: { line1: "19 Catalpa Way", city: "Wake Forest", state: NC, zip: "27587", neighborhood: "Wake Forest edge" },
    price: 1_050_000,
    estimatedValue: 1_080_000,
    beds: 5,
    baths: 4,
    sqft: 4100,
    lotAcres: 1.31,
    yearBuilt: 2015,
    homeType: "single_family",
    style: "Modern Farmhouse",
    newConstruction: false,
    pool: false,
    garageSpaces: 3,
    garageType: "side_entry",
    privacy: "high",
    heroImage: "p-marshfern",
    images: [],
    coords: { lat: 35.96, lng: -78.58 },
    driveMinutes: 24,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      // Deliberately low-verification example — several fields unknown.
      facingDirection: sat("N", 0.66),
      entranceDirection: inf("N", 0.5),
      lotShape: mls("regular"),
      roadPosition: mls("cul_de_sac"),
      openSpaceNE: sat("open", 0.7),
      kitchenZone: unknown(),
      primaryBedroomZone: unknown(),
      bathroomZones: unknown(),
      staircaseZone: unknown(),
      brahmasthan: unknown(),
      garageZone: sat("NW", 0.6),
      waterFeatures: mls([]),
    },
  },

  // ---------- 3 mediocre ----------
  {
    id: "p-ember",
    address: { line1: "77 Ashford St", city: RA, state: NC, zip: "27612", neighborhood: "North Raleigh" },
    price: 855_000,
    estimatedValue: 775_000,
    beds: 4,
    baths: 3,
    sqft: 2900,
    lotAcres: 0.30,
    yearBuilt: 2001,
    homeType: "single_family",
    style: "Traditional",
    newConstruction: false,
    pool: false,
    garageSpaces: 2,
    garageType: "front_entry",
    privacy: "moderate",
    heroImage: "p-ember",
    images: [],
    coords: { lat: 35.86, lng: -78.7 },
    driveMinutes: 31,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("E"),
      entranceDirection: sat("E", 0.66),
      lotShape: mls("regular"),
      roadPosition: mls("corner"),
      openSpaceNE: sat("moderate", 0.6),
      kitchenZone: inf("S" as Zone, 0.55),
      primaryBedroomZone: inf("NE" as Zone, 0.55),
      bathroomZones: inf(["NE"] as Zone[], 0.5),
      staircaseZone: unknown(),
      brahmasthan: inf("partial", 0.5),
      garageZone: sat("S", 0.64),
      waterFeatures: mls([]),
    },
  },
  {
    id: "p-greystone",
    address: { line1: "300 Larkspur Ct", city: RA, state: NC, zip: "27609", neighborhood: "Six Forks" },
    price: 1_100_000,
    estimatedValue: 1_020_000,
    beds: 5,
    baths: 4,
    sqft: 4000,
    lotAcres: 0.7,
    yearBuilt: 2012,
    homeType: "single_family",
    style: "Transitional",
    newConstruction: false,
    pool: false,
    garageSpaces: 3,
    garageType: "front_entry",
    privacy: "moderate",
    heroImage: "p-greystone",
    images: [],
    coords: { lat: 35.85, lng: -78.63 },
    driveMinutes: 12,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("N"),
      entranceDirection: mls("N", 0.85),
      lotShape: mls("regular"),
      roadPosition: mls("mid_block"),
      openSpaceNE: sat("moderate", 0.6),
      kitchenZone: fp("SW" as Zone, 0.8),
      primaryBedroomZone: fp("W" as Zone, 0.8),
      bathroomZones: fp(["S"] as Zone[], 0.78),
      staircaseZone: fp("E" as Zone, 0.76),
      brahmasthan: fp("open", 0.8),
      garageZone: sat("W", 0.64),
      waterFeatures: mls([]),
    },
  },
  {
    id: "p-hollowoak",
    address: { line1: "14 Sable Ct", city: RA, state: NC, zip: "27615", neighborhood: "North Raleigh" },
    price: 965_000,
    estimatedValue: 890_000,
    beds: 4,
    baths: 3.5,
    sqft: 3600,
    lotAcres: 0.34,
    yearBuilt: 2010,
    homeType: "single_family",
    style: "Traditional",
    newConstruction: false,
    pool: false,
    garageSpaces: 2,
    garageType: "side_entry",
    privacy: "low",
    heroImage: "p-hollowoak",
    images: [],
    coords: { lat: 35.89, lng: -78.65 },
    driveMinutes: 30,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("NE"),
      entranceDirection: mls("NE", 0.86),
      lotShape: mls("regular"),
      roadPosition: mls("mid_block"),
      openSpaceNE: sat("obstructed", 0.6),
      kitchenZone: inf("N" as Zone, 0.55),
      primaryBedroomZone: inf("NE" as Zone, 0.55),
      bathroomZones: inf(["NE", "CENTER"] as Zone[], 0.5),
      staircaseZone: inf("CENTER" as Zone, 0.5),
      brahmasthan: inf("partial", 0.5),
      garageZone: sat("S", 0.62),
      waterFeatures: mls([]),
    },
  },

  // ---------- 2 strong-pass ----------
  {
    id: "p-thistle",
    address: { line1: "902 Verbena Dr", city: RA, state: NC, zip: "27613", neighborhood: "Stonehenge" },
    price: 720_000,
    estimatedValue: 705_000,
    beds: 3,
    baths: 2.5,
    sqft: 2600,
    lotAcres: 0.42,
    yearBuilt: 1998,
    homeType: "single_family",
    style: "Traditional",
    newConstruction: false,
    pool: true,
    garageSpaces: 2,
    garageType: "front_entry",
    privacy: "low",
    heroImage: "p-thistle",
    images: [],
    coords: { lat: 35.878, lng: -78.7 },
    driveMinutes: 15,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("SW"),
      entranceDirection: mls("SW", 0.85),
      lotShape: mls("irregular"),
      roadPosition: mls("t_junction"),
      openSpaceNE: sat("obstructed", 0.64),
      kitchenZone: fp("NE" as Zone, 0.8),
      primaryBedroomZone: fp("NE" as Zone, 0.8),
      bathroomZones: fp(["NE", "CENTER"] as Zone[], 0.78),
      staircaseZone: fp("NE" as Zone, 0.76),
      brahmasthan: fp("obstructed", 0.8),
      garageZone: sat("SW", 0.66),
      waterFeatures: mls([{ kind: "pool", direction: "SE" }]),
    },
  },
  {
    id: "p-redmaple",
    address: { line1: "4100 Kestrel Rd", city: RA, state: NC, zip: "27615", neighborhood: "Falls Lake" },
    price: 1_250_000,
    estimatedValue: 1_150_000,
    beds: 5,
    baths: 4,
    sqft: 3800,
    lotAcres: 0.5,
    yearBuilt: 2017,
    homeType: "single_family",
    style: "Modern",
    newConstruction: false,
    pool: true,
    garageSpaces: 3,
    garageType: "front_entry",
    privacy: "moderate",
    heroImage: "p-redmaple",
    images: [],
    coords: { lat: 35.915, lng: -78.64 },
    driveMinutes: 22,
    listingUrl: null,
    isDemo: true,
    source: "mock",
    vastu: {
      facingDirection: mls("S"),
      entranceDirection: mls("S", 0.85),
      lotShape: mls("regular"),
      roadPosition: mls("corner"),
      openSpaceNE: sat("moderate", 0.6),
      kitchenZone: fp("N" as Zone, 0.8),
      primaryBedroomZone: fp("NE" as Zone, 0.8),
      bathroomZones: fp(["NE"] as Zone[], 0.78),
      staircaseZone: fp("S" as Zone, 0.76),
      brahmasthan: fp("partial", 0.8),
      garageZone: sat("S", 0.64),
      waterFeatures: mls([{ kind: "pool", direction: "S" }]),
    },
  },
];

/**
 * Attach deterministic comparable sales to each demo property. These are
 * fictional (like the homes) but are generated to bracket the stored
 * estimatedValue, so the Value score is backed by visible evidence rather than
 * an unexplained number. The estimate is not recomputed from them, so scores
 * and verdicts stay stable.
 */
function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const COMP_STREETS = ["Wheatley Ct", "Lindholm Dr", "Caraway Ln", "Pembroke Way", "Saddle Creek Rd", "Verano Pl"];

/**
 * Anchor for sample comp sale dates. Must stay at/before DEMO_ANALYZED_AT
 * (2026-01-01) so every generated comp is a *past* closed sale relative to the
 * demo analysis date. (Kept as a local constant to avoid a demo ⇄ demo-analysis
 * import cycle.)
 */
const DEMO_COMP_ASOF = Date.UTC(2026, 0, 1); // 2026-01-01

/** Unsigned deterministic 0..1 from the seed (>>> keeps it nonnegative). */
function unit01(seed: number, shift: number): number {
  return ((seed >>> shift) % 1000) / 1000;
}

function makeComps(p: Property): Comp[] {
  const seed = hashId(p.id); // unsigned 32-bit
  const basePsf = p.estimatedValue / p.sqft;
  // Three fictional sample comps straddling the estimate: one under, near, over.
  const deltas = [-0.06, 0.01, 0.07];
  return deltas.map((d, i) => {
    const r = unit01(seed, i * 5); // deterministic 0..1, always nonnegative
    const sqft = Math.max(500, Math.round(p.sqft * (0.9 + r * 0.2)));
    const psf = basePsf * (1 + d) * (0.98 + r * 0.04);
    const soldPrice = Math.max(1000, Math.round((psf * sqft) / 1000) * 1000);
    // 1..10 whole months BEFORE the analysis date → always a past closed sale.
    const monthsAgo = 1 + ((seed >>> (i * 3)) % 10);
    const dt = new Date(DEMO_COMP_ASOF);
    dt.setUTCMonth(dt.getUTCMonth() - monthsAgo);
    const streetNum = 100 + ((seed >>> i) % 800); // 100..899, always positive
    const bedOff = ((seed >>> (i * 2)) % 3) - 1; // -1..+1
    const bathOff = (((seed >>> (i * 4)) % 3) - 1) * 0.5; // -0.5..+0.5
    return {
      address: `${streetNum} ${COMP_STREETS[(seed + i) % COMP_STREETS.length]}`,
      soldPrice,
      soldDate: dt.toISOString().slice(0, 10),
      sqft,
      beds: Math.max(2, p.beds + bedOff),
      baths: Math.max(1, Math.round((p.baths + bathOff) * 2) / 2),
      lotAcres: Math.max(0.05, +(p.lotAcres * (0.8 + r * 0.5)).toFixed(2)),
      distanceMiles: +(0.3 + r * 1.4).toFixed(1), // 0.3..1.7, always positive
    };
  });
}

/**
 * These homes are fictional, so their Vastu evidence is SAMPLE data — not a real
 * MLS/floor-plan/satellite source. Relabel every known attribute's source to
 * "demo" so the report says "Sample data" and never implies a real MLS supplied
 * it (values/confidence are preserved; verification caps at "Likely").
 */
function relabelAsDemoEvidence(v: PropertyVastu): void {
  (Object.keys(v) as (keyof PropertyVastu)[]).forEach((k) => {
    const a = v[k] as VastuAttribute<unknown>;
    if (a.value != null && a.source !== "unknown") a.source = "demo";
  });
}

for (const p of DEMO_PROPERTIES) {
  p.comps = makeComps(p);
  relabelAsDemoEvidence(p.vastu);
}

export function getDemoProperty(id: string): Property | undefined {
  return DEMO_PROPERTIES.find((p) => p.id === id);
}
