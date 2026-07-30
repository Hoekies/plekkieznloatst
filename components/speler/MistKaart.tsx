"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { haversine, mistCellenBinnenStraal, MIST_MAX_SNELHEID_KMH } from "@/lib/geo";
import { speelPuntBereikt } from "@/lib/sounds";
import VraagPopup from "./VraagPopup";
import type { RoutePunt, SpelerPuntVoortgang, SpelerSessie } from "@/types/database";
import type { LeaderboardEntry } from "@/lib/types";

const MistLeaflet = dynamic(() => import("./MistLeaflet"), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      Mistkaart laden…
    </div>
  ),
});

interface Props {
  sessie: SpelerSessie;
  startLocatie: { lat: number; lng: number } | null;
  mistM2PerSter: number;
  initVoortgang: { cellen: { cell_x: number; cell_y: number }[]; totaalM2: number; score: number };
  punten: RoutePunt[];
  initPuntVoortgang: SpelerPuntVoortgang[];
}

type GpsStatus = "laden" | "ok" | "zwak" | "weg";

const GPS_TIMEOUT_MS = 12000;
const SLECHTE_NAUWKEURIGHEID_M = 30;
const ONTHUL_INTERVAL_MS = 15000;
const MIN_SNELHEID_INTERVAL_S = 4;

