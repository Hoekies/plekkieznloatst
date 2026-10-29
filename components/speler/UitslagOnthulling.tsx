"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { strooiConfetti } from "@/lib/confetti";
import { speelOverwinning, speelHelaas } from "@/lib/sounds";

// 🏆 Het moment dat de uitslag vrijkomt: over het hele scherm de eigen plaats. De winnaar krijgt confetti en een
// fanfare; de anderen een knipoog (en een "wah wah"-trombone). Tik = weg, daaronder staat de eindstand.

// Grappige teksten voor wie niet won; de laatste plek heeft zijn eigen eer
const TROOST: Record<"twee" | "drie" | "midden" | "laatst", string[]> = {
  twee: [
    "Zó dichtbij! Nog één goed antwoord en het goud was van jullie.",
    "Zilver! Eigenlijk gewoon goud, maar dan bescheidener.",
  ],
  drie: [
    "Brons! Ook metaal, en het roest niet.",
    "Op het podium! Daar staan jullie mooi op de foto.",
  ],
  midden: [
    "Niet gewonnen, wél gelopen. Volgende keer eerst koffie, dan de route. ☕",
    "Netjes in het midden: de gouden middenweg, zeggen ze.",
  ],
  laatst: [
    "Iemand moet de laatste zijn… en jullie deden dat met verve. Volgende keer de kaart rechtop houden? 🗺️",
    "Laatste plek, maar wel de meeste frisse lucht gehad. Volgende keer iets harder lopen! 🐌",
  ],
};

export default function UitslagOnthulling({ plaats, aantal, kleuren, prijs = null, onSluit }: {
  plaats: number; aantal: number; kleuren: string[]; prijs?: { emoji: string; titel: string; uitleg: string } | null; onSluit: () => void;
}) {
  const winnaar = plaats === 1;
  const soort = plaats === 2 ? "twee" : plaats === 3 ? "drie" : aantal > 1 && plaats === aantal ? "laatst" : "midden";
  // Vaste keuze per plaats (niet bij elke render een andere tekst)
  const troost = TROOST[soort][plaats % TROOST[soort].length];

  useEffect(() => {
    if (winnaar) {
      speelOverwinning();
      navigator.vibrate?.([120, 60, 120, 60, 300]);
      const kl = [...kleuren, "#FFD23F", "#FFFFFF"];
      strooiConfetti({ aantal: 180, duurMs: 3000, knal: true, kleuren: kl });
      const t1 = setTimeout(() => strooiConfetti({ aantal: 160, duurMs: 3500, kleuren: kl }), 900);
      const t2 = setTimeout(() => strooiConfetti({ aantal: 140, duurMs: 3500, knal: true, kleuren: kl }), 2200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    speelHelaas();
    navigator.vibrate?.(200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className={`onthulling${winnaar ? " onthulling--winnaar" : ""}`} onClick={onSluit} role="dialog" aria-label="Uitslag">
      <div className="onthulling-kaart" onClick={(e) => e.stopPropagation()}>
        {winnaar && <div className="onthulling-stralen" aria-hidden />}
        <div className="onthulling-beker" aria-hidden>{winnaar ? "🏆" : plaats === 2 ? "🥈" : plaats === 3 ? "🥉" : soort === "laatst" ? "🐌" : "🎈"}</div>
        <div className="onthulling-plaats">{winnaar ? "Jullie hebben gewonnen!" : `Plaats ${plaats} van ${aantal}`}</div>
        <p className="onthulling-tekst">
          {winnaar ? "Kampioenen! Het goud is van jullie. Laat de groepsapp maar ontploffen. 🎉" : troost}
        </p>
        {!winnaar && <p className="onthulling-klein">Leuk gespeeld! 💪</p>}
        {/* 🏆 Iedereen wint iets: de titel van dit team */}
        {prijs && <div className="onthulling-prijs">Jullie prijs: <strong>{prijs.emoji} {prijs.titel}</strong><span>{prijs.uitleg}</span></div>}
        <button type="button" className="onthulling-knop" onClick={onSluit}>🏆 Bekijk de eindstand</button>
      </div>
    </div>,
    document.body,
  );
}
