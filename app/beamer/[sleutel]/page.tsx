"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { maakKleurMap } from "@/lib/speler-kleur";
import type { BeamerData } from "@/lib/beamer";

const AdminLiveLeaflet = dynamic(() => import("@/components/admin/AdminLiveLeaflet"), { ssr: false });

const VERVERS_MS = 5000;

// Hoe lang geleden, kort: "nu", "3 min", "1 u"
function geleden(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? "nu" : min < 60 ? `${min} min` : `${Math.floor(min / 60)} u`;
}

// 📺 Beamerscherm: live kaart, stand en de laatste gebeurtenissen, groot en zonder knoppen.
// Te openen met de geheime link van de spelleider (live kaart → 📺 Beamer), zonder inloggen.
export default function BeamerPagina({ params }: { params: { sleutel: string } }) {
  const [data, setData] = useState<BeamerData | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    let weg = false;
    const haal = async () => {
      try {
        const res = await fetch(`/api/beamer/${params.sleutel}`, { cache: "no-store" });
        const json = await res.json();
        if (weg) return;
        if (!res.ok) { setFout(json.fout ?? "Deze link werkt niet"); return; }
        setFout(null);
        setData(json);
      } catch { /* even geen verbinding: de vorige stand blijft staan */ }
    };
    haal();
    const t = setInterval(haal, VERVERS_MS);
    return () => { weg = true; clearInterval(t); };
  }, [params.sleutel]);

  const spelers = useMemo(() => data?.spelers ?? [], [data]);
  const kleuren = useMemo(() => maakKleurMap(spelers.map((s) => s.player_id)), [spelers]);
  const stand = [...spelers].sort((a, b) => b.score - a.score);

  // Stand verandert: rijen schuiven zichtbaar naar hun nieuwe plek, en een veranderde score licht even op
  const rijen = useRef(new Map<string, HTMLDivElement>());
  const vorige = useRef(new Map<string, { top: number; score: number }>());
  useLayoutEffect(() => {
    const nieuw = new Map<string, { top: number; score: number }>();
    for (const s of stand) {
      const el = rijen.current.get(s.player_id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      const oud = vorige.current.get(s.player_id);
      if (oud && Math.abs(oud.top - top) > 1) {
        el.animate([{ transform: `translateY(${oud.top - top}px)` }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      if (oud && oud.score !== s.score) el.animate([{ background: "rgba(255,217,59,0.35)" }, { background: "rgba(255,255,255,0.07)" }], { duration: 1600, easing: "ease-out" });
      nieuw.set(s.player_id, { top, score: s.score });
    }
    vorige.current = nieuw;
  });

  if (fout && !data) {
    return <div className="beamer-melding">📺 {fout}</div>;
  }
  if (!data) return <div className="beamer-melding">📺 Even laden…</div>;

  return (
    <div className="beamer">
      <div className="beamer-kaart">
        <AdminLiveLeaflet spelers={spelers} route_punten={data.route_punten} speciale_items={data.speciale_items}
          modus={data.route.modus} kleuren={kleuren} />
      </div>
      <aside className="beamer-zij">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* Met eigen logo: het brede PointRush-logo met het eigen logo eronder; zonder: het gewone (vierkante) logo */}
        <div className={`beamer-logos${data.route.huis_logo ? " beamer-logos--twee" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.route.huis_logo ? "/spellogo/breed.webp" : "/spellogo/vierkant.webp"} alt="PointRush" className="beamer-logo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {data.route.huis_logo && <img src={data.route.huis_logo} alt="" className="beamer-huislogo" />}
        </div>
        <div className="beamer-route">{data.route.naam}</div>

        <div className="beamer-kop">🏆 Stand</div>
        <div className="beamer-stand">
          {stand.length === 0 && <div className="beamer-leeg">Nog niemand onderweg</div>}
          {stand.map((s, i) => (
            <div key={s.player_id} className={`beamer-rij${i === 0 && s.score > 0 ? " beamer-rij--eerste" : ""}`} style={{ borderLeftColor: kleuren.get(s.player_id) }}
              ref={(el) => { if (el) rijen.current.set(s.player_id, el); else rijen.current.delete(s.player_id); }}>
              <span className="beamer-plek">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.foto ? <img src={s.foto} alt="" className="beamer-foto" /> : <span className="beamer-icoon">{s.icon ?? "👫"}</span>}
              <span className="beamer-naam">
                {s.display_name}{s.sessie_status === "voltooid" && " 🏁"}
                {/* 🧩 Hoeveel letters van het puzzelwoord (niet welke) */}
                {s.puzzel && (
                  <span className="beamer-puzzel" title="Letters van het puzzelwoord">
                    {s.puzzel.open.map((o, i) => <i key={i} className={o || s.puzzel!.opgelost ? "aan" : ""} />)}
                  </span>
                )}
              </span>
              <span className={`beamer-score${s.score < 0 ? " score-min" : ""}`}>{s.score}</span>
            </div>
          ))}
        </div>

        <div className="beamer-kop">📣 Net gebeurd</div>
        <div className="beamer-gebeurd">
          {data.gebeurtenissen.length === 0 && <div className="beamer-leeg">Nog niets gebeurd</div>}
          {data.gebeurtenissen.map((g) => (
            <div key={g.id} className="beamer-gebeurtenis" style={{ borderLeftColor: (g.speler_id && kleuren.get(g.speler_id)) || "rgba(255,255,255,0.2)" }}>
              {g.item
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={`/items/${g.item}.webp`} alt="" />
                : <span>{g.icoon}</span>}
              <span style={{ flex: 1, minWidth: 0 }}>{g.tekst}</span>
              <small>{geleden(g.tijd)}</small>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
