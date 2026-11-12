import { describe, it, expect } from "vitest";
import { resoToListing, resoToEvent, resoBatchToEvents, type ResoProperty } from "@/providers/mls/reso";
import { listingKey } from "@/domain/hotsheet";

const rec: ResoProperty = {
  ListingKey: "ABC123",
  ListingId: "2500001",
  UnparsedAddress: "123 Main St, Raleigh, NC 27601",
  ListPrice: 525000,
  BedroomsTotal: 3,
  BathroomsTotalInteger: 2,
  LivingArea: 2100,
  StandardStatus: "Active",
  PublicRemarks: "Lovely home",
  PrivateRemarks: "Lockbox on back door",
  ShowingInstructions: "Call listing agent",
  ModificationTimestamp: "2026-01-02T12:00:00.000Z",
};

describe("RESO → hot sheet mapping", () => {
  it("maps standard fields and carries agent-only fields", () => {
    const l = resoToListing(rec, "doorify")!;
    expect(l.key).toBe(listingKey("doorify", "ABC123"));
    expect(l.price).toBe(525000);
    expect(l.beds).toBe(3);
    expect(l.baths).toBe(2);
    expect(l.sqft).toBe(2100);
    expect(l.status).toBe("Active");
    expect(l.privateRemarks).toBe("Lockbox on back door");
    expect(l.showingInstructions).toBe("Call listing agent");
    expect(l.demo).toBe(false);
    expect(l.updatedAt).toBe(Date.parse("2026-01-02T12:00:00.000Z"));
  });

  it("composes an address from parts when UnparsedAddress is absent", () => {
    const l = resoToListing(
      { ListingKey: "X", StreetNumber: "456", StreetName: "Oak", StreetSuffix: "Ave", City: "Cary", StateOrProvince: "NC", PostalCode: "27511" },
      "doorify",
    )!;
    expect(l.address).toBe("456 Oak Ave, Cary, NC, 27511");
  });

  it("produces a stable, dedupable event id and skips records without a key", () => {
    const e = resoToEvent(rec, "doorify")!;
    expect(e.eventId).toContain("doorify:ABC123");
    expect(e.sourceId).toBe("ABC123");
    expect(resoToEvent({ ListPrice: 1 }, "doorify")).toBeNull();
  });

  it("batches a RESO value array", () => {
    const events = resoBatchToEvents([rec, { ListPrice: 1 }, { ...rec, ListingKey: "DEF" }], "doorify");
    expect(events.length).toBe(2); // the keyless record is dropped
  });
});
