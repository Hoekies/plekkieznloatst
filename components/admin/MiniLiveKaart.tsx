"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SpelerOverzicht, RoutePuntKort } from "@/lib/admin-live";
import { voegBasiskaartToe, bewaardeStijl, ruimKaartOp } from "@/lib/basiskaart";

// Kleine kaart op het dashboard: de punten (grijs) en waar de teams nu zijn (hun kleur).
// Alleen om even te kijken; tikken opent de grote live kaart.
export default function MiniLiveKaart({ spelers, punten, kleuren }: {
  spelers: SpelerOverzicht[]; punten: RoutePuntKort[]; kleuren: Map<string, string>;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const puntLaag = useRef<import("leaflet").LayerGroup | null>(null);
  const teamLaag = useRef<import("leaflet").LayerGroup | null>(null);
  const ingezoomd = useRef(false);

  useEffect(() => {
    let weg = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (weg || !containerRef.current || mapRef.current) return;
      if (!document.querySelector("#leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet"; link.href = "/leaflet/1.9.4/leaflet.css";
        document.head.appendChild(link);
      }
      const map = L.map(containerRef.current, {
        center: [52.37, 4.9], zoom: 13, zoomControl: false, attributionControl: false,
        dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false,
      });
      LRef.current = L;
      mapRef.current = map;
      puntLaag.current = L.layerGroup().addTo(map);
      teamLaag.current = L.layerGroup().addTo(map);
      voegBasiskaartToe(L, map, bewaardeStijl()).catch(() => {});
      tekenen();
    })();
    return () => { weg = true; ruimKaartOp(mapRef.current); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { tekenen(); });

  function tekenen() {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map || !puntLaag.current || !teamLaag.current) return;
    puntLaag.current.clearLayers();
    teamLaag.current.clearLayers();
    const plekken: [number, number][] = [];
    for (const p of punten) {
      plekken.push([p.latitude, p.longitude]);
      L.circleMarker([p.latitude, p.longitude], { radius: 3, color: "#64748B", weight: 1, fillColor: "#94A3B8", fillOpacity: 0.9, interactive: false }).addTo(puntLaag.current);
    }
    for (const s of spelers) {
      if (s.sessie_status !== "actief" || s.laatste_lat == null || s.laatste_lng == null) continue;
      plekken.push([s.laatste_lat, s.laatste_lng]);
      L.circleMarker([s.laatste_lat, s.laatste_lng], { radius: 6, color: "#fff", weight: 2, fillColor: kleuren.get(s.player_id) ?? "#A78BFA", fillOpacity: 1, interactive: false }).addTo(teamLaag.current);
    }
    // Eén keer inzoomen op alles; daarna blijft de kaart staan (geen gespring bij elke update)
    if (!ingezoomd.current && plekken.length) {
      ingezoomd.current = true;
      if (plekken.length === 1) map.setView(plekken[0], 15);
      else map.fitBounds(L.latLngBounds(plekken), { padding: [16, 16], maxZoom: 16 });
    }
  }

  const onderweg = spelers.filter((s) => s.sessie_status === "actief" && s.laatste_lat != null).length;
  return (
    <div role="link" tabIndex={0} className="mini-livekaart" onClick={() => router.push("/admin/live")}
      onKeyDown={(e) => { if (e.key === "Enter") router.push("/admin/live"); }} title="Open de live kaart">
      <div ref={containerRef} className="mini-livekaart-kaart" />
      <span className="mini-livekaart-label">📡 {onderweg} {onderweg === 1 ? "team" : "teams"} op de kaart · groot ▸</span>
    </div>
  );
}
