"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveData } from "@/components/admin/useLiveData";
import PuzzelVoortgang from "@/components/admin/PuzzelVoortgang";
import BevestigKnop from "@/components/admin/BevestigKnop";
import SectieKop from "@/components/admin/SectieKop";
import LeegScherm from "@/components/admin/LeegScherm";
import { toonMelding } from "@/components/admin/Melding";
import StatusLabel, { teamStatus } from "@/components/admin/StatusLabel";
import MenuIcoon from "@/components/admin/MenuIcoon";
import UitklapPijl from "@/components/shared/UitklapPijl";
import { openFotoKeuren } from "@/components/admin/FotoKeuren";

import { sessietijd } from "@/lib/admin-live";
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";
import FotoBeoordelingPanel from "./FotoBeoordelingPanel";
import { maakKleurMap } from "@/lib/speler-kleur";
import SpelLeider, { minutenNietGezien } from "@/components/admin/SpelLeider";
import { duurKort } from "@/lib/tijd";
import Klaarzetten from "@/components/admin/Klaarzetten";
import Tijdlijn from "@/components/admin/Tijdlijn";
import SpelerDetailVenster from "@/components/admin/SpelerDetailVenster";
import PuntenAanpassen from "@/components/admin/PuntenAanpassen";
import ContactKnop from "@/components/admin/ContactKnop";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import StatStrook from "@/components/admin/StatStrook";
import dynamic from "next/dynamic";
import Icoon from "@/components/admin/Icoon";

// Kaart pas laden in de browser (Leaflet), en niet op de server
const MiniLiveKaart = dynamic(() => import("@/components/admin/MiniLiveKaart"), { ssr: false });
const PuntenVerloop = dynamic(() => import("@/components/admin/PuntenVerloop"), { ssr: false });

const POLL_INTERVAL_MS = 5000;

interface Props {
  initData: LiveData;
  // Hulp (helper): alleen foto's keuren en punten vrijgeven, geen stoppen/reset/punten aanpassen
  beperkt?: boolean;
}



