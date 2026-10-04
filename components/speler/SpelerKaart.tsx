"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { haversine } from "@/lib/geo";
import { createClient } from "@/lib/supabase-browser";
import { speelPuntBereikt, speelFinish, speelDong } from "@/lib/sounds";
import VraagPopup from "./VraagPopup";
import SpeciaalItemPopup from "./SpeciaalItemPopup";
import SpeciaalItemLegende, { ITEM_INFO, SPELUITLEG, START_AFSLUITING, type RouteWaarden } from "./SpeciaalItemLegende";

// Na het welkomstscherm op het startpunt: zoveel meter lopen voordat de startvraag komt
const STARTVRAAG_NA_METER = 25;
import InventarisBar from "./InventarisBar";
import TussenstandPopup from "./TussenstandPopup";
import type { SpelerLocatie, LeaderboardEntry } from "@/lib/types";
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
  modus: "sequentieel" | "verspreid";
  waarden: RouteWaarden;
}

type GpsStatus = "laden" | "ok" | "zwak" | "weg";

const GPS_TIMEOUT_MS = 12000;

// Het emoji waarmee een aanvalsmelding begint → item-icoon in /items
const MELDING_ITEM_TYPE: Record<string, string> = {
  "👻": "spook", "💣": "bom", "🔄": "wissel", "🦹": "dief", "🍌": "banaan", "❓": "vraagteken",
};
const SLECHTE_NAUWKEURIGHEID_M = 30;
const LOCATIE_PUBLICEER_INTERVAL_MS = 15000;


// Getal in de statistiekhokjes zo groot mogelijk; bij meer cijfers iets kleiner zodat het past
function hudGetalGrootte(tekst: string): string {
  if (tekst.length <= 4) return "1.85rem";
  if (tekst.length === 5) return "1.6rem";
  return "1.35rem";
}

