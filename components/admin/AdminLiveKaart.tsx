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
    ververs();  // meteen de actuele stand, niet pas na de eerste ronde
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
        <div className={`admin-live-badge${realtimeOk ? " admin-live-badge--ok" : ""}`}>
          <span className={`admin-live-dot${realtimeOk ? " admin-live-dot--pulse" : ""}`} />
          {realtimeOk ? "Live" : "Verbinding weg"}
        </div>
      </div>

      <div className="live-kaart-vak" style={{ flex: 1, minHeight: 0, position: "relative", display: "flex" }}>
        {/* Kaart */}
        <div className="live-kaart-rand" style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <AdminLiveLeaflet spelers={spelers} route_punten={route_punten} speciale_items={data.speciale_items} modus={data.route?.modus ?? null} />
        </div>

        {/* Overlay: spelerslijst */}
        <div className="pr-gem-panel live-kaart-lijst" style={{ position: "absolute", zIndex: 1000, flex: "none", minWidth: 210 }}>
         <div className="pr-gem-panel-inner" style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto", color: "#fff" }}>
          <div className="pr-gem-label" style={{ marginBottom: 8 }}>
            ⚡ {aantalActief} bezig · ✓ {aantalKlaar} klaar
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
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.display_name}
                  </div>
                  {(!s.ingelogd || s.laatste_lat === null) && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text)" }}>
                      {!s.ingelogd ? "uitgelogd" : "nog geen locatie"}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
         </div>
        </div>
      </div>
    </div>
  );
}
