/**
 * Listing cross-reference domain: the normalized facts a licensed MLS listing
 * carries (beds, baths, floor plan, photos) and the provenance block recorded
 * when those facts are cross-referenced against county GIS.
 *
 * Honest by construction:
 *  - These types only ever hold data that came from a REAL licensed feed. The
 *    resolver returns `null` facts when nothing is connected or nothing matches;
 *    nothing here is ever synthesized from a public listing site or guessed.
 *  - Where a listing and the county assessor both state a fact (sqft, year, lot),
 *    we record agreement or conflict instead of silently preferring one — the
 *    county record stays the official value, the listing is corroboration.
 */

/** A US street address broken into the parts a RESO query / ranker needs. */
export type ParsedAddress = {
  raw: string;
  streetNumber: string | null;
  /** Core street name WITHOUT unit/suffix/dir (best for RESO StreetName filters). */
  streetName: string | null;
  streetSuffix: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

const SUFFIXES = new Set([
  "st","street","ave","avenue","blvd","boulevard","rd","road","dr","drive","ln","lane","ct","court",
  "cir","circle","pl","place","way","ter","terrace","trl","trail","pkwy","parkway","hwy","highway",
  "loop","run","pass","path","row","walk","cres","crescent","sq","square","pt","point","xing","crossing",
]);

/** Parse a free-typed US address. Lossy but deterministic; unknown parts stay null. */
export function parseAddress(raw: string): ParsedAddress {
  const out: ParsedAddress = {
    raw: raw.trim(),
    streetNumber: null,
    streetName: null,
    streetSuffix: null,
    city: null,
    state: null,
    zip: null,
  };
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return out;

  // Street line: "5208 Saddle Ct"
  const streetLine = parts[0];
  const tokens = streetLine.split(/\s+/).filter(Boolean);
  if (tokens.length && /^\d+[a-z]?$/i.test(tokens[0])) {
    out.streetNumber = tokens[0];
    const rest = tokens.slice(1);
    // Pull a trailing suffix token if it's a known street suffix.
    if (rest.length >= 2) {
      const last = rest[rest.length - 1].toLowerCase().replace(/\./g, "");
      if (SUFFIXES.has(last)) {
        out.streetSuffix = rest[rest.length - 1].replace(/\./g, "");
        out.streetName = rest.slice(0, -1).join(" ") || null;
      } else {
        out.streetName = rest.join(" ") || null;
      }
    } else {
      out.streetName = rest.join(" ") || null;
    }
  } else {
    out.streetName = streetLine || null;
  }

  // Remaining parts: city, then "STATE ZIP" (in any of the trailing segments).
  const tail = parts.slice(1);
  for (const seg of tail) {
    const m = seg.match(/\b([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?\b/);
    if (m) {
      out.state = m[1].toUpperCase();
      out.zip = m[2];
    } else if (/^\d{5}(?:-\d{4})?$/.test(seg)) {
      out.zip = seg.slice(0, 5);
    } else if (!out.city && !/^\d/.test(seg)) {
      out.city = seg;
    }
  }
  // A bare "raleigh nc 27609" style last segment where city rode along with state.
  if (!out.city && tail.length) {
    const first = tail[0].replace(/\b[A-Za-z]{2}\s+\d{5}.*$/, "").trim();
    if (first && !/^\d/.test(first)) out.city = first;
  }
  return out;
}

/** Normalized facts from a licensed MLS listing (RESO Data Dictionary). */
export type ListingFacts = {
  listingKey: string;
  sourceMls: string;
  /** RESO StandardStatus, e.g. "Active", "Closed", "Pending". */
  status: string;
  listPrice: number | null;
  beds: number | null;
  baths: number | null;
  /** LivingArea (heated sqft). */
  sqft: number | null;
  lotAcres: number | null;
  yearBuilt: number | null;
  /** The listing's own coordinates — authoritative for WHICH house this is. */
  coords: { lat: number; lng: number } | null;
  address: string;
  /** First Media with MediaCategory "Floor Plan" (or null if the listing has none). */
  floorPlanUrl: string | null;
  photoUrls: string[];
  /** ModificationTimestamp (ms epoch). */
  updatedAt: number;
};

/** Where a fact's value came from after cross-referencing a listing and county. */
export type FieldProvenance = "mls" | "county" | "corroborated" | "conflict";

export type FactField = "beds" | "baths" | "sqft" | "yearBuilt" | "lotAcres";

/** A county-vs-listing disagreement on a fact both sources carry. */
export type FactDiscrepancy = {
  field: "sqft" | "yearBuilt" | "lotAcres";
  county: number;
  mls: number;
  deltaPct: number;
};

/**
 * Provenance recorded on a Property after a listing was cross-referenced.
 * Carries no secrets — safe to send to the client.
 */
export type MlsCrossRef = {
  listingKey: string;
  sourceMls: string;
  status: string;
  listPrice: number | null;
  listedAt: number;
  /** Per-field provenance (which fields the listing filled or corroborated). */
  fields: Partial<Record<FactField, FieldProvenance>>;
  discrepancies: FactDiscrepancy[];
  floorPlanUrl: string | null;
  photoCount: number;
  /** True when the listing's own coords/address re-anchored the exact house. */
  coordConfirmed: boolean;
};

/** Result of trying to resolve a single address to a licensed listing. */
export type ListingResolveResult = {
  /** True when server-side feed credentials exist (reachable). */
  connected: boolean;
  /** True when a listing matched the address. */
  found: boolean;
  facts: ListingFacts | null;
  message: string;
  candidatesConsidered: number;
};
