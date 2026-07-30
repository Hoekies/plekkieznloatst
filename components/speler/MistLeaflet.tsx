"use client";

import { useEffect, useRef } from "react";
import { mistCelNaarLatLng, MIST_ONTHUL_STRAAL_M } from "@/lib/geo";
import type { RoutePunt } from "@/types/database";

interface Props {
  positie: GeolocationCoordinates | null;
  cellen: { cell_x: number; cell_y: number }[];
  startLocatie: { lat: number; lng: number } | null;
  punten: RoutePunt[];
  bereikteOfVerwerkteIds: Set<string>;
  verwerkteIds: Set<string>;
}

const ZOOM_SPELER = 17;
const ZOOM_INIT = 15;

// Web Mercator: meters-per-pixel op een gegeven breedtegraad/zoom (standaard Leaflet-formule).
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

export default function MistLeaflet({ positie, cellen, startLocatie, punten, bereikteOfVerwerkteIds, verwerkteIds }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const spelerMarkerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const accuracyCirkelRef = useRef<import("leaflet").Circle | null>(null);
  const startMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const fogLayerRef = useRef<import("leaflet").GridLayer | null>(null);
  const puntMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const gecenterRef = useRef(false);
  const cellenLatLngRef = useRef<{ lat: number; lng: number }[]>([]);

  // Kaart initialiseren
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

      const map = L.map(containerRef.current!, {
        zoom: ZOOM_INIT,
        center: startLocatie ? [startLocatie.lat, startLocatie.lng] : [52.37, 4.9],
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap, © CARTO",
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(map);

      // Mistlaag: elke tegel start ondoorzichtig en "ponst" gaten bij onthulde cellen.
      // any: @types/leaflet's Class.extend() typing verliest de constructor-optie-argumenten
      const MistLayer: any = L.GridLayer.extend({
        createTile(coords: any) {
          const tile = document.createElement("canvas");
          const size = this.getTileSize();
          tile.width = size.x;
          tile.height = size.y;
          const ctx = tile.getContext("2d");
          if (!ctx) return tile;

          ctx.fillStyle = "rgba(18, 22, 40, 0.72)";
          ctx.fillRect(0, 0, size.x, size.y);
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "#000";

          const nwPoint = coords.scaleBy(size);
          for (const cel of cellenLatLngRef.current) {
            const puntM = metersPerPixel(cel.lat, coords.z);
            const straalPx = MIST_ONTHUL_STRAAL_M / puntM;
            const layerPoint = map.project([cel.lat, cel.lng], coords.z);
            const tilePoint = layerPoint.subtract(nwPoint);
            if (
              tilePoint.x < -straalPx || tilePoint.x > size.x + straalPx ||
              tilePoint.y < -straalPx || tilePoint.y > size.y + straalPx
            ) continue;
            ctx.beginPath();
            ctx.arc(tilePoint.x, tilePoint.y, straalPx, 0, Math.PI * 2);
            ctx.fill();
          }
          return tile;
        },
      });
      fogLayerRef.current = new MistLayer({ pane: "overlayPane", opacity: 1 }).addTo(map);

      if (startLocatie) {
        startMarkerRef.current = L.marker([startLocatie.lat, startLocatie.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🚩</div>`,
            iconSize: [28, 28],
            iconAnchor: [8, 26],
          }),
          interactive: false,
        }).addTo(map);
      }

      mapRef.current = map;
    }

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      LRef.current = null;
      fogLayerRef.current = null;
      puntMarkersRef.current.clear();
      gecenterRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onthulde cellen bijhouden + mistlaag opnieuw tekenen
  useEffect(() => {
    cellenLatLngRef.current = cellen.map((c) => mistCelNaarLatLng(c.cell_x, c.cell_y));
    fogLayerRef.current?.redraw();
  }, [cellen]);

  // Vraagpunt-markers bijwerken — pas zichtbaar zodra een team dichtbij genoeg is gekomen.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    puntMarkersRef.current.forEach((marker, id) => {
      if (!bereikteOfVerwerkteIds.has(id)) { marker.remove(); puntMarkersRef.current.delete(id); }
    });

    punten.forEach((punt) => {
      if (!bereikteOfVerwerkteIds.has(punt.id)) return;
      const isVerwerkt = verwerkteIds.has(punt.id);
      const kleur = isVerwerkt ? "#16A34A" : "#F59E0B";
      const label = isVerwerkt ? "✓" : "❓";

      const bestaand = puntMarkersRef.current.get(punt.id);
      if (bestaand) {
        bestaand.setIcon(L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${kleur};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${label}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }));
        return;
      }

      const marker = L.marker([punt.latitude, punt.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${kleur};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${label}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
        interactive: false,
      }).addTo(map);
      puntMarkersRef.current.set(punt.id, marker);
    });
  }, [punten, bereikteOfVerwerkteIds, verwerkteIds]);

  // Spelermarker bijwerken bij positiewijziging
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !positie) return;

    const latlng: [number, number] = [positie.latitude, positie.longitude];

    if (!spelerMarkerRef.current) {
      spelerMarkerRef.current = L.circleMarker(latlng, {
        radius: 10, color: "#1E40AF", fillColor: "#3B82F6", fillOpacity: 0.9, weight: 3,
      }).addTo(map);
    } else {
      spelerMarkerRef.current.setLatLng(latlng);
    }

    if (!accuracyCirkelRef.current) {
      accuracyCirkelRef.current = L.circle(latlng, {
        radius: positie.accuracy, color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.08, weight: 1,
      }).addTo(map);
    } else {
      accuracyCirkelRef.current.setLatLng(latlng).setRadius(positie.accuracy);
    }

    if (!gecenterRef.current) {
      map.setView(latlng, ZOOM_SPELER);
      gecenterRef.current = true;
    }
  }, [positie]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", zIndex: 0 }} />;
}
