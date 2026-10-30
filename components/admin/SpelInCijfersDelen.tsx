"use client";

import { useEffect, useRef, useState } from "react";
import { elementNaarPng, deelOfDownload, bestandsnaamDeel } from "@/lib/delen";
import { toonMelding } from "@/components/admin/Melding";
import type { TeamStatistiek, Record_ } from "@/lib/statistieken";

// 📊 De uitslag en het spel in cijfers als één plaatje, alleen voor de spelleider (spelers kunnen de uitslag niet
// delen). Stand met prijzen, per team de cijfers en de records; het WhatsApp-bericht gaat als bijschrift mee.
// Het kaartje staat buiten beeld klaar en wordt pas bij de knop een plaatje (zoals de oorkonde).
type Data = {
  tekst: string;
  route: string; huis_logo: string | null;
  stand: { rank: number; display_name: string; icon: string | null; foto?: string | null; score: number; prijs?: { emoji: string; titel: string } | null }[];
  perTeam: { naam: string; stat: TeamStatistiek }[];
  records: Record_[];
};

const getal = (x: number) => x.toString().replace(".", ",");

export default function SpelInCijfersDelen({ knopClass = "rl-knop rl-knop--cyan" }: { knopClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [bezig, setBezig] = useState(false);
  useEffect(() => {
    fetch("/api/admin/uitslag-tekst", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d?.stand && setData(d)).catch(() => undefined);
  }, []);

  async function maakEnDeel() {
    if (!ref.current || !data) return;
    setBezig(true);
    try {
      const bestand = await elementNaarPng(ref.current, `PointRush-spel-in-cijfers-${bestandsnaamDeel(data.route)}.png`);
      if (!bestand) { toonMelding("Het plaatje maken lukte niet", "fout"); return; }
      const uit = await deelOfDownload(bestand, data.tekst);
      if (uit === "gedownload") toonMelding("Plaatje gedownload: stuur het in de groepsapp", "info");
    } finally {
      setBezig(false);
    }
  }

  if (!data?.stand.length) return null;
  const datum = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const medaille = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}.`);
  return (
    <>
      <button type="button" className={knopClass} onClick={maakEnDeel} disabled={bezig} title="De uitslag met alle cijfers als plaatje, voor de groepsapp">
        {bezig ? "⏳ Plaatje maken…" : "🖼️ Uitslag en cijfers delen"}
      </button>
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <div ref={ref} className="uitslag-kaart cijfers-kaart">
          <div className="uitslag-kaart-logos">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spellogo/vierkant.webp" alt="" className="uitslag-kaart-logo cijfers-kaart-logo" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {data.huis_logo && <img src={data.huis_logo} alt="" crossOrigin="anonymous" className="uitslag-kaart-huislogo" />}
          </div>
          <div className="uitslag-kaart-kop">Uitslag</div>
          <div className="uitslag-kaart-route">{data.route}</div>

          <div className="cijfers-stand">
            {data.stand.map((e) => {
              const s = data.perTeam.find((t) => t.naam === e.display_name)?.stat;
              return (
                <div key={e.display_name} className={`cijfers-team${e.rank <= 3 ? ` cijfers-team--${e.rank}` : ""}`}>
                  <div className="cijfers-team-kop">
                    <span className="cijfers-plek">{medaille(e.rank)}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {e.foto ? <img src={e.foto} alt="" crossOrigin="anonymous" className="cijfers-foto" /> : <span className="cijfers-icoon">{e.icon ?? "👫"}</span>}
                    <span className="cijfers-naam">{e.display_name}{e.prijs && <small>{e.prijs.emoji} {e.prijs.titel}</small>}</span>
                    <strong className="cijfers-score">{e.score} pt</strong>
                  </div>
                  {s && (
                    <div className="cijfers-chips">
                      <span>✅ {s.goed} goed</span>
                      {s.fout > 0 && <span>❌ {s.fout} fout</span>}
                      {s.snelste !== null && <span>⚡ {s.snelste} s</span>}
                      <span>👟 {getal(s.km)} km</span>
                      {s.itemsIngezet > 0 && <span>🎁 {s.itemsIngezet} {s.itemsIngezet === 1 ? "item" : "items"}</span>}
                      {s.geraakt > 0 && <span>🎯 {s.geraakt}× geraakt</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {data.records.length > 0 && (
            <div className="cijfers-records">
              <div className="cijfers-records-kop">🏅 Records</div>
              {data.records.map((r) => (
                <div key={r.titel}><span>{r.emoji} {r.titel}</span><strong>{r.team}</strong><em>{r.waarde}</em></div>
              ))}
            </div>
          )}
          <div className="uitslag-kaart-voet">{datum} · PointRush by Hoekies</div>
        </div>
      </div>
    </>
  );
}
