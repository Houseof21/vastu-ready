import { describe, it, expect } from "vitest";
import { crossReferenceListing } from "@/domain/cross-reference";
import { gisResultToProperty } from "@/providers/gis/to-property";
import type { GisOrientationResult } from "@/providers/gis/orientation-from-gis";
import type { ListingFacts } from "@/domain/listing";
import { emptyOrientation } from "@/domain/orientation";

function wakeProperty() {
  const o = emptyOrientation();
  o.entranceFacing = { bearingDeg: 136, cardinal: "SE", northType: "true", uncertaintyDeg: 42, confirmed: false, source: "gis" };
  const gis: GisOrientationResult = {
    ok: true,
    stage: "complete",
    message: "ok",
    matchedAddress: "5200 SADDLE CT, RALEIGH, NC, 27609",
    coords: { lng: -78.6152, lat: 35.8519 },
    parcel: {
      siteAddress: "5200 SADDLE CT",
      city: "RALEIGH",
      zip: "27609",
      deedAcres: 0.39,
      yearBuilt: 1973,
      heatedAreaSqft: 1293,
      assessedValue: 469516,
      typeUse: "SINGLFAM",
    },
    vastuExterior: {
      facingDirection: { value: "SE", confidence: 0.62, source: "satellite" },
      lotShape: { value: "triangular", confidence: 0.7, source: "satellite" },
      roadPosition: { value: "corner", confidence: 0.55, source: "inference" },
      openSpaceNE: { value: "moderate", confidence: 0.5, source: "satellite" },
    },
    orientation: o,
    aerialUrl: "https://example.com/aerial.png",
    coverage: "wake",
  };
  return gisResultToProperty(gis)!;
}

const factsBase: ListingFacts = {
  listingKey: "L1",
  sourceMls: "doorify",
  status: "Active",
  listPrice: 540000,
  beds: 4,
  baths: 3,
  sqft: 1293,
  lotAcres: 0.39,
  yearBuilt: 1973,
  coords: { lat: 35.85197, lng: -78.61521 },
  address: "5208 SADDLE CT, RALEIGH, NC, 27609",
  floorPlanUrl: "https://x/plan.png",
  photoUrls: ["https://x/1.jpg"],
  updatedAt: Date.parse("2026-02-01T00:00:00Z"),
};

describe("crossReferenceListing", () => {
  it("fills beds/baths the county lacks and labels them from MLS", () => {
    const { property, crossRef } = crossReferenceListing(wakeProperty(), factsBase);
    expect(property.beds).toBe(4);
    expect(property.baths).toBe(3);
    expect(crossRef.fields.beds).toBe("mls");
    expect(crossRef.fields.baths).toBe("mls");
  });

  it("corroborates matching sqft/year/lot and keeps the county value", () => {
    const { property, crossRef } = crossReferenceListing(wakeProperty(), factsBase);
    expect(property.sqft).toBe(1293); // county value retained
    expect(crossRef.fields.sqft).toBe("corroborated");
    expect(crossRef.fields.yearBuilt).toBe("corroborated");
    expect(crossRef.fields.lotAcres).toBe("corroborated");
    expect(crossRef.discrepancies).toHaveLength(0);
  });

  it("flags a conflict when sqft diverges beyond tolerance, keeping the county record", () => {
    const { property, crossRef } = crossReferenceListing(wakeProperty(), { ...factsBase, sqft: 2200 });
    expect(property.sqft).toBe(1293); // official county value stays
    expect(crossRef.fields.sqft).toBe("conflict");
    expect(crossRef.discrepancies[0]).toMatchObject({ field: "sqft", county: 1293, mls: 2200 });
  });

  it("re-anchors the exact house from the listing's own address + coords", () => {
    const { property, crossRef } = crossReferenceListing(wakeProperty(), factsBase);
    expect(property.address.line1).toBe("5208 SADDLE CT, RALEIGH, NC, 27609");
    expect(property.coords).toEqual({ lat: 35.85197, lng: -78.61521 });
    expect(crossRef.coordConfirmed).toBe(true);
  });

  it("attaches the listing floor plan and the real list price", () => {
    const { property, crossRef } = crossReferenceListing(wakeProperty(), factsBase);
    expect(property.listingFloorPlanUrl).toBe("https://x/plan.png");
    expect(crossRef.floorPlanUrl).toBe("https://x/plan.png");
    expect(property.price).toBe(540000);
  });

  it("does not invent facts the listing omits", () => {
    const { property, crossRef } = crossReferenceListing(wakeProperty(), {
      ...factsBase,
      beds: null,
      floorPlanUrl: null,
    });
    expect(property.beds).toBe(0); // county had none; listing had none → still unknown
    expect(crossRef.fields.beds).toBeUndefined();
    expect(property.listingFloorPlanUrl).toBeNull();
  });
});
