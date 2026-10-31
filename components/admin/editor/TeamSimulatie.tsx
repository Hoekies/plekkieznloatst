"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { haversine } from "@/lib/geo";

// ▶️ Simulatie (route-editor → 👫 Teams): alle teams lopen tegelijk hun eigen rondje, versneld (1 s = 1 min).
// Lopen 4,5 km/u, 2 min per vraag en ½ min bij een infopunt (zelfde schatting als "Afstand, tijd & punten").
// 🔴 Drukte: plekken waar twee of meer teams tegelijk binnen 40 m van elkaar zijn (niet bij de start of finish),
// zodat je ziet waar teams elkaar onderweg tegenkomen of op elkaar wachten bij een punt.
type Plek = { lat: number; lng: number };
export type SimTeam = { teamIndex: number; kleur: string; coords: Plek[]; stukken: Plek[][]; punten: { id: string; type: string }[] };
export type SimLoper = Plek & { kleur: string; label: string };
export type DrukPlek = Plek & { teams: number[]; minuut: number };

const M_PER_MIN = 4500 / 60;
const DRUK_M = 40;

// Tijdlijn per team: een rij (minuut, plek) om de 6 seconden speeltijd
function tijdlijn(t: SimTeam, vraagIds: Set<string>): { min: number; plek: Plek }[] {
  const uit: { min: number; plek: Plek }[] = [{ min: 0, plek: t.coords[0] }];
  let nu = 0;
  t.coords.slice(1).forEach((doel, i) => {
    const lijn = t.stukken[i]?.length > 1 ? t.stukken[i] : [t.coords[i], doel];
    for (let j = 1; j < lijn.length; j++) {
      const a = lijn[j - 1], b = lijn[j];
      const duur = haversine(a.lat, a.lng, b.lat, b.lng) / M_PER_MIN;
      const stappen = Math.max(1, Math.ceil(duur / 0.1));
      for (let s = 1; s <= stappen; s++) {
        uit.push({ min: nu + (duur * s) / stappen, plek: { lat: a.lat + ((b.lat - a.lat) * s) / stappen, lng: a.lng + ((b.lng - a.lng) * s) / stappen } });
      }
      nu += duur;
    }
    const punt = t.punten[i + 1];
    const wacht = punt && vraagIds.has(punt.id) ? 2 : punt && punt.type === "informatiepunt" ? 0.5 : 0;
    if (wacht) { nu += wacht; uit.push({ min: nu, plek: doel }); }
  });
  return uit;
}
function plekOp(lijn: { min: number; plek: Plek }[], min: number): Plek {
  if (min >= lijn[lijn.length - 1].min) return lijn[lijn.length - 1].plek;
  let lo = 0, hi = lijn.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lijn[m].min <= min) lo = m; else hi = m; }
  const a = lijn[lo], b = lijn[hi], f = b.min > a.min ? (min - a.min) / (b.min - a.min) : 0;
  return { lat: a.plek.lat + (b.plek.lat - a.plek.lat) * f, lng: a.plek.lng + (b.plek.lng - a.plek.lng) * f };
}

