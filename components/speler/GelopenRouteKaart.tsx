"use client";

import { useEffect, useRef } from "react";
import { escapeHtml } from "@/lib/html";

export type RouteSpoorPunt = { lat: number; lng: number };
export type BezochtPunt = { nr: number; naam: string; lat: number; lng: number };
export type KaartItem = { soort: "ingezet" | "ontvangen"; type: string; ander: string | null; lat: number; lng: number };

const ITEM_NAAM: Record<string, string> = {
  ster: "Ster", verdubbeling: "Verdubbeling", radar: "Radar", bom: "Bom", spook: "Spook",
  dief: "Dief", banaan: "Banaan", wissel: "Wissel", vraagteken: "Vraagteken", plekzooi: "Plek zooi",
};

// Kaart met de werkelijk gelopen weg (GPS-spoor) en de bezochte punten in volgorde
export default function GelopenRouteKaart({ spoor, punten, items = [] }: { spoor: RouteSpoorPunt[]; punten: BezochtPunt[]; items?: KaartItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!document.querySelector("#leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (!containerRef.current) return;
      map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const grenzen: [number, number][] = [];
      if (spoor.length > 1) {
        const lijn = spoor.map((p) => [p.lat, p.lng] as [number, number]);
        L.polyline(lijn, { color: "#8B5CF6", weight: 5, opacity: 0.9 }).addTo(map);
        grenzen.push(...lijn);
        // Start (groen) en eind (geblokt) van het spoor
        L.circleMarker(lijn[0], { radius: 8, color: "#fff", weight: 2, fillColor: "#22C55E", fillOpacity: 1 }).addTo(map).bindTooltip("Start");
        L.circleMarker(lijn[lijn.length - 1], { radius: 8, color: "#fff", weight: 2, fillColor: "#111827", fillOpacity: 1 }).addTo(map).bindTooltip("Finish");
      }
      for (const p of punten) {
        const icoon = L.divIcon({
          className: "",
          html: `<div style="width:26px;height:26px;border-radius:50%;background:#16A34A;border:2px solid #fff;color:#fff;font:700 12px sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4)">${p.nr}</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        });
        L.marker([p.lat, p.lng], { icon: icoon }).addTo(map).bindTooltip(escapeHtml(p.naam));
        grenzen.push([p.lat, p.lng]);
      }
      // Items: blauwe rand = ingezet, oranje rand = ontvangen, precies op de plek waar het gebeurde.
      // Alleen items op exact dezelfde plek schuiven een stukje op, zodat ze niet over elkaar vallen.
      const opPlek = new Map<string, number>();
      items.forEach((it) => {
        const sleutel = `${it.lat.toFixed(5)},${it.lng.toFixed(5)}`;
        const i = opPlek.get(sleutel) ?? 0;
        opPlek.set(sleutel, i + 1);
        const naam = ITEM_NAAM[it.type] ?? it.type;
        const tekst = it.soort === "ingezet"
          ? `${naam} ingezet${it.ander ? ` op ${it.ander}` : ""}`
          : it.type === "plekzooi" ? "In een plek zooi gelopen" : `${naam} gekregen van ${it.ander ?? "een ander team"}`;
        const rand = it.soort === "ingezet" ? "#22D3EE" : "#FB923C";
        const icoon = L.divIcon({
          className: "",
          html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid ${rand};box-shadow:0 2px 6px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center"><img src="/items/${it.type}.png" style="width:26px;height:26px" alt=""></div>`,
          iconSize: [34, 34], iconAnchor: [17 - i * 22, 17],
        });
        L.marker([it.lat, it.lng], { icon: icoon, zIndexOffset: 500 }).addTo(map!).bindPopup(escapeHtml(tekst));
      });

      if (grenzen.length) map.fitBounds(grenzen, { padding: [30, 30] });
      else map.setView([52.37, 4.9], 13);
    })();
    return () => { map?.remove(); };
  }, [spoor, punten, items]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 380, borderRadius: 16, overflow: "hidden" }} />;
}
