"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import BevestigKnop from "@/components/admin/BevestigKnop";
import StatKaart from "@/components/admin/StatKaart";
import SectieKop from "@/components/admin/SectieKop";
import { toonMelding } from "@/components/admin/Melding";

import { sessietijd } from "@/lib/admin-live";
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";
import { ITEM_INFO } from "@/components/speler/SpeciaalItemLegende";
import FotoBeoordelingPanel from "./FotoBeoordelingPanel";
import { maakKleurMap } from "@/lib/speler-kleur";
import SpelLeider, { minutenNietGezien } from "@/components/admin/SpelLeider";
import Klaarzetten from "@/components/admin/Klaarzetten";
import Tijdlijn from "@/components/admin/Tijdlijn";
import SpelerDetailVenster from "@/components/admin/SpelerDetailVenster";
import WhatsAppKnop from "@/components/admin/WhatsAppKnop";

const POLL_INTERVAL_MS = 5000;

interface Props {
  initData: LiveData;
}

function tijdGeleden(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}u`;
}


export default function AdminDashboard({ initData }: Props) {
  const [data, setData] = useState<LiveData>(initData);
  const [realtimeOk, setRealtimeOk] = useState(true);
  const [resetFase, setResetFase] = useState<"idle" | "bevestig" | "bezig" | "klaar">("idle");
  // Speler waarvan het detailvenster open staat
  const [detailId, setDetailId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  async function geefPuntVrij(s: SpelerOverzicht) {
    if (!s.sessie_id) return;
    const naam = s.nickname ?? s.login_name;
    const res = await fetch(`/api/admin/sessies/${s.sessie_id}/punt-vrijgeven`, { method: "POST" });
    if (!res.ok) {
      const { fout } = await res.json().catch(() => ({ fout: null }));
      toonMelding(fout ?? "Vrijgeven mislukt", "fout");
    } else toonMelding(`Punt van ${naam} vrijgegeven`, "ok");
    ververs();
  }

  async function stopSpel(s: SpelerOverzicht) {
    const naam = s.display_name;
    const res = await fetch(`/api/admin/groepen/${s.player_id}/spel-stoppen`, { method: "POST" });
    if (!res.ok) {
      const { fout } = await res.json().catch(() => ({ fout: null }));
      toonMelding(fout ?? "Stoppen mislukt", "fout");
    }
    ververs();
  }

  async function negeerHulp(hulpId: string) {
    await fetch(`/api/admin/hulp/${hulpId}`, { method: "PATCH" });
    ververs();
  }

  async function ververs() {
    try {
      const res = await fetch("/api/admin/live/spelers");
      if (res.ok) setData(await res.json());
    } catch { /* verbindingsfout */ }
  }

  async function bevestigReset() {
    setResetFase("bezig");
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (!res.ok) { setResetFase("idle"); return; }
      await ververs();
      setResetFase("klaar");
      setTimeout(() => setResetFase("idle"), 3000);
    } catch {
      setResetFase("idle");
    }
  }

  useEffect(() => {
    ververs();  // meteen de actuele stand, niet pas na de eerste ronde
    pollRef.current = setInterval(ververs, POLL_INTERVAL_MS);

    const supabase = createClient();
    const kanaal = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "player_sessions" }, ververs)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_point_progress" }, ververs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_updates" }, ververs)
      .subscribe((status) => setRealtimeOk(status === "SUBSCRIBED"));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(kanaal);
    };
  }, []);

  const { spelers, route, route_punten } = data;
  // Alleen spelers die meedoen (bezig of gefinisht), op volgorde van de stand: hoogste score eerst,
  // bij gelijke score de snelste. Wie nog niet gestart is, staat bij Spelers.
  const spelend = spelers
    .filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid")
    .sort((a, b) => b.score !== a.score ? b.score - a.score : sessietijd(a) - sessietijd(b));
  const aantalActief = spelers.filter((s) => s.sessie_status === "actief").length;
  const aantalKlaar = spelers.filter((s) => s.sessie_status === "voltooid").length;
  const totaalPunten = route_punten.length;
  const koploper = spelend[0];
  // Vaste kleur per speler (zelfde als op de live kaart en de spelerspagina)
  const kleuren = useMemo(() => maakKleurMap(spelers.map((s) => s.player_id)), [spelers]);
  const detail = detailId ? spelend.find((s) => s.player_id === detailId) : undefined;

  return (
    <>
      {/* Titel links, foto's beoordelen in het midden, live-status rechts (uitloggen staat rechtsboven) */}
      <div className="admin-topbar dashboard-topbar" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12 }}>
        <span className="admin-topbar-titel">Dashboard</span>
        <FotoBeoordelingPanel />
        <div style={{ justifySelf: "end" }} className={`admin-live-badge${realtimeOk ? " admin-live-badge--ok" : ""}`}>
          <span className={`admin-live-dot${realtimeOk ? " admin-live-dot--pulse" : ""}`} />
          {realtimeOk ? "Live" : "Verbinding weg"}
        </div>
      </div>

      <div className="admin-content">

        {data.fout && (
          <div style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
            background: "rgba(255,59,92,0.15)", border: "2px solid var(--red)", color: "#fecaca",
            fontSize: "0.85rem", fontWeight: 600,
          }}>
            ⚠️ Het dashboard is onvolledig: {data.fout}. Waarschijnlijk is er een database-migratie nog niet uitgevoerd.
          </div>
        )}

        {/* Telefoon: compacte strook in plaats van de vier tegels */}
        <div className="dash-strook">
          <span title="Actieve route">🗺️ {route?.name ?? "Geen route"}</span>
          <span title="Aan het spelen">⚡ {aantalActief}</span>
          <span title="Gefinisht">✓ {aantalKlaar}</span>
          <span title="Koploper">🥇 {koploper ? `${koploper.display_name} · ${koploper.score}` : "—"}</span>
        </div>

        {/* Stat kaarten */}
        <div className="admin-stat-grid dash-tegels" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 32 }}>
          <StatKaart label="Actieve route" waarde={route?.name ?? "—"} badgeKlas="pr-badge--orange" badge="🗺️" />
          <StatKaart label="Aan het spelen" waarde={String(aantalActief)} badgeKlas="pr-badge--purple" badge="⚡" />
          <StatKaart label="Gefinisht" waarde={String(aantalKlaar)} badgeKlas="pr-badge--green" badge="✓" />
          <StatKaart label="Koploper" waarde={koploper ? `${koploper.nickname ?? koploper.login_name} · ${koploper.score} pt` : "—"} badgeKlas="pr-badge--gold" badge="🥇" />
        </div>

        {/* Voor het spel: stappenplan. Tijdens het spel: wat vraagt je aandacht, en afronden */}
        <div style={{ marginBottom: 24 }}>
          {spelend.length === 0
            ? <Klaarzetten route={route} spelers={spelers} />
            : <SpelLeider spelend={spelend} wachtendeFotos={data.wachtende_fotos ?? 0} kleuren={kleuren}
                uitslagVrij={!!route?.uitslag_vrijgegeven} onKies={(s) => setDetailId(s.player_id)} />}
        </div>

        <div className={route && spelend.length > 0 ? "dash-kolommen" : undefined}>
          <div style={{ minWidth: 0 }}>
            {/* Spelende spelers, op volgorde van de stand */}
            <SectieKop titel="🏆 Spelende spelers" />
            {spelend.length === 0 ? (
              <div className="card leeg-scherm">
                {!route ? (
                  <>
                    <p>Er is geen actieve route. Kies eerst een route en activeer hem.</p>
                    <Link href="/admin/routes" className="rl-knop rl-knop--cyan actie-knop">🗺️ Naar routes</Link>
                  </>
                ) : spelers.length === 0 ? (
                  <>
                    <p>Nog geen spelers aangemaakt.</p>
                    <Link href="/admin/groepen" className="rl-knop rl-knop--cyan actie-knop">👥 Spelers aanmaken</Link>
                  </>
                ) : (
                  <>
                    <p>Er is nog geen speler gestart. Zodra een speler op ‘Ga op pad’ drukt, verschijnt hij hier.</p>
                    <WhatsAppKnop />
                  </>
                )}
              </div>
            ) : (
              <div>
                {spelend.map((s, i) => (
                  <SpelerKaart
                    key={s.player_id}
                    rang={i + 1}
                    speler={s}
                    kleur={kleuren.get(s.player_id) ?? "#A78BFA"}
                    totaalPunten={totaalPunten}
                    kanVrijgeven
                    onOpen={() => setDetailId(s.player_id)}
                    onVrijgeven={() => geefPuntVrij(s)}
                    onStop={() => stopSpel(s)}
                    onNegeer={negeerHulp}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Tijdlijn: naast de spelers op een breed scherm, eronder op de telefoon */}
          {route && spelend.length > 0 && <Tijdlijn kleuren={kleuren} />}
        </div>

        {detail && (
          <SpelerDetailVenster speler={detail} rang={spelend.indexOf(detail) + 1} kleur={kleuren.get(detail.player_id) ?? "#A78BFA"}
            totaalPunten={totaalPunten} onSluit={() => setDetailId(null)} />
        )}

        {/* Reset sectie */}
        {/* Zelfde kaartstijl als de spelers: één regel uitleg en een brede rode knop */}
        <div className="pr-gem-card" style={{ marginTop: 32 }}>
         <div className="pr-gem-card-inner reset-kaart" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0, fontSize: "0.9rem", color: "var(--text)" }}>
            <strong style={{ fontFamily: "var(--font-display)", color: "#fff" }}>Spel resetten</strong>
            <span style={{ color: "var(--muted)" }}> · wist alle spellen en scores, spelers en routes blijven</span>
          </div>
          <div className="reset-kaart-knop">
            {/* Bevestigen in een venster, met uitleg wat er verdwijnt */}
            {(resetFase === "idle" || resetFase === "bevestig") && (
              <BevestigKnop venster icoon="💣" titel="Spel resetten?" className="rl-knop rl-knop--rood actie-knop reset-knop"
                vraag="Alle spellen van alle spelers worden gewist, ook van gefinishte spelers: scores, antwoorden, gelopen routes, ingestuurde foto's en opgepakte items. Gedeelde kaart-links werken daarna niet meer. Spelers en routes blijven bewaard. Dit kan niet ongedaan worden gemaakt."
                ja="Ja, reset het spel" onBevestig={bevestigReset}>
                <span aria-hidden style={{ fontSize: "1.5rem", lineHeight: 1 }}>💣</span> Reset spel
              </BevestigKnop>
            )}
            {resetFase === "bezig" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "var(--muted)" }}>
                <div className="spinner" />
                Bezig…
              </div>
            )}
            {resetFase === "klaar" && (
              <span style={{ fontSize: "0.82rem", color: "var(--green, #16A34A)", fontWeight: 600 }}>✓ Reset voltooid</span>
            )}
          </div>
         </div>
        </div>
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

function SpelerKaart({ rang, speler: s, kleur, totaalPunten, kanVrijgeven, onOpen, onVrijgeven, onStop, onNegeer }: {
  rang: number;
  speler: SpelerOverzicht;
  kleur: string;
  onOpen: () => void;
  totaalPunten: number;
  kanVrijgeven: boolean;
  onVrijgeven: () => void;
  onStop: () => void;
  onNegeer: (hulpId: string) => void;
}) {
  const pct = totaalPunten ? Math.min(100, Math.round((s.bezochte_punten / totaalPunten) * 100)) : 0;
  const speelt = s.sessie_status === "actief";
  const stil = minutenNietGezien(s);
  return (
    // Tik op de kaart: alles van deze speler in één venster (de knoppen erin doen hun eigen ding)
    <div className="pr-gem-card speler-kaart-klik" role="button" tabIndex={0} title="Tik voor alle details"
      onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      style={s.hulp ? { boxShadow: "0 0 0 3px #ff8a00, 0 0 18px rgba(255,138,0,0.6)" }
      : rang === 1 && s.score > 0 ? { boxShadow: "0 0 0 2px #ffd93b, 0 0 16px rgba(255,217,59,0.45)" } : undefined}>
      <div className="pr-gem-card-inner">
        {/* Plek in de stand */}
        <span title={`${rang}e plaats`} style={{ width: 40, flexShrink: 0, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: rang <= 3 ? "1.9rem" : "1.2rem", color: "#fff" }}>
          {rang <= 3 ? ["🥇", "🥈", "🥉"][rang - 1] : rang}
        </span>
        <div className="pr-gem-avatar speler-ring" style={{ ["--speler-kleur" as string]: kleur }}>{s.icon ?? teamIcoonVoor(s.player_id)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem",
            color: s.nickname ? "#fff" : "var(--muted)", fontStyle: s.nickname ? "normal" : "italic",
          }}>
            {s.nickname ?? "nog geen naam gekozen"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {s.login_name}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
            📍 {totaalPunten ? `${s.bezochte_punten}/${totaalPunten}` : s.bezochte_punten}
            {s.huidig_punt_naam && ` · ${s.huidig_punt_naam}`}
            {s.laatste_gezien && ` · ${tijdGeleden(s.laatste_gezien)} geleden`}
          </div>
          <div className="pr-xp-bar"><div className="pr-xp-fill" style={{ width: `${pct}%`, background: kleur }} /></div>
          {stil !== null && (
            <div className="stil-label">📵 Niet gezien sinds {stil} min{s.ingelogd ? "" : " · uitgelogd"}</div>
          )}

          {(s.items.in_balk.length > 0 || s.items.ingezet.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 12px", marginTop: 8, fontSize: "0.72rem", color: "var(--muted)" }}>
              {s.items.in_balk.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  In de balk: <ItemIcoontjes types={s.items.in_balk} />
                </span>
              )}
              {s.items.ingezet.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Ingezet: <ItemIcoontjes types={s.items.ingezet} vaag />
                </span>
              )}
            </div>
          )}

          {s.hulp && (
            <div style={{
              marginTop: 8, padding: "8px 10px", borderRadius: 10,
              background: "rgba(255,138,0,0.18)", border: "1px solid rgba(255,138,0,0.6)",
              fontSize: "0.8rem", color: "#FFD9A0", fontWeight: 600,
            }}>
              ⚠️ Kan {s.hulp.punt_naam ? `"${s.hulp.punt_naam}"` : "het volgende punt"} niet bereiken
              <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {tijdGeleden(s.hulp.sinds)} geleden</span>
            </div>
          )}
          {speelt && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
              {kanVrijgeven && (
                <BevestigKnop className={s.hulp ? "btn-premium--cyan" : "btn btn-ghost"} style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                  vraag="Vraag gaat bij hen direct open." ja="Ja, vrijgeven" onBevestig={onVrijgeven}>
                  ⏭️ {s.hulp ? "Punt vrijgeven" : "Volgend punt vrijgeven"}
                </BevestigKnop>
              )}
              {s.hulp && (
                <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={() => onNegeer(s.hulp!.id)}>
                  Negeren
                </button>
              )}
              <BevestigKnop className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "6px 12px", color: "var(--red)" }}
                vraag="Score en voortgang vervallen." ja="Ja, stoppen" onBevestig={onStop}>
                ⏹️ Spel stoppen
              </BevestigKnop>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <StatusPil status={s.sessie_status} ingelogd={s.ingelogd} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: "#FFE680" }}>{s.score} pt</span>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Details ›</span>
        </div>
      </div>
    </div>
  );
}

// Item-icoontjes, gegroepeerd per type met een aantal (bv. 2× bom)
function ItemIcoontjes({ types, vaag = false }: { types: string[]; vaag?: boolean }) {
  const aantallen = new Map<string, number>();
  types.forEach((t) => aantallen.set(t, (aantallen.get(t) ?? 0) + 1));
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {[...aantallen].map(([type, n]) => (
        <span key={type} title={`${ITEM_INFO[type]?.naam ?? type}${n > 1 ? ` (${n}×)` : ""}`}
          style={{ display: "inline-flex", alignItems: "center", opacity: vaag ? 0.45 : 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/items/${type}.webp`} alt={ITEM_INFO[type]?.naam ?? type} style={{ width: 22, height: 22 }} />
          {n > 1 && <span style={{ fontWeight: 700, color: "var(--ink)", marginLeft: 1 }}>{n}</span>}
        </span>
      ))}
    </span>
  );
}


function StatusPil({ status, ingelogd }: { status: SpelerOverzicht["sessie_status"]; ingelogd: boolean }) {
  const cfg = {
    geen_sessie: { label: "Niet gestart", cls: "pr-gem-chip--gray" },
    // Spel loopt nog, maar de speler is uitgelogd: kan verder na opnieuw inloggen
    actief:      ingelogd ? { label: "Actief", cls: "pr-gem-chip--orange" } : { label: "Uitgelogd", cls: "pr-gem-chip--gray" },
    voltooid:    { label: "Voltooid",     cls: "pr-gem-chip--green" },
    vervallen:   { label: "Vervallen",    cls: "pr-gem-chip--gray" },
  }[status];
  return (
    <span className={`pr-gem-chip ${cfg.cls}`} style={{ flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
}
