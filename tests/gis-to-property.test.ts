import { describe, it, expect } from "vitest";
import { gisResultToProperty } from "@/providers/gis/to-property";
import type { GisOrientationResult } from "@/providers/gis/orientation-from-gis";
import { emptyOrientation } from "@/domain/orientation";

function completeResult(): GisOrientationResult {
  const o = emptyOrientation();
  o.entranceFacing = { bearingDeg: 336, cardinal: "NW", northType: "true", uncertaintyDeg: 20, confirmed: false, source: "gis" };
  o.buildingFrontage = "NW";
  o.northType = "true";
  o.planNorthDeg = 0;
  o.needsConfirmation = ["no_entrance"];
  return {
    ok: true,
    stage: "complete",
    message: "ok",
    matchedAddress: "2515 SANDERSON DR, RALEIGH, NC, 27608",
    coords: { lng: -78.6539, lat: 35.8136 },
    parcel: {
      siteAddress: "2515 SANDERSON DR",
      city: "RALEIGH",
      zip: "27608",
      deedAcres: 0.33,
      yearBuilt: 1958,
      heatedAreaSqft: 5462,
      assessedValue: 1603491,
      typeUse: "SINGLFAM",
    },
    vastuExterior: {
      facingDirection: { value: "NW", confidence: 0.62, source: "satellite" },
      lotShape: { value: "regular", confidence: 0.7, source: "satellite" },
      roadPosition: { value: "corner", confidence: 0.55, source: "inference" },
      openSpaceNE: { value: "open", confidence: 0.5, source: "satellite" },
    },
    orientation: o,
    aerialUrl: "https://example.com/aerial.png",
  };
}

describe("gisResultToProperty", () => {
  it("maps real county facts and keeps interior unknown", () => {
    const p = gisResultToProperty(completeResult())!;
    expect(p).not.toBeNull();
    expect(p.source).toBe("gis");
    expect(p.isDemo).toBe(false);
    // real assessor facts
    expect(p.sqft).toBe(5462);
    expect(p.lotAcres).toBe(0.33);
    expect(p.yearBuilt).toBe(1958);
    expect(p.price).toBe(1603491);
    // exterior vastu present
    expect(p.vastu.facingDirection.value).toBe("NW");
    expect(p.vastu.lotShape.value).toBe("regular");
    // interior stays unknown — never guessed
    expect(p.vastu.kitchenZone.value).toBeNull();
    expect(p.vastu.primaryBedroomZone.value).toBeNull();
    expect(p.vastu.brahmasthan.value).toBeNull();
    // beds/baths unknown (0), commute unknown
    expect(p.beds).toBe(0);
    expect(p.driveMinutes).toBeNull();
    // orientation attached, unconfirmed, no fabricated comps
    expect(p.orientation?.entranceFacing.confirmed).toBe(false);
    expect(p.comps).toEqual([]);
  });

  it("returns null for an incomplete result", () => {
    expect(gisResultToProperty({ ok: false, stage: "parcel", message: "no parcel" })).toBeNull();
  });
});
