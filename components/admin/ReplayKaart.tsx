"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoutePuntKort } from "@/lib/admin-live";
import { escapeHtml } from "@/lib/html";
import { voegBasiskaartToe, bewaardeStijl } from "@/lib/basiskaart";

export type ReplayTeam = { player_id: string; naam: string; icon: string | null; gefinisht_op: number | null; spoor: [number, number, number][] };

const SNELHEDEN = [30, 60, 120, 300];

function klok(ms: number) {
  return new Date(ms).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Plek van een team op tijdstip t (tussen twee metingen in rechte lijn); index = laatste meting vóór t
function plekOp(spoor: [number, number, number][], t: number): { lat: number; lng: number; index: number } | null {
  if (!spoor.length || t < spoor[0][0]) return null;
  let lo = 0, hi = spoor.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (spoor[mid][0] <= t) lo = mid; else hi = mid - 1; }
  const a = spoor[lo], b = spoor[lo + 1];
  if (!b) return { lat: a[1], lng: a[2], index: lo };
  const f = (t - a[0]) / Math.max(1, b[0] - a[0]);
  return { lat: a[1] + (b[1] - a[1]) * f, lng: a[2] + (b[2] - a[2]) * f, index: lo };
}

// ⏪ Replay: het hele spel versneld afspelen, met alle teams tegelijk en hun spoor
export default function ReplayKaart({ teams, route_punten, kleuren }: { teams: ReplayTeam[]; route_punten: RoutePuntKort[]; kleuren: Map<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const lagenRef = useRef<Map<string, { lijn: import("leaflet").Polyline; marker: import("leaflet").Marker; finish: boolean }>>(new Map());
  const [klaar, setKlaar] = useState(false);

  const begin = useMemo(() => Math.min(...teams.map((t) => t.spoor[0][0])), [teams]);
  const eind = useMemo(() => Math.max(...teams.map((t) => Math.max(t.spoor[t.spoor.length - 1][0], t.gefinisht_op ?? 0))), [teams]);
  const [tijd, setTijd] = useState(begin);
  const [speelt, setSpeelt] = useState(false);
  const [snelheid, setSnelheid] = useState(60);
  const tijdRef = useRef(tijd);
  tijdRef.current = tijd;

  // Kaart opzetten
  useEffect(() => {
    let actief = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!actief || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      // Zelfde vectorkaart (en stijl) als de live kaart; laadt op de achtergrond
      voegBasiskaartToe(L, map, bewaardeStijl());
      // Routepunten klein en vaag, zodat de teams opvallen
      route_punten.forEach((p) => L.circleMarker([p.latitude, p.longitude], { radius: 6, color: "#fff", weight: 2, fillColor: "#1E40AF", fillOpacity: 0.8, interactive: false }).addTo(map));
      const alle = teams.flatMap((t) => t.spoor.map((p): [number, number] => [p[1], p[2]]));
      if (alle.length) map.fitBounds(L.latLngBounds(alle), { padding: [40, 40], maxZoom: 17 });
      mapRef.current = map;
      setKlaar(true);
    })();
    const lagen = lagenRef.current;
    return () => { actief = false; mapRef.current?.remove(); mapRef.current = null; lagen.clear(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Afspelen: per beeldje de tijd vooruit (snelheid × echte tijd)
  useEffect(() => {
    if (!speelt) return;
    let vorige = performance.now();
    let frame = 0;
    const stap = (nu: number) => {
      const nieuw = Math.min(eind, tijdRef.current + (nu - vorige) * snelheid);
      vorige = nu;
      setTijd(nieuw);
      if (nieuw >= eind) { setSpeelt(false); return; }
      frame = requestAnimationFrame(stap);
    };
    frame = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(frame);
  }, [speelt, snelheid, eind]);

  // Teams tekenen op de huidige tijd
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    for (const t of teams) {
      const plek = plekOp(t.spoor, tijd);
      let laag = lagenRef.current.get(t.player_id);
      if (!plek) { if (laag) { laag.lijn.remove(); laag.marker.remove(); lagenRef.current.delete(t.player_id); } continue; }
      const kleur = kleuren.get(t.player_id) ?? "#F97316";
      const gefinisht = !!t.gefinisht_op && tijd >= t.gefinisht_op;
      const lijn: [number, number][] = [...t.spoor.slice(0, plek.index + 1).map((p): [number, number] => [p[1], p[2]]), [plek.lat, plek.lng]];
      if (!laag || laag.finish !== gefinisht) {
        laag?.lijn.remove(); laag?.marker.remove();
        const label = gefinisht ? "🏁" : escapeHtml(t.icon ?? t.naam.charAt(0).toUpperCase());
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#1c0c45;border:3px solid ${kleur};box-shadow:0 0 0 2px #fff,0 2px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;">${label}</div>
            <div style="background:rgba(0,0,0,0.7);color:#fff;font-size:10px;white-space:nowrap;padding:1px 5px;border-radius:4px;">${escapeHtml(t.naam)}</div>
          </div>`,
          iconSize: [32, 50], iconAnchor: [16, 16],
        });
        laag = {
          lijn: L.polyline(lijn, { color: kleur, weight: 4, opacity: 0.75, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map),
          marker: L.marker([plek.lat, plek.lng], { icon, interactive: false }).addTo(map),
          finish: gefinisht,
        };
        lagenRef.current.set(t.player_id, laag);
      } else {
        laag.lijn.setLatLngs(lijn);
        laag.marker.setLatLng([plek.lat, plek.lng]);
      }
    }
  }, [tijd, teams, kleuren, klaar]);

  const duurMin = Math.round((eind - begin) / 60000);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", zIndex: 0 }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      </div>
      {/* Bediening: afspelen, tijd en snelheid */}
      <div className="replay-balk">
        <button type="button" className="rl-knop rl-knop--cyan replay-speel" aria-label={speelt ? "Pauze" : "Afspelen"}
          onClick={() => { if (!speelt && tijd >= eind) setTijd(begin); setSpeelt((s) => !s); }}>{speelt ? "⏸" : "▶"}</button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <input type="range" min={begin} max={eind} step={1000} value={tijd} onChange={(e) => setTijd(Number(e.target.value))} className="replay-schuif" aria-label="Tijd" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--muted)" }}>
            <span>{klok(begin)}</span>
            <strong style={{ color: "#fff", fontSize: "0.85rem" }}>{klok(tijd)}</strong>
            <span>{klok(eind)} · {duurMin} min</span>
          </div>
        </div>
        <div className="replay-snelheid">
          {SNELHEDEN.map((s) => (
            <button key={s} type="button" className={`rl-knop${snelheid === s ? " rl-knop--cyan" : ""}`} onClick={() => setSnelheid(s)}>{s}×</button>
          ))}
        </div>
      </div>
    </div>
  );
}
