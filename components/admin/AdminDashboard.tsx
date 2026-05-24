"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formateerTijd } from "@/lib/geo";
import { sessietijd } from "@/lib/admin-live";
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";
import FotoBeoordelingPanel from "./FotoBeoordelingPanel";

const POLL_INTERVAL_MS = 15000;

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const aantalActief = spelers.filter((s) => s.sessie_status === "actief").length;
  const aantalKlaar = spelers.filter((s) => s.sessie_status === "voltooid").length;
  const totaalPunten = route_punten.length;

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar-titel">Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FotoBeoordelingPanel />
          <div className={`admin-live-badge${realtimeOk ? " admin-live-badge--ok" : ""}`}>
            <span className={`admin-live-dot${realtimeOk ? " admin-live-dot--pulse" : ""}`} />
            {realtimeOk ? "Live" : "Verbinding weg"}
          </div>
        </div>
      </div>

      <div className="admin-content">

        {/* Stat kaarten */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatKaart label="Actieve route" waarde={route?.name ?? "—"} icon="🗺️" kleur="var(--blue)" />
          <StatKaart label="Bezig met spelen" waarde={String(aantalActief)} icon="🏃" kleur="var(--gold)" />
          <StatKaart label="Gefinisht" waarde={String(aantalKlaar)} icon="🏁" kleur="var(--green)" />
          <StatKaart label="Routepunten" waarde={totaalPunten ? String(totaalPunten) : "—"} icon="📍" kleur="var(--cyan)" />
        </div>

        {/* Groepen overzicht */}
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>👥 Groepen</div>
        {spelers.length === 0 ? (
          <div className="card">
            <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nog geen groepen aangemaakt.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {spelers.map((s, i) => (
              <SpelerKaart key={s.player_id} speler={s} totaalPunten={totaalPunten} isLast={i === spelers.length - 1} />
            ))}
          </div>
        )}

        {/* Reset sectie */}
        <div style={{ marginTop: 32, borderTop: "1px solid var(--line)", paddingTop: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>Spel resetten</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Wist alle sessies, locaties en voortgang. Groepen en routes blijven behouden.
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {resetFase === "idle" && (
              <button className="btn btn-danger" style={{ fontSize: "0.82rem" }} onClick={() => setResetFase("bevestig")}>
                🗑️ Reset spel
              </button>
            )}
            {resetFase === "bevestig" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Weet je het zeker?</span>
                <button className="btn btn-outline" style={{ fontSize: "0.78rem" }} onClick={() => setResetFase("idle")}>Annuleer</button>
                <button className="btn btn-danger" style={{ fontSize: "0.78rem" }} onClick={bevestigReset}>Ja, reset</button>
              </div>
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
    </>
  );
}

// ── SpelerKaart ───────────────────────────────────────────────────────────────
function SpelerKaart({ speler: s, totaalPunten, isLast }: { speler: SpelerOverzicht; totaalPunten: number; isLast: boolean }) {
  return (
    <div className="speler-rij" style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{s.display_name}</span>
          {s.nickname && <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: 6 }}>{s.group_name}</span>}
        </div>
        <StatusPil status={s.sessie_status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "4px 16px" }}>
        <InfoRegel label="Score" waarde={`${s.score} pt`} />
        <InfoRegel
          label="Voortgang"
          waarde={totaalPunten ? `${s.bezochte_punten} / ${totaalPunten}` : String(s.bezochte_punten)}
        />
        <InfoRegel
          label="Gestart"
          waarde={s.started_at ? new Date(s.started_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "—"}
        />
        {s.huidig_punt_naam && (
          <InfoRegel label="Huidig punt" waarde={s.huidig_punt_naam} />
        )}
        {s.finished_at && (
          <InfoRegel
            label="Speeltijd"
            waarde={formateerTijd(Math.floor((new Date(s.finished_at).getTime() - new Date(s.started_at!).getTime()) / 1000))}
          />
        )}
        {s.laatste_gezien && (
          <InfoRegel label="Laatste update" waarde={`${tijdGeleden(s.laatste_gezien)} geleden`} suppressHydrationWarning />
        )}
      </div>
    </div>
  );
}

function InfoRegel({ label, waarde, suppressHydrationWarning }: { label: string; waarde: string; suppressHydrationWarning?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: "0.83rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} suppressHydrationWarning={suppressHydrationWarning}>{waarde}</div>
    </div>
  );
}

function StatKaart({ label, waarde, icon, kleur }: { label: string; waarde: string; icon: string; kleur: string }) {
  return (
    <div className="card stat-kaart" style={{ borderTop: `3px solid ${kleur}` }}>
      <div style={{ fontSize: "1.1rem", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: kleur, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1 }}>{waarde}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

function StatusPil({ status }: { status: SpelerOverzicht["sessie_status"] }) {
  const cfg = {
    geen_sessie: { label: "Niet gestart", cls: "status-pil--grijs" },
    actief:      { label: "Actief",        cls: "status-pil--blauw" },
    voltooid:    { label: "Voltooid",      cls: "status-pil--groen" },
    vervallen:   { label: "Vervallen",     cls: "status-pil--grijs" },
  }[status];
  return (
    <span className={`status-pil ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
