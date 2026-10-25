"use client";

import { useEffect, useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import Venster from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Tijd (uu:mm) naar het eerstvolgende moment: vandaag, of morgen als die tijd vandaag al voorbij is
function volgendMoment(tijd: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(tijd);
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

export function resterend(eindtijd: string, nu = Date.now()): string {
  const min = Math.max(0, Math.ceil((new Date(eindtijd).getTime() - nu) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} uur`;
}

// "⏰ Eindtijd": om deze tijd stopt het spel voor iedereen en telt de stand.
// Spelers zien de tijd aftellen en krijgen 10 minuten van tevoren een waarschuwing.
// strook: in de spelstrook, met de resterende tijd ("nog 25 min") en klein
export default function EindtijdKnop({ routeId, eindtijd, strook = false }: { routeId: string; eindtijd: string | null | undefined; strook?: boolean }) {
  const [open, setOpen] = useState(false);
  const [huidig, setHuidig] = useState<string | null>(eindtijd ?? null);
  const [tijd, setTijd] = useState("");
  const [bezig, setBezig] = useState(false);

  useEffect(() => { setHuidig(eindtijd ?? null); }, [eindtijd]);
  useEffect(() => {
    if (!open) return;
    setTijd(huidig ? hhmm(new Date(huidig)) : hhmm(new Date(Date.now() + 60 * 60000)));
  }, [open, huidig]);

  const moment = volgendMoment(tijd);
  const morgen = moment && moment.getDate() !== new Date().getDate();

  async function opslaan(waarde: string | null) {
    setBezig(true);
    const res = await fetch(`/api/admin/routes/${routeId}/eindtijd`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eindtijd: waarde }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Opslaan", data.fout), "fout"); return; }
    setHuidig(waarde);
    setOpen(false);
    toonMelding(waarde ? `Het spel stopt om ${hhmm(new Date(waarde))}` : "Eindtijd weggehaald", "ok");
  }

  return (
    <>
      <button type="button" className={strook ? "spelstrook-chip spelstrook-chip--knop" : `rl-knop actie-knop${huidig ? " rl-knop--goud" : ""}`} onClick={() => setOpen(true)}
        title={huidig ? `Het spel stopt om ${hhmm(new Date(huidig))}: tik om te wijzigen` : "Eindtijd instellen: om deze tijd stopt het spel voor iedereen"}>
        <Icoon naam="alarm" /> {strook
          ? huidig && new Date(huidig).getTime() > Date.now() ? <><span className="alleen-pc">nog </span><strong>{resterend(huidig, Date.now())}</strong></> : <span className="alleen-pc">Eindtijd</span>
          : huidig ? `Stopt om ${hhmm(new Date(huidig))}` : "Eindtijd"}
      </button>
      {open && (
        <Venster onSluit={() => setOpen(false)} breedte={380}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>⏰ Eindtijd van het spel</div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Daarna stopt het spel voor iedereen en telt de stand.</div>
              <div className="punten-snel">
                {[30, 60, 90, 120].map((min) => (
                  <button key={min} type="button" className="rl-knop" onClick={() => setTijd(hhmm(new Date(Date.now() + min * 60000)))}>
                    {min < 60 ? `${min} min` : `${min / 60} uur`.replace("1.5", "1½")}
                  </button>
                ))}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Stopt om{morgen ? " (morgen)" : ""}</label>
                <input className="form-input" type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} style={{ fontSize: "1.3rem", fontWeight: 800, textAlign: "center" }} />
              </div>
              <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800 }} disabled={bezig || !moment}
                onClick={() => moment && opslaan(moment.toISOString())}>
                {bezig ? "Bezig…" : moment ? `Stop het spel om ${hhmm(moment)}` : "Kies een tijd"}
              </button>
              {huidig && (
                <button type="button" className="rl-knop rl-knop--rood" disabled={bezig} onClick={() => opslaan(null)}>Geen eindtijd</button>
              )}
            </div>
        </Venster>
      )}
    </>
  );
}
