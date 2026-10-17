"use client";

import { useEffect, useRef } from "react";
import { haversine } from "@/lib/geo";

type Plek = { lat: number; lng: number };

// Vaste verschuiving per item (zelfde id = zelfde plek), zodat de kaart niet bij elke keer anders is
function verschuif(id: string, p: Plek): Plek {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hoek = (h % 360) * (Math.PI / 180);
  const meter = 50 + ((h >>> 9) % 70);  // 50 tot 120 meter van de echte plek
  return {
    lat: p.lat + (meter * Math.cos(hoek)) / 111320,
    lng: p.lng + (meter * Math.sin(hoek)) / (111320 * Math.cos((p.lat * Math.PI) / 180)),
  };
}

// Kaart van het speelgebied: een zachte zone om alle punten, geen route en geen punten.
// Items staan er wel op, maar een stukje verschoven van hun echte plek.
export default function VoorproefKaart({ punten, items }: { punten: Plek[]; items: { id: string; type: string; lat: number; lng: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let weg = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (weg || !ref.current || !punten.length) return;
      if (!document.querySelector("#leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      map = L.map(ref.current, {
        zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.25,
      });
      // crossOrigin: anders kan de kaart niet in de PDF worden overgenomen
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, crossOrigin: true }).addTo(map);

      const midden = {
        lat: punten.reduce((s, p) => s + p.lat, 0) / punten.length,
        lng: punten.reduce((s, p) => s + p.lng, 0) / punten.length,
      };
      const straal = Math.max(150, ...punten.map((p) => haversine(midden.lat, midden.lng, p.lat, p.lng))) + 150;
      const zone = L.circle([midden.lat, midden.lng], {
        radius: straal, color: "#FFD93B", weight: 3, dashArray: "8 8", fillColor: "#FFD93B", fillOpacity: 0.12,
      }).addTo(map);

      for (const i of items) {
        const p = verschuif(i.id, i);
        L.marker([p.lat, p.lng], {
          interactive: false,
          icon: L.divIcon({
            className: "",
            html: `<img src="/items/${i.type}.webp" alt="" style="width:30px;height:30px;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5))" />`,
            iconSize: [30, 30], iconAnchor: [15, 15],
          }),
        }).addTo(map);
      }
      map.fitBounds(zone.getBounds(), { padding: [10, 10] });
    })();
    return () => { weg = true; map?.remove(); };
  }, [punten, items]);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}
