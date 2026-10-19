"use client";

import type { KaartStijl } from "@/lib/basiskaart";

// ☀️ licht · 🌙 donker · 🛰️ luchtfoto, linksboven onder de zoomknoppen (valt op de telefoon nergens weg)
// onder = linksonder (in de route-editor, waar linksboven het puntpaneel opent)
export default function KaartStijlKnoppen({ stijl, onKies, onder = false }: { stijl: KaartStijl; onKies: (s: KaartStijl) => void; onder?: boolean }) {
  const knop = (s: KaartStijl, icoon: string, uitleg: string) => (
    <button type="button" className={stijl === s ? "aan" : ""} onClick={() => onKies(s)} title={uitleg} aria-label={uitleg} aria-pressed={stijl === s}>{icoon}</button>
  );
  return (
    <div className={`kaart-stijl${onder ? " kaart-stijl--onder" : ""}`} onClick={(e) => e.stopPropagation()}>
      {knop("licht", "☀️", "Lichte kaart")}
      {knop("donker", "🌙", "Donkere kaart")}
      {knop("luchtfoto", "🛰️", "Luchtfoto")}
    </div>
  );
}
