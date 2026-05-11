import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cotizpro — Cotisations URSSAF pour auto-entrepreneurs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        width: "100%",
        height: "100%",
        padding: "64px",
        background: "linear-gradient(135deg, #0e0f17 0%, #14162a 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Logo pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#6366f1",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <polygon
              points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
              fill="white"
              strokeWidth="0"
            />
          </svg>
        </div>
        <span
          style={{
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
          }}
        >
          Cotizpro
        </span>
      </div>

      {/* Titre principal */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: "56px",
          fontWeight: "800",
          lineHeight: "1.1",
          letterSpacing: "-1.5px",
          margin: "0 0 16px",
          maxWidth: "800px",
        }}
      >
        Vos cotisations URSSAF,
        <br />
        <span style={{ color: "#818cf8" }}>sans prise de tête.</span>
      </h1>

      {/* Sous-titre */}
      <p
        style={{
          color: "#94a3b8",
          fontSize: "22px",
          fontWeight: "400",
          margin: "0 0 40px",
          maxWidth: "620px",
          lineHeight: "1.5",
        }}
      >
        Calculez et suivez vos cotisations en temps réel. Pour auto-entrepreneurs
        français.
      </p>

      {/* Badges features */}
      <div style={{ display: "flex", gap: "12px" }}>
        {["Calcul automatique", "Export PDF", "Rappels e-mail"].map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: "9999px",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              color: "#a5b4fc",
              fontSize: "15px",
              fontWeight: "500",
            }}
          >
            {f}
          </div>
        ))}
      </div>
    </div>,
    { ...size }
  );
}
