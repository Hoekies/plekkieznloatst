"use client";

import type { ControleRegel } from "@/lib/route-controle";

// "Klaar om te spelen?": de controle vóór het activeren van een route
export default function ControleVenster({ controle, status, actief, onSluit, onActiveer }: {
  controle: ControleRegel[];
  status: string;
  actief: boolean;
  onSluit: () => void;
  onActiveer: () => void;
}) {
  return (
    <div className="route-editor-backdrop" style={{ zIndex: 1900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={() => onSluit()}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", borderRadius: 14, padding: "16px 18px",
        background: "rgba(8,28,48,0.97)", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column", gap: 10, color: "var(--text)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>🩺 Klaar om te spelen?</span>
          <button type="button" className="editor-paneel-sluit" onClick={() => onSluit()} title="Sluiten">✕</button>
        </div>
        {controle.length === 0 ? (
          <div style={{ color: "#86EFAC", fontWeight: 600, fontSize: "0.88rem" }}>✅ Alles in orde. De route is klaar om te spelen.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {controle.map((r, i) => (
              <li key={i} style={{ fontSize: "0.84rem", lineHeight: 1.4, display: "flex", gap: 8 }}>
                <span>{r.niveau === "fout" ? "❌" : "⚠️"}</span>
                <span style={{ color: r.niveau === "fout" ? "#FCA5A5" : "var(--text)" }}>{r.tekst}</span>
              </li>
            ))}
          </ul>
        )}
        {status !== "gepubliceerd" && (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Publiceer de route eerst (📢 Publiceer) voordat je hem activeert.</div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="rl-knop" onClick={() => onSluit()}>Terug</button>
          {!actief && status === "gepubliceerd" && (
            controle.some((r) => r.niveau === "fout") ? (
              <span style={{ fontSize: "0.78rem", color: "#FCA5A5", alignSelf: "center" }}>Los eerst de ❌ op.</span>
            ) : (
              <button type="button" className="rl-knop rl-knop--cyan" onClick={onActiveer}>
                ▶ {controle.length ? "Toch activeren" : "Activeren"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
