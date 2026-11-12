import type { MlsListingProvider, MlsContext, MlsTestResult, MlsPullResult, AddressQuery } from "./types";
import { getCredentials } from "./secure-config";
import { resoBatchToEvents, resoPropertyToFacts, type ResoProperty } from "./reso";
import type { ListingResolveResult } from "@/domain/listing";

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

/** Haversine distance in meters (pure). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const tokens = (s: string | null | undefined): string[] =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

/**
 * Rank RESO candidates for an address query and return the best, or null.
 * Pure and deterministic (exported for unit tests). Higher score = better:
 *  - exact street-number match is required when the query has a number;
 *  - street-name token overlap (Jaccard) dominates;
 *  - when both sides have coordinates, nearer candidates win ties, and a
 *    candidate more than 1 km from the geocode anchor is rejected (wrong house).
 */
export function rankCandidates(records: ResoProperty[], query: AddressQuery): ResoProperty | null {
  const qNameTokens = new Set(tokens(query.streetName));
  const anchor = query.lat != null && query.lng != null ? { lat: query.lat, lng: query.lng } : null;

  let best: { rec: ResoProperty; score: number } | null = null;
  for (const rec of records) {
    if (query.streetNumber && rec.StreetNumber && String(rec.StreetNumber) !== String(query.streetNumber)) {
      continue; // different house number — never a match
    }
    const recTokens = new Set(tokens(rec.StreetName));
    let overlap = 0;
    for (const t of qNameTokens) if (recTokens.has(t)) overlap++;
    const union = new Set([...qNameTokens, ...recTokens]).size || 1;
    const jaccard = overlap / union;

    let dist = Infinity;
    if (anchor && typeof rec.Latitude === "number" && typeof rec.Longitude === "number") {
      dist = distanceMeters(anchor, { lat: rec.Latitude, lng: rec.Longitude });
      if (dist > 1000) continue; // more than 1 km off — not this home
    }

    const numberMatch = query.streetNumber && String(rec.StreetNumber) === String(query.streetNumber) ? 1 : 0;
    const proximity = Number.isFinite(dist) ? Math.max(0, 1 - dist / 1000) : 0;
    const score = numberMatch * 100 + jaccard * 50 + proximity * 10;
    if (!best || score > best.score) best = { rec, score };
  }
  return best?.rec ?? null;
}

const DATA_FIELDS =
  "ListingKey,ListingId,UnparsedAddress,StreetNumber,StreetDirPrefix,StreetName,StreetSuffix," +
  "City,StateOrProvince,PostalCode,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea," +
  "LotSizeAcres,YearBuilt,StandardStatus,ModificationTimestamp,Latitude,Longitude";

function esc(s: string): string {
  return s.replace(/'/g, "''");
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
      const select =
        "ListingKey,ListingId,UnparsedAddress,StreetNumber,StreetDirPrefix,StreetName,StreetSuffix," +
        "City,StateOrProvince,PostalCode,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea," +
        "LotSizeAcres,YearBuilt,StandardStatus,PublicRemarks,PrivateRemarks,ShowingInstructions," +
        "ModificationTimestamp,Latitude,Longitude";
      const url =
        `${tok.apiBase}/Property?$top=50&$orderby=ModificationTimestamp asc&$select=${select}` +
        `&$filter=ModificationTimestamp gt ${since} and StandardStatus eq 'Active'`;
      const res = await withTimeout((signal) =>
        fetch(url, { signal, headers: { Authorization: `Bearer ${tok.token}`, Accept: "application/json" } }),
      );
      if (!res.ok) {
        return { live: false, events: [], checkpoint: sinceCheckpoint, message: `Feed query failed (HTTP ${res.status})` };
      }
      const body = (await res.json()) as { value?: ResoProperty[] };
      const records = body.value ?? [];
      const events = resoBatchToEvents(records, ctx.mlsKey);
      const maxAt = events.reduce((m, e) => Math.max(m, e.at), sinceCheckpoint ?? 0) || sinceCheckpoint;
      return {
        live: true,
        events,
        checkpoint: maxAt,
        message: events.length ? `Synced ${events.length} listing update(s).` : "Connected; no new events in range.",
      };
    } catch (e) {
      return { live: false, events: [], checkpoint: sinceCheckpoint, message: `Feed error: ${(e as Error).message}` };
    }
  },

  async resolveByAddress(ctx, query: AddressQuery): Promise<ListingResolveResult> {
    const notConnected = (message: string): ListingResolveResult => ({
      connected: false,
      found: false,
      facts: null,
      message,
      candidatesConsidered: 0,
    });

    if (!this.isConfigured(ctx)) {
      return notConnected(
        "No licensed MLS feed connected. Connect approved credentials to auto-fill beds, baths, and floor plans.",
      );
    }
    const tok = await getToken(ctx);
    if ("error" in tok) return notConnected(tok.error);
    const { token, apiBase } = tok;

    // Need at least a ZIP or a city to scope the query safely.
    const scope = query.zip ? `PostalCode eq '${esc(query.zip)}'` : query.city ? `City eq '${esc(query.city)}'` : null;
    if (!scope) {
      return {
        connected: true,
        found: false,
        facts: null,
        message: "Address lacked a ZIP or city to search the feed.",
        candidatesConsidered: 0,
      };
    }
    const filters = [scope];
    if (query.streetNumber) filters.push(`StreetNumber eq '${esc(query.streetNumber)}'`);
    const filter = filters.join(" and ");

    const base =
      `${apiBase}/Property?$top=25&$select=${DATA_FIELDS}` +
      `&$expand=Media($select=MediaKey,MediaURL,MediaCategory,Order,ShortDescription,MimeType)` +
      `&$filter=${encodeURIComponent(filter)}`;

    async function fetchRecords(url: string) {
      return withTimeout((signal) =>
        fetch(url, { signal, headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
      );
    }

    try {
      let res = await fetchRecords(base);
      // Some feeds reject $expand on Property — retry without media (facts still useful).
      if (!res.ok && res.status === 400) {
        const noExpand = `${apiBase}/Property?$top=25&$select=${DATA_FIELDS}&$filter=${encodeURIComponent(filter)}`;
        res = await fetchRecords(noExpand);
      }
      if (!res.ok) {
        return { connected: true, found: false, facts: null, message: `Feed query failed (HTTP ${res.status})`, candidatesConsidered: 0 };
      }
      const body = (await res.json()) as { value?: ResoProperty[] };
      const records = body.value ?? [];
      const best = rankCandidates(records, query);
      if (!best) {
        return {
          connected: true,
          found: false,
          facts: null,
          message: records.length
            ? `No listing in the feed matched this exact address (${records.length} nearby considered).`
            : "No listing found in the feed for this address. It may never have been listed.",
          candidatesConsidered: records.length,
        };
      }
      const facts = resoPropertyToFacts(best, best.Media ?? []);
      if (!facts) {
        return { connected: true, found: false, facts: null, message: "Listing matched but carried no usable key.", candidatesConsidered: records.length };
      }
      facts.sourceMls = ctx.mlsKey;
      return {
        connected: true,
        found: true,
        facts,
        message: `Matched listing ${facts.listingKey} (${facts.status}).`,
        candidatesConsidered: records.length,
      };
    } catch (e) {
      return { connected: true, found: false, facts: null, message: `Feed error: ${(e as Error).message}`, candidatesConsidered: 0 };
    }
  },
};
