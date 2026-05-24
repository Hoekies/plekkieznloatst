"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { haversine } from "@/lib/geo";
import { createClient } from "@/lib/supabase-browser";
import { speelPuntBereikt, speelFinish } from "@/lib/sounds";
import VraagPopup from "./VraagPopup";
import type { SpelerLocatie } from "@/lib/types";
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

  const [kmAfgelegd, setKmAfgelegd] = useState(0);

  const bezigRef = useRef(false);
  const positieRef = useRef<GeolocationCoordinates | null>(null);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locatieTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vorigePositieRef = useRef<GeolocationCoordinates | null>(null);

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
    if (spelAfgelopen) { speelFinish(); router.push("/speler/finish"); }
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
    if (vorigePositieRef.current) {
      const d = haversine(vorigePositieRef.current.latitude, vorigePositieRef.current.longitude, pos.coords.latitude, pos.coords.longitude);
      if (d > 5) {
        setKmAfgelegd(prev => prev + d);
        vorigePositieRef.current = pos.coords;
      }
    } else {
      vorigePositieRef.current = pos.coords;
    }
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
        speelPuntBereikt();
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

      {/* Statistiekenbalk: km afgelegd + punten behaald — glass floating */}
      <div style={{
        display: "flex", gap: 10, padding: "10px 14px", flexShrink: 0,
        background: "rgba(10, 27, 54, 0.45)",
        backdropFilter: "blur(14px) saturate(130%)",
        WebkitBackdropFilter: "blur(14px) saturate(130%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 14, padding: "8px 12px",
        }}>
          <span style={{ fontSize: "1.2rem" }}>🗺️</span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
              {(kmAfgelegd / 1000).toFixed(2)}
            </div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>km gelopen</div>
          </div>
        </div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 14, padding: "8px 12px",
        }}>
          <span style={{ fontSize: "1.2rem" }}>⭐</span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>{verwerktIds.size}</div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>punten behaald</div>
          </div>
        </div>
      </div>

      {/* GPS / realtime toast — floating pill over de kaart */}
      {!realtimeVerbonden && (
        <div style={{
          position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, whiteSpace: "nowrap",
          background: "rgba(234, 179, 8, 0.85)", backdropFilter: "blur(10px)",
          color: "#fff", padding: "7px 18px",
          borderRadius: 30, fontSize: "0.78rem", fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>
          ⚠️ Live verbinding onderbroken…
        </div>
      )}
      {gpsStatus === "laden" && (
        <div style={{
          position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, whiteSpace: "nowrap",
          background: "rgba(6, 182, 212, 0.8)", backdropFilter: "blur(10px)",
          color: "#fff", padding: "7px 18px",
          borderRadius: 30, fontSize: "0.78rem", fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>
          📡 GPS-signaal ophalen…
        </div>
      )}
      {gpsStatus === "zwak" && (
        <div style={{
          position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, whiteSpace: "nowrap",
          background: "rgba(234, 179, 8, 0.85)", backdropFilter: "blur(10px)",
          color: "#fff", padding: "7px 18px",
          borderRadius: 30, fontSize: "0.78rem", fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>
          ⚠️ GPS-nauwkeurigheid te laag — ga naar buiten
        </div>
      )}
      {gpsStatus === "weg" && (
        <div style={{
          position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, whiteSpace: "nowrap",
          background: "rgba(239, 68, 68, 0.85)", backdropFilter: "blur(10px)",
          color: "#fff", padding: "7px 18px",
          borderRadius: 30, fontSize: "0.78rem", fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>
          ❌ GPS-verbinding weg
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
            className="btn btn-game"
            onClick={controleerLocatie}
            style={{
              position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%) translateY(-2px)",
              zIndex: 1000, whiteSpace: "nowrap",
              padding: "14px 28px", borderRadius: 30, fontSize: "0.95rem",
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
