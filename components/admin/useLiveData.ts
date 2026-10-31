"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { LiveData } from "@/lib/admin-live";
import { meldLiveData } from "@/components/admin/useBeheerStatus";

// Live gegevens voor dashboard en live kaart: meteen ophalen, daarna elke `pollMs` én bij elke wijziging
// in de database (realtime). realtimeOk = de live-verbinding staat.
export function useLiveData(initData: LiveData, pollMs: number, kanaal: string) {
  const [data, setData] = useState<LiveData>(initData);
  const [realtimeOk, setRealtimeOk] = useState(true);
  // Wanneer de stand voor het laatst gelukt is (bij slecht bereik blijft de oude stand staan, met de leeftijd erbij)
  const [bijgewerkt, setBijgewerkt] = useState(() => Date.now());
  // Elke aanvraag krijgt een nummer; een antwoord van een oudere aanvraag die later binnenkomt, mag een
  // nieuwere stand niet overschrijven. Komt er een aanvraag bij terwijl er al een loopt, dan één keer erna.
  const nummerRef = useRef(0);
  const getoondRef = useRef(0);
  const bezigRef = useRef(false);
  const nogEensRef = useRef(false);

  async function ververs() {
    if (bezigRef.current) { nogEensRef.current = true; return; }
    bezigRef.current = true;
    const nr = ++nummerRef.current;
    try {
      const res = await fetch("/api/admin/live/spelers", { cache: "no-store" });
      // Ook doorgeven aan de gedeelde bron (tabteller, strook), zodat die niet nog eens ophaalt
      if (res.ok) {
        const d = await res.json();
        if (nr > getoondRef.current) { getoondRef.current = nr; setData(d); meldLiveData(d); }
        setBijgewerkt(Date.now());
      }
    } catch { /* verbindingsfout */ }
    finally {
      bezigRef.current = false;
      if (nogEensRef.current) { nogEensRef.current = false; ververs(); }
    }
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

  return { data, realtimeOk, ververs, bijgewerkt };
}
