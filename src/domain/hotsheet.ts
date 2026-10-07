/**
 * Hot-sheet sync engine. Turns a stream of MLS change events into a deduplicated
 * set of listings with an incremental checkpoint, so repeated or overlapping
 * imports never duplicate a listing or an alert.
 *
 *  - Stable identity: a listing's key is `${sourceMls}:${sourceId}`, so the same
 *    home is one row, and the SAME listing ID from two different MLS feeds stays
 *    distinct (overlapping feeds preserve source identity).
 *  - Event dedup: each event carries a stable `eventId`; already-applied events
 *    are skipped, so replays are no-ops.
 *  - Incremental: `checkpoint` advances to the newest applied event time; a
 *    resync asks the provider only for events after it.
 */

export type HotSheetListing = {
  key: string; // `${sourceMls}:${sourceId}`
  sourceMls: string;
  sourceId: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: string;
  updatedAt: number;
  /** Agent-only fields — redacted from client-facing surfaces. */
  privateRemarks?: string;
  showingInstructions?: string;
  /** True = clearly-labeled demo listing, never a live MLS record. */
  demo: boolean;
};

export type HotSheetChangeType = "new" | "price" | "status" | "update" | "removed";

export type HotSheetEvent = {
  eventId: string;
  sourceMls: string;
  sourceId: string;
  changeType: HotSheetChangeType;
  at: number;
  listing: HotSheetListing;
};

export type HotSheetState = {
  listings: Record<string, HotSheetListing>;
  /** Event ids already applied (dedup). */
  appliedEventIds: string[];
  /** Newest applied event time — the incremental watermark. */
  checkpoint: number | null;
  /** Count of genuinely new listings surfaced (for alert counts). */
  newListingKeys: string[];
};

export function emptyHotSheet(): HotSheetState {
  return { listings: {}, appliedEventIds: [], checkpoint: null, newListingKeys: [] };
}

export function listingKey(sourceMls: string, sourceId: string): string {
  return `${sourceMls}:${sourceId}`;
}

/**
 * Apply a batch of events idempotently. Returns a new state; applying the same
 * batch again yields an identical state (no duplicate listings or alerts).
 */
export function applyEvents(state: HotSheetState, events: HotSheetEvent[]): HotSheetState {
  const listings = { ...state.listings };
  const applied = new Set(state.appliedEventIds);
  const newKeys = new Set(state.newListingKeys);
  let checkpoint = state.checkpoint;

  // Process in chronological order so the latest write wins per listing.
  const ordered = [...events].sort((a, b) => a.at - b.at);
  for (const ev of ordered) {
    if (applied.has(ev.eventId)) continue; // dedup replays
    applied.add(ev.eventId);
    const key = listingKey(ev.sourceMls, ev.sourceId);
    if (ev.changeType === "removed") {
      delete listings[key];
    } else {
      const existed = key in listings;
      listings[key] = { ...ev.listing, key, sourceMls: ev.sourceMls, sourceId: ev.sourceId };
      if (!existed && ev.changeType === "new") newKeys.add(key);
    }
    checkpoint = checkpoint == null ? ev.at : Math.max(checkpoint, ev.at);
  }

  return {
    listings,
    appliedEventIds: [...applied],
    checkpoint,
    newListingKeys: [...newKeys].filter((k) => k in listings),
  };
}

/** Listings as an array, newest first. */
export function listingsList(state: HotSheetState): HotSheetListing[] {
  return Object.values(state.listings).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Strip agent-only fields for a client-facing view. */
export function listingForClient(l: HotSheetListing): Omit<HotSheetListing, "privateRemarks" | "showingInstructions"> {
  const { privateRemarks: _p, showingInstructions: _s, ...rest } = l;
  void _p;
  void _s;
  return rest;
}
