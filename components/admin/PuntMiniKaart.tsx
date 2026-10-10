"use client";

import { useEffect, useRef } from "react";

export type KaartPunt = { id: string; lat: number; lng: number; label: string };

// Klein kaartje bij het bewerken van een vraag: waar ligt dit punt? Het punt zelf groot
// met zijn radius, de andere punten van de route klein en vaag ter oriëntatie.
export default function PuntMiniKaart({ punt, radius, andere = [] }: {
  punt: KaartPunt;
  radius: number;
  andere?: KaartPunt[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<import("leaflet").Map | null>(null);
  const laagRef = useRef<import("leaflet").LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  function teken() {
    const L = LRef.current, kaart = kaartRef.current, laag = laagRef.current;
    if (!L || !kaart || !laag) return;
    laag.clearLayers();
    const bol = (label: string, groot: boolean) => L.divIcon({
      className: "",
      iconSize: groot ? [34, 34] : [22, 22],
      iconAnchor: groot ? [17, 17] : [11, 11],
      html: `<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font:800 ${groot ? 14 : 10}px system-ui;color:#fff;border:2px solid #fff;
        background:${groot ? "#00b8d9" : "rgba(30,64,175,0.55)"};box-shadow:0 2px 6px rgba(0,0,0,0.45);
        opacity:${groot ? 1 : 0.75}">${label}</div>`,
    });
    for (const p of andere) {
      if (p.id === punt.id) continue;
      L.marker([p.lat, p.lng], { icon: bol(p.label, false), interactive: false }).addTo(laag);
    }
    L.circle([punt.lat, punt.lng], { radius, color: "#00d9ff", weight: 2, fillOpacity: 0.12 }).addTo(laag);
    L.marker([punt.lat, punt.lng], { icon: bol(punt.label, true), interactive: false, zIndexOffset: 1000 }).addTo(laag);
    kaart.setView([punt.lat, punt.lng], 17);
  }

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    let actief = true;
    import("leaflet").then((L) => {
      if (!actief || !containerRef.current || kaartRef.current) return;
      LRef.current = L;
      const kaart = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(kaart);
      kaartRef.current = kaart;
      laagRef.current = L.layerGroup().addTo(kaart);
      teken();
      // De kolom krijgt zijn hoogte pas na de eerste opmaak
      setTimeout(() => kaartRef.current?.invalidateSize(), 100);
    });
    return () => { actief = false; kaartRef.current?.remove(); kaartRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ander punt of andere radius: opnieuw tekenen en centreren
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { teken(); }, [punt.id, punt.lat, punt.lng, radius, andere.length]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 240, borderRadius: 12, overflow: "hidden" }} />;
}
