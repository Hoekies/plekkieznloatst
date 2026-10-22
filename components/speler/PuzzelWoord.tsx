"use client";

import { useEffect, useState } from "react";
import type { PuzzelStand } from "@/lib/puzzel";

type Stand = PuzzelStand & { actief: true };

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
    setMelding(d.goed ? `🎉 Goed geraden! +${d.bonus} punten` : "❌ Helaas, dat is het niet. Probeer het nog eens!");
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
        {stand.omschrijving && <span className="puzzel-hint">{stand.omschrijving}</span>}
      </div>
    );
  }
  return (
    <div className="puzzel-raden">
      <div className="puzzel-raden-kop">🧩 Puzzelwoord {stand.opgelost ? "· opgelost!" : `· raad het voor ${stand.bonus} punten`}</div>
      {stand.omschrijving && <div className="puzzel-hint">💡 {stand.omschrijving}</div>}
      {tegels}
      {!stand.opgelost && (
        <form onSubmit={raad} className="puzzel-raden-veld">
          <input className="form-input" value={gok} onChange={(e) => setGok(e.target.value.toUpperCase())} placeholder="Het woord is…" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <button type="submit" className="btn btn-primary" disabled={bezig || !gok.trim()}>{bezig ? "…" : "Raden"}</button>
        </form>
      )}
      {melding && <div className="puzzel-melding">{melding}</div>}
    </div>
  );
}
