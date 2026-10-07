import type { MlsListingProvider, MlsContext, MlsTestResult, MlsPullResult } from "./types";
import { TrestleProvider } from "./trestle";
import type { HotSheetEvent } from "@/domain/hotsheet";
import { DEMO_PROPERTIES } from "@/data/demo";

export { setCredentials, clearCredentials, hasCredentials, describeConfig } from "./secure-config";
export type { MlsCreds } from "./secure-config";
export type { MlsContext, MlsTestResult, MlsPullResult } from "./types";

/** Provider used when no adapter matches — always honestly not-connected. */
const NotConfiguredProvider: MlsListingProvider = {
  key: "none",
  label: "Not configured",
  isConfigured() {
    return false;
  },
  async testConnection(): Promise<MlsTestResult> {
    return { ok: false, state: "not_connected", message: "No provider adapter for this MLS yet." };
  },
  async pullEvents(_ctx: MlsContext, since): Promise<MlsPullResult> {
    void _ctx;
    return { live: false, events: [], checkpoint: since, message: "No provider adapter for this MLS yet." };
  },
};

export function getMlsProvider(providerKey: string): MlsListingProvider {
  if (providerKey === "trestle") return TrestleProvider;
  return NotConfiguredProvider;
}

/**
 * Clearly-labeled DEMO hot-sheet events, derived from the fictional demo homes.
 * `sourceMls` is suffixed `-demo` and every listing carries `demo: true`, so demo
 * inventory can never be mistaken for a live, authorized feed. Agent-only fields
 * are included so client-redaction can be demonstrated and verified.
 */
export function demoHotSheetEvents(mlsKey: string): HotSheetEvent[] {
  const sourceMls = `${mlsKey}-demo`;
  const base = Date.UTC(2025, 11, 1);
  return DEMO_PROPERTIES.slice(0, 6).map((p, i) => {
    const at = base + i * 86_400_000;
    return {
      eventId: `${sourceMls}:${p.id}:new`,
      sourceMls,
      sourceId: p.id,
      changeType: "new",
      at,
      listing: {
        key: `${sourceMls}:${p.id}`,
        sourceMls,
        sourceId: p.id,
        address: p.address.line1,
        price: p.price,
        beds: p.beds,
        baths: p.baths,
        sqft: p.sqft,
        status: "Active",
        updatedAt: at,
        privateRemarks: "DEMO private remark — agent-only, never shown to clients.",
        showingInstructions: "DEMO showing instructions — agent-only.",
        demo: true,
      },
    };
  });
}
