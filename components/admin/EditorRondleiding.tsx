"use client";

import { useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";

// 🧭 Rondleiding door de route-editor: vier korte stappen voor wie hem voor het eerst opent.
// Komt één keer vanzelf (onthouden op dit toestel); later opnieuw via 🧭 naast "Wat nu?".
export default function EditorRondleiding({ verspreid, onSluit }: { verspreid: boolean; onSluit: () => void }) {
  const [stap, setStap] = useState(0);
  const stappen = [
    { icoon: "🗺️", titel: "De kaart", tekst: "Tik op de kaart om iets neer te zetten: een punt, een item of een verboden gebied. Rechtsklik of lang drukken opent dat menu altijd. Slepen verplaatst." },
    { icoon: "🧩", titel: "Vijf knoppen", tekst: `Links staan de knoppen in bouwvolgorde, met een stapnummer: 📍 Punten${verspreid ? ", 👫 Teams" : ""}, ❓ Vragen, 🎁 Items en 🎉 Spel. Elke knop opent alles van dat onderdeel; de kaart blijft in beeld.` },
    { icoon: "💡", titel: "Wat nu?", tekst: "Onder de knoppen staat steeds de volgende stap. Tik erop en je gaat er meteen heen. Zo bouw je de route stap voor stap." },
    { icoon: "🧪", titel: "Testen en activeren", tekst: "Klaar? Loop de route na met Testen. Daarna activeer je hem rechtsboven. ⚙️ Instellingen is alleen voor wat zelden verandert, zoals de huisstijl." },
  ];
  const s = stappen[stap];
  const laatste = stap === stappen.length - 1;
  return (
    <VensterMetKop icoon="🧭" label={`Rondleiding · ${stap + 1} van ${stappen.length}`} titel={`${s.icoon} ${s.titel}`} onSluit={onSluit} breedte={420}>
      <p className="rondleiding-tekst">{s.tekst}</p>
      <div className="rondleiding-stippen" aria-hidden>
        {stappen.map((_, i) => <span key={i} className={i === stap ? "aan" : ""} />)}
      </div>
      <div className="rondleiding-knoppen">
        {stap > 0 ? <button type="button" className="rl-knop" onClick={() => setStap(stap - 1)}>← Vorige</button> : <button type="button" className="rl-knop" onClick={onSluit}>Overslaan</button>}
        <button type="button" className="rl-knop rl-knop--cyan" onClick={() => (laatste ? onSluit() : setStap(stap + 1))}>{laatste ? "✓ Aan de slag" : "Volgende →"}</button>
      </div>
    </VensterMetKop>
  );
}
