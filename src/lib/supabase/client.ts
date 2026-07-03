import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk Client Components (browser).
 * Hanya memakai anon key & NEXT_PUBLIC_* env — aman dieksekusi di client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
