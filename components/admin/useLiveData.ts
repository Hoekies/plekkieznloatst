"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { LiveData } from "@/lib/admin-live";
import { meldLiveData } from "@/components/admin/useBeheerStatus";

// Live gegevens voor dashboard en live kaart: meteen ophalen, daarna elke `pollMs` én bij elke wijziging
// in de database (realtime). vers = de stand is net gelukt (dat zegt meer dan of het realtime-kanaal openstaat: de
// verversing werkt ook zonder). uitgelogd = de sessie is verlopen; verversen helpt dan niet.
// Zuinig: een verborgen tabblad ververst eens per halve minuut, en realtime nooit vaker dan eens per 4 seconden
// (anders stuurt elke locatie-update van elk team een volledige ronde query's).
export function useLiveData(initData: LiveData, pollMs: number, kanaal: string) {
  const [data, setData] = useState<LiveData>(initData);
  const [uitgelogd, setUitgelogd] = useState(false);
  const [nu, setNu] = useState(() => Date.now());
  const laatsteRef = useRef(0);
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
    laatsteRef.current = Date.now();
    try {
      const res = await fetch("/api/admin/live/spelers", { cache: "no-store" });
      // Niet meer ingelogd: de API stuurt door naar de inlogpagina of weigert
      if (res.redirected || res.status === 401 || res.status === 403) { setUitgelogd(true); return; }
      // Ook doorgeven aan de gedeelde bron (tabteller, strook), zodat die niet nog eens ophaalt
      if (res.ok) {
        const d = await res.json();
        if (nr > getoondRef.current) { getoondRef.current = nr; setData(d); meldLiveData(d); }
        setBijgewerkt(Date.now());
        setUitgelogd(false);
      }
    } catch { /* verbindingsfout */ }
    finally {
      bezigRef.current = false;
      if (nogEensRef.current) { nogEensRef.current = false; ververs(); }
    }
  }

  useEffect(() => {
    const zuinig = (minAfstand: number) => {
      if (Date.now() - laatsteRef.current >= (document.hidden ? 30000 : minAfstand)) ververs();
    };
    const opRealtime = () => zuinig(4000);
    const zichtbaar = () => { if (!document.hidden) { setNu(Date.now()); ververs(); } };
    ververs();  // meteen de actuele stand, niet pas na de eerste ronde
    const t = setInterval(() => zuinig(0), pollMs);
    const klok = setInterval(() => setNu(Date.now()), 10000);
    document.addEventListener("visibilitychange", zichtbaar);
    const supabase = createClient();
    const kanaalObj = supabase
      .channel(kanaal)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_sessions" }, opRealtime)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_point_progress" }, opRealtime)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_updates" }, opRealtime)
      .subscribe();
    return () => {
      clearInterval(t);
      clearInterval(klok);
      document.removeEventListener("visibilitychange", zichtbaar);
      supabase.removeChannel(kanaalObj);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, kanaal]);

  // Twee rondes gemist (plus wat speling): niet meer vers
  const vers = nu - bijgewerkt < pollMs * 2 + 10000;
  return { data, vers, uitgelogd, nu, ververs, bijgewerkt };
}