export default function TeamSimulatie({ teams, vraagIds, onLopers, onDrukte }: {
  teams: SimTeam[]; vraagIds: Set<string>;
  onLopers: (l: SimLoper[]) => void; onDrukte: (d: DrukPlek[]) => void;
}) {
  const lijnen = useMemo(() => teams.map((t) => tijdlijn(t, vraagIds)), [teams, vraagIds]);
  const totaal = Math.ceil(Math.max(0, ...lijnen.map((l) => l[l.length - 1]?.min ?? 0)));
  const [min, setMin] = useState(0);
  const [speelt, setSpeelt] = useState(false);
  const [aan, setAan] = useState(false);

  // Drukte: elke halve minuut alle paren teams vergelijken; dicht bij elkaar = een drukteplek
  const drukte = useMemo(() => {
    if (teams.length < 2) return [] as DrukPlek[];
    const start = teams[0].coords[0], finish = teams[0].coords[teams[0].coords.length - 1];
    const plekken: DrukPlek[] = [];
    for (let m = 0.5; m <= totaal; m += 0.5) {
      const pos = lijnen.map((l) => plekOp(l, m));
      for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) {
        const p = pos[a], q = pos[b];
        if (haversine(p.lat, p.lng, q.lat, q.lng) > DRUK_M) continue;
        const midden = { lat: (p.lat + q.lat) / 2, lng: (p.lng + q.lng) / 2 };
        if (haversine(midden.lat, midden.lng, start.lat, start.lng) < 80 || haversine(midden.lat, midden.lng, finish.lat, finish.lng) < 80) continue;
        const bekend = plekken.find((x) => haversine(x.lat, x.lng, midden.lat, midden.lng) < 60);
        const paar = [teams[a].teamIndex, teams[b].teamIndex];
        if (bekend) { bekend.teams = [...new Set([...bekend.teams, ...paar])].sort((x, y) => x - y); }
        else plekken.push({ ...midden, teams: paar, minuut: Math.round(m) });
      }
    }
    return plekken;
  }, [lijnen, teams, totaal]);

  // Afspelen: 1 seconde = 1 minuut
  const vorige = useRef<number | null>(null);
  useEffect(() => {
    if (!speelt) { vorige.current = null; return; }
    let id = 0;
    const stap = (tijd: number) => {
      if (vorige.current !== null) setMin((m) => Math.min(totaal, m + (tijd - vorige.current!) / 1000));
      vorige.current = tijd;
      id = requestAnimationFrame(stap);
    };
    id = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(id);
  }, [speelt, totaal]);
  useEffect(() => { if (min >= totaal) setSpeelt(false); }, [min, totaal]);

  // Lopers en drukte naar de kaart (alleen zolang de simulatie aan staat)
  useEffect(() => {
    onLopers(aan ? teams.map((t, i) => ({ ...plekOp(lijnen[i], min), kleur: t.kleur, label: `T${t.teamIndex}` })) : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aan, min, lijnen]);
  useEffect(() => {
    onDrukte(aan ? drukte : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aan, drukte]);
  // Weg uit 👫 Teams: de stipjes en cirkels van de kaart halen
  useEffect(() => () => {
    onLopers([]); onDrukte([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (teams.length < 2) return null;
  return (
    <div className="sim">
      <div className="sim-kop">
        <strong>▶️ Simulatie</strong>
        <button type="button" className={`rl-knop schakel${aan ? " schakel--aan" : ""}`} role="switch" aria-checked={aan}
          onClick={() => { setAan(!aan); setSpeelt(false); setMin(0); }}>{aan ? "Aan" : "Uit"}<span className="schakel-bol" aria-hidden /></button>
      </div>
      <span className="inst-uitleg">Alle teams lopen tegelijk hun rondje: 4,5 km/u, 2 min per vraag. Afspelen gaat versneld (1 seconde = 1 minuut).</span>
      {aan && (
        <>
          <div className="sim-balk">
            <button type="button" className="rl-knop rl-knop--cyan" onClick={() => { if (min >= totaal) setMin(0); setSpeelt(!speelt); }} aria-label={speelt ? "Pauze" : "Afspelen"}>{speelt ? "⏸" : "▶"}</button>
            <input type="range" min={0} max={totaal} step={0.5} value={min} onChange={(e) => { setSpeelt(false); setMin(Number(e.target.value)); }} aria-label="Tijd in het spel" />
            <span className="sim-tijd">{Math.floor(min)} / {totaal} min</span>
          </div>
          {drukte.length === 0
            ? <p className="ondergrond-goed">✓ Geen plekken waar teams elkaar onderweg tegenkomen.</p>
            : <>
                <span className="sim-kopje">🔴 Drukte op de kaart ({drukte.length})</span>
                <ul className="ondergrond-lijst">
                  {drukte.slice(0, 8).map((d, i) => (
                    <li key={i}><button type="button" onClick={() => { setSpeelt(false); setMin(d.minuut); }} title="Spring naar dit moment">
                      <span aria-hidden>🔴</span><span>Team {d.teams.join(", ")} rond minuut {d.minuut}</span>
                    </button></li>
                  ))}
                </ul>
                <span className="inst-uitleg">Tegenkomen kan leuk zijn (duel!), maar bij een punt betekent het wachten. Verplaats dan een punt of laat een team andersom lopen.</span>
              </>}
        </>
      )}
    </div>
  );
}
