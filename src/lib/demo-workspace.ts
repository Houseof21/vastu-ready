import { newWorkspace, type Workspace } from "@/domain/workspace";
import { DEMO_PROPERTIES } from "@/data/demo";

/**
 * A clearly-labeled demo shared workspace so the client–realtor portal is
 * reviewable without live data. Homes referenced are the fictional demo homes.
 */
export function seedDemoWorkspace(realtorName = "Your Agent", clientName = "Sample Client"): Workspace {
  const ws = newWorkspace(`ws-demo-${Date.now().toString(36)}`, clientName, realtorName);
  const ids = DEMO_PROPERTIES.slice(0, 3).map((p) => p.id);
  const now = Date.now();
  ws.sharedHomes = ids.map((propertyId, i) => ({
    propertyId,
    addedBy: i === 0 ? "realtor" : "client",
    at: now - (3 - i) * 3_600_000,
    comments:
      i === 0
        ? [
            { id: "c1", by: "realtor", authorName: realtorName, text: "This one matches your NE-facing preference — worth a tour.", at: now - 3_000_000 },
            { id: "c2", by: "client", authorName: clientName, text: "Love the lot. Can we see it this weekend?", at: now - 2_400_000 },
          ]
        : [],
    reactions: i === 0 ? { client: "love", realtor: "like" } : {},
  }));
  ws.tours = [
    { id: "t1", propertyId: ids[0]!, by: "client", proposedFor: new Date(now + 2 * 86_400_000).toISOString().slice(0, 16), status: "proposed", note: "Saturday afternoon?", at: now - 2_000_000 },
  ];
  ws.tasks = [
    { id: "k1", title: "Send pre-approval letter", done: false, by: "realtor", at: now - 1_800_000 },
    { id: "k2", title: "Confirm Saturday tour time", done: false, by: "realtor", at: now - 1_700_000 },
  ];
  ws.realtorPrivateNotes = [
    { id: "p1", text: "Client is pre-approved to $900k but prefers to stay under $800k. Flexible on commute.", at: now - 1_900_000 },
  ];
  return ws;
}