export default function AdminDashboard({ initData, beperkt = false }: Props) {
  const { data, realtimeOk, ververs } = useLiveData(initData, POLL_INTERVAL_MS, "admin-live");
  // Speler waarvan het detailvenster open staat
  const [detailId, setDetailId] = useState<string | null>(null);
  // Geopend vanuit een pushmelding (?team=…): meteen het venster van dat team
  useEffect(() => {
    const team = new URLSearchParams(window.location.search).get("team");
    if (!team) return;
    setDetailId(team);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  // 🏆 Spelende spelers in te klappen (onthouden op dit toestel)
  const [spelersDicht, setSpelersDicht] = useState(false);
  useEffect(() => { try { setSpelersDicht(localStorage.getItem("pr_dash_spelers_dicht") === "1"); } catch { /* geen opslag */ } }, []);
  // 📱 Telefoon: de kaart standaard dicht (eerst wat er moet gebeuren); open/dicht onthouden. Pc: altijd zichtbaar
  const [telefoon, setTelefoon] = useState(false);
  const [kaartOpen, setKaartOpen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const zet = () => setTelefoon(mq.matches);
    zet(); mq.addEventListener("change", zet);
    try { setKaartOpen(localStorage.getItem("pr_dash_kaart_open") === "1"); } catch { /* geen opslag */ }
    return () => mq.removeEventListener("change", zet);
  }, []);
  // 🖥️ Breed scherm (twee kolommen): puntenverloop als tabblad naast de tijdlijn
  const [breed, setBreed] = useState(false);
  const [zijTab, setZijTab] = useState<"tijdlijn" | "verloop">("tijdlijn");
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const zet = () => setBreed(mq.matches);
    zet(); mq.addEventListener("change", zet);
    try { if (localStorage.getItem("pr_dash_zijtab") === "verloop") setZijTab("verloop"); } catch { /* geen opslag */ }
    return () => mq.removeEventListener("change", zet);
  }, []);
  function kiesZijTab(t: "tijdlijn" | "verloop") {
    setZijTab(t);
    try { localStorage.setItem("pr_dash_zijtab", t); } catch { /* geen opslag */ }
  }
  function wisselKaart() {
    setKaartOpen((o) => { try { localStorage.setItem("pr_dash_kaart_open", o ? "0" : "1"); } catch { /* geen opslag */ } return !o; });
  }
  function wisselSpelers() {
    setSpelersDicht((d) => { try { localStorage.setItem("pr_dash_spelers_dicht", d ? "0" : "1"); } catch { /* geen opslag */ } return !d; });
  }
  async function geefPuntVrij(s: SpelerOverzicht) {
    if (!s.sessie_id) return;
    const naam = s.nickname ?? s.login_name;
    const res = await fetch(`/api/admin/sessies/${s.sessie_id}/punt-vrijgeven`, { method: "POST" });
    if (!res.ok) {
      const { fout } = await res.json().catch(() => ({ fout: null }));
      toonMelding(uitlegBijStatus(res.status, "Vrijgeven", fout), "fout");
    } else toonMelding(`Punt van ${naam} vrijgegeven`, "ok");
    ververs();
  }

  async function stopSpel(s: SpelerOverzicht) {
    const res = await fetch(`/api/admin/groepen/${s.player_id}/spel-stoppen`, { method: "POST" });
    if (!res.ok) {
      const { fout } = await res.json().catch(() => ({ fout: null }));
      toonMelding(uitlegBijStatus(res.status, "Stoppen", fout), "fout");
    }
    ververs();
  }

  // Spook of plek zooi 30 seconden korter laten duren
  async function verkortWachten(effectId: string) {
    const res = await fetch(`/api/admin/effecten/${effectId}/verkorten`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) toonMelding(uitlegBijStatus(res.status, "Inkorten", data.fout), "fout");
    else if (data.voorbij) toonMelding("Wachttijd voorbij: het team kan weer verder", "ok");
    ververs();
  }

  async function negeerHulp(hulpId: string) {
    await fetch(`/api/admin/hulp/${hulpId}`, { method: "PATCH" });
    ververs();
  }

  const { spelers, route, route_punten } = data;
  // Alleen spelers die meedoen (bezig of gefinisht), op volgorde van de stand: hoogste score eerst,
  // bij gelijke score de snelste. Wie nog niet gestart is, staat bij Spelers.
  const spelend = spelers
    .filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid")
    .sort((a, b) => b.score !== a.score ? b.score - a.score : sessietijd(a) - sessietijd(b));
  const aantalActief = spelers.filter((s) => s.sessie_status === "actief").length;
  const aantalKlaar = spelers.filter((s) => s.sessie_status === "voltooid").length;
  const totaalPunten = route_punten.length;
  // Hulpvragen, en een filter op wie aandacht nodig heeft (hulp, wachten, een tijd niet gezien)
  const aantalHulp = spelend.filter((s) => s.hulp).length;
  const [filter, setFilter] = useState<"alles" | "aandacht">("alles");
  const aandacht = (s: SpelerOverzicht) => !!s.hulp || !!s.wacht || minutenNietGezien(s) !== null;
  const zichtbaar = filter === "aandacht" ? spelend.filter(aandacht) : spelend;
  // Vaste kleur per speler (zelfde als op de live kaart en de spelerspagina)
  const kleuren = useMemo(() => maakKleurMap(spelers.map((s) => s.player_id)), [spelers]);
  const detail = detailId ? spelend.find((s) => s.player_id === detailId) : undefined;

  return (
    <>
      {/* Titel links, foto's beoordelen in het midden, live-status rechts (uitloggen staat rechtsboven) */}
      <div className="admin-topbar dashboard-topbar" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12 }}>
        <span className="admin-topbar-titel" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MenuIcoon naam="dashboard" />Dashboard
          {/* De actieve route (stond eerst in de strook) */}
          {route && <span className="dash-route" title="Actieve route">{route.name}</span>}
          {/* Eigen logo van de organisatie (huisstijl van de actieve route) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {route?.huis_logo && <img src={route.huis_logo} alt="" className="huislogo-kop" />}
        </span>
        <FotoBeoordelingPanel />
        <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 12 }}>
          <div className={`admin-live-badge${realtimeOk ? " admin-live-badge--ok" : ""}`}>
            <span className={`admin-live-dot${realtimeOk ? " admin-live-dot--pulse" : ""}`} />
            {realtimeOk ? "Live" : "Verbinding weg"}
          </div>
        </div>
      </div>

      <div className="admin-content">

        {data.fout && (
          <div style={{
            marginBottom: 24, padding: "12px 16px", borderRadius: 12,
            background: "rgba(255,59,92,0.15)", border: "2px solid var(--red)", color: "#fecaca",
            fontSize: "0.85rem", fontWeight: 600,
          }}>
            ⚠️ Het dashboard is onvolledig: {data.fout}. Waarschijnlijk is er een database-migratie nog niet uitgevoerd.
          </div>
        )}

        {/* Compacte strook (pc en telefoon) in plaats van vier grote tegels */}
        <div style={{ marginBottom: 16 }}>
          {/* Wat er nu is én wat je kunt doen: hulp en foto's zijn aan te tikken */}
          <StatStrook vakken={[
            { icoon: "⚡", waarde: aantalActief, label: "onderweg" },
            { icoon: "🏁", waarde: aantalKlaar, label: "gefinisht" },
            { icoon: "⚠️", waarde: aantalHulp, label: aantalHulp === 1 ? "hulpvraag" : "hulpvragen", letOp: aantalHulp > 0,
              onKlik: aantalHulp ? () => { setFilter("aandacht"); document.querySelector(".spelleider")?.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined },
            { icoon: "📸", waarde: data.wachtende_fotos ?? 0, label: "foto's te keuren", letOp: !!data.wachtende_fotos, onKlik: data.wachtende_fotos ? openFotoKeuren : undefined },
          ]} />
        </div>

        {/* Voor het spel: stappenplan. Tijdens het spel: wat vraagt je aandacht, en afronden */}
        <div style={{ marginBottom: 24 }}>
          {spelend.length === 0
            ? !beperkt && <Klaarzetten route={route} spelers={spelers} />
            : <SpelLeider spelend={spelend} wachtendeFotos={data.wachtende_fotos ?? 0} kleuren={kleuren}
                uitslagVrij={!!route?.uitslag_vrijgegeven} onKies={(s) => setDetailId(s.player_id)}
                routeId={route?.id} eindtijd={route?.eindtijd} pauze={route?.gepauzeerd_sinds ?? null} beperkt={beperkt} onGewijzigd={ververs} />}
        </div>

        <div className={route && spelend.length > 0 ? "dash-kolommen" : undefined}>
          <div style={{ minWidth: 0 }}>
            {/* Spelende spelers, op volgorde van de stand */}
            <SectieKop titel={`🏆 Spelende spelers${spelend.length ? ` (${spelend.length})` : ""}`}
              open={!spelersDicht} onWissel={spelend.length ? wisselSpelers : undefined}>
              {spelend.length > 3 && !spelersDicht && (
                <div className="segment dash-filter" role="radiogroup" aria-label="Welke teams">
                  <button type="button" role="radio" aria-checked={filter === "alles"} className={filter === "alles" ? "aan" : ""} onClick={() => setFilter("alles")}>Alles</button>
                  <button type="button" role="radio" aria-checked={filter === "aandacht"} className={filter === "aandacht" ? "aan" : ""} onClick={() => setFilter("aandacht")}>
                    Aandacht {spelend.filter(aandacht).length ? `(${spelend.filter(aandacht).length})` : ""}
                  </button>
                </div>
              )}
            </SectieKop>
            {spelersDicht && spelend.length > 0 ? null : spelend.length === 0 ? (
              !route ? (
                <LeegScherm icoon="🗺️" knop={{ label: "🗺️ Naar routes", href: "/admin/routes" }}>Er is geen actieve route. Kies eerst een route en activeer hem.</LeegScherm>
              ) : spelers.length === 0 ? (
                <LeegScherm icoon="👫" knop={{ label: "👫 Spelers aanmaken", href: "/admin/groepen" }}>Nog geen spelers aangemaakt.</LeegScherm>
              ) : (
                <LeegScherm icoon="⏳">Er is nog geen speler gestart. Zodra een speler op ‘Ga op pad’ drukt, verschijnt hij hier.</LeegScherm>
              )
            ) : (
              <div>
                {filter === "aandacht" && zichtbaar.length === 0 && <div className="dash-filter-leeg">✓ Geen team heeft nu aandacht nodig</div>}
                {zichtbaar.map((s) => (
                  <SpelerKaart
                    key={s.player_id}
                    rang={spelend.indexOf(s) + 1}
                    speler={s}
                    kleur={kleuren.get(s.player_id) ?? "#A78BFA"}
                    totaalPunten={totaalPunten}
                    kanVrijgeven
                    onOpen={() => setDetailId(s.player_id)}
                    onVerkort={verkortWachten}
                    onVrijgeven={() => geefPuntVrij(s)}
                    onStop={() => stopSpel(s)}
                    onNegeer={negeerHulp}
                    onGewijzigd={ververs}
                    beperkt={beperkt}
                  />
                ))}
              </div>
            )}
            {/* 📈 Stand door het spel heen, per team: los van het in- en uitklappen van de spelers */}
            {spelend.length > 0 && !breed && <PuntenVerloop kleuren={kleuren} />}
          </div>
          {/* Tijdlijn: naast de spelers op een breed scherm, eronder op de telefoon */}
          {route && spelend.length > 0 && (
            <div className="dash-zijkolom">
              {telefoon ? (
                <div className="verloop dash-kaart">
                  <button type="button" className="verloop-kop" onClick={wisselKaart} aria-expanded={kaartOpen}>
                    <UitklapPijl open={kaartOpen} /><MenuIcoon naam="live" /><span>Kaart</span>
                    <span className="dash-kaart-aantal">{aantalActief} {aantalActief === 1 ? "team" : "teams"} onderweg</span>
                  </button>
                  {kaartOpen && <MiniLiveKaart spelers={spelers} punten={route_punten} kleuren={kleuren} />}
                </div>
              ) : <MiniLiveKaart spelers={spelers} punten={route_punten} kleuren={kleuren} />}
              {/* Breed scherm: tijdlijn en puntenverloop als tabbladen rechts; anders staat het verloop onder de teams */}
              {breed && (
                <div className="segment dash-zijtabs" role="tablist" aria-label="Rechterkolom">
                  <button type="button" role="tab" aria-selected={zijTab === "tijdlijn"} className={zijTab === "tijdlijn" ? "aan" : ""} onClick={() => kiesZijTab("tijdlijn")}>📜 Wat gebeurt er</button>
                  <button type="button" role="tab" aria-selected={zijTab === "verloop"} className={zijTab === "verloop" ? "aan" : ""} onClick={() => kiesZijTab("verloop")}>📈 Puntenverloop</button>
                </div>
              )}
              {breed && zijTab === "verloop"
                ? <PuntenVerloop kleuren={kleuren} />
                : <Tijdlijn kleuren={kleuren} teams={spelend.map((s) => ({ id: s.player_id, naam: s.display_name, icon: s.icon }))} />}
            </div>
          )}
        </div>

        {detail && (
          <SpelerDetailVenster speler={detail} rang={spelend.indexOf(detail) + 1} kleur={kleuren.get(detail.player_id) ?? "#A78BFA"}
            totaalPunten={totaalPunten} onSluit={() => setDetailId(null)}
            acties={<SpelerActies s={detail} kanVrijgeven beperkt={beperkt}
              onVrijgeven={() => geefPuntVrij(detail)} onStop={() => { stopSpel(detail); setDetailId(null); }}
              onNegeer={negeerHulp} onGewijzigd={ververs} />} />
        )}

      </div>
    </>
  );
}

