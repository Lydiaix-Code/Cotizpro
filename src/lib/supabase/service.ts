import type { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec service_role — SERVEUR UNIQUEMENT.
 * Bypasse le RLS — à utiliser uniquement dans les webhooks et scripts serveur.
 * Ne jamais exposer côté client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
