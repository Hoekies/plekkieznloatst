"use client";

import { useEffect, useState } from "react";

// Korte melding onderin het beheerscherm, in plaats van de grijze alert() van de browser.
// Overal te gebruiken met toonMelding("tekst") of toonMelding("tekst", "fout").
type Soort = "info" | "ok" | "fout";
type Item = { id: number; tekst: string; soort: Soort };

let volgend = 1;
const luisteraars = new Set<(m: Item) => void>();

export function toonMelding(tekst: string, soort: Soort = "info") {
  const m = { id: volgend++, tekst, soort };
  luisteraars.forEach((l) => l(m));
}

const KLEUR: Record<Soort, string> = { info: "rgba(0,217,255,0.5)", ok: "rgba(34,197,94,0.6)", fout: "rgba(239,68,68,0.7)" };

export default function MeldingHouder() {
  const [meldingen, setMeldingen] = useState<Item[]>([]);
  useEffect(() => {
    const l = (m: Item) => {
      setMeldingen((lijst) => [...lijst.slice(-2), m]);
      setTimeout(() => setMeldingen((lijst) => lijst.filter((x) => x.id !== m.id)), m.soort === "fout" ? 7000 : 4000);
    };
    luisteraars.add(l);
    return () => { luisteraars.delete(l); };
  }, []);
  if (!meldingen.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 3000, display: "flex", flexDirection: "column", gap: 6, alignItems: "center", pointerEvents: "none", maxWidth: "calc(100vw - 32px)" }}>
      {meldingen.map((m) => (
        <div key={m.id} onClick={() => setMeldingen((lijst) => lijst.filter((x) => x.id !== m.id))}
          style={{
            pointerEvents: "auto", cursor: "pointer", padding: "9px 16px", borderRadius: 12, fontSize: "0.85rem", fontWeight: 600, color: "#fff",
            background: "rgba(8,28,48,0.96)", border: `1px solid ${KLEUR[m.soort]}`, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
          {m.soort === "fout" ? "⚠️ " : m.soort === "ok" ? "✅ " : ""}{m.tekst}
        </div>
      ))}
    </div>
  );
}
