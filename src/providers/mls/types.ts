import type { HotSheetEvent } from "@/domain/hotsheet";
import type { DataScope, ConnectionState } from "@/domain/realtor";

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
}
