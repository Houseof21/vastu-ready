"use client";

import * as React from "react";
import { useUserState } from "@/components/providers/user-state";
import { remoteConfigured, loadRemote, saveRemote, pickPersisted } from "@/lib/persistence";

/**
 * Cross-device sync. Renders nothing. When Supabase is configured and a user is
 * signed in, it loads their state once on mount and mirrors every change back
 * (debounced). When unconfigured or signed out, it's a complete no-op and the
 * app runs entirely on the local store — so the credential-free demo is unaffected.
 */
export function SupabaseSync() {
  const state = useUserState();
  const { mergeRemote } = state;
  const loadedRef = React.useRef(false);

  // Load once from the remote (async — any setState happens after an await).
  React.useEffect(() => {
    if (!remoteConfigured() || loadedRef.current) return;
    loadedRef.current = true;
    void loadRemote().then((remote) => {
      if (remote && Object.keys(remote).length > 0) mergeRemote(remote);
    });
  }, [mergeRemote]);

  // Mirror changes back, debounced.
  React.useEffect(() => {
    if (!remoteConfigured()) return;
    const t = setTimeout(() => {
      void saveRemote(pickPersisted(state));
    }, 800);
    return () => clearTimeout(t);
  }, [state]);

  return null;
}
