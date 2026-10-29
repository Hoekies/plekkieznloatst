"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { maakKleurMap } from "@/lib/speler-kleur";
import type { BeamerData } from "@/lib/beamer";
import type { ReplayData } from "@/lib/beamer-replay";

const AdminLiveLeaflet = dynamic(() => import("@/components/admin/AdminLiveLeaflet"), { ssr: false });

const VERVERS_MS = 5000;
// 🎬 Replay: het hele spel in zoveel tijd, daarna even stilstaan op het eindbeeld, en dan opnieuw
const REPLAY_MS = 40_000;
const REPLAY_PAUZE_MS = 8_000;

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

  // 🎬 Na het vrijgeven van de uitslag: de kaart speelt de gelopen routes van alle teams versneld af, in een lus
  const uitslagVrij = !!data?.route.uitslag_vrij;
  const [replay, setReplay] = useState<ReplayData | null>(null);
  useEffect(() => {
    if (!uitslagVrij) { setReplay(null); return; }
    fetch(`/api/beamer/${params.sleutel}/replay`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d: ReplayData | null) => { if (d && d.duur > 0) setReplay(d); }).catch(() => undefined);
  }, [uitslagVrij, params.sleutel]);
  const [replayDeel, setReplayDeel] = useState(0);
  useEffect(() => {
    if (!replay) return;
    const begin = performance.now();
    const t = setInterval(() => setReplayDeel(Math.min(1, ((performance.now() - begin) % (REPLAY_MS + REPLAY_PAUZE_MS)) / REPLAY_MS)), 250);
    return () => clearInterval(t);
  }, [replay]);
  const replayBeeld = useMemo(() => {
    if (!replay) return null;
    const tijd = replayDeel * replay.duur;
    const sporen: Record<string, [number, number][]> = {};
    for (const [id, spoor] of Object.entries(replay.sporen)) {
      const tot = spoor.filter((p) => p[2] <= tijd).map((p): [number, number] => [p[0], p[1]]);
      if (tot.length) sporen[id] = tot;
    }
    return { tijd, sporen };
  }, [replay, replayDeel]);
  const replayPlekken = useMemo(() => replay ? Object.values(replay.sporen).flat().map((p): [number, number] => [p[0], p[1]]) : null, [replay]);
  // Tijdens de replay staan de teams op hun plek van dat moment (en tellen als onderweg, zodat het spoor zichtbaar is)
  const kaartSpelers = useMemo(() => {
    if (!replayBeeld) return spelers;
    return spelers.flatMap((s) => {
      const spoor = replayBeeld.sporen[s.player_id];
      const plek = spoor?.[spoor.length - 1];
      return plek ? [{ ...s, sessie_status: "actief" as const, laatste_lat: plek[0], laatste_lng: plek[1], volgend_punt: null }] : [];
    });
  }, [spelers, replayBeeld]);

  // 📣 Sportverslag: een nieuwe gebeurtenis met een item of finish, of een nieuwe koploper, komt even groot in beeld
  const [knaller, setKnaller] = useState<{ id: string; icoon: string; item: string | null; tekst: string } | null>(null);
  const gezienRef = useRef<Set<string> | null>(null);
  const leiderRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data) return;
    const toon = (k: { id: string; icoon: string; item: string | null; tekst: string }) => {
      setKnaller(k);
      window.setTimeout(() => setKnaller((nu) => (nu?.id === k.id ? null : nu)), 6000);
    };
    // De eerste keer alleen onthouden (niet alles van voor het openen tonen)
    if (!gezienRef.current) { gezienRef.current = new Set(data.gebeurtenissen.map((g) => g.id)); }
    else {
      const nieuw = data.gebeurtenissen.filter((g) => !gezienRef.current!.has(g.id));
      nieuw.forEach((g) => gezienRef.current!.add(g.id));
      const groot = nieuw.find((g) => g.item || g.icoon === "🏁");
      if (groot) toon({ id: groot.id, icoon: groot.icoon, item: groot.item, tekst: groot.tekst });
    }
    const leider = stand[0] && stand[0].score > 0 ? stand[0] : null;
    if (leider && leiderRef.current && leiderRef.current !== leider.player_id) {
      toon({ id: `leider-${leider.player_id}-${leider.score}`, icoon: "👑", item: null, tekst: `Nieuwe koploper: ${leider.display_name}!` });
    }
    leiderRef.current = leider?.player_id ?? leiderRef.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
        <AdminLiveLeaflet spelers={kaartSpelers} route_punten={data.route_punten} speciale_items={replayBeeld ? [] : data.speciale_items}
          modus={data.route.modus} kleuren={kleuren} sporen={replayBeeld?.sporen} vastBeeld={replayPlekken} />
        {/* 🎬 Replay: hoe ver in het spel, met een balk */}
        {replayBeeld && (
          <div className="beamer-replay">
            <span>🎬 Replay</span>
            <span className="beamer-replay-klok">{Math.floor(replayBeeld.tijd / 3_600_000)}:{String(Math.floor(replayBeeld.tijd / 60_000) % 60).padStart(2, "0")}</span>
            <span className="beamer-replay-balk"><i style={{ width: `${Math.round(replayDeel * 100)}%` }} /></span>
          </div>
        )}
        {/* ⏰ Gouden kwartier: dubbele punten */}
        {data.route.gouden_tot && Date.parse(data.route.gouden_tot) > Date.now() && (
          <div className="beamer-gouden">⏰ GOUDEN KWARTIER · dubbele punten tot {new Date(data.route.gouden_tot).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</div>
        )}
        {/* ⚡ Bonusvraag die nu loopt */}
        {data.bonus && (
          <div className="beamer-bonus">
            <span className="beamer-bonus-titel">⚡ BONUSVRAAG</span>
            <span className="beamer-bonus-vraag">{data.bonus.vraag}</span>
            <span className="beamer-bonus-tijd">⏱ {Math.floor(data.bonus.rest / 60)}:{String(data.bonus.rest % 60).padStart(2, "0")}</span>
            <span className="beamer-bonus-eerste">{data.bonus.eerste ? <>🥇 Eerst goed: <strong>{data.bonus.eerste}</strong>{data.bonus.goed > 1 ? ` (+${data.bonus.goed - 1})` : ""}</> : "Wie is het eerst?"}</span>
          </div>
        )}
        {/* 📣 Net gebeurd, groot over de kaart */}
        {knaller && (
          <div key={knaller.id} className="beamer-knaller">
            {knaller.item
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/items/${knaller.item}.webp`} alt="" />
              : <span className="beamer-knaller-icoon">{knaller.icoon}</span>}
            <span>{knaller.tekst}</span>
          </div>
        )}
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
