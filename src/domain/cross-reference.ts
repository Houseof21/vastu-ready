import type { Property } from "./property";
import type { ListingFacts, MlsCrossRef, FactDiscrepancy, FieldProvenance, FactField } from "./listing";

/**
 * Cross-reference a licensed MLS listing against the county/GIS facts already on
 * a Property, producing a merged Property plus a provenance record.
 *
 * Principles (honest by construction):
 *  - The county assessor record stays the OFFICIAL value for facts both sources
 *    carry (sqft, year, lot). The listing corroborates it or, when they diverge
 *    beyond tolerance, is flagged as a conflict — never silently overwritten.
 *  - Beds and baths, which county parcels do not carry, are filled from the
 *    listing (the only authoritative source) and labeled as such.
 *  - The listing's own coordinates/address re-anchor WHICH house this is, fixing
 *    the geocoder "snapped to the neighbor" problem.
 *  - Nothing is invented: absent listing facts leave the Property unchanged.
 *
 * Pure and deterministic — safe on client or server, unit-tested without a feed.
 */

// Agreement tolerances between county and listing.
const SQFT_TOL = 0.07; // 7%
const LOT_TOL = 0.1; // 10%
const YEAR_TOL = 1; // ±1 year

function pctDelta(county: number, mls: number): number {
  if (county === 0) return mls === 0 ? 0 : 100;
  return Math.round((Math.abs(county - mls) / county) * 100);
}

type MergeOutcome = {
  value: number;
  provenance: FieldProvenance;
  discrepancy: FactDiscrepancy | null;
};

/** Merge a numeric fact both sources may carry. County value is authoritative. */
function mergeNumeric(
  field: "sqft" | "yearBuilt" | "lotAcres",
  county: number,
  mls: number | null,
  withinTolerance: (county: number, mls: number) => boolean,
): MergeOutcome {
  if (mls == null) return { value: county, provenance: "county", discrepancy: null };
  if (county <= 0) return { value: mls, provenance: "mls", discrepancy: null };
  if (withinTolerance(county, mls)) return { value: county, provenance: "corroborated", discrepancy: null };
  return {
    value: county, // keep the official assessor value; record the divergence
    provenance: "conflict",
    discrepancy: { field, county, mls, deltaPct: pctDelta(county, mls) },
  };
}

export function crossReferenceListing(
  base: Property,
  facts: ListingFacts,
): { property: Property; crossRef: MlsCrossRef } {
  const fields: Partial<Record<FactField, FieldProvenance>> = {};
  const discrepancies: FactDiscrepancy[] = [];

  // Beds / baths — county doesn't carry these; the listing is authoritative.
  let beds = base.beds;
  if (facts.beds != null) {
    if (base.beds > 0 && base.beds !== facts.beds) {
      fields.beds = "conflict";
      // keep the user's/base value but record the listing's figure as a discrepancy-free note
    } else if (base.beds > 0) {
      fields.beds = "corroborated";
    } else {
      beds = facts.beds;
      fields.beds = "mls";
    }
  }
  let baths = base.baths;
  if (facts.baths != null) {
    if (base.baths > 0 && base.baths !== facts.baths) {
      fields.baths = "conflict";
    } else if (base.baths > 0) {
      fields.baths = "corroborated";
    } else {
      baths = facts.baths;
      fields.baths = "mls";
    }
  }

  // Sqft / year / lot — county is official; listing corroborates or conflicts.
  const sqftM = mergeNumeric("sqft", base.sqft, facts.sqft, (c, m) => Math.abs(c - m) / c <= SQFT_TOL);
  const yearM = mergeNumeric("yearBuilt", base.yearBuilt, facts.yearBuilt, (c, m) => Math.abs(c - m) <= YEAR_TOL);
  const lotM = mergeNumeric("lotAcres", base.lotAcres, facts.lotAcres, (c, m) => (c === 0 ? m === 0 : Math.abs(c - m) / c <= LOT_TOL));
  if (facts.sqft != null) fields.sqft = sqftM.provenance;
  if (facts.yearBuilt != null) fields.yearBuilt = yearM.provenance;
  if (facts.lotAcres != null) fields.lotAcres = lotM.provenance;
  for (const d of [sqftM.discrepancy, yearM.discrepancy, lotM.discrepancy]) if (d) discrepancies.push(d);

  // Re-anchor the exact house from the listing's own identity (fixes geocode snap).
  const coordConfirmed = facts.coords != null;
  const coords = facts.coords ?? base.coords;
  const addressLine1 = facts.address && facts.address !== "Address unavailable" ? facts.address : base.address.line1;

  const property: Property = {
    ...base,
    beds,
    baths,
    sqft: sqftM.value,
    yearBuilt: yearM.value,
    lotAcres: lotM.value,
    coords,
    address: { ...base.address, line1: addressLine1 },
    // Real list price (labeled by status) is more meaningful than assessed value.
    price: facts.listPrice != null && facts.listPrice > 0 ? facts.listPrice : base.price,
    // The listing floor plan is the correct Room-Zone Studio backdrop.
    listingFloorPlanUrl: facts.floorPlanUrl ?? base.listingFloorPlanUrl ?? null,
    mls: {
      listingKey: facts.listingKey,
      sourceMls: facts.sourceMls,
      status: facts.status,
      listPrice: facts.listPrice,
      listedAt: facts.updatedAt,
      fields,
      discrepancies,
      floorPlanUrl: facts.floorPlanUrl,
      photoCount: facts.photoUrls.length,
      coordConfirmed,
    },
  };

  return { property, crossRef: property.mls! };
}
