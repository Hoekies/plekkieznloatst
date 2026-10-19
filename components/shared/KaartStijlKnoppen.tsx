"use client";

import type { KaartStijl } from "@/lib/basiskaart";

// ☀️ licht · 🌙 donker · 🛰️ luchtfoto, linksboven onder de zoomknoppen (valt op de telefoon nergens weg)
// onder = linksonder (in de route-editor, waar linksboven het puntpaneel opent)
// inBlok = onderdeel van een groter blok knoppen (zoals in de route-editor, samen met de kaartlagen)
export default function KaartStijlKnoppen({ stijl, onKies, onder = false, inBlok = false }: { stijl: KaartStijl; onKies: (s: KaartStijl) => void; onder?: boolean; inBlok?: boolean }) {
  // In een blok met tekst erbij, net als de knoppen van de kaartlagen
  const knop = (s: KaartStijl, icoon: string, uitleg: string, kort: string) => (
    <button type="button" className={stijl === s ? "aan" : ""} onClick={() => onKies(s)} title={uitleg} aria-label={uitleg} aria-pressed={stijl === s}>{icoon}{inBlok && <> {kort}</>}</button>
  );
  return (
    <div className={`kaart-stijl${inBlok ? " kaart-stijl--in-blok" : onder ? " kaart-stijl--onder" : ""}`} onClick={(e) => e.stopPropagation()}>
      {knop("licht", "☀️", "Lichte kaart", "Licht")}
      {knop("donker", "🌙", "Donkere kaart", "Donker")}
      {knop("luchtfoto", "🛰️", "Luchtfoto", "Luchtfoto")}
      {/* Telefoon (in een blok): één knop die de volgende stijl kiest */}
      {inBlok && (
        <button type="button" className="kaart-stijl-wissel aan" onClick={() => onKies(stijl === "licht" ? "donker" : stijl === "donker" ? "luchtfoto" : "licht")}
          title={`Kaart: ${stijl === "licht" ? "licht" : stijl === "donker" ? "donker" : "luchtfoto"} (tik voor de volgende)`} aria-label="Andere kaartstijl">
          {stijl === "licht" ? "☀️" : stijl === "donker" ? "🌙" : "🛰️"}
        </button>
      )}
    </div>
  );
}
