"use client";

import { useEffect, useState } from "react";
import type { PuzzelStand } from "@/lib/puzzel";
import { strooiConfetti } from "@/lib/confetti";

// Na de finish ook: hoeveel letters gevonden, en de punten per letter en voor het afmaken
type Stand = PuzzelStand & { actief: true; gevonden?: number; gefinisht?: boolean; letter_punten?: number; raad_bonus?: number };

// 🧩 Puzzelwoord: de letters die het team al verdiend heeft (de rest leeg). Tijdens het spel als smalle balk;
// bij de finish (raden) met een invulveld voor de bonuspunten. Zonder puzzelwoord in de route: niets.
export default function PuzzelWoord({ ververs = 0, raden = false }: { ververs?: number; raden?: boolean }) {
  const [stand, setStand] = useState<Stand | null>(null);
  const [gok, setGok] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/speler/puzzel").then((r) => (r.ok ? r.json() : null)).then((d) => setStand(d?.actief ? d : null)).catch(() => {});
  }, [ververs]);

  if (!stand) return null;

  async function raad(e: React.FormEvent) {
    e.preventDefault();
    if (!gok.trim()) return;
    setBezig(true);
    const res = await fetch("/api/speler/puzzel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ woord: gok }) }).catch(() => null);
    const d = res?.ok ? await res.json() : null;
    setBezig(false);
    if (!d) { setMelding("Raden lukte niet, probeer het opnieuw"); return; }
    setStand(d);
    if (d.goed) strooiConfetti({ aantal: 160, duurMs: 3200, knal: true });
    setMelding(d.goed ? `🎉 Goed! +${d.raad_bonus ?? 0} punten voor het afmaken` : "❌ Helaas, dat is het niet. Probeer het nog eens!");
  }

  const tegels = (
    <div className="puzzel-tegels" aria-label={`Puzzelwoord, ${stand.letters.filter(Boolean).length} van ${stand.lengte} letters`}>
      {stand.letters.map((l, i) => <span key={i} className={`puzzel-tegel${l ? " puzzel-tegel--open" : ""}`}>{l ?? ""}</span>)}
    </div>
  );

  if (!raden) {
    return (
      <div className="puzzel-balk" title="Puzzelwoord: elke goede vraag geeft een letter">
        🧩 {tegels}
      </div>
    );
  }
  // Bij de finish: punten per gevonden letter; alles gevonden = bonus; anders het woord zelf afmaken
  const gevonden = stand.gevonden ?? stand.letters.filter(Boolean).length;
  const allesGevonden = gevonden >= stand.lengte;
  const letterPunten = stand.letter_punten ?? 0;
  return (
    <div className="puzzel-raden">
      <div className="puzzel-raden-kop">🧩 Puzzelwoord</div>
      {stand.omschrijving && <div className="puzzel-hint">💡 {stand.omschrijving}</div>}
      {tegels}
      <div className="puzzel-punten">
        <span>🔤 {gevonden} van {stand.lengte} letters gevonden{letterPunten ? <> · <strong>+{gevonden * letterPunten}</strong></> : null}</span>
        {allesGevonden && <span>🎉 Alle letters gevonden · <strong>+{stand.bonus}</strong></span>}
        {!allesGevonden && stand.opgelost && <span>🎉 Woord afgemaakt · <strong>+{stand.raad_bonus ?? 0}</strong></span>}
      </div>
      {!stand.opgelost && (
        <form onSubmit={raad} className="puzzel-raden-veld">
          <input className="form-input" value={gok} onChange={(e) => setGok(e.target.value.toUpperCase())} placeholder={`Maak het woord af: +${stand.raad_bonus ?? 0}`} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <button type="submit" className="btn btn-primary" disabled={bezig || !gok.trim()}>{bezig ? "…" : "Raden"}</button>
        </form>
      )}
      {melding && <div className="puzzel-melding">{melding}</div>}
    </div>
  );
}
