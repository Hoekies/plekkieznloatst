"use client";

import { useEffect } from "react";

// Vangt een fout in de pagina op (in plaats van "Application error").
// Na een nieuwe versie van de app kan een open pagina een stukje code missen dat niet meer bestaat
// (ChunkLoadError): dan één keer vanzelf herladen. Anders een korte uitleg met opnieuw proberen.
const SLEUTEL = "pr_fout_herladen";

function isNieuweVersie(fout: Error) {
  return fout.name === "ChunkLoadError" || /Loading (CSS )?chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(fout.message);
}

export default function FoutScherm({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const nieuweVersie = isNieuweVersie(error);
  useEffect(() => {
    console.error(error);
    if (!nieuweVersie) return;
    // Hooguit één keer per minuut vanzelf herladen, anders blijft hij hangen in een lus
    let laatst = 0;
    try { laatst = Number(sessionStorage.getItem(SLEUTEL)) || 0; } catch { /* geen opslag */ }
    if (Date.now() - laatst > 60000) {
      try { sessionStorage.setItem(SLEUTEL, String(Date.now())); } catch { /* geen opslag */ }
      window.location.reload();
    }
  }, [error, nieuweVersie]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="pr-gem-panel" style={{ maxWidth: 420, width: "100%" }}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: "2rem" }}>{nieuweVersie ? "🔄" : "😵"}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#fff" }}>
            {nieuweVersie ? "Er is een nieuwe versie" : "Er ging iets mis"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {nieuweVersie ? "De app wordt even opnieuw geladen." : "Probeer het opnieuw. Blijft het misgaan, laad dan de pagina opnieuw."}
          </div>
          <button type="button" className="rl-knop hoofdknop" style={{ height: 44, justifyContent: "center" }}
            onClick={() => (nieuweVersie ? window.location.reload() : reset())}>
            {nieuweVersie ? "Opnieuw laden" : "Opnieuw proberen"}
          </button>
          {!nieuweVersie && error.message && <div style={{ fontSize: "0.7rem", color: "var(--muted)", wordBreak: "break-word" }}>{error.message}</div>}
        </div>
      </div>
    </div>
  );
}
