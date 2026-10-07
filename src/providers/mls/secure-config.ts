/**
 * Server-side secure configuration for MLS credentials.
 *
 * SECURITY CONTRACT:
 *  - Secrets live ONLY on the server. They are never returned to the browser,
 *    never put in URLs, never logged, and never written to client state.
 *  - The client may learn ONLY non-secret metadata via `describeConfig`
 *    (which fields are present, whether config came from env), never the values.
 *  - In production, `setCredentials` writes to an encrypted-at-rest store keyed
 *    by owner; here it uses a server-process in-memory map plus env fallback,
 *    which is enough to drive the flow without ever exposing a secret. This file
 *    must only be imported by server code (route handlers / server components).
 */

export type OAuthCreds = {
  kind: "oauth";
  clientId: string;
  clientSecret: string;
  tokenUrl?: string;
  apiBase?: string;
};

export type ApiKeyCreds = {
  kind: "api_key";
  apiToken: string;
  apiBase?: string;
};

export type MlsCreds = OAuthCreds | ApiKeyCreds;

// Per (ownerKey|mlsKey) credentials held only in this server process.
const store = new Map<string, MlsCreds>();

function id(ownerKey: string, mlsKey: string): string {
  return `${ownerKey}::${mlsKey}`;
}

/** Env fallback: a globally-configured Trestle connection, if present. */
function envTrestle(): OAuthCreds | null {
  const clientId = process.env.TRESTLE_CLIENT_ID;
  const clientSecret = process.env.TRESTLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    kind: "oauth",
    clientId,
    clientSecret,
    tokenUrl: process.env.TRESTLE_TOKEN_URL,
    apiBase: process.env.TRESTLE_API_BASE,
  };
}

export function setCredentials(ownerKey: string, mlsKey: string, creds: MlsCreds): void {
  store.set(id(ownerKey, mlsKey), creds);
}

export function clearCredentials(ownerKey: string, mlsKey: string): void {
  store.delete(id(ownerKey, mlsKey));
}

/** Server-only read of the actual secret. Never expose the result to a client. */
export function getCredentials(ownerKey: string, mlsKey: string): MlsCreds | null {
  const own = store.get(id(ownerKey, mlsKey));
  if (own) return own;
  if (mlsKey === "doorify") return envTrestle();
  return null;
}

export function hasCredentials(ownerKey: string, mlsKey: string): boolean {
  return getCredentials(ownerKey, mlsKey) != null;
}

/** Safe, non-secret description of what's configured — OK to send to the client. */
export function describeConfig(ownerKey: string, mlsKey: string): {
  hasServerCredentials: boolean;
  fieldsProvided: string[];
  fromEnv: boolean;
} {
  const own = store.get(id(ownerKey, mlsKey));
  const env = mlsKey === "doorify" ? envTrestle() : null;
  const creds = own ?? env;
  if (!creds) return { hasServerCredentials: false, fieldsProvided: [], fromEnv: false };
  const fieldsProvided =
    creds.kind === "oauth"
      ? ["clientId", "clientSecret", ...(creds.tokenUrl ? ["tokenUrl"] : []), ...(creds.apiBase ? ["apiBase"] : [])]
      : ["apiToken", ...(creds.apiBase ? ["apiBase"] : [])];
  return { hasServerCredentials: true, fieldsProvided, fromEnv: !own && !!env };
}
