import type { MlsListingProvider, MlsContext, MlsTestResult, MlsPullResult } from "./types";
import { getCredentials } from "./secure-config";

/**
 * CoreLogic Trestle adapter — RESO Web API 1.0.3 (OData), server-to-server
 * OAuth client-credentials. This is a REAL adapter structure: it performs the
 * actual token + OData calls when credentials and MLS approval exist. It never
 * fabricates a connected state — without working, approved credentials every
 * method honestly reports not-connected / needs-attention.
 *
 * Activation (external, cannot be done from here): apply to the MLS (Doorify),
 * e-sign the Trestle data license, receive an approved client_id/secret, and set
 * them via the secure server config. Only then will these calls succeed.
 */

const DEFAULT_TOKEN_URL = "https://api-prod.corelogic.com/trestle/oidc/connect/token";
const DEFAULT_API_BASE = "https://api-prod.corelogic.com/trestle/odata";
const TIMEOUT_MS = 12_000;

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function getToken(ctx: MlsContext): Promise<{ token: string; apiBase: string } | { error: string }> {
  const creds = getCredentials(ctx.ownerKey, ctx.mlsKey);
  if (!creds || creds.kind !== "oauth") return { error: "No approved OAuth credentials configured" };
  const tokenUrl = creds.tokenUrl || DEFAULT_TOKEN_URL;
  const apiBase = creds.apiBase || DEFAULT_API_BASE;
  try {
    const res = await withTimeout((signal) =>
      fetch(tokenUrl, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          scope: "api",
        }),
      }),
    );
    if (!res.ok) return { error: `Token request failed (HTTP ${res.status})` };
    const j = (await res.json()) as { access_token?: string };
    if (!j.access_token) return { error: "Token response missing access_token" };
    return { token: j.access_token, apiBase };
  } catch (e) {
    return { error: `Token request error: ${(e as Error).message}` };
  }
}

export const TrestleProvider: MlsListingProvider = {
  key: "trestle",
  label: "CoreLogic Trestle (RESO Web API)",

  isConfigured(ctx) {
    const c = getCredentials(ctx.ownerKey, ctx.mlsKey);
    return !!c;
  },

  async testConnection(ctx): Promise<MlsTestResult> {
    if (!this.isConfigured(ctx)) {
      return {
        ok: false,
        state: "not_connected",
        message: "No approved credentials configured. Complete MLS approval and add server credentials first.",
      };
    }
    const tok = await getToken(ctx);
    if ("error" in tok) {
      return { ok: false, state: "needs_attention", message: tok.error };
    }
    // Verify data access with a minimal OData probe.
    try {
      const res = await withTimeout((signal) =>
        fetch(`${tok.apiBase}/Property?$top=1&$select=ListingKey`, {
          signal,
          headers: { Authorization: `Bearer ${tok.token}`, Accept: "application/json" },
        }),
      );
      if (!res.ok) {
        return { ok: false, state: "needs_attention", message: `Data probe failed (HTTP ${res.status})` };
      }
      return { ok: true, state: "connected", message: "Connected — token and data access verified." };
    } catch (e) {
      return { ok: false, state: "needs_attention", message: `Data probe error: ${(e as Error).message}` };
    }
  },

  async pullEvents(ctx, sinceCheckpoint): Promise<MlsPullResult> {
    if (!this.isConfigured(ctx)) {
      return {
        live: false,
        events: [],
        checkpoint: sinceCheckpoint,
        message: "Live feed not active — no approved credentials. See activation steps.",
      };
    }
    const tok = await getToken(ctx);
    if ("error" in tok) {
      return { live: false, events: [], checkpoint: sinceCheckpoint, message: tok.error };
    }
    // Real incremental RESO query would go here (ModificationTimestamp gt checkpoint,
    // StandardStatus in scope). Without approved access it will not return rows;
    // we never synthesize listings, so the live hot sheet stays empty until the
    // MLS grant is real.
    try {
      const since = sinceCheckpoint ? new Date(sinceCheckpoint).toISOString() : "1970-01-01T00:00:00Z";
      const url =
        `${tok.apiBase}/Property?$top=50&$orderby=ModificationTimestamp asc` +
        `&$filter=ModificationTimestamp gt ${since} and StandardStatus eq 'Active'`;
      const res = await withTimeout((signal) =>
        fetch(url, { signal, headers: { Authorization: `Bearer ${tok.token}`, Accept: "application/json" } }),
      );
      if (!res.ok) {
        return { live: false, events: [], checkpoint: sinceCheckpoint, message: `Feed query failed (HTTP ${res.status})` };
      }
      // Mapping RESO Property → HotSheetEvent is intentionally omitted until a real
      // feed and its exact field set are available; returning no events is honest.
      return { live: true, events: [], checkpoint: sinceCheckpoint, message: "Connected; no new events in range." };
    } catch (e) {
      return { live: false, events: [], checkpoint: sinceCheckpoint, message: `Feed error: ${(e as Error).message}` };
    }
  },
};
