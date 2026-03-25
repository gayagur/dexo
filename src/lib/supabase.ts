import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** Set when real project URL + anon key exist (not dev placeholders). */
export const isSupabaseConfigured = Boolean(envUrl && envKey);

if (import.meta.env.PROD && !isSupabaseConfigured) {
  throw new Error("Missing Supabase environment variables");
}

// In dev, missing .env.local used to throw at import time → blank white screen. Use placeholders so the UI can load; auth/API will fail until configured.
const supabaseUrl =
  envUrl ?? "https://__dexo_missing_env__.invalid";
const supabaseAnonKey =
  envKey ?? "sb-local-dev-placeholder-anon-key";

if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.warn(
    "[DEXO] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and add your Supabase URL and anon key.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Bypass navigator.locks to prevent deadlocks when withTimeout
    // rejects while a lock is still held by a background getSession call.
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
  },
});
