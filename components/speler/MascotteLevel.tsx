"use client";

import { useEffect, useRef, useState } from "react";
import { MASCOTTE, LEVELS, mascotteVoor, levelVoor, volgendeTrede } from "@/lib/spelplezier";
import { strooiConfetti } from "@/lib/confetti";
import { speelBonus } from "@/lib/sounds";

// 🐣 Mascotte en 🏅 level in de puntenbalk (spelplezier deel 2, per route aan of uit): groeien mee met de score.
// Tik erop voor alle stappen en hoeveel punten nog tot de volgende. Een nieuwe stap geeft confetti en een melding.
export default function MascotteLevel({ score, mascotte, levels }: { score: number; mascotte: boolean; levels: boolean }) {
  const [open, setOpen] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const m = mascotteVoor(score), l = levelVoor(score);
  const vorige = useRef<string | null>(null);

  // Nieuwe stap (niet bij het openen van de kaart): even vieren
  useEffect(() => {
    const sleutel = `${mascotte ? m.naam : ""}|${levels ? l.naam : ""}`;
    if (vorige.current !== null && vorige.current !== sleutel) {
      const oud = vorige.current.split("|");
      const tekst = mascotte && oud[0] !== m.naam && MASCOTTE.findIndex((x) => x.naam === m.naam) > MASCOTTE.findIndex((x) => x.naam === oud[0])
        ? `${m.emoji} Jullie mascotte is nu een ${m.naam.toLowerCase()}!`
        : levels && oud[1] !== l.naam && LEVELS.findIndex((x) => x.naam === l.naam) > LEVELS.findIndex((x) => x.naam === oud[1])
          ? `${l.emoji} Nieuw level: ${l.naam}!` : null;
      if (tekst) {
        setMelding(tekst);
        strooiConfetti({ aantal: 60, duurMs: 1600, knal: true });
        speelBonus();
        window.setTimeout(() => setMelding(null), 4000);
      }
    }
    vorige.current = sleutel;
  }, [m.naam, l.naam, mascotte, levels, m.emoji, l.emoji]);

  if (!mascotte && !levels) return null;
  const volgende = levels ? volgendeTrede(LEVELS, score) : volgendeTrede(MASCOTTE, score);

  return (
    <>
      <button type="button" className="mascotte-gem" onClick={() => setOpen((o) => !o)} aria-label="Mascotte en level" title="Mascotte en level">
        {mascotte && <span className="mascotte-gem-dier" aria-hidden>{m.emoji}</span>}
        {levels && <span className="mascotte-gem-level">{l.emoji}<small>{l.naam}</small></span>}
      </button>
      {open && (
        <div className="mascotte-pop" onClick={() => setOpen(false)}>
          {mascotte && (
            <div className="mascotte-pop-rij">
              {MASCOTTE.map((x) => <span key={x.naam} className={score >= x.min ? "bereikt" : ""} title={`${x.naam} vanaf ${x.min}`}>{x.emoji}<small>{x.min}</small></span>)}
            </div>
          )}
          {levels && (
            <div className="mascotte-pop-rij">
              {LEVELS.map((x) => <span key={x.naam} className={score >= x.min ? "bereikt" : ""} title={`${x.naam} vanaf ${x.min}`}>{x.emoji}<small>{x.naam}</small></span>)}
            </div>
          )}
          <div className="mascotte-pop-nog">{volgende ? `Nog ${volgende.nog} punten tot ${volgende.trede.emoji} ${volgende.trede.naam}` : "Hoogste stap bereikt! 🏆"}</div>
        </div>
      )}
      {melding && <div className="mascotte-melding" role="status">{melding}</div>}
    </>
  );
}
