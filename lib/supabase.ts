import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

function hasValidSupabaseUrl(value?: string) {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:")
      && parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  hasValidSupabaseUrl(supabaseUrl) && supabasePublishableKey
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string)
  : null;
