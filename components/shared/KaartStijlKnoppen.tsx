"use client";

import type { KaartStijl } from "@/lib/basiskaart";

// ☀️ licht · 🌙 donker · 🛰️ luchtfoto, linksboven onder de zoomknoppen (valt op de telefoon nergens weg)
// onder = linksonder (in de route-editor, waar linksboven het puntpaneel opent)
// inBlok = onderdeel van een groter blok knoppen (zoals in de route-editor, samen met de kaartlagen)
// verticaal = onder elkaar, rechts (spelerskaart); onderAfstand = hoogte boven de onderkant in px
// enkel = alleen één knop die steeds de volgende stijl kiest (spelerskaart)
// linksAfstand = links in plaats van rechts, zoveel px van de linkerkant (spelerskaart: naast 🎯)
export default function KaartStijlKnoppen({ stijl, onKies, onder = false, inBlok = false, verticaal = false, enkel = false, onderAfstand, linksAfstand }: { stijl: KaartStijl; onKies: (s: KaartStijl) => void; onder?: boolean; inBlok?: boolean; verticaal?: boolean; enkel?: boolean; onderAfstand?: number | string; linksAfstand?: number }) {
  // In een blok met tekst erbij, net als de knoppen van de kaartlagen
  const knop = (s: KaartStijl, icoon: string, uitleg: string, kort: string) => (
    <button type="button" className={stijl === s ? "aan" : ""} onClick={() => onKies(s)} title={uitleg} aria-label={uitleg} aria-pressed={stijl === s}>{icoon}{inBlok && <> {kort}</>}</button>
  );
  // Eén knop die de volgende stijl kiest (telefoon in een blok, en de spelerskaart)
  const wissel = (
    <button type="button" className="kaart-stijl-wissel aan" onClick={() => onKies(stijl === "licht" ? "donker" : stijl === "donker" ? "luchtfoto" : "licht")}
      title={`Kaart: ${stijl === "licht" ? "licht" : stijl === "donker" ? "donker" : "luchtfoto"} (tik voor de volgende)`} aria-label="Andere kaartstijl">
      {stijl === "licht" ? "☀️" : stijl === "donker" ? "🌙" : "🛰️"}
    </button>
  );
  return (
    <div className={`kaart-stijl${inBlok ? " kaart-stijl--in-blok" : verticaal ? " kaart-stijl--verticaal" : onder ? " kaart-stijl--onder" : ""}${enkel ? " kaart-stijl--enkel" : ""}`}
      style={verticaal && onderAfstand !== undefined
        ? { bottom: onderAfstand, ...(linksAfstand !== undefined ? { left: linksAfstand, right: "auto" } : {}) }
        : undefined} onClick={(e) => e.stopPropagation()}>
      {enkel ? wissel : (<>
        {knop("licht", "☀️", "Lichte kaart", "Licht")}
        {knop("donker", "🌙", "Donkere kaart", "Donker")}
        {knop("luchtfoto", "🛰️", "Luchtfoto", "Luchtfoto")}
        {inBlok && wissel}
      </>)}
    </div>
  );
}
