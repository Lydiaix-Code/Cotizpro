/**
 * JsonLd — injecte un bloc <script type="application/ld+json"> dans le <head>.
 *
 * Sécurité :
 * - Les données sont sérialisées via JSON.stringify puis les caractères HTML
 *   sensibles (< > & ') sont échappés pour neutraliser toute tentative d'injection
 *   de balise ou de fermeture anticipée du script.
 * - Aucune donnée utilisateur ne transite ici — toutes les valeurs sont des
 *   constantes définies statiquement dans page.tsx.
 * - dangerouslySetInnerHTML est nécessaire pour l'injection d'un script JSON-LD
 *   (pratique standard Next.js/React), mais le contenu est entièrement sanitisé.
 */

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

function escapeJsonLd(json: string): string {
  // Échappe les séquences qui pourraient fermer le tag <script> ou injecter du HTML
  return json
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/'/g, "\\u0027");
}

export function JsonLd({ data }: JsonLdProps) {
  const json = escapeJsonLd(JSON.stringify(data));

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
