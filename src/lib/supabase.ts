import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseKey); }

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error("Brakuje konfiguracji Supabase. Uzupełnij plik .env.local.");
  if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
