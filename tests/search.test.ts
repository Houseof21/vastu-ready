import { describe, it, expect } from "vitest";
import { emptySavedSearch, matchesHard, type SavedSearch } from "@/domain/search";
import type { Property } from "@/domain/property";

function search(hard: Partial<SavedSearch["hard"]>): SavedSearch {
  const s = emptySavedSearch("s1");
  s.hard = { ...s.hard, ...hard };
  return s;
}

const base = {
  id: "x",
  price: 800000,
  beds: 4,
  baths: 3,
  sqft: 3200,
  lotAcres: 0.6,
  driveMinutes: 18 as number | null,
} as unknown as Property;

describe("matchesHard enforces hard requirements", () => {
  it("passes a home meeting all requirements", () => {
    const s = search({ maxBudget: 900000, minBeds: 4, minLotAcres: 0.5, maxDriveMinutes: 20, acceptableFacings: ["NE"] });
    expect(matchesHard(s, base, "NE")).toBe(true);
  });
  it("fails over budget", () => {
    expect(matchesHard(search({ maxBudget: 700000 }), base, "NE")).toBe(false);
  });
  it("fails below min beds / lot", () => {
    expect(matchesHard(search({ minBeds: 5 }), base, "NE")).toBe(false);
    expect(matchesHard(search({ minLotAcres: 1 }), base, "NE")).toBe(false);
  });
  it("unknown commute cannot satisfy a commute cap", () => {
    const noCommute = { ...base, driveMinutes: null } as Property;
    expect(matchesHard(search({ maxDriveMinutes: 30 }), noCommute, "NE")).toBe(false);
  });
  it("unknown facing cannot satisfy a facing requirement", () => {
    expect(matchesHard(search({ acceptableFacings: ["NE"] }), base, null)).toBe(false);
  });
  it("a flexible-only search matches any home", () => {
    const s = emptySavedSearch("s2");
    s.flexible.priorities = ["large_lot"];
    expect(matchesHard(s, base, null)).toBe(true);
  });
});
