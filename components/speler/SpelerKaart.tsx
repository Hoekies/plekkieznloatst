"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { haversine } from "@/lib/geo";
import { createClient } from "@/lib/supabase";
import VraagPopup from "./VraagPopup";
import type { SpelerLocatie } from "@/app/api/speler/locaties/route";
import type { RoutePunt, SpelerSessie, SpelerPuntVoortgang } from "@/types/database";

const SpelerLeaflet = dynamic(() => import("./SpelerLeaflet"), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      Kaart laden…
    </div>
  ),
});

interface Props {
  sessie: SpelerSessie;
  punten: RoutePunt[];
  initVoortgang: SpelerPuntVoortgang[];
}

type GpsStatus = "laden" | "ok" | "zwak" | "weg";

const GPS_TIMEOUT_MS = 12000;
const SLECHTE_NAUWKEURIGHEID_M = 30;
const LOCATIE_PUBLICEER_INTERVAL_MS = 60000;

function speelGeluid() {
  try { new Audio("/sounds/punt-bereikt.mp3").play(); } catch { /* geen geluid */ }
}

export default function SpelerKaart({ sessie, punten, initVoortgang }: Props) {
  const router = useRouter();
  const [voortgang, setVoortgang] = useState<SpelerPuntVoortgang[]>(initVoortgang);
  const [positie, setPositie] = useState<GeolocationCoordinates | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("laden");
  const [popupPunt, setPopupPunt] = useState<RoutePunt | null>(null);
  const [andereSpelers, setAndereSpelers] = useState<SpelerLocatie[]>([]);
  const [realtimeVerbonden, setRealtimeVerbonden] = useState(true);

  const bezigRef = useRef(false);
  const positieRef = useRef<GeolocationCoordinates | null>(null);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locatieTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Afgeleid uit voortgang
  const verwerktIds = new Set(voortgang.filter((v) => v.answered_at).map((v) => v.route_point_id));
  const bereiktIds = new Set(voortgang.filter((v) => v.reached_at && !v.answered_at).map((v) => v.route_point_id));
  const activePunt = punten[verwerktIds.size] ?? null;
  const spelAfgelopen = verwerktIds.size >= punten.length;

  // GPS starten
  useEffect(() => {
    if (!navigator?.geolocation) { setGpsStatus("weg"); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPositieUpdate,
      () => setGpsStatus("weg"),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locatie publiceren elke 60 seconden
  useEffect(() => {
    locatieTimerRef.current = setInterval(() => {
      if (positieRef.current) publiceerLocatie(positieRef.current);
    }, LOCATIE_PUBLICEER_INTERVAL_MS);
    return () => { if (locatieTimerRef.current) clearInterval(locatieTimerRef.current); };
  }, []);

  // Andere spelers: initieel ophalen + Supabase Realtime abonnement
  useEffect(() => {
    haalAndereSpelersOp();

    const supabase = createClient();
    const kanaal = supabase
      .channel("locaties-kanaal")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_updates" },
        () => {
          // Veilig ophalen via de beveiligde API (geen exacte coords uit de payload)
          haalAndereSpelersOp();
        },
      )
      .subscribe((status) => {
        setRealtimeVerbonden(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(kanaal); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Puntdetectie bij iedere positiewijziging
  useEffect(() => {
    if (!positie || !activePunt || bereiktIds.has(activePunt.id) || bezigRef.current || popupPunt) return;
    const afstand = haversine(positie.latitude, positie.longitude, activePunt.latitude, activePunt.longitude);
    if (afstand <= activePunt.radius_meters) markeerBereikt(activePunt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positie]);

  // Redirect naar finish als alle punten verwerkt zijn
  useEffect(() => {
    if (spelAfgelopen) router.push("/speler/finish");
  }, [spelAfgelopen, router]);

  async function haalAndereSpelersOp() {
    try {
      const res = await fetch("/api/speler/locaties");
      if (res.ok) {
        const data = await res.json();
        setAndereSpelers(data.locaties ?? []);
      }
    } catch { /* verbindingsfout */ }
  }

  async function publiceerLocatie(coords: GeolocationCoordinates) {
    try {
      await fetch("/api/speler/locatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      });
    } catch { /* verbindingsfout, volgende keer opnieuw */ }
  }

  function resetGpsTimeout() {
    if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
    gpsTimeoutRef.current = setTimeout(() => setGpsStatus("weg"), GPS_TIMEOUT_MS);
  }

  function onPositieUpdate(pos: GeolocationPosition) {
    resetGpsTimeout();
    positieRef.current = pos.coords;
    setPositie(pos.coords);
    setGpsStatus(pos.coords.accuracy <= SLECHTE_NAUWKEURIGHEID_M ? "ok" : "zwak");
  }

  async function markeerBereikt(punt: RoutePunt) {
    if (bezigRef.current) return;
    bezigRef.current = true;
    speelGeluid();
    try {
      const res = await fetch("/api/speler/voortgang/bereik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_point_id: punt.id }),
      });
      if (res.ok) {
        const nieuweVoortgang: SpelerPuntVoortgang = await res.json();
        setVoortgang((v) => [...v, nieuweVoortgang]);
        setPopupPunt(punt);
      }
    } finally {
      bezigRef.current = false;
    }
  }

  function puntVerwerkt(bijgewerktVoortgang: SpelerPuntVoortgang) {
    setVoortgang((v) =>
      v.some((vp) => vp.route_point_id === bijgewerktVoortgang.route_point_id)
        ? v.map((vp) => vp.route_point_id === bijgewerktVoortgang.route_point_id ? bijgewerktVoortgang : vp)
        : [...v, bijgewerktVoortgang]
    );
    setPopupPunt(null);
  }

  function controleerLocatie() {
    if (!positie || !activePunt || bereiktIds.has(activePunt.id) || popupPunt) return;
    const afstand = haversine(positie.latitude, positie.longitude, activePunt.latitude, activePunt.longitude);
    if (afstand <= activePunt.radius_meters) markeerBereikt(activePunt);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>

      {/* Realtime-verbindingsbanner */}
      {!realtimeVerbonden && (
        <div style={{ background: "#FEF9C3", color: "#A16207", padding: "6px 14px", fontSize: "0.78rem", textAlign: "center" }}>
          ⚠️ Live verbinding onderbroken — bezig met opnieuw verbinden…
        </div>
      )}

      {/* GPS-statusbalk */}
      {gpsStatus === "laden" && (
        <div style={{ background: "var(--cyan-soft)", color: "var(--cyan)", padding: "8px 14px", fontSize: "0.83rem", textAlign: "center" }}>
          GPS-signaal ophalen…
        </div>
      )}
      {gpsStatus === "zwak" && (
        <div style={{ background: "#FEF9C3", color: "#A16207", padding: "8px 14px", fontSize: "0.83rem", textAlign: "center" }}>
          ⚠️ GPS-nauwkeurigheid te laag. Ga naar buiten voor een beter signaal.
        </div>
      )}
      {gpsStatus === "weg" && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "8px 14px", fontSize: "0.83rem", textAlign: "center" }}>
          ❌ GPS-verbinding weg. Wacht op herstel van het signaal…
        </div>
      )}

      {/* Kaart */}
      <div style={{ flex: 1, position: "relative" }}>
        <SpelerLeaflet
          positie={positie}
          punten={punten}
          verwerktIds={verwerktIds}
          bereiktIds={bereiktIds}
          activePuntId={activePunt?.id ?? null}
          andereSpelers={andereSpelers}
        />

        {/* Controleer locatie-knop */}
        {activePunt && !bereiktIds.has(activePunt.id) && !popupPunt && gpsStatus !== "laden" && (
          <button
            className="btn btn-primary"
            onClick={controleerLocatie}
            style={{
              position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
              zIndex: 1000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}>
            📍 Controleer locatie
          </button>
        )}
      </div>

      {/* Punt bereikt → vraag/info popup */}
      {popupPunt && (
        <VraagPopup punt={popupPunt} onVerwerkt={puntVerwerkt} />
      )}
    </div>
  );
}
