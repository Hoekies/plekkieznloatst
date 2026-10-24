"use client";

import { useEffect, useState } from "react";
import type { PuzzelStand } from "@/lib/puzzel";
import { strooiConfetti } from "@/lib/confetti";

// Na de finish ook: hoeveel letters gevonden, en de punten per letter en voor het afmaken
type Stand = PuzzelStand & { actief: true; gevonden?: number; gefinisht?: boolean; letter_punten?: number; raad_bonus?: number;
  // Raden na de finish: tot wanneer, of het al voorbij is, en wat het team invulde
  raad_tot?: string | null; afgesloten?: boolean; gok?: string | null; gok_goed?: boolean | null };

// 🧩 Puzzelwoord: de letters die het team al verdiend heeft (de rest leeg). Tijdens het spel als smalle balk;
// bij de finish (raden) met een invulveld voor de bonuspunten. Zonder puzzelwoord in de route: niets.
export default function PuzzelWoord({ ververs = 0, raden = false }: { ververs?: number; raden?: boolean }) {
  const [stand, setStand] = useState<Stand | null>(null);
  const [gok, setGok] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [nu, setNu] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/speler/puzzel").then((r) => (r.ok ? r.json() : null)).then((d) => setStand(d?.actief ? d : null)).catch(() => {});
  }, [ververs]);
  // Aftellen tot de raadtijd om is; dan het woord ophalen (dat gaat dan open)
  const raadTot = stand?.raad_tot ? Date.parse(stand.raad_tot) : null;
  const telAf = raden && !!raadTot && !stand?.afgesloten;
  useEffect(() => {
    if (!telAf) return;
    const t = setInterval(() => setNu(Date.now()), 500);
    return () => clearInterval(t);
  }, [telAf]);
  const tijdOm = !!raadTot && nu > raadTot;
  useEffect(() => {
    if (!telAf || !tijdOm) return;
    fetch("/api/speler/puzzel").then((r) => (r.ok ? r.json() : null)).then((d) => d?.actief && setStand(d)).catch(() => {});
  }, [telAf, tijdOm]);

  if (!stand) return null;

  async function raad(e: React.FormEvent) {
    e.preventDefault();
    if (!gok.trim()) return;
    setBezig(true);
    const res = await fetch("/api/speler/puzzel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ woord: gok }) }).catch(() => null);
    const d = res ? await res.json().catch(() => null) : null;
    setBezig(false);
    if (!d) { setMelding("Raden lukte niet, probeer het opnieuw"); return; }
    if (d.actief) setStand(d);
    if (!res?.ok) { setMelding(`⚠️ ${d.fout ?? "Raden lukte niet"}`); return; }
    if (d.goed) strooiConfetti({ aantal: 160, duurMs: 3200, knal: true });
    setMelding(d.goed ? `🎉 Goed! +${d.raad_bonus ?? 0} punten voor het afmaken` : `❌ Helaas, het woord was ${d.letters?.join("") ?? ""}.`);
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
      {/* Eén poging binnen de minuut na de finish */}
      {!stand.opgelost && !stand.afgesloten && !tijdOm && (
        <>
          {raadTot && <div className="puzzel-klok">⏱️ Nog <strong>{Math.max(0, Math.ceil((raadTot - nu) / 1000))}</strong> seconden · één poging</div>}
          <form onSubmit={raad} className="puzzel-raden-veld">
            <input className="form-input" value={gok} onChange={(e) => setGok(e.target.value.toUpperCase())} placeholder={`Maak het woord af: +${stand.raad_bonus ?? 0}`} autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoFocus />
            <button type="submit" className="btn btn-primary" disabled={bezig || !gok.trim()}>{bezig ? "…" : "Raden"}</button>
          </form>
        </>
      )}
      {!stand.opgelost && stand.gok && !melding && <div className="puzzel-melding">❌ Jullie vulden {stand.gok} in; dat was het niet.</div>}
      {!stand.opgelost && !stand.gok && (stand.afgesloten || tijdOm) && !melding && <div className="puzzel-melding">⏱️ De tijd om te raden is voorbij.</div>}
      {melding && <div className="puzzel-melding">{melding}</div>}
    </div>
  );
}
