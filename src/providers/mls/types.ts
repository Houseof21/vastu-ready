import type { HotSheetEvent } from "@/domain/hotsheet";
import type { DataScope, ConnectionState } from "@/domain/realtor";
import type { ListingResolveResult } from "@/domain/listing";

/** A single-address lookup against a licensed feed (for cross-referencing GIS). */
export type AddressQuery = {
  raw: string;
  streetNumber: string | null;
  streetName: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  /** Geocode anchor used to rank candidates to the exact house. */
  lat: number | null;
  lng: number | null;
};

/**
 * MLS listing-provider seam (server-side only). An adapter NEVER reports a
 * connected/live state without a real successful call, and NEVER returns secrets.
 */

export type MlsContext = {
  /** Identity that owns the connection (agent/brokerage) — enforces isolation. */
  ownerKey: string;
  mlsKey: string;
  scope: DataScope | null;
};

export type MlsTestResult = {
  ok: boolean;
  state: ConnectionState;
  message: string;
};

export type MlsPullResult = {
  /** True only when a real feed returned data. */
  live: boolean;
  events: HotSheetEvent[];
  checkpoint: number | null;
  message: string;
};

export interface MlsListingProvider {
  readonly key: string;
  readonly label: string;
  /** Whether server-side credentials exist for this owner+MLS. */
  isConfigured(ctx: MlsContext): boolean;
  /** Attempt a real connection. Returns ok:true ONLY on a verified success. */
  testConnection(ctx: MlsContext): Promise<MlsTestResult>;
  /** Pull change events after a checkpoint. live:false when not truly connected. */
  pullEvents(ctx: MlsContext, sinceCheckpoint: number | null): Promise<MlsPullResult>;
  /**
   * Resolve a single address to a listing's normalized facts (beds/baths/floor
   * plan) for cross-referencing with GIS. Optional per provider. MUST report
   * connected:false when no real credentials exist — never a fabricated match.
   */
  resolveByAddress?(ctx: MlsContext, query: AddressQuery): Promise<ListingResolveResult>;
}
