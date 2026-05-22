"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formateerTijd } from "@/lib/geo";
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";

const POLL_INTERVAL_MS = 15000;

function sessietijd(s: SpelerOverzicht): number {
  if (!s.started_at) return 0;
  const eind = s.finished_at ? new Date(s.finished_at).getTime() : Date.now();
  return Math.floor((eind - new Date(s.started_at).getTime()) / 1000);
}

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
        <h1 className="admin-topbar-titel">🏆 Leaderboard</h1>
        <div className={`admin-live-badge${realtimeOk ? " admin-live-badge--ok" : ""}`}>
          <span className={`admin-live-dot${realtimeOk ? " admin-live-dot--pulse" : ""}`} />
          {realtimeOk ? "Live" : "Verbinding weg"}
        </div>
      </div>

      <div className="admin-content">
        {leaderboard.length === 0 ? (
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
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((s) => (
                  <tr key={s.player_id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: "1.2rem" }}>
                      {s.rang <= 3 ? ["🥇", "🥈", "🥉"][s.rang - 1] : s.rang}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{s.group_name}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 800, fontSize: "1.1rem", color: "var(--blue)" }}>{s.score}</td>
                    <td style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums", fontSize: "0.85rem" }}>
                      {s.started_at ? formateerTijd(sessietijd(s)) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem" }}>
                      {totaalPunten ? `${s.bezochte_punten} / ${totaalPunten}` : s.bezochte_punten}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusPil status={s.sessie_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
