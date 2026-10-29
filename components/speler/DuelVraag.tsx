"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { speelDuel, speelGoedAntwoord, speelFoutAntwoord } from "@/lib/sounds";
import { strooiConfetti } from "@/lib/confetti";

// ⚔️ Duel (migratie 006): twee teams vlak bij elkaar krijgen dezelfde snelle vraag. Wie het eerst goed is, pakt
// punten van de ander. Eén poging. De uitslag komt bij allebei in beeld.

type Duel = {
  id: string; vraag: string; keuzes: string[]; punten: number; rest: number;
  tegenstander: { naam: string; icon: string | null }; mijn_antwoord: number | null; afgerond: boolean;
  uitslag: "gewonnen" | "verloren" | "niemand" | null; buit: number;
};

const POLL_MS = 4000;

export default function DuelVraag() {
  const [duel, setDuel] = useState<Duel | null>(null);
  const [rest, setRest] = useState(0);
  const [bezig, setBezig] = useState(false);
  const [weg, setWeg] = useState<string | null>(null);   // weggetikte uitslag (per duel)
  const gezien = useRef<string | null>(null);

  useEffect(() => {
    let stop = false;
    async function haal() {
      try {
        const res = await fetch("/api/speler/duel");
        if (!res.ok || stop) return;
        const d = (await res.json()).duel as Duel | null;
        setDuel(d);
        if (d) {
          setRest(d.rest);
          // Nieuw duel: geluid en trillen
          if (gezien.current !== d.id && !d.afgerond) { gezien.current = d.id; speelDuel(); navigator.vibrate?.([60, 40, 60, 40, 200]); }
        }
      } catch { /* geen verbinding: volgende keer */ }
    }
    haal();
    const t = setInterval(haal, POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, []);
  useEffect(() => {
    if (!duel || duel.afgerond) return;
    const t = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [duel]);

  // De uitslag één keer met geluid
  const uitslagGezien = useRef<string | null>(null);
  useEffect(() => {
    if (!duel?.uitslag || uitslagGezien.current === duel.id) return;
    uitslagGezien.current = duel.id;
    if (duel.uitslag === "gewonnen") { speelGoedAntwoord(); strooiConfetti({ aantal: 80, duurMs: 1800, knal: true }); }
    else if (duel.uitslag === "verloren") speelFoutAntwoord();
  }, [duel]);

  async function antwoord(keuze: number) {
    if (!duel || bezig) return;
    setBezig(true);
    const res = await fetch("/api/speler/duel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duel_id: duel.id, keuze }) }).catch(() => null);
    setBezig(false);
    if (res?.ok) setDuel((d) => (d ? { ...d, mijn_antwoord: keuze } : d));
    // Meteen de nieuwe stand ophalen (gewonnen of niet)
    const nieuw = await fetch("/api/speler/duel").then((r) => r.json()).catch(() => null);
    if (nieuw?.duel) setDuel(nieuw.duel);
  }

  if (!duel || weg === duel.id) return null;
  const open = !duel.afgerond && rest > 0;
  if (!open && !duel.uitslag) return null;

  return createPortal(
    <div className="bonus-achter duel-achter" role="dialog" aria-label="Duel">
      <div className="bonus-kaart duel-kaart">
        <div className="bonus-kop">
          <span className="bonus-bliksem" aria-hidden>⚔️</span>
          <span className="bonus-titel duel-titel">DUEL!</span>
          {open && <span className={`bonus-tijd${rest <= 10 ? " bonus-tijd--bijna" : ""}`}>⏱ {rest}s</span>}
        </div>
        <p className="bonus-uitleg">Tegen <strong>{duel.tegenstander.icon ?? "👫"} {duel.tegenstander.naam}</strong>, vlak bij jullie. Wie het eerst goed is pakt <strong>{duel.punten} punten</strong> van de ander. Eén poging.</p>
        {duel.uitslag ? (
          <div className="bonus-uitslag">
            {duel.uitslag === "gewonnen" && <><div className="bonus-uitslag-groot">🏆 Gewonnen!</div><p>Jullie pakken <strong>{duel.buit} punten</strong> van {duel.tegenstander.naam}.</p></>}
            {duel.uitslag === "verloren" && <><div className="bonus-uitslag-groot">😵 Verloren…</div><p>{duel.tegenstander.naam} was sneller{duel.buit ? <> en pakt {duel.buit} punten</> : null}.</p></>}
            {duel.uitslag === "niemand" && <><div className="bonus-uitslag-groot">🤝 Gelijkspel</div><p>Niemand had het goed: geen punten.</p></>}
            <button type="button" className="bonus-sluit" onClick={() => setWeg(duel.id)}>Verder spelen</button>
          </div>
        ) : duel.mijn_antwoord !== null ? (
          <div className="bonus-uitslag"><p>Antwoord verstuurd… even wachten op {duel.tegenstander.naam}.</p></div>
        ) : (
          <>
            <div className="bonus-vraag">{duel.vraag}</div>
            <div className="bonus-keuzes">
              {duel.keuzes.map((k, i) => <button key={i} type="button" className="bonus-keuze" disabled={bezig} onClick={() => antwoord(i)}>{k}</button>)}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
