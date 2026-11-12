import { describe, it, expect } from "vitest";
import { resoPropertyToFacts, type ResoProperty } from "@/providers/mls/reso";
import { rankCandidates, distanceMeters } from "@/providers/mls/trestle";
import { parseAddress } from "@/domain/listing";
import type { AddressQuery } from "@/providers/mls/types";

const base: ResoProperty = {
  ListingKey: "L1",
  StreetNumber: "5208",
  StreetName: "Saddle",
  StreetSuffix: "Ct",
  City: "Raleigh",
  StateOrProvince: "NC",
  PostalCode: "27609",
  ListPrice: 540000,
  BedroomsTotal: 4,
  BathroomsTotalInteger: 3,
  LivingArea: 1850,
  LotSizeAcres: 0.4,
  YearBuilt: 1973,
  StandardStatus: "Active",
  ModificationTimestamp: "2026-02-01T00:00:00.000Z",
  Latitude: 35.8519,
  Longitude: -78.6152,
};

describe("resoPropertyToFacts", () => {
  it("normalizes facts and extracts the floor plan + photos from Media", () => {
    const facts = resoPropertyToFacts(
      { ...base, Media: [
        { MediaURL: "https://x/p1.jpg", MediaCategory: "Photo", Order: 1 },
        { MediaURL: "https://x/plan.png", MediaCategory: "Floor Plan", Order: 2 },
        { MediaURL: "https://x/p2.jpg", MediaCategory: "Photo", Order: 0 },
      ] },
    )!;
    expect(facts.beds).toBe(4);
    expect(facts.baths).toBe(3);
    expect(facts.sqft).toBe(1850);
    expect(facts.yearBuilt).toBe(1973);
    expect(facts.floorPlanUrl).toBe("https://x/plan.png");
    // photos sorted by Order, floor plan excluded
    expect(facts.photoUrls).toEqual(["https://x/p2.jpg", "https://x/p1.jpg"]);
    expect(facts.coords).toEqual({ lat: 35.8519, lng: -78.6152 });
  });

  it("leaves absent facts null — never fabricated", () => {
    const facts = resoPropertyToFacts({ ListingKey: "L2" })!;
    expect(facts.beds).toBeNull();
    expect(facts.baths).toBeNull();
    expect(facts.floorPlanUrl).toBeNull();
    expect(facts.photoUrls).toEqual([]);
    expect(facts.coords).toBeNull();
  });

  it("detects a floor plan from the description when category is generic", () => {
    const facts = resoPropertyToFacts({ ...base, Media: [
      { MediaURL: "https://x/fp.png", MediaCategory: "Document", ShortDescription: "Floor Plan - Main" },
    ] })!;
    expect(facts.floorPlanUrl).toBe("https://x/fp.png");
  });

  it("returns null without a listing key", () => {
    expect(resoPropertyToFacts({ BedroomsTotal: 3 })).toBeNull();
  });
});

describe("rankCandidates", () => {
  const q: AddressQuery = {
    raw: "5208 Saddle Ct, Raleigh NC 27609",
    streetNumber: "5208",
    streetName: "Saddle",
    city: "Raleigh",
    state: "NC",
    zip: "27609",
    lat: 35.8519,
    lng: -78.6152,
  };

  it("requires an exact street-number match", () => {
    const got = rankCandidates(
      [
        { ...base, StreetNumber: "5200" },
        { ...base, StreetNumber: "5208" },
      ],
      q,
    );
    expect(got?.StreetNumber).toBe("5208");
  });

  it("rejects a candidate more than 1 km from the geocode anchor", () => {
    const farAway = { ...base, Latitude: 35.90, Longitude: -78.70 }; // ~7 km away
    expect(rankCandidates([farAway], q)).toBeNull();
  });

  it("returns null when nothing matches the house number", () => {
    expect(rankCandidates([{ ...base, StreetNumber: "9999" }], q)).toBeNull();
  });
});

describe("distanceMeters", () => {
  it("is ~0 for the same point and positive otherwise", () => {
    expect(distanceMeters({ lat: 35.85, lng: -78.61 }, { lat: 35.85, lng: -78.61 })).toBeCloseTo(0, 5);
    expect(distanceMeters({ lat: 35.85, lng: -78.61 }, { lat: 35.86, lng: -78.61 })).toBeGreaterThan(900);
  });
});

describe("parseAddress", () => {
  it("splits a typical address", () => {
    const p = parseAddress("5208 Saddle Ct, Raleigh, NC 27609");
    expect(p.streetNumber).toBe("5208");
    expect(p.streetName).toBe("Saddle");
    expect(p.streetSuffix).toBe("Ct");
    expect(p.city).toBe("Raleigh");
    expect(p.state).toBe("NC");
    expect(p.zip).toBe("27609");
  });

  it("handles a comma-light 'city STATE zip' tail", () => {
    const p = parseAddress("1600 Pennsylvania Ave NW, Washington DC 20500");
    expect(p.streetNumber).toBe("1600");
    expect(p.zip).toBe("20500");
    expect(p.state).toBe("DC");
  });
});
