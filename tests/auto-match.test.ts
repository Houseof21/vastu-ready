import { describe, it, expect } from "vitest";
import { autoMatch, facingFit, type ScoredCandidate } from "@/domain/auto-match";
import { emptySavedSearch, type SavedSearch } from "@/domain/search";
import type { Property } from "@/domain/property";
import type { PropertyAnalysis } from "@/domain/scoring";
import type { Cardinal8 } from "@/domain/types";

function prop(id: string, o: Partial<Property> & { facing?: Cardinal8 | null }): Property {
  const facing = o.facing ?? null;
  return {
    id,
    address: { line1: id, city: "Raleigh", state: "NC", zip: "27609", neighborhood: "" },
    price: o.price ?? 400000,
    estimatedValue: o.price ?? 400000,
    beds: o.beds ?? 4,
    baths: o.baths ?? 3,
    sqft: o.sqft ?? 2000,
    lotAcres: o.lotAcres ?? 0.5,
    yearBuilt: 1990,
    homeType: "single_family",
    style: "",
    newConstruction: false,
    pool: false,
    garageSpaces: 2,
    garageType: "front_entry",
    privacy: "moderate",
    heroImage: "",
    images: [],
    coords: { lat: 35.8, lng: -78.6 },
    driveMinutes: o.driveMinutes ?? 20,
    listingUrl: null,
    vastu: { facingDirection: { value: facing, confidence: facing ? 0.9 : 0, source: facing ? "satellite" : "unknown" } } as Property["vastu"],
    isDemo: false,
    source: "gis",
  };
}

function cand(p: Property, overall: number): ScoredCandidate {
  return { property: p, analysis: { scores: { overall } } as PropertyAnalysis };
}

function search(over: Partial<SavedSearch["hard"]>, facingMode: SavedSearch["facingMode"] = "required"): SavedSearch {
  const s = emptySavedSearch("s1");
  s.hard = { ...s.hard, ...over };
  s.facingMode = facingMode;
  return s;
}

describe("facingFit", () => {
  it("classifies against the acceptable set", () => {
    expect(facingFit([], "S")).toBe("any");
    expect(facingFit(["N", "E"], null)).toBe("unknown");
    expect(facingFit(["N", "E"], "E")).toBe("match");
    expect(facingFit(["N", "E"], "S")).toBe("off");
  });
});

describe("autoMatch — required facing", () => {
  const s = search({ acceptableFacings: ["N", "NE", "E"] }, "required");
  const candidates = [
    cand(prop("match", { facing: "NE" }), 70),
    cand(prop("off", { facing: "SW" }), 95),
    cand(prop("unknown", { facing: null }), 90),
  ];

  it("excludes off-facing and unknown-facing homes entirely", () => {
    const r = autoMatch(s, candidates);
    expect(r.map((m) => m.property.id)).toEqual(["match"]);
    expect(r[0].facingFit).toBe("match");
  });

  it("still enforces non-facing hard requirements", () => {
    const sb = search({ acceptableFacings: ["N", "NE", "E"], maxBudget: 300000 }, "required");
    const r = autoMatch(sb, [cand(prop("pricey", { facing: "NE", price: 500000 }), 99)]);
    expect(r).toHaveLength(0);
  });
});

describe("autoMatch — preferred facing", () => {
  const s = search({ acceptableFacings: ["N", "NE", "E"] }, "preferred");
  const candidates = [
    cand(prop("match70", { facing: "NE" }), 70),
    cand(prop("off95", { facing: "SW" }), 95),
    cand(prop("unknown90", { facing: null }), 90),
  ];

  it("keeps off-facing homes but ranks acceptable facings competitively via penalty", () => {
    const r = autoMatch(s, candidates);
    expect(r.map((m) => m.property.id)).toEqual(["unknown90", "off95", "match70"]);
    // off95: 95-18=77, unknown90: 90-10=80, match70: 70 → order 80,77,70
    expect(r.find((m) => m.property.id === "off95")!.rankScore).toBe(77);
    expect(r.find((m) => m.property.id === "unknown90")!.rankScore).toBe(80);
    expect(r.find((m) => m.property.id === "match70")!.rankScore).toBe(70);
  });

  it("a strong-enough off-facing home can still outrank a weak match", () => {
    const r = autoMatch(s, [cand(prop("m", { facing: "N" }), 50), cand(prop("o", { facing: "S" }), 90)]);
    expect(r[0].property.id).toBe("o"); // 90-18=72 > 50
  });
});

describe("autoMatch — no facing preference", () => {
  it("ranks purely by overall when acceptableFacings is empty", () => {
    const s = search({});
    const r = autoMatch(s, [cand(prop("a", { facing: "S" }), 60), cand(prop("b", { facing: "W" }), 80)]);
    expect(r.map((m) => m.property.id)).toEqual(["b", "a"]);
    expect(r.every((m) => m.facingFit === "any")).toBe(true);
  });

  it("respects the limit", () => {
    const s = search({});
    const many = [1, 2, 3, 4].map((n) => cand(prop(`p${n}`, { facing: "N" }), n * 10));
    expect(autoMatch(s, many, { limit: 2 }).map((m) => m.property.id)).toEqual(["p4", "p3"]);
  });
});
