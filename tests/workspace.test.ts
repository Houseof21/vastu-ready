import { describe, it, expect } from "vitest";
import { newWorkspace, clientView, type Workspace } from "@/domain/workspace";

function sample(): Workspace {
  const w = newWorkspace("ws1", "Client", "Agent");
  w.sharedHomes = [{ propertyId: "p-cardinal", addedBy: "realtor", at: 1, comments: [], reactions: {} }];
  w.tours = [{ id: "t1", propertyId: "p-cardinal", by: "client", proposedFor: "2026-02-01T10:00", status: "proposed", at: 1 }];
  w.tasks = [{ id: "k1", title: "x", done: false, by: "realtor", at: 1 }];
  w.realtorPrivateNotes = [{ id: "p1", text: "Client is pre-approved to $900k — confidential", at: 1 }];
  return w;
}

describe("workspace client isolation", () => {
  it("clientView removes realtor private notes entirely", () => {
    const c = clientView(sample());
    expect("realtorPrivateNotes" in c).toBe(false);
    expect(JSON.stringify(c)).not.toContain("confidential");
  });
  it("clientView preserves shared homes, tours, and tasks", () => {
    const c = clientView(sample());
    expect(c.sharedHomes.length).toBe(1);
    expect(c.tours.length).toBe(1);
    expect(c.tasks.length).toBe(1);
  });
});
