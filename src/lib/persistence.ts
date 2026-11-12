import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { Property } from "@/domain/property";
import type { UserPreferences } from "@/domain/profile";
import type { RealtorProfile, MlsConnection } from "@/domain/realtor";
import type { SavedSearch } from "@/domain/search";
import type { Workspace } from "@/domain/workspace";

/**
 * Cross-device persistence for the user's app state.
 *
 * Local storage is always the instant, offline cache. When Supabase is
 * configured AND a user is signed in, the same state is mirrored to the
 * owner-scoped `user_state` row (RLS-protected) so it follows them across
 * devices. No secrets are ever persisted — MLS connections carry only
 * non-secret metadata (state, scope, flags); credentials stay server-side.
 */

export type PersistedFeedback = "love" | "consider" | "pass" | "dealbreaker";
export type PersistedRole = "buyer" | "realtor" | null;

export type PersistedState = {
  saved: string[];
  feedback: Record<string, PersistedFeedback>;
  compare: string[];
  preferences: UserPreferences | null;
  properties: Record<string, Property>;
  role: PersistedRole;
  realtorProfile: RealtorProfile | null;
  mlsConnections: MlsConnection[];
  savedSearches: SavedSearch[];
  workspaces: Workspace[];
};

const KEYS: (keyof PersistedState)[] = [
  "saved",
  "feedback",
  "compare",
  "preferences",
  "properties",
  "role",
  "realtorProfile",
  "mlsConnections",
  "savedSearches",
  "workspaces",
];

/** Select exactly the persistable fields from a larger state object. */
export function pickPersisted(state: Partial<PersistedState>): Partial<PersistedState> {
  const out: Partial<PersistedState> = {};
  for (const k of KEYS) {
    if (state[k] !== undefined) (out as Record<string, unknown>)[k] = state[k];
  }
  return out;
}

/** Whether a remote backend is even configured (keys present). */
export function remoteConfigured(): boolean {
  return isSupabaseConfigured();
}

/** Load the signed-in user's state from Supabase, or null (demo / signed-out). */
export async function loadRemote(): Promise<Partial<PersistedState> | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from("user_state").select("state").eq("user_id", user.id).maybeSingle();
    if (error || !data) return null;
    return pickPersisted((data.state ?? {}) as Partial<PersistedState>);
  } catch {
    return null;
  }
}

/** Mirror the user's state to Supabase (no-op when unconfigured / signed out). */
export async function saveRemote(state: Partial<PersistedState>): Promise<void> {
  const sb = getBrowserSupabase();
  if (!sb) return;
  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("user_state").upsert({ user_id: user.id, state: pickPersisted(state) }, { onConflict: "user_id" });
  } catch {
    // Offline or transient — localStorage still holds the latest; retry on next change.
  }
}
