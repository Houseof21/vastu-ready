/**
 * Environment access. Public (NEXT_PUBLIC_*) values may ship to the client;
 * everything else is server-only. Nothing throws at import time so the demo
 * runs with zero configuration — callers check `isSupabaseConfigured()`.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Publishable/anon key — safe to expose to the browser.
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Server-only. Never import this into client components.
  aiProvider: process.env.AI_PROVIDER ?? "mock",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Server-only secret accessor — guarded so it never leaks to the client. */
export function serverSecret(name: "AI_API_KEY" | "SUPABASE_SERVICE_ROLE_KEY"): string | null {
  if (typeof window !== "undefined") {
    throw new Error(`serverSecret(${name}) must not be called in the browser`);
  }
  return process.env[name] ?? null;
}
