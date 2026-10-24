"use client";

import type { ControleRegel } from "@/lib/route-controle";
import { VensterKop } from "@/components/shared/Venster";

// "Klaar om te spelen?": de controle vóór het activeren van een route.
// Zelfde stijl als de andere vensters: paars paneel met gouden rand, ✕ rechtsboven,
// per punt een regel met een gekleurde streep (rood = moet opgelost, geel = let op).
export default function ControleVenster({ controle, status, actief, onSluit, onActiveer, onKlaarzetten }: {
  controle: ControleRegel[];
  status: string;
  actief: boolean;
  onSluit: () => void;
  onActiveer: () => void;
  onKlaarzetten: () => void;
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
          <VensterKop label="🩺 Route controleren" titel="Klaar om te spelen?" onSluit={() => onSluit()} />

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

          {/* Eén stap: is alles in orde, dan start je de route meteen (de spelers kunnen beginnen).
              Wie hem pas later wil starten, zet hem klaar met het linkje eronder. */}
          {!actief && (
            fouten ? (
              <div style={{ fontSize: "0.82rem", color: "#FCA5A5", textAlign: "center", fontWeight: 600 }}>Los eerst de rode punten op, dan kun je de route starten.</div>
            ) : (<>
              <button type="button" className="rl-knop hoofdknop" style={{ height: 44, width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onActiveer}>
                ▶ {controle.length ? "Toch starten" : "Starten"}
              </button>
              <div style={{ fontSize: "0.74rem", color: "var(--muted)", textAlign: "center" }}>De spelers kunnen dan meteen beginnen. Een andere actieve route stopt.</div>
              {status !== "gepubliceerd" && (
                <button type="button" className="es-link" style={{ alignSelf: "center" }} onClick={onKlaarzetten}>Nog niet starten, alleen klaarzetten</button>
              )}
            </>)
          )}
        </div>
      </div>
    </div>
  );
}
