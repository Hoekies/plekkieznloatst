"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpeciaalItem } from "@/types/database";
import type { SpelerLocatie } from "@/lib/types";
import { escapeHtml } from "@/lib/html";

const VEROUDERD_MS = 2 * 60 * 1000; // 2 minuten

// Item-iconen staan als /items/<type>.png (zelfde stijl als de spelershandleiding)

interface Props {
  positie: GeolocationCoordinates | null;
  punten: RoutePunt[];
  verwerktIds: Set<string>;
  bereiktIds: Set<string>;
  activePuntId: string | null;
  andereSpelers: SpelerLocatie[];
  specialeItems: SpeciaalItem[];
  ghostedPuntId: string | null;
}

const ZOOM_SPELER = 17;
const ZOOM_INIT = 14;

export default function SpelerLeaflet({ positie, punten, verwerktIds, bereiktIds, activePuntId, andereSpelers, specialeItems, ghostedPuntId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  // GPS kan binnenkomen voordat Leaflet geladen is; effecten draaien opnieuw zodra de kaart klaar staat
  const [kaartKlaar, setKaartKlaar] = useState(false);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const andereSpelersMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const spelerMarkerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const accuracyCirkelRef = useRef<import("leaflet").Circle | null>(null);
  const puntMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const specialeItemMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
  const guideLijnRef = useRef<import("leaflet").Polyline | null>(null);
  const gecenterRef = useRef(false);

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

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        zoom: ZOOM_INIT,
        center: [52.37, 4.9],
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setKaartKlaar(true);
    }

    init();

    const puntMarkers = puntMarkersRef.current;
    const specialeItemMarkers = specialeItemMarkersRef.current;

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      LRef.current = null;
      puntMarkers.clear();
      specialeItemMarkers.clear();
      guideLijnRef.current = null;
      gecenterRef.current = false;
    };
  }, []);

  // Spelermarker bijwerken bij positiewijziging
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !positie) return;

    const latlng: [number, number] = [positie.latitude, positie.longitude];

    if (!spelerMarkerRef.current) {
      spelerMarkerRef.current = L.circleMarker(latlng, {
        radius: 10,
        color: "#1E40AF",
        fillColor: "#3B82F6",
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(map);
    } else {
      spelerMarkerRef.current.setLatLng(latlng);
    }

    if (!accuracyCirkelRef.current) {
      accuracyCirkelRef.current = L.circle(latlng, {
        radius: positie.accuracy,
        color: "#3B82F6",
        fillColor: "#3B82F6",
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map);
    } else {
      accuracyCirkelRef.current.setLatLng(latlng).setRadius(positie.accuracy);
    }

    if (!gecenterRef.current) {
      map.setView(latlng, ZOOM_SPELER);
      gecenterRef.current = true;
    }
  }, [positie, kaartKlaar]);

  // Punt-markers en polyline bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    puntMarkersRef.current.forEach((m) => m.remove());
    puntMarkersRef.current.clear();

    // Polyline langs verwerkte punten
    const polylinePunten = punten
      .filter((p) => verwerktIds.has(p.id))
      .map((p): [number, number] => [p.latitude, p.longitude]);

    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polylinePunten.length >= 2) {
      polylineRef.current = L.polyline(polylinePunten, {
        color: "#1E40AF", weight: 3, opacity: 0.6,
      }).addTo(map);
    }

    punten.forEach((punt) => {
      const isVerwerkt = verwerktIds.has(punt.id);
      const isActief = punt.id === activePuntId;
      const isBereikt = bereiktIds.has(punt.id);

      // Verborgen toekomstige punten
      if (!isVerwerkt && !isActief && !isBereikt) return;

      // Ghosted punt: onzichtbaar maken
      if (punt.id === ghostedPuntId && !isVerwerkt) return;

      let kleur: string;
      let label: string;

      if (isVerwerkt) {
        kleur = "#16A34A"; label = "✓";
      } else if (isBereikt) {
        kleur = "#F59E0B"; label = "!";
      } else {
        kleur = "#1E40AF";
        label = punt.type === "eindpunt" ? "🏁" : "?";
      }

      const puls = isActief
        ? `animation:puls 1.4s ease-in-out infinite;`
        : "";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${kleur};border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          font-size:${punt.type === "eindpunt" ? "17px" : "13px"};
          font-weight:700;color:#fff;${puls}
        ">${label}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([punt.latitude, punt.longitude], { icon, interactive: false }).addTo(map);
      puntMarkersRef.current.set(punt.id, marker);
    });
  }, [punten, verwerktIds, bereiktIds, activePuntId, ghostedPuntId, kaartKlaar]);

  // Stippellijn naar het actieve punt, zodra dat punt zichtbaar is
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    guideLijnRef.current?.remove();
    guideLijnRef.current = null;

    const actiefPunt = punten.find((p) => p.id === activePuntId);
    if (!positie || !actiefPunt || activePuntId === ghostedPuntId) return;

    guideLijnRef.current = L.polyline(
      [[positie.latitude, positie.longitude], [actiefPunt.latitude, actiefPunt.longitude]],
      { color: "#8b5cf6", weight: 2.5, opacity: 0.75, dashArray: "6 8", interactive: false }
    ).addTo(map);
  }, [positie, punten, activePuntId, ghostedPuntId, kaartKlaar]);

  // Speciale item markers bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Alle bestaande markers verwijderen en opnieuw tekenen
    specialeItemMarkersRef.current.forEach((m) => m.remove());
    specialeItemMarkersRef.current.clear();

    specialeItems.forEach((item) => {
      if (item.claimed) return;

      // Vraagteken iets groter en pulserend, zodat hij extra opvalt
      const isVraagteken = item.type === "vraagteken";
      const maat = isVraagteken ? 48 : 42;
      const icon = L.divIcon({
        className: "",
        html: `<img src="/items/${item.type}.png" alt="" style="
          width:${maat}px;height:${maat}px;display:block;
          filter:drop-shadow(0 3px 5px rgba(0,0,0,0.55))${isVraagteken ? " drop-shadow(0 0 8px rgba(255,217,59,0.9))" : ""};
          ${isVraagteken ? "animation:pr-vraagteken-puls 1.6s ease-in-out infinite;" : ""}
        " />`,
        iconSize: [maat, maat],
        iconAnchor: [maat / 2, maat / 2],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon, interactive: false }).addTo(map);
      specialeItemMarkersRef.current.set(item.id, marker);
    });
  }, [specialeItems, kaartKlaar]);

  // Andere spelers bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const nu = Date.now();

    // Alleen teams met een plek tonen (dat is alleen tijdens een eigen radar). Wat geen plek
    // meer heeft (radar afgelopen), verdwijnt meteen van de kaart.
    const zichtbaar = andereSpelers.filter((s) => s.latitude != null && s.longitude != null && s.created_at);
    const actieveIds = new Set(zichtbaar.map((s) => s.session_id));
    andereSpelersMarkersRef.current.forEach((marker, id) => {
      if (!actieveIds.has(id)) { marker.remove(); andereSpelersMarkersRef.current.delete(id); }
    });

    zichtbaar.forEach((speler) => {
      const isVerouderd = nu - new Date(speler.created_at!).getTime() > VEROUDERD_MS;
      const kleur = isVerouderd ? "#9CA3AF" : "#F97316";
      const label = isVerouderd ? "?" : escapeHtml(speler.teamnaam.charAt(0).toUpperCase());
      const naam = isVerouderd ? `${escapeHtml(speler.teamnaam)}\n>2 min` : escapeHtml(speler.teamnaam);

      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:${kleur};border:${isVerouderd ? "2px dashed #9CA3AF" : "2px solid #fff"};
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
            display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:700;color:#fff;
          ">${label}</div>
          <div style="
            background:rgba(0,0,0,0.65);color:#fff;
            font-size:10px;white-space:nowrap;
            padding:1px 5px;border-radius:4px;line-height:1.3;
            text-align:center;
          ">${naam.replace("\n", "<br/>")}</div>
        </div>`,
        iconSize: [32, 52],
        iconAnchor: [16, 16],
      });

      const bestaand = andereSpelersMarkersRef.current.get(speler.session_id);
      if (bestaand) {
        bestaand.setLatLng([speler.latitude!, speler.longitude!]);
        bestaand.setIcon(icon);
      } else {
        const marker = L.marker([speler.latitude!, speler.longitude!], { icon, interactive: false }).addTo(map);
        andereSpelersMarkersRef.current.set(speler.session_id, marker);
      }
    });
  }, [andereSpelers, kaartKlaar]);

  return (
    <>
      <style>{`
        @keyframes pr-vraagteken-puls {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes puls {
          0%   { box-shadow: 0 0 0 0 rgba(30,64,175,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(30,64,175,0); }
          100% { box-shadow: 0 0 0 0 rgba(30,64,175,0); }
        }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
