"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase-browser";
import type { LiveData } from "@/lib/admin-live";

const AdminLiveLeaflet = dynamic(() => import("./AdminLiveLeaflet"), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      Kaart laden…
    </div>
  ),
});

const POLL_INTERVAL_MS = 15000;

interface Props {
  initData: LiveData;
}

export default function AdminLiveKaart({ initData }: Props) {
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
      .channel("admin-live-kaart")
      .on("postgres_changes", { event: "*", schema: "public", table: "player_sessions" }, ververs)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_point_progress" }, ververs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_updates" }, ververs)
      .subscribe((status) => setRealtimeOk(status === "SUBSCRIBED"));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(kanaal);
    };
  }, []);

  const { spelers, route_punten } = data;
  const aantalActief = spelers.filter((s) => s.sessie_status === "actief").length;
  const aantalKlaar = spelers.filter((s) => s.sessie_status === "voltooid").length;
  const spelersOpKaart = spelers.filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">Live kaart</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: realtimeOk ? "var(--green, #16A34A)" : "var(--muted)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: realtimeOk ? "var(--green, #16A34A)" : "var(--muted)", display: "inline-block" }} />
          {realtimeOk ? "Live" : "Verbinding weg"}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative", padding: 24, display: "flex" }}>
        {/* Kaart */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)" }}>
          <AdminLiveLeaflet spelers={spelers} route_punten={route_punten} speciale_items={data.speciale_items} />
        </div>

        {/* Overlay: spelerslijst */}
        <div style={{
          position: "absolute", top: 36, right: 36, zIndex: 1000,
          background: "rgba(255,255,255,0.95)", borderRadius: 10,
          border: "1px solid var(--line)", padding: "12px 14px",
          minWidth: 170, maxHeight: "calc(100% - 72px)", overflowY: "auto",
          backdropFilter: "blur(4px)",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            {aantalActief} bezig · {aantalKlaar} klaar
          </div>
          {spelersOpKaart.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Geen actieve spelers</div>
          ) : (
            spelersOpKaart.map((s) => (
              <div key={s.player_id} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                <span style={{
                  width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                  background: s.sessie_status === "voltooid" ? "var(--green, #16A34A)" : "#F97316",
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.group_name}
                  </div>
                  {s.laatste_lat === null && (
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>geen locatie</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
