"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Browser Supabase client. Returns null when Supabase isn't configured, so the
 * credential-free demo keeps working. Only the publishable anon key is used
 * here — never a secret.
 */
export function getBrowserSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
