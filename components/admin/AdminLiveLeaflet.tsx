"use client";

import { useEffect, useRef, useState } from "react";
import type { SpelerOverzicht, RoutePuntKort } from "@/lib/admin-live";
import type { SpeciaalItem } from "@/types/database";
import { escapeHtml } from "@/lib/html";

interface Props {
  spelers: SpelerOverzicht[];
  route_punten: RoutePuntKort[];
  speciale_items?: SpeciaalItem[];
}

export default function AdminLiveLeaflet({ spelers, route_punten, speciale_items = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const spelerMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const puntMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const specialeItemMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const routeGetoondRef = useRef(false);
  // Gegevens kunnen binnenkomen voordat Leaflet geladen is; effecten draaien opnieuw zodra de kaart klaar staat
  const [kaartKlaar, setKaartKlaar] = useState(false);
  // Kaart volgt de spelers tot de admin hem zelf versleept
  const [volgen, setVolgen] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    async function init() {
      const L = (await import("leaflet")).default;
      if (!mounted || !containerRef.current || mapRef.current) return;

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

      const map = L.map(containerRef.current, {
        zoom: 14,
        center: [52.37, 4.9],
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      map.on("dragstart", () => setVolgen(false));

      mapRef.current = map;
      setKaartKlaar(true);
    }

    init();

    const spelerMarkers = spelerMarkersRef.current;
    const puntMarkers = puntMarkersRef.current;
    const specialeItemMarkers = specialeItemMarkersRef.current;

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      LRef.current = null;
      spelerMarkers.clear();
      puntMarkers.clear();
      specialeItemMarkers.clear();
      routeGetoondRef.current = false;
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
  }, [route_punten, kaartKlaar]);

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
      const label = isKlaar ? "✓" : escapeHtml(speler.display_name.charAt(0).toUpperCase());

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
          ">${escapeHtml(speler.display_name)}</div>
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

    if (volgen && nieuwePosities.length > 0) {
      // Spelers volgen: bij elke update alle teams in beeld houden
      map.fitBounds(L.latLngBounds(nieuwePosities), { padding: [60, 60], maxZoom: 17, animate: true });
    } else if (!routeGetoondRef.current && route_punten.length > 0) {
      // Nog geen spelers op pad: toon de route i.p.v. de standaardplek
      routeGetoondRef.current = true;
      map.fitBounds(L.latLngBounds(route_punten.map((p): [number, number] => [p.latitude, p.longitude])), { padding: [40, 40] });
    }
  }, [spelers, route_punten, volgen, kaartKlaar]);

  // Speciale item markers bijwerken (admin ziet geclaimd = transparant)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    specialeItemMarkersRef.current.forEach((m) => m.remove());
    specialeItemMarkersRef.current.clear();

    speciale_items.forEach((item) => {
      const icon = L.divIcon({
        className: "",
        html: `<img src="/items/${item.type}.png" alt="" style="width:32px;height:32px;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));opacity:${item.claimed ? 0.3 : 1}" />`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([item.latitude, item.longitude], { icon })
        .bindTooltip(`${item.name}${item.claimed ? " (geclaimd)" : ""}`, { permanent: false })
        .addTo(map);
      specialeItemMarkersRef.current.set(item.id, marker);
    });
  }, [speciale_items, kaartKlaar]);

  // flex:1 i.p.v. height:100% — percentage-hoogtes door geneste containers bleken op
  // sommige mobiele browsers niet betrouwbaar te resolven (zelfde klasse bug als de
  // ontbrekende kaart in de route-editor). position+zIndex vormen een eigen stacking-
  // context, zodat Leaflet's interne panes (tot z-index 700) niet boven pagina-
  // elementen als het admin-hamburgermenu lekken.
  return (
    <div style={{ flex: 1, minHeight: 0, width: "100%", position: "relative", zIndex: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {!volgen && (
        <button
          onClick={() => setVolgen(true)}
          className="btn-premium--cyan"
          style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, fontSize: "0.8rem", padding: "8px 14px" }}>
          📍 Volg spelers
        </button>
      )}
    </div>
  );
}
