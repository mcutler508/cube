import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && KEY);
}

/**
 * The cube game manages its own session (handle + passcode in localStorage),
 * so we disable Supabase's built-in auth session machinery — it would add
 * noise and network calls we don't need.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;
  cached = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
