"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formateerTijd } from "@/lib/geo";
import { sessietijd } from "@/lib/admin-live";
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";
import StatKaart from "@/components/admin/StatKaart";
import SectieKop from "@/components/admin/SectieKop";

const POLL_INTERVAL_MS = 4000;

function StatusPil({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    actief:      { label: "Actief",      cls: "status-pil--blauw" },
    voltooid:    { label: "Voltooid",    cls: "status-pil--groen" },
    geen_sessie: { label: "Niet gestart", cls: "status-pil--grijs" },
    vervallen:   { label: "Vervallen",   cls: "status-pil--grijs" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "status-pil--grijs" };
  return <span className={`status-pil ${cls}`}>{label}</span>;
}

export default function AdminLeaderboard({ initData }: { initData: LiveData }) {
  const [data, setData] = useState<LiveData>(initData);
  const [realtimeOk, setRealtimeOk] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function ververs() {
    try {
      const res = await fetch("/api/admin/live/spelers");
      if (res.ok) setData(await res.json());
    } catch { /* verbindingsfout */ }
  }

  useEffect(() => {
    ververs();  // meteen de actuele stand, niet pas na de eerste ronde
    pollRef.current = setInterval(ververs, POLL_INTERVAL_MS);
    const supabase = createClient();
    const kanaal = supabase
      .channel("leaderboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "player_sessions" }, ververs)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_point_progress" }, ververs)
      .subscribe((status) => setRealtimeOk(status === "SUBSCRIBED"));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(kanaal);
    };
  }, []);

  const { spelers, route_punten } = data;
  const totaalPunten = route_punten.length;

  const leaderboard = [...spelers]
    .filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid")
    .sort((a, b) => b.score !== a.score ? b.score - a.score : sessietijd(a) - sessietijd(b))
    .map((s, i) => ({ ...s, rang: i + 1 }));

  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">Leaderboard</span>
        <div className={`admin-live-badge${realtimeOk ? " admin-live-badge--ok" : ""}`}>
          <span className={`admin-live-dot${realtimeOk ? " admin-live-dot--pulse" : ""}`} />
          {realtimeOk ? "Live" : "Verbinding weg"}
        </div>
      </div>

      <div className="admin-content">
        {/* Tegels zoals bovenaan het dashboard */}
        <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 32 }}>
          <StatKaart label="Koploper" waarde={leaderboard[0]?.display_name ?? "—"} badgeKlas="pr-badge--gold" badge="🥇" />
          <StatKaart label="Hoogste score" waarde={leaderboard[0] ? String(leaderboard[0].score) : "—"} badgeKlas="pr-badge--orange" badge="⭐" />
          <StatKaart label="Bezig met spelen" waarde={String(leaderboard.filter((s) => s.sessie_status === "actief").length)} badgeKlas="pr-badge--purple" badge="⚡" />
          <StatKaart label="Gefinisht" waarde={String(leaderboard.filter((s) => s.sessie_status === "voltooid").length)} badgeKlas="pr-badge--green" badge="✓" />
        </div>

        <SectieKop titel="🏆 Stand" />
        {leaderboard.length === 0 ? (
          <div className="card">
            <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              Nog geen teams aan het spelen.
            </p>
          </div>
        ) : (
          leaderboard.map((s) => (
            <div key={s.player_id} className="pr-gem-card" style={s.rang === 1 ? { boxShadow: "0 0 0 2px #ffd93b, 0 0 16px rgba(255,217,59,0.45)" } : undefined}>
              <div className="pr-gem-card-inner" style={{ flexWrap: "wrap" }}>
                <span style={{ width: 44, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: s.rang <= 3 ? "2rem" : "1.3rem", color: "#fff" }}>
                  {s.rang <= 3 ? ["🥇", "🥈", "🥉"][s.rang - 1] : s.rang}
                </span>
                <span className="pr-gem-avatar" style={{ width: 52, height: 52, fontSize: "2rem" }}>{s.icon ?? "👥"}</span>
                <div style={{ flex: 1, minWidth: 140 }}>
                  {s.nickname
                    ? <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>{s.nickname}</div>
                    : <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>nog geen naam gekozen</div>}
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                    ⏱ {s.started_at ? formateerTijd(sessietijd(s)) : "—"}
                    {" · "}🚶 {s.afstand_m > 0 ? `${(s.afstand_m / 1000).toFixed(2)} km` : "—"}
                    {" · "}📍 {totaalPunten ? `${s.bezochte_punten}/${totaalPunten}` : s.bezochte_punten}
                  </div>
                </div>
                <StatusPil status={s.sessie_status} />
                <span style={{ minWidth: 80, textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "#FFE680" }}>{s.score}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
