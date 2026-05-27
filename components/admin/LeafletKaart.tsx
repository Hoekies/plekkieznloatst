"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpeciaalItem } from "@/types/database";

// Leaflet wordt alleen client-side geladen
declare global {
  interface Window { L: typeof import("leaflet"); }
}

const SPECIAAL_EMOJI: Record<string, string> = {
  spook: "👻", bom: "💣", ster: "⭐", verdubbeling: "🔴", wissel: "🔄", dief: "🦹", radar: "📡",
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
  onKlik: (lat: number, lng: number) => void;
  onMarkerVerplaatst: (id: string, lat: number, lng: number) => void;
  onMarkerKlik: (id: string) => void;
}

export default function LeafletKaart({ punten, addModus, geselecteerdId, specialeItems = [], guideCirkel = null, teamStartPunten = [], onKlik, onMarkerVerplaatst, onMarkerKlik }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const specialeItemMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
  const cirkelRef = useRef<import("leaflet").Circle | null>(null);
  const startPolygoonRef = useRef<import("leaflet").Polygon | null>(null);
  const startMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const ontmoetingMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const addModusRef = useRef(addModus);
  const onKlikRef = useRef(onKlik);
  const onMarkerKlikRef = useRef(onMarkerKlik);
  const onMarkerVerplaatsdRef = useRef(onMarkerVerplaatst);
  const prevPuntenLenRef = useRef(-1);
  const [kaartKlaar, setKaartKlaar] = useState(false);

  addModusRef.current = addModus;
  onKlikRef.current = onKlik;
  onMarkerKlikRef.current = onMarkerKlik;
  onMarkerVerplaatsdRef.current = onMarkerVerplaatst;

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
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(kaart);

      kaart.on("click", (e) => {
        if (!addModusRef.current) return;
        onKlikRef.current(e.latlng.lat, e.latlng.lng);
      });

      kaartRef.current = kaart;
      setKaartKlaar(true);
    });

    return () => {
      mounted = false;
      kaartRef.current?.remove();
      kaartRef.current = null;
      markersRef.current.clear();
      specialeItemMarkersRef.current.clear();
      cirkelRef.current = null;
      startPolygoonRef.current = null;
      startMarkersRef.current = [];
      ontmoetingMarkerRef.current = null;
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

      // Verwijder markers van verwijderde punten
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

      // Kaart inzoomen alleen als het aantal punten verandert
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

  // Speciale item markers bijhouden (static, niet draggable)
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      const kaart = kaartRef.current!;
      specialeItemMarkersRef.current.forEach((m) => m.remove());
      specialeItemMarkersRef.current.clear();
      specialeItems.forEach((item) => {
        const emoji = SPECIAAL_EMOJI[item.type] ?? "?";
        const icon = L.divIcon({
          className: "",
          html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));opacity:${item.claimed ? 0.35 : 1};">${emoji}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([item.latitude, item.longitude], { icon, interactive: false })
          .bindTooltip(`${emoji} ${item.name}`, { permanent: false })
          .addTo(kaart);
        specialeItemMarkersRef.current.set(item.id, marker);
      });
    });
  }, [specialeItems, kaartKlaar]);

  // Teamstartpunten: verbindingslijnen + ontmoetingspunt (verspreid-modus)
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      // Opruimen
      startPolygoonRef.current?.remove();
      startPolygoonRef.current = null;
      startMarkersRef.current.forEach((m) => m.remove());
      startMarkersRef.current = [];
      ontmoetingMarkerRef.current?.remove();
      ontmoetingMarkerRef.current = null;

      if (teamStartPunten.length < 2) return;

      // Verbindingspolygoon tussen startpunten
      const coords = teamStartPunten.map((p) => [p.lat, p.lng] as [number, number]);
      startPolygoonRef.current = L.polygon(coords, {
        color: "#ffd93b",
        weight: 1.5,
        dashArray: "6 5",
        fill: false,
        opacity: 0.7,
        interactive: false,
      }).addTo(kaartRef.current!);

      // Nummerlabels per startpunt
      teamStartPunten.forEach((p) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:22px;height:22px;border-radius:50%;
            background:#ffd93b;color:#060e1a;
            font-size:0.68rem;font-weight:800;
            display:flex;align-items:center;justify-content:center;
            border:2px solid #fff;box-shadow:0 0 6px rgba(255,217,59,0.6);
          ">T${p.teamIndex}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const marker = L.marker([p.lat, p.lng], { icon, interactive: false })
          .addTo(kaartRef.current!);
        startMarkersRef.current.push(marker);
      });

      // Ontmoetingspunt = centroïde van alle startpunten
      const centLat = teamStartPunten.reduce((s, p) => s + p.lat, 0) / teamStartPunten.length;
      const centLng = teamStartPunten.reduce((s, p) => s + p.lng, 0) / teamStartPunten.length;
      const ontmoetingIcon = L.divIcon({
        className: "",
        html: `<div style="
          background:rgba(255,217,59,0.15);
          border:2px solid #ffd93b;
          border-radius:8px;
          padding:4px 7px;
          font-size:0.68rem;font-weight:700;
          color:#ffd93b;
          white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.5);
        ">📍 Startlocatie</div>`,
        iconSize: [100, 28],
        iconAnchor: [50, 14],
      });
      ontmoetingMarkerRef.current = L.marker([centLat, centLng], { icon: ontmoetingIcon, interactive: false })
        .addTo(kaartRef.current!);
    });
  }, [teamStartPunten, kaartKlaar]);

  // Aanbevolen-afstand cirkel (verspreid-modus)
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
          weight: 2,
          dashArray: "10 6",
          fill: false,
          opacity: 0.65,
          interactive: false,
        }
      )
        .bindTooltip(`≈ ${Math.round(guideCirkel.radiusM)} m`, {
          permanent: true,
          direction: "bottom",
          offset: [0, guideCirkel.radiusM > 0 ? 6 : 0],
          className: "",
          opacity: 0.85,
        })
        .addTo(kaartRef.current!);
    });
  }, [guideCirkel, kaartKlaar]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minHeight: 0 }}
    />
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
