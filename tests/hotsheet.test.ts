import { describe, it, expect } from "vitest";
import {
  applyEvents,
  emptyHotSheet,
  listingsList,
  listingForClient,
  listingKey,
  type HotSheetEvent,
  type HotSheetListing,
} from "@/domain/hotsheet";

function listing(sourceMls: string, sourceId: string, over: Partial<HotSheetListing> = {}): HotSheetListing {
  return {
    key: listingKey(sourceMls, sourceId),
    sourceMls,
    sourceId,
    address: `${sourceId} Main St`,
    price: 500000,
    beds: 3,
    baths: 2,
    sqft: 2000,
    status: "Active",
    updatedAt: 1000,
    privateRemarks: "agent only",
    showingInstructions: "call first",
    demo: true,
    ...over,
  };
}

function ev(sourceMls: string, sourceId: string, at: number, changeType: HotSheetEvent["changeType"] = "new"): HotSheetEvent {
  return {
    eventId: `${sourceMls}:${sourceId}:${changeType}:${at}`,
    sourceMls,
    sourceId,
    changeType,
    at,
    listing: listing(sourceMls, sourceId, { updatedAt: at }),
  };
}

describe("hot-sheet sync engine", () => {
  it("does not duplicate listings or alerts on replay", () => {
    const batch = [ev("tmls", "A1", 100), ev("tmls", "A2", 200)];
    let s = applyEvents(emptyHotSheet(), batch);
    expect(listingsList(s).length).toBe(2);
    expect(s.newListingKeys.length).toBe(2);
    // Replay the exact same batch — idempotent.
    s = applyEvents(s, batch);
    expect(listingsList(s).length).toBe(2);
    expect(s.appliedEventIds.length).toBe(2);
    expect(s.newListingKeys.length).toBe(2);
  });

  it("keeps overlapping feeds distinct by source identity", () => {
    const s = applyEvents(emptyHotSheet(), [ev("tmls", "X", 100), ev("canopy", "X", 100)]);
    expect(listingsList(s).length).toBe(2); // same sourceId, different MLS → two rows
  });

  it("advances the checkpoint to the newest applied event", () => {
    const s = applyEvents(emptyHotSheet(), [ev("tmls", "A", 100), ev("tmls", "B", 350)]);
    expect(s.checkpoint).toBe(350);
  });

  it("updates in place and handles removal", () => {
    let s = applyEvents(emptyHotSheet(), [ev("tmls", "A", 100)]);
    s = applyEvents(s, [{ ...ev("tmls", "A", 200, "price"), listing: listing("tmls", "A", { price: 475000, updatedAt: 200 }) }]);
    expect(listingsList(s).length).toBe(1);
    expect(listingsList(s)[0]!.price).toBe(475000);
    s = applyEvents(s, [ev("tmls", "A", 300, "removed")]);
    expect(listingsList(s).length).toBe(0);
  });

  it("strips agent-only fields for client view", () => {
    const l = listing("tmls", "A");
    const c = listingForClient(l);
    expect("privateRemarks" in c).toBe(false);
    expect("showingInstructions" in c).toBe(false);
    expect(c.address).toBe(l.address);
  });
});
