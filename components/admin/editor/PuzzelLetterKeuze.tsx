"use client";

import { lettersVoor } from "@/lib/puzzel";

// Wat de vraag-editor van het puzzelwoord moet weten (alleen als het puzzelwoord aan staat)
export type PuzzelKoppeling = {
  letters: number;                       // lengte van het woord
  verdeling: Record<string, number>;     // per vraagpunt 0 of 2 letters (ontbreekt = 1)
  vraagIds: string[];                    // alle vraagpunten van de route
  onZet: (puntId: string, n: number) => void;
};

// 🧩 Per vraag: telt deze mee voor het puzzelwoord? Geen letter, 1 of 2. Ernaast meteen of het woord nog
// klopt met wat alle vragen samen opleveren. Hetzelfde als in het 🧩-venster van de route-editor, maar
// hier bij de vraag zelf.
export default function PuzzelLetterKeuze({ puzzel, puntId }: { puzzel: PuzzelKoppeling; puntId: string }) {
  const n = lettersVoor(puzzel.verdeling, puntId);
  const samen = puzzel.vraagIds.reduce((t, id) => t + lettersVoor(puzzel.verdeling, id), 0);
  const verschil = puzzel.letters - samen;
  return (
    <div className="puzzel-keuze">
      <span className="puzzel-keuze-titel">🧩 Letters voor het puzzelwoord</span>
      <div className="segment puzzel-keuze-segment" role="radiogroup" aria-label="Letters voor het puzzelwoord">
        {[0, 1, 2].map((k) => (
          <button key={k} type="button" role="radio" aria-checked={n === k} className={n === k ? "aan" : ""} onClick={() => puzzel.onZet(puntId, k)}
            title={k === 0 ? "Deze vraag telt niet mee: een goed antwoord geeft geen letter" : `Een goed antwoord geeft ${k} letter${k === 1 ? "" : "s"}`}>
            {k === 0 ? "Geen" : k}
          </button>
        ))}
      </div>
      <span className={`puzzel-keuze-telling${verschil === 0 ? " puzzel-keuze-telling--goed" : ""}`}>
        {verschil === 0
          ? `✓ Klopt: ${puzzel.letters} letters`
          : `⚠️ Woord ${puzzel.letters} letters, vragen samen ${samen}`}
      </span>
    </div>
  );
}
