"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpeciaalItem } from "@/types/database";

// Leaflet wordt alleen client-side geladen
declare global {
  interface Window { L: typeof import("leaflet"); }
}

const SPECIAAL_EMOJI: Record<string, string> = {
  spook: "👻", bom: "💣", ster: "⭐", verdubbeling: "🔴", wissel: "🔄", dief: "🦹", radar: "📡",
  banaan: "🍌", plekzooi: "⛔", vraagteken: "❓",
};

interface GuideCirkel {
  lat: number;
  lng: number;
  radiusM: number;
}

export interface TeamRoute {
  teamIndex: number;
  kleur: string;
  // Volledige looproute: start-hub, lus-punten in teamvolgorde, finish-hub
  coords: { lat: number; lng: number }[];
}

interface Props {
  punten: RoutePunt[];
  addModus: boolean;
  geselecteerdId: string | null;
  specialeItems?: SpeciaalItem[];
  guideCirkel?: GuideCirkel | null;
  // Verspreid: eerste punt = start-hub (🏠), lus-punten genummerd vanaf 1
  hubModus?: boolean;
  teamRoutes?: TeamRoute[];
  // Genereer-preview
  centrumPunt?: { lat: number; lng: number } | null;
  ghostPunten?: { lat: number; lng: number }[];
  ghostRadiusM?: number;
  onCentrumVerplaatst?: (lat: number, lng: number) => void;
  onKlik: (lat: number, lng: number) => void;
  onMarkerVerplaatst: (id: string, lat: number, lng: number) => void;
  onMarkerKlik: (id: string) => void;
  onSpeciaalItemVerplaatst?: (id: string, lat: number, lng: number) => void;
  onSpeciaalItemKlik?: (id: string) => void;
  geselecteerdSpeciaalId?: string | null;
  vliegNaar?: { lat: number; lng: number; zoom?: number } | null;
  // Verspreid: voorgestelde plekken voor extra items; klikken plaatst het item
  itemVoorstellen?: { lat: number; lng: number; type: string }[];
  onItemVoorstelKlik?: (v: { lat: number; lng: number; type: string }) => void;
}

