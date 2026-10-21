"use client";

import { useEffect, useMemo, useState } from "react";
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
        <img src="/logo.webp" alt="PointRush" className="beamer-logo" />
        <div className="beamer-route">{data.route.naam}</div>

        <div className="beamer-kop">🏆 Stand</div>
        <div className="beamer-stand">
          {stand.length === 0 && <div className="beamer-leeg">Nog niemand onderweg</div>}
          {stand.map((s, i) => (
            <div key={s.player_id} className="beamer-rij" style={{ borderLeftColor: kleuren.get(s.player_id) }}>
              <span className="beamer-plek">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              <span className="beamer-icoon">{s.icon ?? "👫"}</span>
              <span className="beamer-naam">{s.display_name}{s.sessie_status === "voltooid" && " 🏁"}</span>
              <span className="beamer-score">{s.score}</span>
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
