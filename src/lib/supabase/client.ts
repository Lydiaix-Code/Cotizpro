import type { Database } from "@/types/database";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur (composants client "use client")
 * Singleton pour éviter de recréer le client à chaque rendu
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
