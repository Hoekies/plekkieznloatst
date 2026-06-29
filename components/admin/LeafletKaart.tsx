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

interface TeamStartPunt {
  lat: number;
  lng: number;
  teamIndex: number;
}

interface Props {
  punten: RoutePunt[];
  addModus: boolean;
  geselecteerdId: string | null;
  specialeItems?: SpeciaalItem[];
  guideCirkel?: GuideCirkel | null;
  teamStartPunten?: TeamStartPunt[];
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
}

export default function LeafletKaart({
  punten, addModus, geselecteerdId, specialeItems = [],
  guideCirkel = null, teamStartPunten = [],
  centrumPunt = null, ghostPunten = [], ghostRadiusM = 0,
  onCentrumVerplaatst, onKlik, onMarkerVerplaatst, onMarkerKlik,
  onSpeciaalItemVerplaatst, onSpeciaalItemKlik, geselecteerdSpeciaalId = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const specialeItemMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
  const cirkelRef = useRef<import("leaflet").Circle | null>(null);
  const startPolygoonRef = useRef<import("leaflet").Polygon | null>(null);
  const startMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const ontmoetingMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const centrumMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const ghostMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const ghostCirkelRef = useRef<import("leaflet").Circle | null>(null);
  const addModusRef = useRef(addModus);
  const onKlikRef = useRef(onKlik);
  const onMarkerKlikRef = useRef(onMarkerKlik);
  const onMarkerVerplaatsdRef = useRef(onMarkerVerplaatst);
  const onCentrumVerplaatsdRef = useRef(onCentrumVerplaatst);
  const onSpeciaalItemVerplaatsdRef = useRef(onSpeciaalItemVerplaatst);
  const onSpeciaalItemKlikRef = useRef(onSpeciaalItemKlik);
  const prevPuntenLenRef = useRef(-1);
  const [kaartKlaar, setKaartKlaar] = useState(false);

  addModusRef.current = addModus;
  onKlikRef.current = onKlik;
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
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap, © CARTO",
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(kaart);

      kaart.on("click", (e) => {
        if (!addModusRef.current) return;
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
      startPolygoonRef.current = null;
      startMarkersRef.current = [];
      ontmoetingMarkerRef.current = null;
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
        const icon = maakIcoon(L, pt.type, i + 1, isGeselecteerd);

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

      // Polyline
      polylineRef.current?.remove();
      if (punten.length >= 2) {
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
  }, [punten, geselecteerdId, kaartKlaar]);

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
          html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));opacity:${item.claimed ? 0.35 : 1};border-radius:50%;${ring}">${emoji}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
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

  // Teamstartpunten: verbindingspolygoon + T-markers + startlocatie
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      startPolygoonRef.current?.remove();
      startPolygoonRef.current = null;
      startMarkersRef.current.forEach((m) => m.remove());
      startMarkersRef.current = [];
      ontmoetingMarkerRef.current?.remove();
      ontmoetingMarkerRef.current = null;

      if (teamStartPunten.length < 2) return;

      const coords = teamStartPunten.map((p) => [p.lat, p.lng] as [number, number]);
      startPolygoonRef.current = L.polygon(coords, {
        color: "#ffd93b",
        weight: 2.5,
        dashArray: "8 5",
        fill: false,
        opacity: 0.9,
        interactive: false,
      }).addTo(kaartRef.current!);

      teamStartPunten.forEach((p) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:26px;height:26px;border-radius:50%;
            background:#ffd93b;color:#060e1a;
            font-size:0.68rem;font-weight:800;
            display:flex;align-items:center;justify-content:center;
            border:2px solid #fff;
            box-shadow:0 0 0 3px rgba(255,217,59,0.3),0 0 8px rgba(255,217,59,0.6);
          ">T${p.teamIndex}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const marker = L.marker([p.lat, p.lng], { icon, interactive: false })
          .addTo(kaartRef.current!);
        startMarkersRef.current.push(marker);
      });

      // Startlocatie = centroïde — groot icoon met gloed
      const centLat = teamStartPunten.reduce((s, p) => s + p.lat, 0) / teamStartPunten.length;
      const centLng = teamStartPunten.reduce((s, p) => s + p.lng, 0) / teamStartPunten.length;
      const ontmoetingIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
          <div style="
            width:48px;height:48px;border-radius:50%;
            background:rgba(255,217,59,0.2);
            border:2.5px solid #ffd93b;
            display:flex;align-items:center;justify-content:center;
            font-size:22px;
            box-shadow:0 0 0 5px rgba(255,217,59,0.12),0 0 18px rgba(255,217,59,0.45);
          ">📍</div>
          <div style="
            background:rgba(6,14,26,0.85);
            border:1px solid rgba(255,217,59,0.5);
            border-radius:5px;
            padding:2px 7px;
            font-size:0.62rem;font-weight:700;
            color:#ffd93b;
            white-space:nowrap;
            text-shadow:0 1px 3px rgba(0,0,0,0.8);
          ">Startlocatie</div>
        </div>`,
        iconSize: [80, 68],
        iconAnchor: [40, 30],
      });
      ontmoetingMarkerRef.current = L.marker([centLat, centLng], { icon: ontmoetingIcon, interactive: false, zIndexOffset: 500 })
        .addTo(kaartRef.current!);
    });
  }, [teamStartPunten, kaartKlaar]);

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

  return (
    <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

function maakIcoon(
  L: typeof import("leaflet"),
  type: RoutePunt["type"],
  nummer: number,
  geselecteerd: boolean
) {
  const bg = type === "eindpunt" ? "#F59E0B" : type === "informatiepunt" ? "#06B6D4" : "#1E40AF";
  const ring = geselecteerd ? `box-shadow:0 0 0 3px #fff,0 0 0 5px ${bg};` : "";
  const label = type === "eindpunt" ? "🏁" : String(nummer);
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#fff;
      display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;
      border:2px solid #fff;${ring}transition:box-shadow 0.15s">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "",
  });
}
