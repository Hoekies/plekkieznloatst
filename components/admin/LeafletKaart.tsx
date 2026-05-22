"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt } from "@/types/database";

// Leaflet wordt alleen client-side geladen
declare global {
  interface Window { L: typeof import("leaflet"); }
}

interface Props {
  punten: RoutePunt[];
  addModus: boolean;
  geselecteerdId: string | null;
  onKlik: (lat: number, lng: number) => void;
  onMarkerVerplaatst: (id: string, lat: number, lng: number) => void;
  onMarkerKlik: (id: string) => void;
}

export default function LeafletKaart({ punten, addModus, geselecteerdId, onKlik, onMarkerVerplaatst, onMarkerKlik }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
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
