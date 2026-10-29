"use client";

import { useEffect, useRef } from "react";
import { voegBasiskaartToe, ruimKaartOp, laadLeafletCss } from "@/lib/basiskaart";

// 🗺️ Kaartje om een plek aan te tikken (kaartvraag): in de vraag-editor (het goede antwoord kiezen), bij de speler
// (een speld zetten) en in de feedback (de speld en de goede plek met een lijn ertussen). Zonder onKies alleen kijken.
export default function KaartPrikker({ centrum, speld, doel = null, onKies, hoogte = 260 }: {
  centrum: { lat: number; lng: number };
  speld: { lat: number; lng: number } | null;
  doel?: { lat: number; lng: number; straal: number } | null;
  onKies?: (lat: number, lng: number) => void;
  hoogte?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const laagRef = useRef<import("leaflet").LayerGroup | null>(null);
  const kiesRef = useRef(onKies);
  kiesRef.current = onKies;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    let weg = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (weg || !ref.current) return;
      laadLeafletCss();
      LRef.current = L;
      const map = L.map(ref.current, { zoom: 15, center: [centrum.lat, centrum.lng], zoomControl: true, attributionControl: false });
      mapRef.current = map;
      laagRef.current = L.layerGroup().addTo(map);
      voegBasiskaartToe(L, map, "licht");
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => kiesRef.current?.(e.latlng.lat, e.latlng.lng));
      teken();
    })();
    return () => { weg = true; ruimKaartOp(mapRef.current); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function teken() {
    const L = LRef.current, map = mapRef.current, laag = laagRef.current;
    if (!L || !map || !laag) return;
    laag.clearLayers();
    const icoon = (emoji: string) => L.divIcon({ className: "", html: `<div style="font-size:30px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))">${emoji}</div>`, iconSize: [0, 0] });
    if (doel) {
      L.circle([doel.lat, doel.lng], { radius: doel.straal, color: "#22C55E", weight: 2, fillOpacity: 0.15 }).addTo(laag);
      L.marker([doel.lat, doel.lng], { icon: icoon("🎯"), interactive: false }).addTo(laag);
    }
    if (speld) L.marker([speld.lat, speld.lng], { icon: icoon("📍"), interactive: false }).addTo(laag);
    if (speld && doel) {
      L.polyline([[speld.lat, speld.lng], [doel.lat, doel.lng]], { color: "#F97316", weight: 3, dashArray: "6 8" }).addTo(laag);
      map.fitBounds(L.latLngBounds([[speld.lat, speld.lng], [doel.lat, doel.lng]]), { padding: [40, 40], maxZoom: 17 });
    }
  }
  useEffect(() => { teken(); });

  return <div ref={ref} className="kaart-prikker" style={{ height: hoogte }} />;
}
