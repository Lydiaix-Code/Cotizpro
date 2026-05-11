import { getHistoriqueAnnee } from "@/actions/historique";
import { HistoriquePdf } from "@/lib/pdf/HistoriquePdf";
import { getIsPremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime — @react-pdf/renderer n'est pas compatible Edge
export const runtime = "nodejs";

const ANNEE_MIN = 2000;

export async function GET(request: NextRequest) {
  // ── Authentification via cookies (jamais via token dans l'URL) ────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  // ── Vérification Premium ──────────────────────────────────────────────────
  const isPremium = await getIsPremium();
  if (!isPremium) {
    return new NextResponse("L'export PDF est réservé aux abonnés Premium.", {
      status: 403,
    });
  }

  // ── Validation de l'année — bornes strictes, jamais faire confiance au client
  const anneeRaw = request.nextUrl.searchParams.get("annee");
  const annee = anneeRaw ? parseInt(anneeRaw, 10) : new Date().getFullYear();
  const anneeActuelle = new Date().getFullYear();

  if (isNaN(annee) || annee < ANNEE_MIN || annee > anneeActuelle) {
    return new NextResponse("Paramètre annee invalide", { status: 400 });
  }

  // ── Récupération des données (l'action vérifie elle-même l'ownership) ─────
  const data = await getHistoriqueAnnee(annee);

  if (!data || data.mois.length === 0) {
    return new NextResponse("Aucune donnée pour cette année", { status: 404 });
  }

  // ── Génération du PDF côté serveur ────────────────────────────────────────
  let pdfBuffer: Uint8Array;
  try {
    pdfBuffer = await renderToBuffer(<HistoriquePdf data={data} />);
  } catch {
    return new NextResponse("Erreur lors de la génération du PDF", { status: 500 });
  }

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Cotizpro-${annee}.pdf"`,
      // Sécurité : jamais mettre en cache des données personnelles
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