// ── SpelerKaart ───────────────────────────────────────────────────────────────
const TEAM_ICONEN = ["🦊", "🐸", "🦄", "🐧", "🦁", "🐙", "🐻", "🦋", "🐺", "🦩"];

function teamIcoonVoor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TEAM_ICONEN[hash % TEAM_ICONEN.length];
}

function SpelerKaart({ rang, speler: s, kleur, totaalPunten, kanVrijgeven, onOpen, onVerkort, onVrijgeven, onStop, onNegeer, onGewijzigd, beperkt }: {
  rang: number;
  speler: SpelerOverzicht;
  kleur: string;
  onOpen: () => void;
  onVerkort: (effectId: string) => void;
  totaalPunten: number;
  kanVrijgeven: boolean;
  onVrijgeven: () => void;
  onStop: () => void;
  onNegeer: (hulpId: string) => void;
  onGewijzigd: () => void;
  beperkt: boolean;
}) {
  const pct = totaalPunten ? Math.min(100, Math.round((s.bezochte_punten / totaalPunten) * 100)) : 0;
  // Compact: kop, voortgang en wat aandacht vraagt. Items en knoppen staan in het venster (tik op de kaart);
  // alleen bij een hulpvraag staan de knoppen ook hier, om meteen te kunnen helpen.
  const stil = minutenNietGezien(s);
  return (
    // Tik op de kaart: alles van deze speler in één venster (de knoppen erin doen hun eigen ding)
    <div className="pr-gem-card speler-kaart-klik" role="button" tabIndex={0} title="Tik voor alle details"
      onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      style={s.hulp ? { boxShadow: "0 0 0 3px #ff8a00, 0 0 18px rgba(255,138,0,0.6)" }
      : rang === 1 && s.score > 0 ? { boxShadow: "0 0 0 2px #ffd93b, 0 0 16px rgba(255,217,59,0.45)" } : undefined}>
      {/* Bovenaan: plek, icoon, naam en score op één regel; daaronder over de volle breedte de rest */}
      {/* Compact (ook op de pc, zodat meerdere teams tegelijk in beeld passen): regel 1 naam, status en
          score; regel 2 de cijfers; daaronder de voortgang. Items en knoppen in het venster */}
      <div className="pr-gem-card-inner sk-inner">
        <div className="sk-kop">
          <span className="sk-rang" title={`${rang}e plaats`} style={{ fontSize: rang <= 3 ? "1.5rem" : "1rem" }}>
            {rang <= 3 ? ["🥇", "🥈", "🥉"][rang - 1] : rang}
          </span>
          <div className="pr-gem-avatar speler-ring sk-avatar" style={{ ["--speler-kleur" as string]: kleur }}>{s.icon ?? teamIcoonVoor(s.player_id)}</div>
          <div className="sk-naam">
            <div className="sk-titel">
              <span className="sk-teamnaam" style={s.nickname ? undefined : { color: "var(--muted)", fontStyle: "italic" }}>{s.nickname ?? "nog geen naam gekozen"}</span>
              <span className="sk-login">{s.login_name}</span>
            </div>
            <div className="sk-stats">
              <span title="Punten bezocht">📍 {totaalPunten ? `${s.bezochte_punten}/${totaalPunten}` : s.bezochte_punten}</span>
              <span title="Gelopen">🚶 {(s.afstand_m / 1000).toFixed(2).replace(".", ",")} km</span>
              {s.started_at && <span title="Speeltijd">⏱ {duurKort(Math.floor(sessietijd(s) / 60))}</span>}
              {s.huidig_punt_naam && <span className="sk-volgend" title={`Op weg naar ${s.huidig_punt_naam}`}>➡️ {s.huidig_punt_naam}</span>}
              {stil !== null && <span className="sk-stil" title="Al een tijd geen locatie ontvangen">📵 {duurKort(stil)} niet gezien{s.ingelogd ? "" : " · uitgelogd"}</span>}
            </div>
          </div>
          <div className="sk-rechts">
            <StatusLabel status={teamStatus(s.sessie_status, s.ingelogd)} />
            <span className={`sk-score${s.score < 0 ? " score-min" : ""}`}>{s.score} pt</span>
          </div>
        </div>

        <div className="sk-lijf">
          {/* Voortgang: bij een gewone route één stip per punt (gehaald vol, het volgende knippert); bij heel veel
              punten een balk */}
          {totaalPunten > 0 && totaalPunten <= 30
            ? <div className="sk-stippen" title={`${s.bezochte_punten} van ${totaalPunten} punten`} style={{ ["--speler-kleur" as string]: kleur }}>
                {Array.from({ length: totaalPunten }, (_, i) => (
                  <i key={i} className={i < s.bezochte_punten ? "sk-stip sk-stip--vol" : i === s.bezochte_punten && s.sessie_status === "actief" ? "sk-stip sk-stip--nu" : "sk-stip"} />
                ))}
              </div>
            : <div className="pr-xp-bar sk-balk" title={totaalPunten ? `${s.bezochte_punten} van ${totaalPunten} punten` : undefined}><div className="pr-xp-fill" style={{ width: `${pct}%`, background: kleur }} /></div>}
          {/* 🧩 Puzzelwoord: het hele woord, de letters die het team al heeft in goud */}
          {s.puzzel && <PuzzelVoortgang p={s.puzzel} gefinisht={s.sessie_status === "voltooid"} />}
          {s.wacht && <WachtBlok wacht={s.wacht} onVerkort={beperkt ? undefined : () => onVerkort(s.wacht!.effect_id)} />}

          {s.hulp && (
            <div style={{
              marginTop: 8, padding: "8px 10px", borderRadius: 10,
              background: "rgba(255,138,0,0.18)", border: "1px solid rgba(255,138,0,0.6)",
              fontSize: "0.8rem", color: "#FFD9A0", fontWeight: 600,
            }}>
              ⚠️ Kan {s.hulp.punt_naam ? `"${s.hulp.punt_naam}"` : "het volgende punt"} niet bereiken
              <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {duurKort(Math.max(0, Math.floor((Date.now() - new Date(s.hulp.sinds).getTime()) / 60000)))} geleden</span>
            </div>
          )}
          {/* Hulpvraag: de knoppen (dezelfde als in het venster) meteen hier */}
          {s.hulp && <SpelerActies s={s} kanVrijgeven={kanVrijgeven} beperkt={beperkt}
            onVrijgeven={onVrijgeven} onStop={onStop} onNegeer={onNegeer} onGewijzigd={onGewijzigd} />}
        </div>
      </div>
    </div>
  );
}

