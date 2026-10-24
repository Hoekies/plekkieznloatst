"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SpelerOverzicht, RoutePuntKort } from "@/lib/admin-live";
import { voegBasiskaartToe, bewaardeStijl, ruimKaartOp, laadLeafletCss } from "@/lib/basiskaart";

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
  // Laatst ingezoomde gebied: alleen opnieuw inzoomen als dat verandert (geen gespring bij elke update)
  const gebiedRef = useRef("");

  useEffect(() => {
    let weg = false;
    let waarnemer: ResizeObserver | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (weg || !containerRef.current || mapRef.current) return;
      laadLeafletCss();
      const map = L.map(containerRef.current, {
        center: [52.37, 4.9], zoom: 13, zoomControl: false, attributionControl: false,
        dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false,
      });
      LRef.current = L;
      mapRef.current = map;
      puntLaag.current = L.layerGroup().addTo(map);
      teamLaag.current = L.layerGroup().addTo(map);
      voegBasiskaartToe(L, map, bewaardeStijl("donker")).catch(() => {});
      tekenen();
      // Pas na de opbouw van de pagina weet de kaart hoe groot hij is: dan opnieuw passend inzoomen
      waarnemer = new ResizeObserver(() => { map.invalidateSize(); gebiedRef.current = ""; tekenen(); });
      waarnemer.observe(containerRef.current);
    })();
    return () => { weg = true; waarnemer?.disconnect(); ruimKaartOp(mapRef.current); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { tekenen(); });

  function tekenen() {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map || !puntLaag.current || !teamLaag.current) return;
    puntLaag.current.clearLayers();
    teamLaag.current.clearLayers();
    const puntPlekken: [number, number][] = [];
    for (const p of punten) {
      puntPlekken.push([p.latitude, p.longitude]);
      L.circleMarker([p.latitude, p.longitude], { radius: 5, color: "#fff", weight: 2, fillColor: "#7C3AED", fillOpacity: 1, interactive: false }).addTo(puntLaag.current);
    }
    const teamPlekken: [number, number][] = [];
    for (const s of spelers) {
      if (s.sessie_status !== "actief" || s.laatste_lat == null || s.laatste_lng == null) continue;
      teamPlekken.push([s.laatste_lat, s.laatste_lng]);
      L.circleMarker([s.laatste_lat, s.laatste_lng], { radius: 8, color: "#1E1B4B", weight: 3, fillColor: kleuren.get(s.player_id) ?? "#A78BFA", fillOpacity: 1, interactive: false }).addTo(teamLaag.current);
    }
    // Ingezoomd op de teams die spelen; nog niemand onderweg: de hele route
    const plekken = teamPlekken.length ? teamPlekken : puntPlekken;
    if (!plekken.length) return;
    const grenzen = L.latLngBounds(plekken);
    // Afgerond (±100 m): niet bij elke paar meter lopen opnieuw inzoomen
    const sleutel = grenzen.toBBoxString().split(",").map((g) => Number(g).toFixed(3)).join(",");
    if (sleutel === gebiedRef.current) return;
    gebiedRef.current = sleutel;
    if (plekken.length === 1) map.setView(plekken[0], 17);
    else map.fitBounds(grenzen, { padding: [24, 24], maxZoom: 17 });
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