export default function SpelerKaart({ sessie, punten, initVoortgang, modus, waarden }: Props) {
  const router = useRouter();
  const effectGezienKey = `pointrush_effect_gezien_${sessie.id}`;
  const [voortgang, setVoortgang] = useState<SpelerPuntVoortgang[]>(initVoortgang);
  const [positie, setPositie] = useState<GeolocationCoordinates | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("laden");
  const [popupPunt, setPopupPunt] = useState<RoutePunt | null>(null);
  // Startvraag: afgelegde meters op het moment dat het team "Op pad!" tikte (null = niet aan het wachten)
  const [startVraagVanaf, setStartVraagVanaf] = useState<number | null>(null);
  const [startVraagKlaar, setStartVraagKlaar] = useState(false);
  const [andereSpelers, setAndereSpelers] = useState<SpelerLocatie[]>([]);
  const [realtimeVerbonden, setRealtimeVerbonden] = useState(true);

  const [kmAfgelegd, setKmAfgelegd] = useState(0);
  const [broadcastBericht, setBroadcastBericht] = useState<string | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [specialeItems, setSpecialeItems] = useState<SpeciaalItem[]>([]);
  const [inventaris, setInventaris] = useState<SpeciaalItem[]>([]);
  const [legendeItems, setLegendeItems] = useState<SpeciaalItem[]>([]);
  const [ghostTot, setGhostTot] = useState<number | null>(null);
  const [ghostSecondsLeft, setGhostSecondsLeft] = useState(0);
  const gehadPlekzooiRef = useRef<Set<string>>(new Set());
  const [opgepakt, setOpgepakt] = useState<{ item: SpeciaalItem; extra: string } | null>(null);
  const [hulpOpen, setHulpOpen] = useState(false);
  const hulpIdRef = useRef<string | null>(null);
  const [activeSpeciaalItem, setActiveSpeciaalItem] = useState<SpeciaalItem | null>(null);
  const [effectNotificatie, setEffectNotificatie] = useState<string | null>(null);
  const [opgehaaldToast, setOpgehaaldToast] = useState<string | null>(null);
  const [legendeOpen, setLegendeOpen] = useState(false);
  const [score, setScore] = useState(sessie.score);
  const [plekzooiActief, setPlekzooiActief] = useState(false);
  const [plekzooiSecondsLeft, setPlekzooiSecondsLeft] = useState(0);
  const [tussenstand, setTussenstand] = useState<LeaderboardEntry[] | null>(null);
  const [tussenstandResterend, setTussenstandResterend] = useState(0);
  const tussenstandActiefRef = useRef(false);
  const effectNotificatieTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opgehaaldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plekzooiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bezigSpeciaalRef = useRef(false);
  const effectNotificatieAtRef = useRef<string | null>(null);

  const bezigRef = useRef(false);
  const positieRef = useRef<GeolocationCoordinates | null>(null);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locatieTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radarPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vorigePositieRef = useRef<GeolocationCoordinates | null>(null);
  const kmAfgelegdRef = useRef(0);

  // Afgeleid uit voortgang
  const verwerktIds = new Set(voortgang.filter((v) => v.answered_at).map((v) => v.route_point_id));
  const bereiktIds = new Set(voortgang.filter((v) => v.reached_at && !v.answered_at).map((v) => v.route_point_id));
  const activePunt = punten[verwerktIds.size] ?? null;
  const spelAfgelopen = verwerktIds.size >= punten.length;

  // Verspreid: het eerste punt is het startpunt (start en finish op dezelfde plek)
  const startPunt = modus === "verspreid" && punten.length >= 3 ? punten[0] : null;
  const wachtOpStartVraag = startVraagVanaf !== null;
  const nogTeLopen = wachtOpStartVraag ? Math.max(0, Math.ceil(STARTVRAAG_NA_METER - (kmAfgelegd - startVraagVanaf))) : 0;

  // 25 meter gelopen na het welkomstscherm → de vraag van het startpunt verschijnt
  useEffect(() => {
    if (startVraagVanaf === null || !startPunt) return;
    if (kmAfgelegd - startVraagVanaf >= STARTVRAAG_NA_METER) {
      setStartVraagVanaf(null);
      setStartVraagKlaar(true);
      speelPuntBereikt();
      setPopupPunt(startPunt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kmAfgelegd, startVraagVanaf]);

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
  // publiceerLocatie gebruikt enkel het meegegeven coords-argument + de stabiele router-ref/kmAfgelegdRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime + initiële data
  useEffect(() => {
    // Al getoonde aanval niet opnieuw laten piepen na herladen van de pagina
    try { effectNotificatieAtRef.current = localStorage.getItem(effectGezienKey); } catch { /* geen opslag */ }
    haalAndereSpelersOp();
    haalSpecialeItemsOp();
    haalEffectenOp();
    haalInventarisOp();
    haalScoreOp();
    haalHulpOp();
    // Realtime mist soms een update; zo verdwijnt een item dat een ander team pakte binnen 5s
    const itemsTimer = setInterval(() => haalSpecialeItemsOp(), 5000);
    const sessieCheckTimer = setInterval(() => haalScoreOp(), 30 * 1000);
    // Realtime mist soms een event; pollen zorgt dat een aanval altijd binnen 5s binnenkomt
    const effectenTimer = setInterval(() => haalEffectenOp(), 5000);

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "special_item_effects" }, () => { haalEffectenOp(); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "player_sessions", filter: `id=eq.${sessie.id}` }, () => {
        router.push("/speler");
      })
      .subscribe((status) => { setRealtimeVerbonden(status === "SUBSCRIBED"); });

    return () => {
      supabase.removeChannel(kanaal);
      clearInterval(itemsTimer);
      clearInterval(sessieCheckTimer);
      clearInterval(effectenTimer);
      if (radarPollRef.current) clearInterval(radarPollRef.current);
      if (plekzooiTimerRef.current) clearInterval(plekzooiTimerRef.current);
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
      if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
      if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Openstaande melding "punt niet bereikbaar": elke 5s kijken of de organisatie al gereageerd heeft
  useEffect(() => {
    if (!hulpOpen) return;
    const timer = setInterval(haalHulpOp, 5000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hulpOpen]);

  // Spook: aftellen tot het verborgen punt weer terugkomt
  useEffect(() => {
    if (!ghostTot) return;
    const tik = () => {
      const rem = Math.max(0, Math.ceil((ghostTot - Date.now()) / 1000));
      setGhostSecondsLeft(rem);
      if (rem <= 0) setGhostTot(null);
    };
    tik();
    const timer = setInterval(tik, 1000);
    return () => clearInterval(timer);
  }, [ghostTot]);

  // Puntdetectie bij iedere positiewijziging
  useEffect(() => {
    if (!positie || !activePunt || bereiktIds.has(activePunt.id) || bezigRef.current || popupPunt || plekzooiActief || ghostTot) return;
    const afstand = haversine(positie.latitude, positie.longitude, activePunt.latitude, activePunt.longitude);
    if (afstand <= activePunt.radius_meters) markeerBereikt(activePunt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positie]);

  // Speciale item detectie bij positiewijziging
  useEffect(() => {
    if (!positie || bezigSpeciaalRef.current || plekzooiActief) return;
    for (const item of specialeItems) {
      if (item.claimed || gehadPlekzooiRef.current.has(item.id)) continue;
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

  // Tussenstand-poll: elke 3s checken of admin de tussenstand nu toont
  useEffect(() => {
    haalTussenstandOp();
    const timer = setInterval(haalTussenstandOp, 3000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (!res.ok) return;
      const items: SpeciaalItem[] = await res.json();
      setSpecialeItems(items);
      // Uitleg (ℹ️) onthoudt elk itemtype dat ooit in de route zat, ook na oppakken of respawn
      setLegendeItems((prev) => {
        const bekend = new Set(prev.map((i) => i.type));
        const nieuw = items.filter((i) => !bekend.has(i.type) && bekend.add(i.type));
        return nieuw.length > 0 ? [...prev, ...nieuw] : prev;
      });
    } catch { /* verbindingsfout */ }
  }

  async function haalInventarisOp() {
    try {
      const res = await fetch("/api/speler/speciaal/inventaris");
      if (res.ok) setInventaris(await res.json());
    } catch { /* verbindingsfout */ }
  }

  async function haalScoreOp() {
    try {
      const res = await fetch("/api/speler/sessie");
      if (res.status === 403) { router.push("/speler"); return; }
      if (res.ok) {
        const data = await res.json();
        if (data === null) { router.push("/speler"); return; }
        if (data?.score !== undefined) setScore(data.score);
      }
    } catch { /* verbindingsfout */ }
  }

  async function haalHulpOp() {
    try {
      const res = await fetch("/api/speler/hulp");
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "open") {
        hulpIdRef.current = data.id;
        setHulpOpen(true);
        return;
      }
      // Alleen reageren op een melding die we in deze sessie open hebben zien staan
      if (!hulpIdRef.current || data.id !== hulpIdRef.current) return;
      hulpIdRef.current = null;
      setHulpOpen(false);
      if (data.status === "toegekend") {
        // Punt is vrijgegeven: herladen zet het als bereikt en opent de vraag
        speelPuntBereikt();
        window.location.reload();
      } else if (data.status === "genegeerd") {
        setEffectNotificatie("📨 De organisatie heeft je melding bekeken: probeer het punt toch te bereiken.");
      }
    } catch { /* verbindingsfout */ }
  }

  async function meldOnbereikbaar() {
    if (!confirm("Kunnen jullie het volgende punt echt niet bereiken, bijvoorbeeld omdat het afgesloten of onveilig is?\n\nDan krijgt de organisatie een melding en kan die het punt voor jullie vrijgeven.")) return;
    try {
      const res = await fetch("/api/speler/hulp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setOpgehaaldToast(data.fout ?? "Melden lukte niet, probeer het opnieuw.");
      } else {
        hulpIdRef.current = data.id;
        setHulpOpen(true);
        setOpgehaaldToast("📨 De organisatie is gewaarschuwd");
      }
      if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
      opgehaaldTimerRef.current = setTimeout(() => setOpgehaaldToast(null), 3500);
    } catch { /* verbindingsfout */ }
  }

  function activeerPlekzooi(verlooptOp: Date) {
    const remaining = Math.max(0, Math.floor((verlooptOp.getTime() - Date.now()) / 1000));
    if (remaining <= 0) return;
    setPlekzooiActief(true);
    setPlekzooiSecondsLeft(remaining);
    if (plekzooiTimerRef.current) clearInterval(plekzooiTimerRef.current);
    plekzooiTimerRef.current = setInterval(() => {
      const rem = Math.max(0, Math.floor((verlooptOp.getTime() - Date.now()) / 1000));
      setPlekzooiSecondsLeft(rem);
      if (rem <= 0) {
        clearInterval(plekzooiTimerRef.current!);
        plekzooiTimerRef.current = null;
        setPlekzooiActief(false);
      }
    }, 1000);
  }

  async function haalEffectenOp() {
    try {
      const res = await fetch("/api/speler/speciaal/effecten");
      if (!res.ok) return;
      const data = await res.json();
      setGhostTot(data.ghost?.active && data.ghost.expires_at ? new Date(data.ghost.expires_at).getTime() : null);
      if (data.notification && data.notification_at !== effectNotificatieAtRef.current) {
        effectNotificatieAtRef.current = data.notification_at;
        try { localStorage.setItem(effectGezienKey, data.notification_at); } catch { /* geen opslag */ }
        // Aanval: blijft staan tot het team hem zelf wegklikt
        if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
        setEffectNotificatie(data.notification);
        speelDong();
        navigator.vibrate?.([300, 120, 300, 120, 300]);
        haalScoreOp();
        // Banaan: de puntvolgorde is op de server omgewisseld — kaart opnieuw laden met de nieuwe volgorde
        if (data.notification.startsWith("🍌")) router.refresh();
      }

      // Plek zooi actief: herstel afteltimer bij herverbinding
      if (data.plekzooi?.active && data.plekzooi.expires_at) {
        activeerPlekzooi(new Date(data.plekzooi.expires_at));
      }

      // Radar actief: poll andere spelers elke 5 seconden
      if (data.radar?.active) {
        if (!radarPollRef.current) {
          radarPollRef.current = setInterval(() => haalAndereSpelersOp(), 5000);
        }
      } else {
        if (radarPollRef.current) {
          clearInterval(radarPollRef.current);
          radarPollRef.current = null;
        }
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

      // Plek zooi blijft liggen voor andere teams; dit team kan hem maar één keer raken
      if (data.status === "plekzooi" || data.status === "al_gehad") {
        gehadPlekzooiRef.current.add(item.id);
        if (data.status === "plekzooi" && data.expires_at) activeerPlekzooi(new Date(data.expires_at));
        return;
      }

      if (data.status === "geclaimd" && data.item) {
        setSpecialeItems((prev) => prev.map((i) => i.id === item.id ? { ...i, claimed: true } : i));

        speelPuntBereikt();
        if (data.item.type === "ster") {
          // Direct inzetten: punten meteen bijschrijven
          const effectRes = await fetch("/api/speler/speciaal/effect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ special_item_id: data.item.id }),
          });
          if (effectRes.ok) {
            setScore((prev) => prev + data.item.points_effect);
            haalScoreOp();
          }
          setOpgepakt({ item: data.item, extra: effectRes.ok ? "De bonuspunten staan al op je score!" : "De bonuspunten komen eraan." });
        } else if (data.item.type === "wissel") {
          setInventaris((prev) => [...prev, data.item]);
          setOpgepakt({ item: data.item, extra: "Kies zo meteen met welk team je van score wisselt." });
        } else {
          setInventaris((prev) => [...prev, data.item]);
          setOpgepakt({ item: data.item, extra: "Staat in je balk onderin — tik erop wanneer je hem wilt inzetten." });
        }
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
      const res = await fetch("/api/speler/locatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy,
          afstandM: kmAfgelegdRef.current,
        }),
      });
      if (res.status === 403) router.push("/speler");
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
        kmAfgelegdRef.current += d;
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
    setStartVraagKlaar(false);
    haalScoreOp();
  }

  function bewaarItemVoorLater() {
    setActiveSpeciaalItem(null);
  }

  async function haalTussenstandOp() {
    try {
      const res = await fetch("/api/speler/tussenstand");
      if (!res.ok) return;
      const data = await res.json();
      if (data.zichtbaar) {
        if (!tussenstandActiefRef.current) {
          tussenstandActiefRef.current = true;
          setTussenstand(data.tussenstand);
          setTussenstandResterend(data.resterende_seconden);
        }
      } else {
        tussenstandActiefRef.current = false;
      }
    } catch { /* verbindingsfout */ }
  }

  function sluitTussenstand() {
    setTussenstand(null);
  }

  function controleerLocatie() {
    if (!positie || !activePunt || bereiktIds.has(activePunt.id) || popupPunt || plekzooiActief) return;
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
        alignItems: "center",
      }}>
        <div className="pr-hud-gem pr-hud-gem--purple pr-hud-gem--groot">
          <span className="pr-hud-icoon">🗺️</span>
          <span className="pr-hud-getal" style={{ fontSize: hudGetalGrootte((kmAfgelegd / 1000).toFixed(2)) }}>{(kmAfgelegd / 1000).toFixed(2)}</span>
        </div>
        <div className="pr-hud-gem pr-hud-gem--orange pr-hud-gem--groot">
          <span className="pr-hud-icoon">⭐</span>
          <span className="pr-hud-getal" style={{ fontSize: hudGetalGrootte(String(score)) }}>{score}</span>
        </div>
        <button
          onClick={() => setLegendeOpen(true)}
          title="Wat doen de speciale items?"
          style={{
            position: "relative", overflow: "hidden",
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(180deg, #ffc24a 0%, var(--pr-orange) 48%, #e35d00 50%, #c44900 100%)",
            border: "2px solid #000",
            color: "#fff", fontSize: "1rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontFamily: "var(--font-display)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), 0 3px 0 #8a3300, 0 5px 10px rgba(0,0,0,0.4)",
          }}>
          i
        </button>
      </div>

      {/* Na het welkomstscherm: eerst 25 meter lopen voor de startvraag */}
      {wachtOpStartVraag && (
        <div style={{
          position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 950,
          maxWidth: "calc(100% - 32px)", width: "max-content",
          background: "rgba(124,58,237,0.95)", color: "#fff", padding: "12px 20px", borderRadius: 16,
          fontSize: "0.95rem", fontWeight: 700, textAlign: "center", boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
        }}>
          🚶 Loop nog {nogTeLopen} meter, dan krijg je je eerste vraag!
        </div>
      )}

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
        <div style={{
          position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, maxWidth: "calc(100% - 32px)", width: "max-content",
          background: "rgba(5, 150, 105, 0.95)", backdropFilter: "blur(12px)",
          color: "#fff", padding: "14px 22px", borderRadius: 16,
          fontSize: "1rem", fontWeight: 700, boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", gap: 10, textAlign: "center",
          border: "1px solid rgba(255,255,255,0.25)",
        }}>
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
      {effectNotificatie && (() => {
        // Meldingen beginnen met het emoji van het item (of 📨 van de organisatie): toon dat groot als icoon
        const [eerste, ...rest] = effectNotificatie.split(" ");
        const itemType = MELDING_ITEM_TYPE[eerste];
        const isIcoon = !!itemType || /\p{Extended_Pictographic}/u.test(eerste);
        const tekst = isIcoon ? rest.join(" ") : effectNotificatie;
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1600,
            background: "rgba(12,3,34,0.72)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div className="pr-panel" style={{ maxWidth: 360, width: "100%", animation: "pr-effect-pop 0.4s ease" }}>
              <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", paddingTop: 22 }}>
                {itemType ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/items/${itemType}.png`} alt="" style={{ width: 110, height: 110, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))" }} />
                ) : (
                  <span style={{ fontSize: "4rem", lineHeight: 1 }}>{isIcoon ? eerste : "🚨"}</span>
                )}
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.35rem", color: "var(--pr-gold)" }}>
                  {itemType ? "Let op!" : "Bericht"}
                </div>
                <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.45, color: "#fff", fontWeight: 600 }}>
                  {tekst}
                </p>
                <button className="btn-premium--compact" style={{ marginTop: 4 }} onClick={() => setEffectNotificatie(null)}>
                  OK, BEGREPEN
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Kaart */}
      <div style={{ flex: 1, position: "relative" }}>
        <SpelerLeaflet
          positie={positie}
          punten={punten}
          verwerktIds={verwerktIds}
          bereiktIds={bereiktIds}
          activePuntId={wachtOpStartVraag ? null : activePunt?.id ?? null}
          andereSpelers={andereSpelers}
          specialeItems={specialeItems.filter((i) => i.type !== "plekzooi")}
          ghostedPuntId={ghostTot ? activePunt?.id ?? null : null}
        />

        {/* Controleer locatie-knop */}
        {activePunt && !bereiktIds.has(activePunt.id) && !popupPunt && gpsStatus !== "laden" && (
          <button
            onClick={controleerLocatie}
            title="Controleer locatie"
            className="pr-loc-btn"
            style={{ bottom: knoepBottomOffset, left: 16, zIndex: 1000 }}>
            📍
          </button>
        )}

        {/* Punt niet bereikbaar → organisatie waarschuwen (rechtsonder, op één lijn met 📍) */}
        {activePunt && !bereiktIds.has(activePunt.id) && !popupPunt && !ghostTot && (
          <button
            onClick={hulpOpen ? undefined : meldOnbereikbaar}
            disabled={hulpOpen}
            title="Meld dat jullie het volgende punt niet kunnen bereiken"
            style={{
              position: "absolute", bottom: knoepBottomOffset, right: 16, zIndex: 1000,
              padding: "7px 12px", borderRadius: 99,
              background: hulpOpen ? "rgba(15,23,42,0.85)" : "rgba(255,138,0,0.92)",
              border: "2px solid #fff", color: "#fff",
              fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-display)",
              boxShadow: "0 3px 10px rgba(0,0,0,0.4)", cursor: hulpOpen ? "default" : "pointer",
            }}>
            {hulpOpen ? "⏳ Organisatie gewaarschuwd" : "⚠️ Niet bereikbaar?"}
          </button>
        )}


        {/* Inventaris balk onderin de kaart */}
        <InventarisBar inventaris={inventaris} onGebruik={(item) => setActiveSpeciaalItem(item)} />
      </div>

      {/* Punt bereikt → vraag/info popup */}
      {popupPunt && (
        <VraagPopup
          punt={popupPunt}
          onVerwerkt={puntVerwerkt}
          start={startPunt && popupPunt.id === startPunt.id ? (startVraagKlaar ? "vraag" : "uitleg") : undefined}
          startUitleg={{ regels: SPELUITLEG[modus], ...START_AFSLUITING }}
          onStartVraagLater={() => { setPopupPunt(null); setStartVraagVanaf(kmAfgelegdRef.current); }}
        />
      )}

      {/* Speciaal item gebruiken */}
      {activeSpeciaalItem && (
        <SpeciaalItemPopup
          item={activeSpeciaalItem}
          // Gefinishte teams zijn geen tegenstander meer (geen wissel, bom enz. met hen)
          andereSessies={andereSpelers.filter((s) => !s.gefinisht).map((s) => ({ session_id: s.session_id, teamnaam: s.teamnaam }))}
          waarden={waarden}
          onVerwerkt={inventarisItemGebruikt}
          onSluit={bewaarItemVoorLater}
        />
      )}

      {/* Speciale items legende */}
      {legendeOpen && (
        <SpeciaalItemLegende
          onSluit={() => setLegendeOpen(false)}
          speciaalItems={legendeItems}
          modus={modus}
          waarden={waarden}
        />
      )}

      {/* Item opgepakt — groot icoon dat de speler zelf wegtikt */}
      {opgepakt && (() => {
        const info = ITEM_INFO[opgepakt.item.type];
        const sluit = () => {
          if (opgepakt.item.type === "wissel") setActiveSpeciaalItem(opgepakt.item);
          setOpgepakt(null);
        };
        return (
          <div onClick={sluit} style={{
            position: "fixed", inset: 0, zIndex: 2500,
            background: "rgba(12,3,34,0.78)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div onClick={(e) => e.stopPropagation()} className="pr-panel" style={{ maxWidth: 340, width: "100%" }}>
              <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", paddingTop: 24 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/items/${opgepakt.item.type}.png`} alt="" style={{
                  width: 150, height: 150,
                  filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(255,217,59,0.45))",
                  animation: "pr-item-pop 0.45s cubic-bezier(.2,1.6,.4,1)",
                }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", color: "#fff" }}>
                  {info?.naam ?? opgepakt.item.name} opgepakt!
                </div>
                {info && (
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.45 }}>
                    {info.beschrijving(waarden)}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--pr-gold)", fontWeight: 700 }}>
                  {opgepakt.extra}
                </p>
                <button className="btn-premium--compact" style={{ marginTop: 6 }} onClick={sluit}>
                  {opgepakt.item.type === "wissel" ? "KIES EEN TEAM →" : "TOP!"}
                </button>
              </div>
            </div>
            <style>{`@keyframes pr-item-pop { 0% { transform: scale(0.3) rotate(-12deg); opacity: 0 } 100% { transform: scale(1) rotate(0); opacity: 1 } }`}</style>
          </div>
        );
      })()}

      {/* Spook — groot spook met aftelling; kaart blijft eronder bruikbaar voor items */}
      {ghostTot && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1500, pointerEvents: "none",
          background: "radial-gradient(circle at 50% 45%, rgba(88,28,135,0.55) 0%, rgba(15,10,40,0.75) 70%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "#fff", gap: 10, textAlign: "center", padding: "0 24px",
        }}>
          <div style={{ fontSize: "9rem", lineHeight: 1, filter: "drop-shadow(0 0 30px rgba(196,181,253,0.8))", animation: "pr-spook-zweef 2.4s ease-in-out infinite" }}>👻</div>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 900, letterSpacing: "0.05em", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            BOE! Je punt is weg
          </h1>
          <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.85 }}>
            Een ander team heeft je volgende punt verstopt. Het komt terug over:
          </p>
          <div style={{ fontSize: "4.5rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
            {String(Math.floor(ghostSecondsLeft / 60)).padStart(2, "0")}:{String(ghostSecondsLeft % 60).padStart(2, "0")}
          </div>
          <style>{`@keyframes pr-spook-zweef { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }`}</style>
        </div>
      )}

      {/* Tussenstand — door admin getoond */}
      {tussenstand && (
        <TussenstandPopup
          tussenstand={tussenstand}
          resterendeSeconden={tussenstandResterend}
          onSluit={sluitTussenstand}
        />
      )}

      {/* Plek zooi overlay — rood scherm met afteltimer */}
      {plekzooiActief && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "linear-gradient(160deg, #7f1d1d 0%, #b91c1c 55%, #991b1b 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "#fff", gap: 20,
          userSelect: "none",
        }}>
          <div style={{ fontSize: "5rem", lineHeight: 1 }}>💥</div>
          <h1 style={{
            margin: 0, fontSize: "2.6rem", fontWeight: 900,
            letterSpacing: "0.06em", textShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}>PLEK ZOOI!</h1>
          <p style={{ margin: 0, fontSize: "1rem", opacity: 0.85, textAlign: "center", padding: "0 32px" }}>
            Je zit vast — de kaart is niet beschikbaar
          </p>
          <div style={{
            fontSize: "5rem", fontWeight: 800,
            fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em",
            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            marginTop: 8,
          }}>
            {String(Math.floor(plekzooiSecondsLeft / 60)).padStart(2, "0")}:{String(plekzooiSecondsLeft % 60).padStart(2, "0")}
          </div>
          <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.55 }}>
            Wacht tot de timer op nul staat
          </p>
        </div>
      )}
    </div>
  );
}