// Knoppen bij een speler: punt vrijgeven, punten, bericht en stoppen (gefinisht: alleen punten).
// Op de spelerskaart én in het venster met alle details. Op de telefoon korte teksten.
export function SpelerActies({ s, kanVrijgeven, beperkt, onVrijgeven, onStop, onNegeer, onGewijzigd }: {
  s: SpelerOverzicht; kanVrijgeven: boolean; beperkt: boolean;
  onVrijgeven: () => void; onStop: () => void; onNegeer: (hulpId: string) => void; onGewijzigd: () => void;
}) {
  const speelt = s.sessie_status === "actief";
  if (!speelt) {
    if (beperkt || !s.sessie_id) return null;
    return (
      <div className="speler-knoppen" onClick={(e) => e.stopPropagation()}>
        <PuntenAanpassen sessieId={s.sessie_id} naam={s.display_name} onKlaar={onGewijzigd} />
      </div>
    );
  }
  return (
    <div className="speler-knoppen" onClick={(e) => e.stopPropagation()}>
      {kanVrijgeven && (
        <BevestigKnop venster gevaarlijk={false} icoon="⏭️" titel={`Volgend punt vrijgeven voor ${s.display_name}?`}
          vraag="" ja="Ja, vrijgeven" onBevestig={onVrijgeven}
          className={`rl-knop${s.hulp ? " rl-knop--cyan" : ""}`}>
          <Icoon naam="vrijgeven" /> <span className="alleen-pc">{s.hulp ? "Punt vrijgeven" : "Volgend punt vrijgeven"}</span><span className="alleen-mobiel">Vrijgeven</span>
        </BevestigKnop>
      )}
      {s.hulp && (
        <button className="rl-knop" onClick={() => onNegeer(s.hulp!.id)}>Negeren</button>
      )}
      {!beperkt && s.sessie_id && <PuntenAanpassen sessieId={s.sessie_id} naam={s.display_name} onKlaar={onGewijzigd} />}
      {!beperkt && <ContactKnop team={{ id: s.player_id, naam: s.display_name, telefoon: s.telefoon }} />}
      {!beperkt && (
        <BevestigKnop venster icoon="⏹️" titel={`Spel van ${s.display_name} stoppen?`}
          vraag="" ja="Ja, stoppen" onBevestig={onStop} className="rl-knop rl-knop--rood">
          <Icoon naam="stoppen" /> <span className="alleen-pc">Spel stoppen</span><span className="alleen-mobiel">Stoppen</span>
        </BevestigKnop>
      )}
    </div>
  );
}

// Team moet wachten door een spook of plek zooi: resterende tijd (telt per seconde af) en inkorten
function WachtBlok({ wacht, onVerkort }: { wacht: NonNullable<SpelerOverzicht["wacht"]>; onVerkort?: () => void }) {
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNu(Date.now()), 1000); return () => clearInterval(t); }, []);
  const rest = Math.max(0, Math.ceil((new Date(wacht.tot).getTime() - nu) / 1000));
  if (rest <= 0) return null;
  const tijd = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`;
  return (
    <div className={`wacht-blok wacht-blok--${wacht.soort}`} onClick={(e) => e.stopPropagation()}>
      <span style={{ fontSize: "1.3rem", lineHeight: 1 }} aria-hidden>{wacht.soort === "spook" ? "👻" : "⛔"}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong>{wacht.soort === "spook" ? "Spook" : "Plek zooi"}</strong>
        <span style={{ color: "var(--text)" }}>{wacht.soort === "spook" ? " · volgende punt verborgen" : " · staat stil"}</span>
      </span>
      <span className="wacht-tijd">{tijd}</span>
      {onVerkort && <button type="button" className="rl-knop" onClick={onVerkort} title="Wachttijd 30 seconden korter maken">−30 s</button>}
    </div>
  );
}