export default function MistKaart({ sessie, startLocatie, mistM2PerSter, initVoortgang, punten, initPuntVoortgang }: Props) {
  const router = useRouter();
  const [positie, setPositie] = useState<GeolocationCoordinates | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("laden");
  const [cellen, setCellen] = useState(initVoortgang.cellen);
  const [totaalM2, setTotaalM2] = useState(initVoortgang.totaalM2);
  const [score, setScore] = useState(initVoortgang.score);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gestopt, setGestopt] = useState(false);
  const [puntVoortgang, setPuntVoortgang] = useState<SpelerPuntVoortgang[]>(initPuntVoortgang);
  const [popupPunt, setPopupPunt] = useState<RoutePunt | null>(null);

  const positieRef = useRef<GeolocationCoordinates | null>(null);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const onthulTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locatieTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const celSetRef = useRef<Set<string>>(new Set(initVoortgang.cellen.map((c) => `${c.cell_x},${c.cell_y}`)));
  const vorigePositieRef = useRef<{ lat: number; lng: number; tijd: number } | null>(null);
  const snelheidOkRef = useRef(true);
  const bezigPuntRef = useRef(false);

  const bereikteOfVerwerkteIds = new Set(puntVoortgang.map((v) => v.route_point_id));

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

  // Periodiek: mist onthullen (server) + locatie publiceren (voor admin's live kaart)
  useEffect(() => {
    onthulTimerRef.current = setInterval(() => { if (positieRef.current) onthulMist(positieRef.current); }, ONTHUL_INTERVAL_MS);
    locatieTimerRef.current = setInterval(() => { if (positieRef.current) publiceerLocatie(positieRef.current); }, ONTHUL_INTERVAL_MS);
    return () => {
      if (onthulTimerRef.current) clearInterval(onthulTimerRef.current);
      if (locatieTimerRef.current) clearInterval(locatieTimerRef.current);
    };
  // onthulMist/publiceerLocatie gebruiken enkel de stabiele positieRef, niet reactieve state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Einde detecteren: admin heeft de route gestopt → sessie wordt voltooid
  useEffect(() => {
    const supabase = createClient();
    const kanaal = supabase
      .channel(`mist-sessie-${sessie.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "player_sessions", filter: `id=eq.${sessie.id}` }, (payload) => {
        if ((payload.new as { status: string }).status === "voltooid") {
          setGestopt(true);
          haalLeaderboardOp();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(kanaal); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessie.id]);

  function resetGpsTimeout() {
    if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
    gpsTimeoutRef.current = setTimeout(() => setGpsStatus("weg"), GPS_TIMEOUT_MS);
  }

  function onPositieUpdate(pos: GeolocationPosition) {
    resetGpsTimeout();
    positieRef.current = pos.coords;
    setPositie(pos.coords);
    setGpsStatus(pos.coords.accuracy <= SLECHTE_NAUWKEURIGHEID_M ? "ok" : "zwak");

    // Snelheid bepalen t.o.v. de vorige (voldoende oude) positie — boven wandeltempo telt mist wegspelen niet mee.
    const vorige = vorigePositieRef.current;
    const nu = pos.timestamp;
    if (!vorige) {
      vorigePositieRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, tijd: nu };
    } else {
      const tijdS = (nu - vorige.tijd) / 1000;
      if (tijdS >= MIN_SNELHEID_INTERVAL_S) {
        const afstandM = haversine(vorige.lat, vorige.lng, pos.coords.latitude, pos.coords.longitude);
        snelheidOkRef.current = (afstandM / tijdS) * 3.6 <= MIST_MAX_SNELHEID_KMH;
        vorigePositieRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, tijd: nu };
      }
    }

    // Vraagpunt-detectie: elk niet-bereikt vraagpunt binnen bereik triggert automatisch.
    if (!bezigPuntRef.current && !popupPunt) {
      for (const punt of punten) {
        if (bereikteOfVerwerkteIds.has(punt.id)) continue;
        const afstand = haversine(pos.coords.latitude, pos.coords.longitude, punt.latitude, punt.longitude);
        if (afstand <= punt.radius_meters) { markeerBereikt(punt); break; }
      }
    }

    if (!snelheidOkRef.current) return; // te snel bewogen — mist blijft liggen

    // Meteen lokaal onthullen voor directe visuele feedback, los van de periodieke serverronde.
    const nieuw = mistCellenBinnenStraal(pos.coords.latitude, pos.coords.longitude);
    const toegevoegd: { cell_x: number; cell_y: number }[] = [];
    nieuw.forEach((c) => {
      const key = `${c.x},${c.y}`;
      if (!celSetRef.current.has(key)) {
        celSetRef.current.add(key);
        toegevoegd.push({ cell_x: c.x, cell_y: c.y });
      }
    });
    if (toegevoegd.length > 0) setCellen((prev) => [...prev, ...toegevoegd]);
  }

  async function markeerBereikt(punt: RoutePunt) {
    if (bezigPuntRef.current) return;
    bezigPuntRef.current = true;
    try {
      const res = await fetch("/api/speler/voortgang/bereik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_point_id: punt.id }),
      });
      if (res.ok) {
        const nieuweVoortgang: SpelerPuntVoortgang = await res.json();
        setPuntVoortgang((v) => [...v, nieuweVoortgang]);
        speelPuntBereikt();
        setPopupPunt(punt);
      }
    } finally {
      bezigPuntRef.current = false;
    }
  }

  function puntVerwerkt(bijgewerkt: SpelerPuntVoortgang) {
    setPuntVoortgang((v) =>
      v.some((vp) => vp.route_point_id === bijgewerkt.route_point_id)
        ? v.map((vp) => vp.route_point_id === bijgewerkt.route_point_id ? bijgewerkt : vp)
        : [...v, bijgewerkt]
    );
    setPopupPunt(null);
    if (bijgewerkt.points_awarded > 0) setScore((s) => s + bijgewerkt.points_awarded);
  }

  async function onthulMist(coords: GeolocationCoordinates) {
    try {
      const res = await fetch("/api/speler/mist/onthul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.latitude, lng: coords.longitude }),
      });
      if (res.status === 403) { router.push("/speler"); return; }
      if (res.ok) {
        const data = await res.json();
        setTotaalM2(data.totaalM2);
        setScore(data.score);
      }
    } catch { /* verbindingsfout */ }
  }

  async function publiceerLocatie(coords: GeolocationCoordinates) {
    try {
      await fetch("/api/speler/locatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      });
    } catch { /* verbindingsfout */ }
  }

  async function haalLeaderboardOp() {
    try {
      const res = await fetch("/api/speler/mist-leaderboard");
      if (res.ok) setLeaderboard((await res.json()).leaderboard ?? []);
    } catch { /* verbindingsfout */ }
  }

  const m2TotVolgendeSter = mistM2PerSter - (totaalM2 % mistM2PerSter);
  const voortgangPct = Math.min(100, Math.round(((totaalM2 % mistM2PerSter) / mistM2PerSter) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>

      {/* Statistiekenbalk */}
      <div style={{
        display: "flex", gap: 10, padding: "10px 14px", flexShrink: 0,
        background: "rgba(10, 27, 54, 0.45)",
        backdropFilter: "blur(14px) saturate(130%)",
        WebkitBackdropFilter: "blur(14px) saturate(130%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        alignItems: "center",
      }}>
        <div className="pr-hud-gem pr-hud-gem--orange" style={{ flex: 1 }}>
          <span style={{ fontSize: "1.2rem" }}>⭐</span>
          <span className="pr-hud-value" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>{score}</span>
        </div>
        <div className="pr-hud-gem pr-hud-gem--purple" style={{ flex: 2 }}>
          <span style={{ fontSize: "0.95rem" }}>🌫️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)" }}>nog {m2TotVolgendeSter} m² tot ⭐</div>
            <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.15)", overflow: "hidden", marginTop: 2 }}>
              <div style={{ height: "100%", width: `${voortgangPct}%`, background: "linear-gradient(90deg, var(--pr-gold), var(--pr-orange))" }} />
            </div>
          </div>
        </div>
        <button
          onClick={() => { setLeaderboardOpen(true); haalLeaderboardOp(); }}
          title="Leaderboard"
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(180deg, #ffc24a 0%, var(--pr-orange) 48%, #e35d00 50%, #c44900 100%)",
            border: "2px solid #000", color: "#fff", fontSize: "1.1rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), 0 3px 0 #8a3300, 0 5px 10px rgba(0,0,0,0.4)",
          }}>
          🏆
        </button>
      </div>

      {/* GPS toasts */}
      {gpsStatus === "laden" && (
        <div style={{ position: "absolute", top: 74, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(6, 182, 212, 0.8)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          📡 GPS-signaal ophalen…
        </div>
      )}
      {gpsStatus === "zwak" && (
        <div style={{ position: "absolute", top: 74, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(234, 179, 8, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ⚠️ GPS-nauwkeurigheid te laag — ga naar buiten
        </div>
      )}
      {gpsStatus === "weg" && (
        <div style={{ position: "absolute", top: 74, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(239, 68, 68, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ❌ GPS-verbinding weg
        </div>
      )}

      {/* Kaart */}
      <div style={{ flex: 1, position: "relative" }}>
        <MistLeaflet
          positie={positie}
          cellen={cellen}
          startLocatie={startLocatie}
          punten={punten}
          bereikteOfVerwerkteIds={bereikteOfVerwerkteIds}
          verwerkteIds={new Set(puntVoortgang.filter((v) => v.answered_at).map((v) => v.route_point_id))}
        />
      </div>

      {popupPunt && <VraagPopup punt={popupPunt} onVerwerkt={puntVerwerkt} />}

      {/* Leaderboard-modal */}
      {leaderboardOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setLeaderboardOpen(false)}>
          <div style={{
            background: "#0f1c2e", color: "#e8f0ff", borderRadius: 18, padding: 24,
            maxWidth: 420, width: "100%", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#00d9ff" }}>🏆 Leaderboard</h2>
              <button onClick={() => setLeaderboardOpen(false)} style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#e8f0ff", fontWeight: 700 }}>✕</button>
            </div>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#6b84a8", fontSize: "0.85rem" }}>Nog geen scores beschikbaar.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {leaderboard.map((entry) => (
                  <div key={entry.rank} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12,
                    background: entry.is_eigen_team ? "rgba(0,217,255,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${entry.is_eigen_team ? "#00d9ff" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    <span style={{ fontSize: "1.2rem", width: 26, textAlign: "center" }}>{["🥇", "🥈", "🥉"][entry.rank - 1] ?? `${entry.rank}.`}</span>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: "0.9rem", color: entry.is_eigen_team ? "#00d9ff" : "#e8f0ff" }}>
                      {entry.display_name}{entry.is_eigen_team && " (jij)"}
                    </div>
                    <div style={{ fontWeight: 800, color: entry.is_eigen_team ? "#00d9ff" : "#e8f0ff" }}>
                      {entry.score} <span style={{ fontWeight: 400, fontSize: "0.72rem", color: "#6b84a8" }}>⭐</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spel gestopt door admin */}
      {gestopt && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2500,
          background: "linear-gradient(160deg, #2f1769 0%, #1c0c45 70%, #150a36 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "#fff", gap: 16, padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: "3.5rem" }}>🏁</div>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Spel gestopt!</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>Eindstand: {score} ⭐ · {totaalM2} m² mist weggespeeld</p>
          <button className="btn-premium" style={{ width: "auto", padding: "12px 28px" }} onClick={() => { setLeaderboardOpen(true); }}>
            🏆 Bekijk leaderboard
          </button>
        </div>
      )}
    </div>
  );
}
