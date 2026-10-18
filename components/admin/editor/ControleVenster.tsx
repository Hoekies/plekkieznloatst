"use client";

import type { ControleRegel } from "@/lib/route-controle";

// "Klaar om te spelen?": de controle vóór het activeren van een route.
// Zelfde stijl als de andere vensters: paars paneel met gouden rand, ✕ rechtsboven,
// per punt een regel met een gekleurde streep (rood = moet opgelost, geel = let op).
export default function ControleVenster({ controle, status, actief, onSluit, onActiveer }: {
  controle: ControleRegel[];
  status: string;
  actief: boolean;
  onSluit: () => void;
  onActiveer: () => void;
}) {
  const fouten = controle.filter((r) => r.niveau === "fout").length;
  const letOp = controle.length - fouten;
  const samenvatting = controle.length === 0
    ? "Alles in orde"
    : [fouten ? `${fouten} om op te lossen` : "", letOp ? `${letOp} om op te letten` : ""].filter(Boolean).join(" · ");

  return (
    <div onClick={() => onSluit()} style={{ position: "fixed", inset: 0, zIndex: 1900, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 440, maxHeight: "90vh" }}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(90vh - 6px)", overflowY: "auto", padding: "18px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="pr-gem-label">🩺 Route controleren</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>Klaar om te spelen?</div>
            </div>
            <button type="button" className="editor-paneel-sluit" onClick={() => onSluit()} title="Sluiten" aria-label="Sluiten">✕</button>
          </div>

          <div className={`controle-samenvatting${fouten ? " controle-samenvatting--fout" : controle.length ? " controle-samenvatting--letop" : ""}`}>
            {controle.length === 0 ? "✅" : fouten ? "❌" : "⚠️"} {samenvatting}
          </div>

          {controle.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {controle.map((r, i) => (
                <div key={i} className={`controle-regel controle-regel--${r.niveau === "fout" ? "fout" : "letop"}`}>{r.tekst}</div>
              ))}
            </div>
          )}

          {status !== "gepubliceerd" && !actief && (
            <div className="controle-regel controle-regel--info">Publiceer de route eerst (📢 Publiceer), daarna kun je hem activeren.</div>
          )}

          {!actief && status === "gepubliceerd" && (
            fouten ? (
              <div style={{ fontSize: "0.82rem", color: "#FCA5A5", textAlign: "center", fontWeight: 600 }}>Los eerst de rode punten op, dan kun je activeren.</div>
            ) : (
              <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800, width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onActiveer}>
                ▶ {controle.length ? "Toch activeren" : "Activeren"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
