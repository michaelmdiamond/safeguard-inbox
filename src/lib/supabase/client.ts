import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Fall back to placeholder values during build so createBrowserClient
  // doesn't throw when NEXT_PUBLIC_ vars aren't available at build time.
  // Actual API calls only happen in the browser where real values are present.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createBrowserClient(url, key);
}
