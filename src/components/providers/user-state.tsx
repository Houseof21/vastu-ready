"use client";

import * as React from "react";
import type { Property } from "@/domain/property";
import type { UserPreferences } from "@/domain/profile";
import type { RealtorProfile, MlsConnection } from "@/domain/realtor";
import type { SavedSearch } from "@/domain/search";
import type { Workspace } from "@/domain/workspace";

/**
 * Client-side user state for the credential-free demo: role, saved homes,
 * feedback, compare tray, editable preferences, manually-entered properties,
 * the realtor profile, MLS connection metadata, saved searches, and shared
 * client–realtor workspaces. Backed by a tiny external store and persisted to
 * localStorage. This is the seam Supabase-backed persistence replaces (same
 * shape, server-synced).
 *
 * SECURITY: no secrets are ever kept here. MLS connections store only non-secret
 * metadata (state, scope, hasServerCredentials, demo flag); credentials live
 * server-side only. Workspaces keep realtor private notes, which the client-facing
 * views read exclusively through `clientView()` so they are never shown to clients.
 */

export type Feedback = "love" | "consider" | "pass" | "dealbreaker";
export type Role = "buyer" | "realtor" | null;

type State = {
  saved: string[];
  feedback: Record<string, Feedback>;
  compare: string[];
  /** null = use the default demo buyer profile. */
  preferences: UserPreferences | null;
  /** Manually-entered properties, keyed by id. */
  properties: Record<string, Property>;
  /** null until the user picks a role in onboarding. */
  role: Role;
  realtorProfile: RealtorProfile | null;
  mlsConnections: MlsConnection[];
  savedSearches: SavedSearch[];
  workspaces: Workspace[];
};

const KEY = "vastu-ready:user-state:v2";
const MAX_COMPARE = 4;
const EMPTY: State = {
  saved: [],
  feedback: {},
  compare: [],
  preferences: null,
  properties: {},
  role: null,
  realtorProfile: null,
  mlsConnections: [],
  savedSearches: [],
  workspaces: [],
};
/** Floor-plan data URLs above this size aren't persisted (localStorage quota). */
const MAX_PERSIST_FLOORPLAN = 1_200_000;

// --- External store ----------------------------------------------------------

let state: State = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    // Strip oversized floor-plan data URLs before persisting (quota safety);
    // they stay in memory for the session.
    const props: Record<string, Property> = {};
    for (const [id, p] of Object.entries(state.properties)) {
      props[id] =
        p.floorPlanDataUrl && p.floorPlanDataUrl.length > MAX_PERSIST_FLOORPLAN
          ? { ...p, floorPlanDataUrl: null }
          : p;
    }
    window.localStorage.setItem(KEY, JSON.stringify({ ...state, properties: props }));
  } catch {
    /* storage unavailable or over quota — demo still works in-memory */
  }
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      state = {
        saved: Array.isArray(parsed.saved) ? parsed.saved : [],
        feedback: parsed.feedback && typeof parsed.feedback === "object" ? parsed.feedback : {},
        compare: Array.isArray(parsed.compare) ? parsed.compare : [],
        preferences: parsed.preferences ?? null,
        properties: parsed.properties && typeof parsed.properties === "object" ? parsed.properties : {},
        role: parsed.role === "buyer" || parsed.role === "realtor" ? parsed.role : null,
        realtorProfile: parsed.realtorProfile ?? null,
        mlsConnections: Array.isArray(parsed.mlsConnections) ? parsed.mlsConnections : [],
        savedSearches: Array.isArray(parsed.savedSearches) ? parsed.savedSearches : [],
        workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      };
    }
  } catch {
    /* ignore malformed storage */
  }
}

function setState(next: State) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  hydrateOnce();
  // Re-sync if the store changed in another tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      hydrated = false;
      hydrateOnce();
      listeners.forEach((l) => l());
    }
  };
  listeners.add(cb);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

/** True once localStorage has been read on the client (for avoiding flashes). */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

// --- Actions (stable) --------------------------------------------------------

const actions = {
  toggleSaved: (id: string) =>
    setState({
      ...state,
      saved: state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id],
    }),
  setFeedback: (id: string, f: Feedback) =>
    setState({ ...state, feedback: { ...state.feedback, [id]: f } }),
  clearFeedback: (id: string) => {
    const next = { ...state.feedback };
    delete next[id];
    setState({ ...state, feedback: next });
  },
  toggleCompare: (id: string) => {
    if (state.compare.includes(id)) {
      setState({ ...state, compare: state.compare.filter((x) => x !== id) });
    } else if (state.compare.length < MAX_COMPARE) {
      setState({ ...state, compare: [...state.compare, id] });
    }
  },
  clearCompare: () => setState({ ...state, compare: [] }),
  setPreferences: (prefs: UserPreferences) => setState({ ...state, preferences: prefs }),
  resetPreferences: () => setState({ ...state, preferences: null }),
  upsertProperty: (p: Property) =>
    setState({ ...state, properties: { ...state.properties, [p.id]: p } }),
  removeProperty: (id: string) => {
    const next = { ...state.properties };
    delete next[id];
    setState({
      ...state,
      properties: next,
      saved: state.saved.filter((x) => x !== id),
      compare: state.compare.filter((x) => x !== id),
    });
  },
  // --- Role + realtor ---
  setRole: (role: Role) => setState({ ...state, role }),
  setRealtorProfile: (realtorProfile: RealtorProfile | null) => setState({ ...state, realtorProfile }),
  // --- MLS connections (metadata only; no secrets) ---
  upsertConnection: (c: MlsConnection) =>
    setState({
      ...state,
      mlsConnections: [...state.mlsConnections.filter((x) => x.id !== c.id), c],
    }),
  removeConnection: (id: string) =>
    setState({ ...state, mlsConnections: state.mlsConnections.filter((x) => x.id !== id) }),
  // --- Saved searches ---
  upsertSavedSearch: (s: SavedSearch) =>
    setState({
      ...state,
      savedSearches: [...state.savedSearches.filter((x) => x.id !== s.id), s],
    }),
  removeSavedSearch: (id: string) =>
    setState({ ...state, savedSearches: state.savedSearches.filter((x) => x.id !== id) }),
  // --- Shared workspaces ---
  upsertWorkspace: (w: Workspace) =>
    setState({
      ...state,
      workspaces: [...state.workspaces.filter((x) => x.id !== w.id), w],
    }),
  removeWorkspace: (id: string) =>
    setState({ ...state, workspaces: state.workspaces.filter((x) => x.id !== id) }),
};

export type UserState = State & typeof actions & {
  isSaved: (id: string) => boolean;
  inCompare: (id: string) => boolean;
};

export function useUserState(): UserState {
  const snap = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return React.useMemo(
    () => ({
      ...snap,
      ...actions,
      isSaved: (id: string) => snap.saved.includes(id),
      inCompare: (id: string) => snap.compare.includes(id),
    }),
    [snap],
  );
}

/** No longer required, kept as a no-op wrapper for layout composition. */
export function UserStateProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const COMPARE_LIMIT = MAX_COMPARE;
