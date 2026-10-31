"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import Venster, { VensterKop } from "@/components/shared/Venster";

// "± Punten": bonus of aftrek voor één team, met een reden (komt in de tijdlijn en het rapport)
// Veelgebruikte redenen (zelf typen kan altijd)
const REDENEN = ["Mooiste foto", "Bonusopdracht", "Hulp van de organisatie", "Regel overtreden", "Foutje rechtgezet"];

export default function PuntenAanpassen({ sessieId, naam, onKlaar }: { sessieId: string; naam: string; onKlaar: () => void }) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState(10);
  const [reden, setReden] = useState("");
  const [bezig, setBezig] = useState(false);


  async function toepassen(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const res = await fetch(`/api/admin/sessies/${sessieId}/punten`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta, reden }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Aanpassen", data.fout), "fout"); return; }
    toonMelding(`${naam}: ${data.delta > 0 ? "+" : ""}${data.delta} punten`, "ok");
    setOpen(false); setReden(""); setDelta(10);
    onKlaar();
  }

  return (
    <>
      <button type="button" className="rl-knop" onClick={() => setOpen(true)} title="Bonus of aftrek, met een reden"><span className="knop-icoon" aria-hidden>±</span> Punten</button>
      {open && (
        <Venster onSluit={() => setOpen(false)} breedte={400}>
            <form onSubmit={toepassen} className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
              <VensterKop label="± Punten aanpassen" titel={naam} onSluit={() => setOpen(false)} />
              {/* Snelkeuze, of zelf een getal (negatief = aftrek) */}
              <div className="punten-snel">
                {[-20, -10, 10, 20, 50].map((n) => (
                  <button key={n} type="button" className={`rl-knop${delta === n ? (n > 0 ? " rl-knop--groen" : " rl-knop--rood") : ""}`} onClick={() => setDelta(n)}>
                    {n > 0 ? `+${n}` : n}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="form-group" style={{ margin: 0, width: 100 }}>
                  <label className="form-label">Punten</label>
                  <input className="form-input" type="number" value={delta} onChange={(e) => setDelta(Math.round(Number(e.target.value)))} style={{ textAlign: "center", fontWeight: 800 }} />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label className="form-label">Reden</label>
                  <input className="form-input" value={reden} onChange={(e) => setReden(e.target.value)} maxLength={120} placeholder="Waarom? (verplicht)" required />
                </div>
              </div>
              {/* Reden is verplicht (komt in de tijdlijn en het rapport); veelgebruikte redenen met één tik */}
              <div className="reden-snel">
                {REDENEN.map((r) => (
                  <button key={r} type="button" className={`plezier-chip${reden === r ? " plezier-chip--aan" : ""}`} onClick={() => setReden(r)}>{r}</button>
                ))}
              </div>
              <button type="submit" className={`rl-knop ${delta < 0 ? "rl-knop--rood" : "rl-knop--groen"}`} style={{ height: 44, fontWeight: 800 }} disabled={bezig || !delta || !reden.trim()}>
                {bezig ? "Bezig…" : delta < 0 ? `${delta} punten aftrekken` : `+${delta} punten geven`}
              </button>
            </form>
        </Venster>
      )}
    </>
  );
}
