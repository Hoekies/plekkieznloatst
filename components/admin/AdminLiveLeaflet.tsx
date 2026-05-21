"use client";

import { useEffect, useRef } from "react";
import type { SpelerOverzicht, RoutePuntKort } from "@/app/api/admin/live/spelers/route";

interface Props {
  spelers: SpelerOverzicht[];
  route_punten: RoutePuntKort[];
}

export default function AdminLiveLeaflet({ spelers, route_punten }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const spelerMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const puntMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const initBoundsRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    async function init() {
      const L = (await import("leaflet")).default;
      LRef.current = L;

      if (!document.querySelector("#leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        zoom: 14,
        center: [52.37, 4.9],
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      LRef.current = null;
      spelerMarkersRef.current.clear();
      puntMarkersRef.current.clear();
      initBoundsRef.current = false;
    };
  }, []);

  // Route-punten bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    puntMarkersRef.current.forEach((m) => m.remove());
    puntMarkersRef.current.clear();

    route_punten.forEach((punt) => {
      const isEind = punt.type === "eindpunt";
      const label = isEind ? "🏁" : String(punt.order_index);
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:30px;height:30px;border-radius:50%;
          background:#1E40AF;border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:${isEind ? "14px" : "11px"};font-weight:700;color:#fff;
        ">${label}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = L.marker([punt.latitude, punt.longitude], { icon })
        .bindTooltip(punt.name, { permanent: false })
        .addTo(map);
      puntMarkersRef.current.set(punt.id, marker);
    });
  }, [route_punten]);

  // Spelermarkers bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const actieveIds = new Set(
      spelers.filter((s) => s.laatste_lat !== null).map((s) => s.player_id)
    );
    spelerMarkersRef.current.forEach((marker, id) => {
      if (!actieveIds.has(id)) { marker.remove(); spelerMarkersRef.current.delete(id); }
    });

    const nieuwePosities: [number, number][] = [];

    spelers.forEach((speler) => {
      if (speler.laatste_lat === null || speler.laatste_lng === null) return;
      const latlng: [number, number] = [speler.laatste_lat, speler.laatste_lng];
      nieuwePosities.push(latlng);

      const isKlaar = speler.sessie_status === "voltooid";
      const kleur = isKlaar ? "#16A34A" : "#F97316";
      const label = isKlaar ? "✓" : speler.group_name.charAt(0).toUpperCase();

      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="
            width:34px;height:34px;border-radius:50%;
            background:${kleur};border:2px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:14px;font-weight:700;color:#fff;
          ">${label}</div>
          <div style="
            background:rgba(0,0,0,0.7);color:#fff;
            font-size:10px;white-space:nowrap;
            padding:1px 5px;border-radius:4px;line-height:1.4;
          ">${speler.group_name}</div>
        </div>`,
        iconSize: [34, 52],
        iconAnchor: [17, 17],
      });

      const bestaand = spelerMarkersRef.current.get(speler.player_id);
      if (bestaand) {
        bestaand.setLatLng(latlng);
        bestaand.setIcon(icon);
      } else {
        const marker = L.marker(latlng, { icon, interactive: false }).addTo(map);
        spelerMarkersRef.current.set(speler.player_id, marker);
      }
    });

    // Eerste keer bounds fitten op alle markers samen
    if (!initBoundsRef.current && nieuwePosities.length > 0) {
      initBoundsRef.current = true;
      const alleLatlngs: [number, number][] = [
        ...nieuwePosities,
        ...route_punten.map((p): [number, number] => [p.latitude, p.longitude]),
      ];
      map.fitBounds(L.latLngBounds(alleLatlngs), { padding: [40, 40] });
    }
  }, [spelers, route_punten]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
