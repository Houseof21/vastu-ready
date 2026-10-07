import type { MlsAuthMethod, DataScope } from "./realtor";
import { DEFAULT_AGENT_ONLY_FIELDS } from "./realtor";

/**
 * MLS + data-provider registry. Starts with the Raleigh-area MLS and the
 * provider it is believed to use; everything else is request-only (pending)
 * until an adapter and an authorized connection exist.
 *
 * Provider facts (confirmed from official docs):
 *  - CoreLogic Trestle is a RESO Web API 1.0.3 (OData) platform. Access is
 *    server-to-server (OAuth client credentials) — never an agent's MLS password.
 *  - Before data flows, Trestle requires an e-signed data license agreement and
 *    MLS approval of the application. (trestle-documentation.corelogic.com)
 */

export type MlsProviderInfo = {
  key: string;
  label: string;
  authMethod: MlsAuthMethod;
  /** True when the provider offers hosted OAuth we prefer over API keys. */
  oauth: boolean;
  docsUrl: string;
  requiresAgreement: boolean;
  agreementNote: string;
  /** Default scope a fresh grant starts from (conservative). */
  defaultScope: DataScope;
};

export const MLS_PROVIDERS: Record<string, MlsProviderInfo> = {
  trestle: {
    key: "trestle",
    label: "CoreLogic Trestle (RESO Web API)",
    authMethod: "oauth",
    oauth: true,
    docsUrl: "https://trestle-documentation.corelogic.com/",
    requiresAgreement: true,
    agreementNote:
      "Requires an e-signed Trestle data license agreement and MLS approval of this application before any data flows. Access is server-to-server (OAuth client credentials) — never your MLS password.",
    defaultScope: {
      listingStatuses: ["Active"],
      agentOnlyFields: DEFAULT_AGENT_ONLY_FIELDS,
      clientVisibleFields: [
        "address",
        "price",
        "beds",
        "baths",
        "sqft",
        "lotAcres",
        "yearBuilt",
        "photos",
        "publicRemarks",
      ],
      idxOnly: true,
      retentionNote:
        "Display and retention follow the provider/MLS terms; cached listings must be refreshed on the feed's cadence and purged when a listing leaves the permitted set.",
    },
  },
  bridge: {
    key: "bridge",
    label: "Bridge Interactive (RESO Web API)",
    authMethod: "api_credentials",
    oauth: false,
    docsUrl: "https://www.bridgeinteractive.com/developers/",
    requiresAgreement: true,
    agreementNote: "Requires MLS approval and a server access token issued by Bridge.",
    defaultScope: {
      listingStatuses: ["Active"],
      agentOnlyFields: DEFAULT_AGENT_ONLY_FIELDS,
      clientVisibleFields: ["address", "price", "beds", "baths", "sqft", "lotAcres", "yearBuilt", "photos", "publicRemarks"],
      idxOnly: true,
      retentionNote: "Follow the provider/MLS display, attribution, and retention rules.",
    },
  },
};

export type SupportedMls = {
  key: string;
  name: string;
  region: string;
  /** The data provider this MLS is believed to use. */
  providerKey: string;
  /** True once an adapter exists for this MLS's provider. */
  supported: boolean;
  /**
   * Whether the provider/auth has been CONFIRMED with the MLS. We default to
   * false and surface "confirm before activation" rather than assuming an
   * agent's membership authorizes this application.
   */
  providerConfirmed: boolean;
  note: string;
};

export const SUPPORTED_MLS: SupportedMls[] = [
  {
    key: "doorify",
    name: "Doorify MLS (formerly Triangle MLS)",
    region: "Raleigh–Durham–Chapel Hill, NC",
    providerKey: "trestle",
    supported: true,
    providerConfirmed: false,
    note: "Raleigh-area MLS. Adapter built against CoreLogic Trestle (the common RESO Web API provider). Confirm the current provider and agreements with Doorify MLS before activating.",
  },
  {
    key: "canopy",
    name: "Canopy MLS",
    region: "Charlotte, NC",
    providerKey: "trestle",
    supported: false,
    providerConfirmed: false,
    note: "Not yet implemented — request to add.",
  },
  {
    key: "other",
    name: "Another MLS (not listed)",
    region: "—",
    providerKey: "",
    supported: false,
    providerConfirmed: false,
    note: "Submit a request and we'll evaluate adding support.",
  },
];

export function getSupportedMls(key: string): SupportedMls | undefined {
  return SUPPORTED_MLS.find((m) => m.key === key);
}

export function getProvider(key: string): MlsProviderInfo | undefined {
  return MLS_PROVIDERS[key];
}

/** The guided-flow steps, in order. */
export const CONNECT_STEPS = [
  { key: "choose", label: "Choose MLS" },
  { key: "provider", label: "Identify provider" },
  { key: "authorize", label: "Authorize access" },
  { key: "approval", label: "Check approval" },
  { key: "test", label: "Test connection" },
] as const;

export type ConnectStepKey = (typeof CONNECT_STEPS)[number]["key"];