export default function LeafletKaart({
  punten, addModus, geselecteerdId, specialeItems = [],
  guideCirkel = null, hubModus = false, teamRoutes = [],
  centrumPunt = null, ghostPunten = [], ghostRadiusM = 0,
  onCentrumVerplaatst, onKlik, onMarkerVerplaatst, onMarkerKlik,
  onSpeciaalItemVerplaatst, onSpeciaalItemKlik, geselecteerdSpeciaalId = null,
  vliegNaar = null, itemVoorstellen = [], onItemVoorstelKlik,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const specialeItemMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
  const cirkelRef = useRef<import("leaflet").Circle | null>(null);
  const teamLijnenRef = useRef<import("leaflet").Polyline[]>([]);
  const startMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const centrumMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const ghostMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const voorstelMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const onItemVoorstelKlikRef = useRef(onItemVoorstelKlik);
  const ghostCirkelRef = useRef<import("leaflet").Circle | null>(null);
  const onKlikRef = useRef(onKlik);
  const onMarkerKlikRef = useRef(onMarkerKlik);
  const onMarkerVerplaatsdRef = useRef(onMarkerVerplaatst);
  const onCentrumVerplaatsdRef = useRef(onCentrumVerplaatst);
  const onSpeciaalItemVerplaatsdRef = useRef(onSpeciaalItemVerplaatst);
  const onSpeciaalItemKlikRef = useRef(onSpeciaalItemKlik);
  const prevPuntenLenRef = useRef(-1);
  const [kaartKlaar, setKaartKlaar] = useState(false);

  onKlikRef.current = onKlik;
  onItemVoorstelKlikRef.current = onItemVoorstelKlik;
  onMarkerKlikRef.current = onMarkerKlik;
  onMarkerVerplaatsdRef.current = onMarkerVerplaatst;
  onCentrumVerplaatsdRef.current = onCentrumVerplaatst;
  onSpeciaalItemVerplaatsdRef.current = onSpeciaalItemVerplaatst;
  onSpeciaalItemKlikRef.current = onSpeciaalItemKlik;

  useEffect(() => {
    if (!containerRef.current || kaartRef.current) return;

    let mounted = true;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (!mounted || !containerRef.current || kaartRef.current) return;

      const kaart = L.map(containerRef.current).setView([52.3676, 4.9041], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(kaart);

      kaart.on("click", (e) => {
        onKlikRef.current(e.latlng.lat, e.latlng.lng);
      });

      kaartRef.current = kaart;
      setKaartKlaar(true);
    });

    const markers = markersRef.current;
    const specialeItemMarkers = specialeItemMarkersRef.current;

    return () => {
      mounted = false;
      kaartRef.current?.remove();
      kaartRef.current = null;
      markers.clear();
      specialeItemMarkers.clear();
      cirkelRef.current = null;
      teamLijnenRef.current = [];
      startMarkersRef.current = [];
      centrumMarkerRef.current = null;
      ghostMarkersRef.current = [];
      ghostCirkelRef.current = null;
    };
  }, []);

  // Cursor bij addModus
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.cursor = addModus ? "crosshair" : "";
  }, [addModus]);

  // Markers en polyline bijhouden
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      const kaart = kaartRef.current!;
      const bestaandeIds = new Set(markersRef.current.keys());

      punten.forEach((pt, i) => {
        const isGeselecteerd = pt.id === geselecteerdId;
        const isHubStart = hubModus && i === 0;
        const label = pt.type === "eindpunt" ? "🏁" : isHubStart ? "🏠" : String(hubModus ? i : i + 1);
        const icon = maakIcoon(L, pt.type, label, isHubStart, isGeselecteerd);

        if (markersRef.current.has(pt.id)) {
          const marker = markersRef.current.get(pt.id)!;
          marker.setLatLng([pt.latitude, pt.longitude]);
          marker.setIcon(icon);
          bestaandeIds.delete(pt.id);
        } else {
          const marker = L.marker([pt.latitude, pt.longitude], { icon, draggable: true })
            .addTo(kaart)
            .on("click", () => onMarkerKlikRef.current(pt.id))
            .on("dragend", (e) => {
              const pos = (e.target as import("leaflet").Marker).getLatLng();
              onMarkerVerplaatsdRef.current(pt.id, pos.lat, pos.lng);
            });
          markersRef.current.set(pt.id, marker);
        }
      });

      bestaandeIds.forEach((id) => {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      });

      // Volgordelijn — bij verspreid tonen de gekleurde teamroutes de echte looproute
      polylineRef.current?.remove();
      polylineRef.current = null;
      if (punten.length >= 2 && teamRoutes.length === 0) {
        polylineRef.current = L.polyline(
          punten.map((p) => [p.latitude, p.longitude] as [number, number]),
          { color: "#1E40AF", weight: 2.5, opacity: 0.7, dashArray: "6 4" }
        ).addTo(kaart);
      }

      if (punten.length !== prevPuntenLenRef.current && punten.length > 0) {
        prevPuntenLenRef.current = punten.length;
        const bounds = L.latLngBounds(punten.map((p) => [p.latitude, p.longitude]));
        if (punten.length === 1) {
          kaart.setView([punten[0].latitude, punten[0].longitude], 16);
        } else {
          kaart.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        }
      }
    });
  }, [punten, geselecteerdId, hubModus, teamRoutes.length, kaartKlaar]);

  // Speciale item markers
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      const kaart = kaartRef.current!;
      specialeItemMarkersRef.current.forEach((m) => m.remove());
      specialeItemMarkersRef.current.clear();
      specialeItems.forEach((item) => {
        const emoji = SPECIAAL_EMOJI[item.type] ?? "❓";
        const isGeselecteerd = item.id === geselecteerdSpeciaalId;
        const ring = isGeselecteerd ? "box-shadow:0 0 0 3px #fff,0 0 0 6px #00d9ff;" : "";
        const icon = L.divIcon({
          className: "",
          html: `<img src="/items/${item.type}.png" alt="" style="width:34px;height:34px;display:block;border-radius:50%;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));opacity:${item.claimed ? 0.35 : 1};${ring}" />`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const marker = L.marker([item.latitude, item.longitude], { icon, draggable: true, zIndexOffset: 200 })
          .bindTooltip(`${emoji} ${item.name}`, { permanent: false })
          .on("click", () => onSpeciaalItemKlikRef.current?.(item.id))
          .on("dragend", (e) => {
            const pos = (e.target as import("leaflet").Marker).getLatLng();
            onSpeciaalItemVerplaatsdRef.current?.(item.id, pos.lat, pos.lng);
          })
          .addTo(kaart);
        specialeItemMarkersRef.current.set(item.id, marker);
      });
    });
  }, [specialeItems, geselecteerdSpeciaalId, kaartKlaar]);

  // Teamroutes: per team een gekleurde lijn (hub → lus in teamvolgorde → hub) + T-marker op het instappunt
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      teamLijnenRef.current.forEach((l) => l.remove());
      teamLijnenRef.current = [];
      startMarkersRef.current.forEach((m) => m.remove());
      startMarkersRef.current = [];

      if (teamRoutes.length === 0) return;

      teamRoutes.forEach((t, k) => {
        // Lijnen lopen over dezelfde randen; schuif ze radiaal uit elkaar zodat elk team zichtbaar blijft
        const verschuivingM = (k - (teamRoutes.length - 1) / 2) * 4;
        const lijn = L.polyline(
          t.coords.map((c, i) => verschuifRadiaal(c, t.coords[0], i === 0 || i === t.coords.length - 1 ? 0 : verschuivingM)),
          { color: t.kleur, weight: 3.5, opacity: 0.9, interactive: false },
        ).addTo(kaartRef.current!);
        teamLijnenRef.current.push(lijn);

        const instap = t.coords[1];
        if (!instap) return;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:26px;height:26px;border-radius:50%;
            background:${t.kleur};color:#fff;
            font-size:0.68rem;font-weight:800;
            display:flex;align-items:center;justify-content:center;
            border:2px solid #fff;
            text-shadow:0 1px 2px rgba(0,0,0,0.6);
            box-shadow:0 0 8px ${t.kleur};
          ">T${t.teamIndex}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 34],
        });
        const marker = L.marker([instap.lat, instap.lng], { icon, interactive: false, zIndexOffset: 300 })
          .addTo(kaartRef.current!);
        startMarkersRef.current.push(marker);
      });
    });
  }, [teamRoutes, kaartKlaar]);

  // Aanbevolen-afstand cirkel bij geselecteerd punt
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      cirkelRef.current?.remove();
      cirkelRef.current = null;
      if (!guideCirkel || guideCirkel.radiusM <= 0) return;
      cirkelRef.current = L.circle(
        [guideCirkel.lat, guideCirkel.lng],
        {
          radius: guideCirkel.radiusM,
          color: "#00d9ff",
          weight: 3,
          dashArray: "12 5",
          fill: true,
          fillColor: "#00d9ff",
          fillOpacity: 0.04,
          opacity: 0.9,
          interactive: false,
        }
      )
        .bindTooltip(`≈ ${Math.round(guideCirkel.radiusM)} m`, {
          permanent: true,
          direction: "bottom",
          opacity: 0.9,
        })
        .addTo(kaartRef.current!);
    });
  }, [guideCirkel, kaartKlaar]);

  // Voorgestelde plekken voor extra items (gouden stippelcirkel met ➕); klik = item plaatsen
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      voorstelMarkersRef.current.forEach((m) => m.remove());
      voorstelMarkersRef.current = [];
      itemVoorstellen.forEach((v) => {
        const icon = L.divIcon({
          className: "",
          html: `<div title="Voorstel: klik om hier een item te plaatsen" style="
            width:34px;height:34px;border-radius:50%;cursor:pointer;
            background:rgba(255,217,59,0.15);border:2px dashed rgba(255,217,59,0.9);
            display:flex;align-items:center;justify-content:center;position:relative;
            box-shadow:0 0 10px rgba(255,217,59,0.35);">
            <img src="/items/${v.type}.png" style="width:22px;height:22px;opacity:0.6" alt="">
            <span style="position:absolute;right:-4px;top:-6px;font-size:13px;font-weight:900;color:#FFE680;text-shadow:0 1px 2px #000">+</span>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const m = L.marker([v.lat, v.lng], { icon, zIndexOffset: 400 })
          .on("click", () => onItemVoorstelKlikRef.current?.(v))
          .addTo(kaartRef.current!);
        voorstelMarkersRef.current.push(m);
      });
    });
  }, [itemVoorstellen, kaartKlaar]);

  // Genereer-preview: draggable centerpunt + ghost markers + ghost cirkel
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      centrumMarkerRef.current?.remove();
      centrumMarkerRef.current = null;
      ghostMarkersRef.current.forEach((m) => m.remove());
      ghostMarkersRef.current = [];
      ghostCirkelRef.current?.remove();
      ghostCirkelRef.current = null;

      if (!centrumPunt) return;

      // Draggable centerpunt
      const centrumIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:38px;height:38px;border-radius:50%;
          background:rgba(0,217,255,0.15);
          border:2.5px solid #00d9ff;
          display:flex;align-items:center;justify-content:center;
          font-size:20px;color:#00d9ff;font-weight:900;
          box-shadow:0 0 0 5px rgba(0,217,255,0.12),0 0 16px rgba(0,217,255,0.4);
          cursor:grab;
        ">⊕</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      centrumMarkerRef.current = L.marker([centrumPunt.lat, centrumPunt.lng], {
        icon: centrumIcon,
        draggable: true,
        zIndexOffset: 1000,
      })
        .on("dragend", (e) => {
          const pos = (e.target as import("leaflet").Marker).getLatLng();
          onCentrumVerplaatsdRef.current?.(pos.lat, pos.lng);
        })
        .addTo(kaartRef.current!);

      if (ghostPunten.length === 0) return;

      // Ghost cirkel
      if (ghostRadiusM > 0) {
        ghostCirkelRef.current = L.circle(
          [centrumPunt.lat, centrumPunt.lng],
          {
            radius: ghostRadiusM,
            color: "#00d9ff",
            weight: 2,
            dashArray: "8 6",
            fill: true,
            fillColor: "#00d9ff",
            fillOpacity: 0.03,
            opacity: 0.5,
            interactive: false,
          }
        ).addTo(kaartRef.current!);
      }

      // Ghost punt-markers
      ghostPunten.forEach((p, i) => {
        const isLaatste = i === ghostPunten.length - 1;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:30px;height:30px;border-radius:50%;
            background:rgba(0,217,255,0.1);
            border:2px dashed rgba(0,217,255,${isLaatste ? "0.9" : "0.55"});
            display:flex;align-items:center;justify-content:center;
            font-size:0.7rem;font-weight:800;
            color:rgba(0,217,255,${isLaatste ? "1" : "0.7"});
          ">${isLaatste ? "🏁" : i + 1}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const marker = L.marker([p.lat, p.lng], { icon, interactive: false })
          .addTo(kaartRef.current!);
        ghostMarkersRef.current.push(marker);
      });
    });
  }, [centrumPunt, ghostPunten, ghostRadiusM, kaartKlaar]);

  // Navigeer naar een opgezochte plaatsnaam
  useEffect(() => {
    if (!kaartRef.current || !vliegNaar) return;
    kaartRef.current.setView([vliegNaar.lat, vliegNaar.lng], vliegNaar.zoom ?? 15);
  }, [vliegNaar, kaartKlaar]);

  return (
    // z-index hier is bewust gezet: position:relative zonder z-index vormt geen eigen
    // stacking-context, waardoor Leaflet's interne panes (tot z-index 700 voor popups)
    // zouden "lekken" en boven pagina-elementen als het admin-hamburgermenu komen te staan.
    <div style={{ flex: 1, position: "relative", minWidth: 0, zIndex: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

// Schuift een punt `meters` weg van (of naar) het middelpunt; 0 = ongewijzigd
function verschuifRadiaal(
  p: { lat: number; lng: number },
  midden: { lat: number; lng: number },
  meters: number,
): [number, number] {
  if (meters === 0) return [p.lat, p.lng];
  const mPerGraad = 111320;
  const cosLat = Math.cos((p.lat * Math.PI) / 180);
  const dx = (p.lng - midden.lng) * mPerGraad * cosLat;
  const dy = (p.lat - midden.lat) * mPerGraad;
  const lengte = Math.hypot(dx, dy);
  if (lengte < 1) return [p.lat, p.lng];
  return [
    p.lat + ((dy / lengte) * meters) / mPerGraad,
    p.lng + ((dx / lengte) * meters) / (mPerGraad * cosLat),
  ];
}

function maakIcoon(
  L: typeof import("leaflet"),
  type: RoutePunt["type"],
  label: string,
  isHubStart: boolean,
  geselecteerd: boolean
) {
  const bg = isHubStart ? "#16A34A" : type === "eindpunt" ? "#F59E0B" : type === "informatiepunt" ? "#06B6D4" : "#1E40AF";
  const ring = geselecteerd ? `box-shadow:0 0 0 3px #fff,0 0 0 5px ${bg};` : "";
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#fff;
      display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;
      border:2px solid #fff;${ring}transition:box-shadow 0.15s">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "",
  });
}
