import { describe, it, expect } from "vitest";
import { isEligibleComp, compStats } from "@/domain/comps";
import type { Comp } from "@/domain/property";
import { DEMO_PROPERTIES, getDemoProperty } from "@/data/demo";
import { DEMO_ANALYZED_AT } from "@/lib/demo-analysis";

const asOf = Date.parse(DEMO_ANALYZED_AT);

const good: Comp = {
  address: "412 Lindholm Dr",
  soldPrice: 800000,
  soldDate: "2025-09-01",
  sqft: 2600,
  beds: 4,
  baths: 3,
  lotAcres: 0.3,
  distanceMiles: 0.6,
};

describe("isEligibleComp rejects invalid rows", () => {
  it("accepts a valid past sale", () => {
    expect(isEligibleComp(good, asOf)).toBe(true);
  });
  it("rejects a negative street number", () => {
    expect(isEligibleComp({ ...good, address: "-104 Lindholm Dr" }, asOf)).toBe(false);
  });
  it("rejects a negative distance", () => {
    expect(isEligibleComp({ ...good, distanceMiles: -0.4 }, asOf)).toBe(false);
  });
  it("rejects a nonpositive price or sqft", () => {
    expect(isEligibleComp({ ...good, soldPrice: 0 }, asOf)).toBe(false);
    expect(isEligibleComp({ ...good, sqft: 0 }, asOf)).toBe(false);
  });
  it("rejects a sale dated after the analysis date", () => {
    expect(isEligibleComp({ ...good, soldDate: "2027-02-01" }, asOf)).toBe(false);
  });
});

describe("compStats uses only eligible comps", () => {
  it("computes median sold price and $/sqft from the displayed comps", () => {
    const comps: Comp[] = [
      { ...good, soldPrice: 700000, sqft: 2000 }, // 350/sqft
      { ...good, soldPrice: 800000, sqft: 2000 }, // 400/sqft
      { ...good, soldPrice: 900000, sqft: 2000 }, // 450/sqft
    ];
    const s = compStats(comps, 2000, asOf)!;
    expect(s.count).toBe(3);
    expect(s.medianSoldPrice).toBe(800000);
    expect(Math.round(s.medianPsf)).toBe(400);
    expect(s.impliedValue).toBe(800000);
  });
  it("excludes ineligible rows before computing", () => {
    const comps: Comp[] = [
      good,
      { ...good, soldPrice: -5 }, // dropped
      { ...good, soldDate: "2030-01-01" }, // dropped
    ];
    const s = compStats(comps, 2600, asOf)!;
    expect(s.count).toBe(1);
  });
  it("returns null when nothing is eligible", () => {
    expect(compStats([{ ...good, soldPrice: -1 }], 2600, asOf)).toBeNull();
    expect(compStats([], 2600, asOf)).toBeNull();
  });
});

describe("every demo property's generated comps are clean", () => {
  for (const p of DEMO_PROPERTIES) {
    it(`${p.id} has only eligible comps as of the analysis date`, () => {
      const comps = p.comps ?? [];
      expect(comps.length).toBeGreaterThan(0);
      for (const c of comps) {
        expect(isEligibleComp(c, asOf), `${p.id}: ${c.address} @ ${c.soldDate} $${c.soldPrice} ${c.distanceMiles}mi`).toBe(true);
        expect(c.distanceMiles).toBeGreaterThanOrEqual(0);
        expect(c.soldPrice).toBeGreaterThan(0);
        expect(c.sqft).toBeGreaterThan(0);
        expect(Date.parse(c.soldDate)).toBeLessThanOrEqual(asOf); // no future sales
        expect(Number(c.address.match(/^(\d+)/)![1])).toBeGreaterThan(0); // positive street #
      }
    });
  }

  it("p-cardinal specifically: stated median equals the median of displayed prices", () => {
    const p = getDemoProperty("p-cardinal")!;
    const s = compStats(p.comps, p.sqft, asOf)!;
    const sorted = [...s.eligible.map((c) => c.soldPrice)].sort((a, b) => a - b);
    const mid =
      sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]!
        : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
    expect(s.medianSoldPrice).toBe(Math.round(mid));
  });
});
