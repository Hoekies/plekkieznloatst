"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { LiveData } from "@/lib/admin-live";

// Live gegevens voor dashboard en live kaart: meteen ophalen, daarna elke `pollMs` én bij elke wijziging
// in de database (realtime). realtimeOk = de live-verbinding staat.
export function useLiveData(initData: LiveData, pollMs: number, kanaal: string) {
  const [data, setData] = useState<LiveData>(initData);
  const [realtimeOk, setRealtimeOk] = useState(true);

  async function ververs() {
    try {
      const res = await fetch("/api/admin/live/spelers");
      if (res.ok) setData(await res.json());
    } catch { /* verbindingsfout */ }
  }

  useEffect(() => {
    ververs();  // meteen de actuele stand, niet pas na de eerste ronde
    const t = setInterval(ververs, pollMs);
    const supabase = createClient();
    const kanaalObj = supabase
      .channel(kanaal)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_sessions" }, ververs)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_point_progress" }, ververs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_updates" }, ververs)
      .subscribe((status) => setRealtimeOk(status === "SUBSCRIBED"));
    return () => {
      clearInterval(t);
      supabase.removeChannel(kanaalObj);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, kanaal]);

  return { data, realtimeOk, ververs };
}
