"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formateerTijd } from "@/lib/geo";
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";

const POLL_INTERVAL_MS = 15000;

type Tab = "overzicht" | "leaderboard";

interface Props {
  initData: LiveData;
}

function tijdGeleden(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}u`;
}

function sessietijd(s: SpelerOverzicht): number {
  if (!s.started_at) return 0;
  const eind = s.finished_at ? new Date(s.finished_at).getTime() : Date.now();
  return Math.floor((eind - new Date(s.started_at).getTime()) / 1000);
}

export default function AdminDashboard({ initData }: Props) {
  const [data, setData] = useState<LiveData>(initData);
  const [tab, setTab] = useState<Tab>("overzicht");
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

  // Leaderboard: klare spelers gerangschikt, daarna actieve op score
  const leaderboard = [...spelers]
    .filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid")
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return sessietijd(a) - sessietijd(b);
    })
    .map((s, i) => ({ ...s, rang: i + 1 }));

  return (
    <>
      <div className="admin-topbar">
        <h1>Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: realtimeOk ? "var(--green, #16A34A)" : "var(--muted)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: realtimeOk ? "var(--green, #16A34A)" : "var(--muted)", display: "inline-block" }} />
          {realtimeOk ? "Live" : "Verbinding weg"}
        </div>
      </div>

      <div className="admin-content">

        {/* Stat kaarten */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          <StatKaart label="Actieve route" waarde={route?.name ?? "—"} icon="🗺️" />
          <StatKaart label="Bezig met spelen" waarde={String(aantalActief)} icon="🏃" />
          <StatKaart label="Gefinisht" waarde={String(aantalKlaar)} icon="🏁" />
          <StatKaart label="Routepunten" waarde={totaalPunten ? String(totaalPunten) : "—"} icon="📍" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["overzicht", "leaderboard"] as Tab[]).map((t) => (
            <button key={t} className={`btn ${tab === t ? "btn-primary" : "btn-outline"}`}
              style={{ fontSize: "0.82rem" }} onClick={() => setTab(t)}>
              {t === "overzicht" ? "👥 Overzicht" : "🏆 Leaderboard"}
            </button>
          ))}
        </div>

        {/* Overzicht */}
        {tab === "overzicht" && (
          spelers.length === 0 ? (
            <div className="card">
              <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nog geen groepen aangemaakt.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {spelers.map((s) => (
                <SpelerKaart key={s.player_id} speler={s} totaalPunten={totaalPunten} />
              ))}
            </div>
          )
        )}

        {/* Leaderboard */}
        {tab === "leaderboard" && (
          leaderboard.length === 0 ? (
            <div className="card">
              <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                Nog geen actieve sessies. Start een route om het leaderboard te activeren.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
                    {["#", "Groep", "Score", "Tijd", "Punten", "Status"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((s) => (
                    <tr key={s.player_id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--muted)" }}>
                        {s.rang <= 3 ? ["🥇","🥈","🥉"][s.rang - 1] : s.rang}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{s.group_name}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--blue)" }}>{s.score}</td>
                      <td style={{ padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontSize: "0.85rem" }}>
                        {s.started_at ? formateerTijd(sessietijd(s)) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "0.85rem" }}>
                        {totaalPunten ? `${s.bezochte_punten} / ${totaalPunten}` : s.bezochte_punten}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <StatusPil status={s.sessie_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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
function SpelerKaart({ speler: s, totaalPunten }: { speler: SpelerOverzicht; totaalPunten: number }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{s.group_name}</span>
            <StatusPil status={s.sessie_status} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px" }}>
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
              <InfoRegel label="Laatste update" waarde={`${tijdGeleden(s.laatste_gezien)} geleden`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRegel({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: "0.83rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{waarde}</div>
    </div>
  );
}

function StatKaart({ label, waarde, icon }: { label: string; waarde: string; icon: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: "2rem" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--blue)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{waarde}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function StatusPil({ status }: { status: SpelerOverzicht["sessie_status"] }) {
  const cfg = {
    geen_sessie: { label: "Niet gestart",  bg: "var(--line)",       kleur: "var(--muted)" },
    actief:      { label: "Bezig",          bg: "var(--cyan-soft)",  kleur: "var(--cyan)"  },
    voltooid:    { label: "Klaar",          bg: "var(--green-soft, #DCFCE7)", kleur: "var(--green, #16A34A)" },
    vervallen:   { label: "Vervallen",      bg: "var(--line)",       kleur: "var(--muted)" },
  }[status];
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, background: cfg.bg, color: cfg.kleur, padding: "2px 8px", borderRadius: 99 }}>
      {cfg.label}
    </span>
  );
}
