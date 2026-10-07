/**
 * Realtor identity, professional verification, and MLS data connections.
 *
 * CRITICAL SEPARATION: professional verification (is this a real licensed agent?)
 * is DISTINCT from data authorization (is this app approved to receive this MLS's
 * listings?). Entering a license number or MLS member ID records a credential; it
 * does NOT unlock listings and does NOT produce a "Verified" badge. Verification
 * and authorization each require their own real process.
 */

export type ProfessionalVerificationStatus = "unverified" | "pending" | "verified" | "failed";

export const PRO_VERIFICATION_LABEL: Record<ProfessionalVerificationStatus, string> = {
  unverified: "Not verified",
  pending: "Verification pending",
  verified: "License verified",
  failed: "Verification failed",
};

export type RealtorProfile = {
  name: string;
  brokerage: string;
  /** 2-letter state of licensure. */
  state: string;
  /** Professional credential — never a data authorization. */
  licenseNumber: string;
  /** MLS organization key (see SUPPORTED_MLS). */
  mlsOrg: string;
  /** MLS member ID — identity, not authorization. */
  memberId: string;
  /** Set only by a real verification process, never by entering a number. */
  verification: ProfessionalVerificationStatus;
  verificationNote?: string;
};

export function emptyRealtorProfile(): RealtorProfile {
  return {
    name: "",
    brokerage: "",
    state: "NC",
    licenseNumber: "",
    mlsOrg: "",
    memberId: "",
    verification: "unverified",
  };
}

// --- MLS data connections ---------------------------------------------------

export type ConnectionState =
  | "not_connected"
  | "awaiting_approval"
  | "connected"
  | "needs_attention"
  | "disconnected";

export const CONNECTION_STATE_LABEL: Record<ConnectionState, string> = {
  not_connected: "Not connected",
  awaiting_approval: "Awaiting approval",
  connected: "Connected",
  needs_attention: "Needs attention",
  disconnected: "Disconnected",
};

export const CONNECTION_STATE_TONE: Record<ConnectionState, "neutral" | "caution" | "good" | "concern"> = {
  not_connected: "neutral",
  awaiting_approval: "caution",
  connected: "good",
  needs_attention: "concern",
  disconnected: "neutral",
};

export type MlsAuthMethod = "oauth" | "api_credentials" | "none";

/**
 * What an approved feed actually permits. An approved connection does NOT imply
 * all listings or all fields — scope reflects the real grant and the provider's
 * display/attribution/retention rules.
 */
export type DataScope = {
  /** Listing statuses the feed is permitted to sync (e.g., Active, Pending). */
  listingStatuses: string[];
  /** Fields visible to the agent only — never exposed in client-facing views. */
  agentOnlyFields: string[];
  /** Fields permitted in client-facing views. */
  clientVisibleFields: string[];
  /** IDX display rules apply (attribution required, limited fields). */
  idxOnly: boolean;
  /** Plain-language retention rule from the provider terms. */
  retentionNote: string;
};

/** Default agent-only fields redacted from every client-facing surface. */
export const DEFAULT_AGENT_ONLY_FIELDS = [
  "privateRemarks",
  "showingInstructions",
  "restrictedDocuments",
  "compensation",
  "ownerName",
  "ownerPhone",
  "lockboxCode",
];

export type SyncHealth = {
  lastSuccessfulSyncAt: number | null;
  /** Actual refresh cadence of the feed (not an aspiration). */
  cadenceLabel: string;
  lastError: string | null;
  stale: boolean;
  /** Incremental sync checkpoint (opaque provider timestamp/token). */
  checkpoint: string | null;
};

export type MlsConnection = {
  id: string;
  mlsKey: string;
  mlsName: string;
  providerKey: string;
  providerLabel: string;
  authMethod: MlsAuthMethod;
  /** Identity that owns this connection — isolates agents/brokerages. */
  ownerKey: string;
  /** Connected agent or brokerage, once authorized. */
  connectedSubject: string | null;
  state: ConnectionState;
  approvalStatus: string;
  scope: DataScope | null;
  sync: SyncHealth;
  /**
   * Whether encrypted server-side credentials exist for this connection.
   * The secrets themselves NEVER live in client state, URLs, logs, or responses.
   */
  hasServerCredentials: boolean;
  /** True = clearly-labeled demo connection, NOT a live feed. */
  demo: boolean;
  /** True when this is a "request another MLS" entry (pending, not connected). */
  requested: boolean;
  createdAt: number;
};

export function newConnection(partial: Partial<MlsConnection> & Pick<MlsConnection, "mlsKey" | "mlsName" | "providerKey" | "providerLabel" | "ownerKey">): MlsConnection {
  return {
    id: `conn-${partial.mlsKey}-${Date.now().toString(36)}`,
    authMethod: "none",
    connectedSubject: null,
    state: "not_connected",
    approvalStatus: "Not started",
    scope: null,
    sync: { lastSuccessfulSyncAt: null, cadenceLabel: "—", lastError: null, stale: false, checkpoint: null },
    hasServerCredentials: false,
    demo: true,
    requested: false,
    createdAt: Date.now(),
    ...partial,
  };
}

/** Remove agent-only fields from a listing record for a client-facing view. */
export function redactForClient<T extends Record<string, unknown>>(
  record: T,
  scope: DataScope | null,
): Partial<T> {
  const agentOnly = new Set(scope?.agentOnlyFields ?? DEFAULT_AGENT_ONLY_FIELDS);
  const out: Partial<T> = {};
  for (const k of Object.keys(record)) {
    if (!agentOnly.has(k)) out[k as keyof T] = record[k] as T[keyof T];
  }
  return out;
}
