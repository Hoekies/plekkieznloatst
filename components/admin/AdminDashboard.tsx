"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";
import FotoBeoordelingPanel from "./FotoBeoordelingPanel";

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
        <span className="admin-topbar-titel">Dashboard</span>
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
        <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 32 }}>
          <StatKaart label="Actieve route" waarde={route?.name ?? "—"} badgeKlas="pr-badge--orange" badge="🗺️" />
          <StatKaart label="Bezig met spelen" waarde={String(aantalActief)} badgeKlas="pr-badge--purple" badge="⚡" />
          <StatKaart label="Gefinisht" waarde={String(aantalKlaar)} badgeKlas="pr-badge--green" badge="✓" />
          <StatKaart label="Routepunten" waarde={totaalPunten ? String(totaalPunten) : "—"} badgeKlas="pr-badge--purple" badge="📍" />
        </div>

        {/* Groepen overzicht */}
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>👥 Groepen</div>
        {spelers.length === 0 ? (
          <div className="card">
            <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nog geen groepen aangemaakt.</p>
          </div>
        ) : (
          <div>
            {spelers.map((s) => (
              <SpelerKaart key={s.player_id} speler={s} totaalPunten={totaalPunten} />
            ))}
          </div>
        )}

        {/* Reset sectie */}
        <div style={{
          marginTop: 32, padding: "18px 22px", borderRadius: 16,
          background: "rgba(255,59,92,0.08)", border: "2px dashed rgba(255,59,92,0.4)",
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>💣 Spel resetten</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>
              Wist alle sessies, locaties en voortgang. Groepen en routes blijven behouden.
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {resetFase === "idle" && (
              <button className="btn-premium--danger" onClick={() => setResetFase("bevestig")}>
                Reset spel
              </button>
            )}
            {resetFase === "bevestig" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Weet je het zeker?</span>
                <button className="btn btn-outline" style={{ fontSize: "0.78rem" }} onClick={() => setResetFase("idle")}>Annuleer</button>
                <button className="btn-premium--danger" style={{ fontSize: "0.78rem", padding: "9px 16px" }} onClick={bevestigReset}>Ja, reset</button>
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
const TEAM_ICONEN = ["🦊", "🐸", "🦄", "🐧", "🦁", "🐙", "🐻", "🦋", "🐺", "🦩"];

function teamIcoonVoor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TEAM_ICONEN[hash % TEAM_ICONEN.length];
}

function SpelerKaart({ speler: s, totaalPunten }: { speler: SpelerOverzicht; totaalPunten: number }) {
  const pct = totaalPunten ? Math.min(100, Math.round((s.bezochte_punten / totaalPunten) * 100)) : 0;
  return (
    <div className="pr-gem-card">
      <div className="pr-gem-card-inner">
        <div className="pr-gem-avatar">{teamIcoonVoor(s.player_id)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>
            {s.login_name}
            <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 6, fontFamily: "var(--font)" }}>{s.group_name}</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: s.nickname ? "#fff" : "var(--muted)", fontStyle: s.nickname ? "normal" : "italic" }}>
            {s.nickname ?? "nog geen naam gekozen"}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
            {s.score} pt · {totaalPunten ? `${s.bezochte_punten}/${totaalPunten}` : s.bezochte_punten}
            {s.huidig_punt_naam && ` · ${s.huidig_punt_naam}`}
            {s.laatste_gezien && ` · ${tijdGeleden(s.laatste_gezien)} geleden`}
          </div>
          <div className="pr-xp-bar"><div className="pr-xp-fill" style={{ width: `${pct}%` }} /></div>
        </div>
        <StatusPil status={s.sessie_status} />
      </div>
    </div>
  );
}

function StatKaart({ label, waarde, badge, badgeKlas }: { label: string; waarde: string; badge: string; badgeKlas: string }) {
  return (
    <div className="pr-gem-panel">
      <span className={`pr-corner-chip pr-badge ${badgeKlas}`}>{badge}</span>
      <div className="pr-gem-panel-inner">
        <div className="pr-gem-label">{label}</div>
        <div className="pr-gem-value">{waarde}</div>
      </div>
    </div>
  );
}

function StatusPil({ status }: { status: SpelerOverzicht["sessie_status"] }) {
  const cfg = {
    geen_sessie: { label: "Niet gestart", cls: "pr-gem-chip--gray" },
    actief:      { label: "Actief",       cls: "pr-gem-chip--orange" },
    voltooid:    { label: "Voltooid",     cls: "pr-gem-chip--green" },
    vervallen:   { label: "Vervallen",    cls: "pr-gem-chip--gray" },
  }[status];
  return (
    <span className={`pr-gem-chip ${cfg.cls}`} style={{ flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
}
