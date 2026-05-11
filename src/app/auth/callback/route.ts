import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Route handler pour le callback OAuth / PKCE Supabase.
 * Appelée après :
 *  - Confirmation d'email (inscription)
 *  - Lien magique
 *
 * Échange le `code` PKCE contre une session, puis redirige vers le dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Valider que `next` ne sort pas du domaine (protection open redirect)
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Échec de l'échange — rediriger vers login avec message d'erreur
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
