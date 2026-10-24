"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveData } from "@/components/admin/useLiveData";
import type { LiveData } from "@/lib/admin-live";
import { maakKleurMap } from "@/lib/speler-kleur";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import PuzzelVoortgang from "@/components/admin/PuzzelVoortgang";
import UitklapPijl from "@/components/shared/UitklapPijl";

const AdminLiveLeaflet = dynamic(() => import("./AdminLiveLeaflet"), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      Kaart laden…
    </div>
  ),
});

const ReplayKaart = dynamic(() => import("./ReplayKaart"), {
  ssr: false,
  loading: () => <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Replay laden…</div>,
});

const POLL_INTERVAL_MS = 15000;

interface Props {
  initData: LiveData;
}

export default function AdminLiveKaart({ initData }: Props) {
  const { data, realtimeOk } = useLiveData(initData, POLL_INTERVAL_MS, "admin-live-kaart");
  // Speler die de kaart volgt (null = iedereen in beeld houden)
  const [volgId, setVolgId] = useState<string | null>(null);
  // Spoor van de laatste 10 minuten per speler
  const [sporen, setSporen] = useState<Record<string, [number, number][]>>({});
  // ⏪ Replay: het hele spel versneld afspelen (null = live kaart)
  const [replay, setReplay] = useState<import("./ReplayKaart").ReplayTeam[] | null>(null);
  const [replayLaden, setReplayLaden] = useState(false);
  // Teamlijst rechtsboven in- of uitgeklapt (onthouden per toestel)
  const [lijstDicht, setLijstDicht] = useState(false);
  useEffect(() => { try { setLijstDicht(localStorage.getItem("pr_live_lijst") === "dicht"); } catch { /* geen opslag */ } }, []);
  function wisselLijst() {
    setLijstDicht((d) => { try { localStorage.setItem("pr_live_lijst", d ? "open" : "dicht"); } catch { /* geen opslag */ } return !d; });
  }
  // Kaartlagen (sporen, items): hier, zodat Items aan/uit ook in de bovenbalk kan; onthouden per toestel
  const [lagen, setLagen] = useState<{ sporen: boolean; items: boolean }>({ sporen: true, items: true });
  useEffect(() => {
    try { setLagen((l) => ({ ...l, ...JSON.parse(localStorage.getItem("pr_live_lagen") ?? "{}") })); } catch { /* geen opslag */ }
  }, []);
  function wisselLaag(k: "sporen" | "items") {
    setLagen((l) => {
      const nieuw = { ...l, [k]: !l[k] };
      try { localStorage.setItem("pr_live_lagen", JSON.stringify(nieuw)); } catch { /* geen opslag */ }
      return nieuw;
    });
  }

  async function startReplay() {
    setReplayLaden(true);
    try {
      const res = await fetch("/api/admin/live/replay");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Replay laden", data.fout), "fout"); return; }
      if (!data.teams?.length) { toonMelding("Nog geen gelopen sporen om af te spelen", "info"); return; }
      setReplay(data.teams);
    } finally { setReplayLaden(false); }
  }

  useEffect(() => {
    let actief = true;
    async function laadSporen() {
      try {
        const res = await fetch("/api/admin/live/sporen");
        if (res.ok && actief) setSporen((await res.json()).sporen ?? {});
      } catch { /* verbindingsfout */ }
    }
    laadSporen();
    const t = setInterval(laadSporen, 15000);
    return () => { actief = false; clearInterval(t); };
  }, []);

  // 📺 Beamerscherm: link ophalen, openen in een nieuw tabblad en kopiëren (om op een ander toestel te openen)
  async function openBeamer() {
    const res = await fetch("/api/admin/beamer").catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !json.pad) { toonMelding(json.fout ?? "Beamerlink ophalen lukte niet", "fout"); return; }
    const url = `${window.location.origin}${json.pad}`;
    window.open(url, "_blank");
    navigator.clipboard?.writeText(url).then(() => toonMelding("Beamerlink gekopieerd: open hem op de tv of laptop bij de beamer", "ok")).catch(() => {});
  }

  const { spelers, route_punten } = data;
  const aantalActief = spelers.filter((s) => s.sessie_status === "actief").length;
  const aantalKlaar = spelers.filter((s) => s.sessie_status === "voltooid").length;
  const spelersOpKaart = spelers.filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid");
  // Zelfde kleur per speler als op het dashboard
  const kleuren = useMemo(() => maakKleurMap(spelers.map((s) => s.player_id)), [spelers]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">{replay ? "Replay" : "Live kaart"}</span>
        {/* Eigen logo van de organisatie (huisstijl): groot in de lege ruimte midden in de balk */}
        <span className="topbar-huislogo-vak">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {data.route?.huis_logo && <img src={data.route.huis_logo} alt="" />}
        </span>
        {replay ? (
          <button type="button" className="rl-knop rl-knop--cyan" onClick={() => setReplay(null)}>📡 Terug naar live</button>
        ) : (
          <>
            <button type="button" className={`rl-knop${lagen.items ? " rl-knop--cyan" : " knop-uit"}`} aria-pressed={lagen.items} onClick={() => wisselLaag("items")}
              title={lagen.items ? "Items op de kaart verbergen (rustiger beeld)" : "Items op de kaart tonen"}>
              🎁<span className="alleen-pc"> Items {lagen.items ? "aan" : "uit"}</span>
            </button>
            <button type="button" className="rl-knop" onClick={openBeamer} title="Live kaart, stand en gebeurtenissen groot op een tv of beamer (zonder inloggen)">
              📺<span className="alleen-pc"> Beamer</span>
            </button>
            <button type="button" className="rl-knop" onClick={startReplay} disabled={replayLaden} title="Het hele spel versneld afspelen">
              {replayLaden ? "⏳" : "⏪"} Replay
            </button>
            <div className={`admin-live-badge${realtimeOk ? " admin-live-badge--ok" : ""}`}>
              <span className={`admin-live-dot${realtimeOk ? " admin-live-dot--pulse" : ""}`} />
              {realtimeOk ? "Live" : "Verbinding weg"}
            </div>
          </>
        )}
      </div>

      {replay ? (
        <div className="live-kaart-vak" style={{ flex: 1, minHeight: 0, position: "relative", display: "flex" }}>
          <div className="live-kaart-rand" style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
            <ReplayKaart teams={replay} route_punten={route_punten} kleuren={kleuren} titel={initData.route?.name ?? null} />
          </div>
        </div>
      ) : (
      <div className="live-kaart-vak" style={{ flex: 1, minHeight: 0, position: "relative", display: "flex" }}>
        {/* Kaart */}
        <div className="live-kaart-rand" style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <AdminLiveLeaflet spelers={spelers} route_punten={route_punten} speciale_items={data.speciale_items} modus={data.route?.modus ?? null}
            kleuren={kleuren} sporen={sporen} volgId={volgId} onStopVolgen={() => setVolgId(null)} lagen={lagen} onWisselLaag={wisselLaag} />
        </div>

        {/* Overlay: spelerslijst. Tik op een naam om die speler te volgen */}
        <div className="pr-gem-panel live-kaart-lijst" style={{ position: "absolute", zIndex: 1000, flex: "none", minWidth: 210 }}>
         <div className="pr-gem-panel-inner" style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto", color: "#fff" }}>
          <button type="button" className="pr-gem-label live-lijst-inklap" onClick={wisselLijst} aria-expanded={!lijstDicht}>
            <UitklapPijl open={!lijstDicht} /><span>⚡ {aantalActief} bezig · ✓ {aantalKlaar} klaar</span>
          </button>
          {lijstDicht ? null : spelersOpKaart.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Geen actieve spelers</div>
          ) : (
            spelersOpKaart.map((s) => {
              const volgt = volgId === s.player_id;
              return (
                <button key={s.player_id} type="button" className={`live-lijst-regel${volgt ? " live-lijst-regel--volgt" : ""}`}
                  disabled={s.laatste_lat === null} onClick={() => setVolgId(volgt ? null : s.player_id)}
                  title={volgt ? "Niet meer volgen" : "Deze speler volgen op de kaart"}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", flexShrink: 0, background: kleuren.get(s.player_id) }} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="live-lijst-kop">
                      <span className="live-lijst-naam">{s.sessie_status === "voltooid" ? "🏁 " : ""}{s.display_name}</span>
                      <span className={`live-lijst-score${s.score < 0 ? " score-min" : ""}`}>{s.score} pt</span>
                    </span>
                    {/* Waar het team heen loopt (of: gefinisht) */}
                    <span className="live-lijst-sub">
                      {s.sessie_status === "voltooid" ? "Gefinisht" : s.huidig_punt_naam ? `➡️ ${s.huidig_punt_naam}` : "Onderweg"}
                    </span>
                    {/* 🧩 Puzzelwoord: gevonden letters in goud */}
                    {s.puzzel && <PuzzelVoortgang p={s.puzzel} gefinisht={s.sessie_status === "voltooid"} lijst />}
                    {(!s.ingelogd || s.laatste_lat === null) && (
                      <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text)" }}>
                        {!s.ingelogd ? "uitgelogd" : "nog geen locatie"}
                      </span>
                    )}
                  </span>
                  {volgt && <span aria-hidden style={{ fontSize: "0.9rem" }}>🎯</span>}
                </button>
              );
            })
          )}
         </div>
        </div>
      </div>
      )}
    </div>
  );
}
