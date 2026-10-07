import type { RealtorProfile } from "@/domain/realtor";

/**
 * Client helpers for the MLS API. Credentials are sent via POST body only — never
 * a query string — and responses never contain secrets.
 */

/** Stable per-agent/brokerage identity used to isolate connections + credentials. */
export function ownerKeyFor(profile: RealtorProfile | null): string {
  if (!profile) return "anon";
  const who = profile.memberId || profile.licenseNumber || profile.name || "anon";
  return `${profile.state}:${profile.mlsOrg || "mls"}:${who}`.toLowerCase().replace(/\s+/g, "-");
}

export type ProvidersResponse = {
  supported: import("@/domain/mls").SupportedMls[];
  providers: Record<string, import("@/domain/mls").MlsProviderInfo>;
};

export async function fetchProviders(): Promise<ProvidersResponse> {
  const res = await fetch("/api/mls/providers");
  return res.json();
}

export type ConfigMeta = { hasServerCredentials: boolean; fieldsProvided: string[]; fromEnv: boolean };

export async function submitCredentials(input: {
  ownerKey: string;
  mlsKey: string;
  authMethod: "oauth" | "api_credentials";
  clientId?: string;
  clientSecret?: string;
  apiToken?: string;
  tokenUrl?: string;
  apiBase?: string;
}): Promise<{ ok: boolean; message?: string } & Partial<ConfigMeta>> {
  const res = await fetch("/api/mls/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function testConnection(input: { ownerKey: string; mlsKey: string }): Promise<{
  ok: boolean;
  state: import("@/domain/realtor").ConnectionState;
  message: string;
}> {
  const res = await fetch("/api/mls/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function fetchStatus(ownerKey: string, mlsKey: string): Promise<{
  ok: boolean;
  config: ConfigMeta;
}> {
  const res = await fetch(`/api/mls/status?ownerKey=${encodeURIComponent(ownerKey)}&mlsKey=${encodeURIComponent(mlsKey)}`);
  return res.json();
}

export type HotSheetRow = {
  key: string;
  sourceMls: string;
  sourceId: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: string;
  updatedAt: number;
  privateRemarks?: string;
  showingInstructions?: string;
  demo: boolean;
};

export async function fetchHotSheet(input: {
  ownerKey: string;
  mlsKey: string;
  mode: "demo" | "live";
  view: "agent" | "client";
}): Promise<{ ok: boolean; live: boolean; demo?: boolean; message: string; count: number; newCount?: number; listings: HotSheetRow[] }> {
  const q = new URLSearchParams({
    ownerKey: input.ownerKey,
    mlsKey: input.mlsKey,
    mode: input.mode,
    view: input.view,
  }).toString();
  const res = await fetch(`/api/mls/hot-sheet?${q}`);
  return res.json();
}
