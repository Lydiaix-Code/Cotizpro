"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const SLIDES = [
  {
    src: "/screenshots/Tableau_Bord.png",
    alt: "Tableau de bord Cotizpro — KPIs, progression plafond URSSAF, prochaine échéance",
    label: "Tableau de bord",
  },
  {
    src: "/screenshots/CA.png",
    alt: "Déclaration CA mensuel — formulaire de saisie avec calcul automatique des cotisations",
    label: "Déclarer un CA",
  },
  {
    src: "/screenshots/Cotisations.png",
    alt: "Mes cotisations URSSAF — récapitulatif annuel, taux appliqué, plafond CA",
    label: "Cotisations",
  },
  {
    src: "/screenshots/Simulateur.png",
    alt: "Simulateur de cotisations — estimez vos cotisations sans enregistrer de déclaration",
    label: "Simulateur",
    nouveau: true,
  },
  {
    src: "/screenshots/Graphiques.png",
    alt: "Graphiques — performance mensuelle, jauge du plafond légal, évolution CA et cotisations",
    label: "Graphiques",
  },
  {
    src: "/screenshots/Historique.png",
    alt: "Historique — tableau détail mensuel CA, cotisations, revenu net et total annuel",
    label: "Historique",
  },
  {
    src: "/screenshots/Import_CSV.png",
    alt: "Import CSV — importez vos déclarations passées depuis un fichier CSV",
    label: "Import CSV",
    nouveau: true,
  },
  {
    src: "/screenshots/Export.png",
    alt: "Export — téléchargement CSV et PDF Premium du récapitulatif annuel",
    label: "Export",
  },
  {
    src: "/screenshots/2042.png",
    alt: "Récapitulatif fiscal 2042-C-PRO — cases à reporter sur votre déclaration d'impôts selon votre régime",
    label: "Fiscal 2042-C",
    nouveau: true,
  },
] satisfies { src: string; alt: string; label: string; nouveau?: boolean }[];

export function AppSlider() {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating || index === current) return;
      setIsAnimating(true);
      setCurrent(index);
      setTimeout(() => setIsAnimating(false), 400);
    },
    [current, isAnimating]
  );

  const prev = useCallback(
    () => goTo((current - 1 + SLIDES.length) % SLIDES.length),
    [current, goTo]
  );
  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);

  // Auto-advance every 5 s — reset on manual interaction
  useEffect(() => {
    timerRef.current = setTimeout(next, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [next]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setLightbox(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next]);

  return (
    <div
      className="relative mx-auto w-full max-w-5xl select-none"
      role="region"
      aria-label="Aperçu des fonctionnalités de Cotizpro"
      aria-roledescription="carrousel"
    >
      {" "}
      {/* Tab labels */}
      <div className="mb-4 flex flex-wrap justify-center gap-2" role="tablist">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.label}
            role="tab"
            aria-selected={i === current}
            aria-label={`Voir ${slide.label}`}
            onClick={() => goTo(i)}
            className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              i === current
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {slide.label}
            {slide.nouveau && (
              <span className="absolute -top-2 -right-2 inline-flex items-center rounded-full bg-blue-600 px-1.5 py-px text-[9px] leading-tight font-bold text-white shadow-sm">
                New
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Slide */}
      <div
        className="border-border relative overflow-hidden rounded-xl border"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Badge Nouveauté */}
        {SLIDES[current].nouveau && (
          <div className="pointer-events-none absolute top-3 left-3 z-10">
            <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
              Nouveauté
            </span>
          </div>
        )}
        <div
          style={{
            transition: "opacity 0.35s ease",
            opacity: isAnimating ? 0.6 : 1,
          }}
        >
          <button
            className="block w-full cursor-zoom-in focus-visible:outline-none"
            aria-label={`Agrandir : ${SLIDES[current].label}`}
            onClick={() => setLightbox(true)}
          >
            <Image
              src={SLIDES[current].src}
              alt={SLIDES[current].alt}
              width={1456}
              height={770}
              priority={current === 0}
              draggable={false}
              className="w-full"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </button>
        </div>

        {/* Arrow prev */}
        <button
          onClick={() => {
            prev();
            if (timerRef.current) clearTimeout(timerRef.current);
          }}
          aria-label="Image précédente"
          className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3L5 8L10 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Arrow next */}
        <button
          onClick={() => {
            next();
            if (timerRef.current) clearTimeout(timerRef.current);
          }}
          aria-label="Image suivante"
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {/* Dots */}
      <div
        className="mt-4 flex justify-center gap-2"
        role="tablist"
        aria-label="Navigation par points"
      >
        {SLIDES.map((slide, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Aller à ${slide.label}`}
            onClick={() => {
              goTo(i);
              if (timerRef.current) clearTimeout(timerRef.current);
            }}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "bg-primary h-1.5 w-1.5" : "bg-primary/25 h-1 w-1"
            }`}
          />
        ))}
      </div>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={SLIDES[current].alt}
          onClick={() => setLightbox(false)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Fermer"
            onClick={() => setLightbox(false)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Arrow prev */}
          <button
            className="absolute top-1/2 left-3 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Image précédente"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Image
            src={SLIDES[current].src}
            alt={SLIDES[current].alt}
            width={1456}
            height={770}
            className="max-h-[90dvh] w-full max-w-6xl rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />

          {/* Arrow next */}
          <button
            className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Image suivante"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
