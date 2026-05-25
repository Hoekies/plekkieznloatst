"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { haversine } from "@/lib/geo";
import { createClient } from "@/lib/supabase-browser";
import { speelPuntBereikt, speelFinish } from "@/lib/sounds";
import VraagPopup from "./VraagPopup";
import SpeciaalItemPopup from "./SpeciaalItemPopup";
import SpeciaalItemLegende from "./SpeciaalItemLegende";
import InventarisBar from "./InventarisBar";
import type { SpelerLocatie } from "@/lib/types";
import type { RoutePunt, SpelerSessie, SpelerPuntVoortgang, SpeciaalItem } from "@/types/database";

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

const ITEM_LABEL: Record<string, string> = {
  spook: "👻 Spook", bom: "💣 Bom", ster: "⭐ Ster",
  verdubbeling: "🔴 Verdubbeling", wissel: "🔄 Wissel",
  dief: "🦹 Dief", radar: "📡 Radar",
};

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
  const [broadcastBericht, setBroadcastBericht] = useState<string | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [specialeItems, setSpecialeItems] = useState<SpeciaalItem[]>([]);
  const [inventaris, setInventaris] = useState<SpeciaalItem[]>([]);
  const [ghostedPuntId, setGhostedPuntId] = useState<string | null>(null);
  const [activeSpeciaalItem, setActiveSpeciaalItem] = useState<SpeciaalItem | null>(null);
  const [effectNotificatie, setEffectNotificatie] = useState<string | null>(null);
  const [opgehaaldToast, setOpgehaaldToast] = useState<string | null>(null);
  const [legendeOpen, setLegendeOpen] = useState(false);
  const effectNotificatieTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opgehaaldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bezigSpeciaalRef = useRef(false);
  const effectNotificatieAtRef = useRef<string | null>(null);

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

  const heeftInventaris = inventaris.length > 0;
  const knoepBottomOffset = heeftInventaris ? 92 : 28;

  useEffect(() => {
    if (bereiktIds.size > 0 && activePunt && bereiktIds.has(activePunt.id) && !popupPunt) {
      setPopupPunt(activePunt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Realtime + initiële data
  useEffect(() => {
    haalAndereSpelersOp();
    haalSpecialeItemsOp();
    haalEffectenOp();
    haalInventarisOp();

    const supabase = createClient();
    const kanaal = supabase
      .channel("locaties-en-broadcasts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_updates" }, () => { haalAndereSpelersOp(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "broadcasts" }, (payload) => {
        const bericht = (payload.new as { bericht: string }).bericht;
        setBroadcastBericht(bericht);
        if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = setTimeout(() => setBroadcastBericht(null), 8000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "special_items" }, () => { haalSpecialeItemsOp(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "special_item_effects" }, () => { haalEffectenOp(); })
      .subscribe((status) => { setRealtimeVerbonden(status === "SUBSCRIBED"); });

    return () => {
      supabase.removeChannel(kanaal);
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
      if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
      if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Puntdetectie bij iedere positiewijziging
  useEffect(() => {
    if (!positie || !activePunt || bereiktIds.has(activePunt.id) || bezigRef.current || popupPunt) return;
    const afstand = haversine(positie.latitude, positie.longitude, activePunt.latitude, activePunt.longitude);
    if (afstand <= activePunt.radius_meters) markeerBereikt(activePunt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positie]);

  // Speciale item detectie bij positiewijziging
  useEffect(() => {
    if (!positie || bezigSpeciaalRef.current) return;
    for (const item of specialeItems) {
      if (item.claimed) continue;
      const afstand = haversine(positie.latitude, positie.longitude, item.latitude, item.longitude);
      if (afstand <= item.radius_meters) {
        claimSpeciaalItem(item);
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positie, specialeItems]);

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

  async function haalSpecialeItemsOp() {
    try {
      const res = await fetch("/api/speler/speciaal");
      if (res.ok) setSpecialeItems(await res.json());
    } catch { /* verbindingsfout */ }
  }

  async function haalInventarisOp() {
    try {
      const res = await fetch("/api/speler/speciaal/inventaris");
      if (res.ok) setInventaris(await res.json());
    } catch { /* verbindingsfout */ }
  }

  async function haalEffectenOp() {
    try {
      const res = await fetch("/api/speler/speciaal/effecten");
      if (!res.ok) return;
      const data = await res.json();
      setGhostedPuntId(data.ghost?.active ? data.ghost.blocked_point_id : null);
      if (data.notification && data.notification_at !== effectNotificatieAtRef.current) {
        effectNotificatieAtRef.current = data.notification_at;
        setEffectNotificatie(data.notification);
        if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
        effectNotificatieTimerRef.current = setTimeout(() => setEffectNotificatie(null), 8000);
      }
    } catch { /* verbindingsfout */ }
  }

  async function claimSpeciaalItem(item: SpeciaalItem) {
    if (bezigSpeciaalRef.current) return;
    bezigSpeciaalRef.current = true;
    try {
      const res = await fetch("/api/speler/speciaal/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ special_item_id: item.id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "geclaimd" && data.item) {
        setSpecialeItems((prev) => prev.map((i) => i.id === item.id ? { ...i, claimed: true } : i));

        if (data.item.type === "ster") {
          // Direct inzetten: punten meteen bijschrijven
          const effectRes = await fetch("/api/speler/speciaal/effect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ special_item_id: data.item.id }),
          });
          const pts = data.item.points_effect > 0 ? `+${data.item.points_effect}` : String(data.item.points_effect);
          if (effectRes.ok) {
            setOpgehaaldToast(`⭐ ${pts} bonuspunten bijgeschreven!`);
          } else {
            setOpgehaaldToast(`⭐ Ster opgehaald!`);
          }
        } else if (data.item.type === "wissel") {
          // Direct popup: meteen team kiezen
          setActiveSpeciaalItem(data.item);
          setOpgehaaldToast(`🔄 Wissel opgehaald — kies een team!`);
        } else {
          setInventaris((prev) => [...prev, data.item]);
          const label = ITEM_LABEL[data.item.type] ?? data.item.type;
          setOpgehaaldToast(`${label} opgehaald!`);
        }

        if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
        opgehaaldTimerRef.current = setTimeout(() => setOpgehaaldToast(null), 3000);
      }
    } finally {
      bezigSpeciaalRef.current = false;
    }
  }

  function inventarisItemGebruikt(itemId: string, eigenNotificatie?: string) {
    setActiveSpeciaalItem(null);
    setInventaris((prev) => {
      const idx = prev.findIndex((i) => i.id === itemId);
      return idx === -1 ? prev : [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    if (eigenNotificatie) {
      setEffectNotificatie(eigenNotificatie);
      if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
      effectNotificatieTimerRef.current = setTimeout(() => setEffectNotificatie(null), 8000);
    }
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
      if (res.status === 423) { bezigRef.current = false; return; }
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

      {/* Statistiekenbalk */}
      <div style={{
        display: "flex", gap: 10, padding: "10px 14px", flexShrink: 0,
        background: "rgba(10, 27, 54, 0.45)",
        backdropFilter: "blur(14px) saturate(130%)",
        WebkitBackdropFilter: "blur(14px) saturate(130%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 14, padding: "8px 12px" }}>
          <span style={{ fontSize: "1.2rem" }}>🗺️</span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{(kmAfgelegd / 1000).toFixed(2)}</div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>km gelopen</div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 14, padding: "8px 12px" }}>
          <span style={{ fontSize: "1.2rem" }}>⭐</span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>{verwerktIds.size}</div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>punten behaald</div>
          </div>
        </div>
      </div>

      {/* GPS / realtime toasts */}
      {!realtimeVerbonden && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(234, 179, 8, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ⚠️ Live verbinding onderbroken…
        </div>
      )}
      {gpsStatus === "laden" && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(6, 182, 212, 0.8)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          📡 GPS-signaal ophalen…
        </div>
      )}
      {gpsStatus === "zwak" && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(234, 179, 8, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ⚠️ GPS-nauwkeurigheid te laag — ga naar buiten
        </div>
      )}
      {gpsStatus === "weg" && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(239, 68, 68, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ❌ GPS-verbinding weg
        </div>
      )}

      {/* Item opgehaald toast */}
      {opgehaaldToast && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(5, 150, 105, 0.9)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.82rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          {opgehaaldToast}
        </div>
      )}

      {/* Broadcast bericht van admin */}
      {broadcastBericht && (
        <div style={{
          position: "absolute", bottom: knoepBottomOffset + 62, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, maxWidth: "calc(100% - 32px)",
          background: "rgba(6, 182, 212, 0.92)", backdropFilter: "blur(10px)",
          color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: "0.85rem", fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ flexShrink: 0 }}>📢</span>
          <span>{broadcastBericht}</span>
          <button onClick={() => setBroadcastBericht(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 4 }}>✕</button>
        </div>
      )}

      {/* Effect notificatie */}
      {effectNotificatie && (
        <div style={{
          position: "absolute",
          bottom: broadcastBericht ? knoepBottomOffset + 117 : knoepBottomOffset + 62,
          left: "50%", transform: "translateX(-50%)",
          zIndex: 900, maxWidth: "calc(100% - 32px)",
          background: "rgba(124, 58, 237, 0.92)", backdropFilter: "blur(10px)",
          color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: "0.85rem", fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>{effectNotificatie}</span>
          <button onClick={() => setEffectNotificatie(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 4 }}>✕</button>
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
          specialeItems={specialeItems}
          ghostedPuntId={ghostedPuntId}
        />

        {/* Controleer locatie-knop */}
        {activePunt && !bereiktIds.has(activePunt.id) && !popupPunt && gpsStatus !== "laden" && (
          <button
            onClick={controleerLocatie}
            title="Controleer locatie"
            style={{
              position: "absolute", bottom: knoepBottomOffset, left: 16,
              zIndex: 1000,
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(30,64,175,0.9)", border: "none",
              boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
              fontSize: "22px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            📍
          </button>
        )}

        {/* Legende knop */}
        <button
          onClick={() => setLegendeOpen(true)}
          title="Wat doen de speciale items?"
          style={{
            position: "absolute", bottom: knoepBottomOffset, right: 16,
            zIndex: 1000,
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.9)", border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "20px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          ℹ️
        </button>

        {/* Inventaris balk onderin de kaart */}
        <InventarisBar inventaris={inventaris} onGebruik={(item) => setActiveSpeciaalItem(item)} />
      </div>

      {/* Punt bereikt → vraag/info popup */}
      {popupPunt && (
        <VraagPopup punt={popupPunt} onVerwerkt={puntVerwerkt} />
      )}

      {/* Speciaal item gebruiken */}
      {activeSpeciaalItem && (
        <SpeciaalItemPopup
          item={activeSpeciaalItem}
          andereSessies={andereSpelers.map((s) => ({ session_id: s.session_id, group_name: s.group_name }))}
          onVerwerkt={inventarisItemGebruikt}
        />
      )}

      {/* Speciale items legende */}
      {legendeOpen && (
        <SpeciaalItemLegende onSluit={() => setLegendeOpen(false)} />
      )}
    </div>
  );
}
