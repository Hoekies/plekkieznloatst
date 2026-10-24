"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoutePuntKort } from "@/lib/admin-live";
import { escapeHtml } from "@/lib/html";
import { laadMaplibre, pasStijlToe, webglMogelijk, bewaardeStijl, bewaarStijl, VECTOR_STIJL_URL, type KaartStijl, ruimKaartOp } from "@/lib/basiskaart";
import KaartStijlKnoppen from "@/components/shared/KaartStijlKnoppen";
import { toonMelding } from "@/components/admin/Melding";
import Icoon from "@/components/admin/Icoon";

export type ReplayTeam = { player_id: string; naam: string; icon: string | null; gefinisht_op: number | null; spoor: [number, number, number][] };

const SNELHEDEN = [30, 60, 120, 300];
const SCHUIN = 55;  // kantelhoek in graden

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

type GlMap = import("maplibre-gl").Map;
type GlMarker = import("maplibre-gl").Marker;

// ⏪ Replay: het hele spel versneld afspelen, met alle teams tegelijk en hun spoor.
// Een echte 3D-kaart (MapLibre): schuin bekijken, draaien, en de camera beweegt mee.
// 🎬 Film maken: de hele race in 30 seconden, opgenomen als video om te delen
const FILM_MS = 30000;

export default function ReplayKaart({ teams, route_punten, kleuren, titel = null }: { teams: ReplayTeam[]; route_punten: RoutePuntKort[]; kleuren: Map<string, string>; titel?: string | null }) {
  const [film, setFilm] = useState<number | null>(null);  // voortgang 0..1 tijdens het opnemen
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GlMap | null>(null);
  const markersRef = useRef<Map<string, { marker: GlMarker; finish: boolean }>>(new Map());
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [klaar, setKlaar] = useState(false);
  const [geenWebgl, setGeenWebgl] = useState(false);
  const [stijl, setStijl] = useState<KaartStijl>("licht");
  const [schuin, setSchuin] = useState(true);
  const [meebewegen, setMeebewegen] = useState(true);

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
    const markers = markersRef.current;
    (async () => {
      if (!webglMogelijk()) { setGeenWebgl(true); return; }
      const maplibre = await laadMaplibre();
      if (!actief || !containerRef.current || mapRef.current) return;
      maplibreRef.current = maplibre;
      const beginStijl = bewaardeStijl("donker");
      setStijl(beginStijl);
      const alle = teams.flatMap((t) => t.spoor.map((p): [number, number] => [p[2], p[1]]));
      const grenzen = alle.length ? alle.reduce((b, c) => b.extend(c), new maplibre.LngLatBounds(alle[0], alle[0])) : null;
      const map = new maplibre.Map({
        container: containerRef.current, style: VECTOR_STIJL_URL, attributionControl: false,
        ...(grenzen ? { bounds: grenzen, fitBoundsOptions: { padding: 50, maxZoom: 17 } } : { center: [5.3, 52.1] as [number, number], zoom: 7 }),
        pitch: SCHUIN, bearing: -12, maxPitch: 70,
        // Nodig om de kaart als film op te nemen (anders is het beeld leeg)
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      map.addControl(new maplibre.NavigationControl({ visualizePitch: true }), "top-left");
      map.on("style.load", () => {
        pasStijlToe(map, beginStijl, true);
        // Routepunten en sporen als lagen op de kaart
        map.addSource("pr-punten", { type: "geojson", data: { type: "FeatureCollection", features: route_punten.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })) } });
        map.addLayer({ id: "pr-punten", type: "circle", source: "pr-punten", paint: { "circle-radius": 6, "circle-color": "#1E40AF", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2, "circle-opacity": 0.85 } });
        map.addSource("pr-sporen", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "pr-sporen-rand", type: "line", source: "pr-sporen", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FFFFFF", "line-width": 8, "line-opacity": 0.8 } });
        map.addLayer({ id: "pr-sporen", type: "line", source: "pr-sporen", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "kleur"], "line-width": 4, "line-opacity": 0.85 } });
        if (actief) setKlaar(true);
      });
      // Zelf slepen of draaien: dan niet meer meebewegen
      map.on("dragstart", () => setMeebewegen(false));
      mapRef.current = map;
    })();
    return () => {
      actief = false;
      markers.forEach((m) => m.marker.remove());
      markers.clear();
      ruimKaartOp(mapRef.current);
      mapRef.current = null;
    };
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
    const map = mapRef.current, maplibre = maplibreRef.current;
    if (!map || !maplibre || !klaar) return;
    const lijnen: object[] = [];
    for (const t of teams) {
      const plek = plekOp(t.spoor, tijd);
      const bestaand = markersRef.current.get(t.player_id);
      if (!plek) { if (bestaand) { bestaand.marker.remove(); markersRef.current.delete(t.player_id); } continue; }
      const kleur = kleuren.get(t.player_id) ?? "#F97316";
      const gefinisht = !!t.gefinisht_op && tijd >= t.gefinisht_op;
      lijnen.push({
        type: "Feature", properties: { kleur },
        geometry: { type: "LineString", coordinates: [...t.spoor.slice(0, plek.index + 1).map((p) => [p[2], p[1]]), [plek.lng, plek.lat]] },
      });
      if (!bestaand || bestaand.finish !== gefinisht) {
        bestaand?.marker.remove();
        const el = document.createElement("div");
        const label = gefinisht ? "🏁" : escapeHtml(t.icon ?? t.naam.charAt(0).toUpperCase());
        el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#3a1f80;border:3px solid ${kleur};box-shadow:0 0 0 2px #fff,0 2px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;">${label}</div>
          <div style="background:rgba(0,0,0,0.7);color:#fff;font-size:10px;white-space:nowrap;padding:1px 5px;border-radius:4px;">${escapeHtml(t.naam)}</div>
        </div>`;
        const marker = new maplibre.Marker({ element: el, anchor: "top", offset: [0, -16] }).setLngLat([plek.lng, plek.lat]).addTo(map);
        markersRef.current.set(t.player_id, { marker, finish: gefinisht });
      } else {
        bestaand.marker.setLngLat([plek.lng, plek.lat]);
      }
    }
    const bron = map.getSource("pr-sporen") as { setData?: (d: object) => void } | undefined;
    bron?.setData?.({ type: "FeatureCollection", features: lijnen });
  }, [tijd, teams, kleuren, klaar]);

  // Camera beweegt mee: rustig naar het midden van de teams (niet elk beeldje, dat schokt)
  useEffect(() => {
    if (!meebewegen || !klaar) return;
    const t = setInterval(() => {
      const map = mapRef.current;
      if (!map) return;
      const plekken = teams.map((tm) => plekOp(tm.spoor, tijdRef.current)).filter((p): p is NonNullable<typeof p> => !!p);
      if (!plekken.length) return;
      const lng = plekken.reduce((s, p) => s + p.lng, 0) / plekken.length;
      const lat = plekken.reduce((s, p) => s + p.lat, 0) / plekken.length;
      map.easeTo({ center: [lng, lat], duration: 900 });
    }, 1000);
    return () => clearInterval(t);
  }, [meebewegen, klaar, teams]);

  // Neemt de kaart beeld voor beeld op in een eigen canvas, met de teams, de klok en een titel erop
  async function maakFilm() {
    const map = mapRef.current;
    if (!map || typeof MediaRecorder === "undefined") { toonMelding("Film maken werkt niet in deze browser. Probeer Chrome, Edge of Safari.", "fout"); return; }
    const gl = map.getCanvas();
    const schaal = Math.min(1, 1280 / gl.width);
    const doek = document.createElement("canvas");
    doek.width = Math.round(gl.width * schaal / 2) * 2; doek.height = Math.round(gl.height * schaal / 2) * 2;
    const ctx = doek.getContext("2d");
    if (!ctx) return;
    const soort = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((s) => MediaRecorder.isTypeSupported(s)) ?? "";
    const opname = new MediaRecorder(doek.captureStream(30), soort ? { mimeType: soort, videoBitsPerSecond: 5_000_000 } : undefined);
    const stukken: Blob[] = [];
    opname.ondataavailable = (e) => { if (e.data.size) stukken.push(e.data); };
    const klaar = new Promise<void>((r) => { opname.onstop = () => r(); });

    setSpeelt(false); setMeebewegen(true); setFilm(0);
    tijdRef.current = begin; setTijd(begin);
    await new Promise((r) => setTimeout(r, 400));
    opname.start();
    const start = performance.now();
    const px = doek.width / map.getContainer().clientWidth;
    await new Promise<void>((af) => {
      const beeld = (nu: number) => {
        const f = Math.min(1, (nu - start) / FILM_MS);
        const t = begin + (eind - begin) * f;
        tijdRef.current = t; setTijd(t); setFilm(f);
        ctx.drawImage(gl, 0, 0, doek.width, doek.height);
        // Teams: bolletje in de teamkleur met het icoon en de naam
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (const tm of teams) {
          const plek = plekOp(tm.spoor, t);
          if (!plek) continue;
          const p = map.project([plek.lng, plek.lat]);
          const x = p.x * px, y = p.y * px, r = 15 * px;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = "#3a1f80"; ctx.fill();
          ctx.lineWidth = 3 * px; ctx.strokeStyle = kleuren.get(tm.player_id) ?? "#F97316"; ctx.stroke();
          ctx.font = `${15 * px}px sans-serif`;
          ctx.fillStyle = "#fff";
          ctx.fillText(tm.gefinisht_op && t >= tm.gefinisht_op ? "🏁" : tm.icon ?? tm.naam.charAt(0).toUpperCase(), x, y + px);
          ctx.font = `bold ${11 * px}px sans-serif`;
          const b = ctx.measureText(tm.naam).width + 10 * px;
          ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(x - b / 2, y + r + 3 * px, b, 15 * px);
          ctx.fillStyle = "#fff"; ctx.fillText(tm.naam, x, y + r + 10.5 * px);
        }
        // Titel en klok bovenaan, voortgangsbalk onderaan
        ctx.fillStyle = "rgba(28,12,69,0.82)"; ctx.fillRect(0, 0, doek.width, 46 * px);
        ctx.textAlign = "left"; ctx.font = `bold ${20 * px}px sans-serif`; ctx.fillStyle = "#FFE680";
        ctx.fillText(`🏁 ${titel ?? "PointRush"}`, 14 * px, 23 * px);
        ctx.textAlign = "right"; ctx.fillStyle = "#fff";
        ctx.fillText(klok(t), doek.width - 14 * px, 23 * px);
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, doek.height - 6 * px, doek.width, 6 * px);
        ctx.fillStyle = "#FF8A00"; ctx.fillRect(0, doek.height - 6 * px, doek.width * f, 6 * px);
        if (f < 1) requestAnimationFrame(beeld);
        else setTimeout(af, 1500);  // eindbeeld even laten staan
      };
      requestAnimationFrame(beeld);
    });
    opname.stop();
    await klaar;
    setFilm(null);
    const type = opname.mimeType || soort || "video/webm";
    const bestand = new File([new Blob(stukken, { type })], `PointRush-replay${titel ? `-${titel.replace(/[^\p{L}\p{N}]+/gu, "-")}` : ""}.${type.includes("mp4") ? "mp4" : "webm"}`, { type });
    if (navigator.canShare?.({ files: [bestand] })) {
      await navigator.share({ files: [bestand], text: `🎬 Replay${titel ? ` van ${titel}` : ""}` }).catch(() => { /* geannuleerd */ });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(bestand); a.download = bestand.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
  }

  function kiesStijl(s: KaartStijl) {
    setStijl(s);
    bewaarStijl(s);
    if (mapRef.current) pasStijlToe(mapRef.current, s, false);
  }
  function wisselSchuin() {
    const nieuw = !schuin;
    setSchuin(nieuw);
    mapRef.current?.easeTo({ pitch: nieuw ? SCHUIN : 0, bearing: nieuw ? -12 : 0, duration: 800 });
  }

  const duurMin = Math.round((eind - begin) / 60000);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", zIndex: 0 }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
        {geenWebgl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", padding: 24, textAlign: "center" }}>
            De replay heeft een browser met WebGL nodig. Probeer het op een andere computer of telefoon.
          </div>
        )}
        {!geenWebgl && (
          <>
            {/* Rechtsboven: camera en licht/donker/luchtfoto in één paneel, zoals op de andere kaarten */}
            <div className="kaart-bediening replay-bediening" onClick={(e) => e.stopPropagation()}>
              <div className="kaart-lagen kaart-lagen--camera">
                <button type="button" className={meebewegen ? "aan" : ""} aria-pressed={meebewegen} onClick={() => setMeebewegen((m) => !m)} title="Camera beweegt mee met de teams"><Icoon naam="meebewegen" /> Meebewegen</button>
                <button type="button" className={schuin ? "aan" : ""} aria-pressed={schuin} onClick={wisselSchuin} title={schuin ? "Plat bekijken" : "Schuin bekijken"}><Icoon naam="schuin" /> Schuin</button>
              </div>
              <KaartStijlKnoppen stijl={stijl} onKies={kiesStijl} inBlok />
            </div>
          </>
        )}
      </div>
      {/* Bediening: afspelen, tijd en snelheid */}
      <div className="replay-balk">
        <button type="button" className="rl-knop rl-knop--cyan replay-speel" aria-label={speelt ? "Pauze" : "Afspelen"}
          onClick={() => { if (!speelt && tijd >= eind) setTijd(begin); setSpeelt((s) => !s); }}>{speelt ? <Icoon naam="pauze" /> : "▶"}</button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <input type="range" min={begin} max={eind} step={1000} value={tijd} onChange={(e) => setTijd(Number(e.target.value))} className="replay-schuif" aria-label="Tijd" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--muted)" }}>
            <span>{klok(begin)}</span>
            <strong style={{ color: "#fff", fontSize: "0.85rem" }}>{klok(tijd)}</strong>
            <span>{klok(eind)} · {duurMin} min</span>
          </div>
        </div>
        <button type="button" className="rl-knop" disabled={film !== null || !klaar} onClick={maakFilm}
          title="De hele race in 30 seconden als video, om te delen">{film !== null ? <><Icoon naam="film" />{` ${Math.round(film * 100)}%`}</> : <><Icoon naam="film" />{" Film"}</>}</button>
        <div className="replay-snelheid">
          {SNELHEDEN.map((s) => (
            <button key={s} type="button" className={`rl-knop${snelheid === s ? " rl-knop--cyan" : ""}`} onClick={() => setSnelheid(s)}>{s}×</button>
          ))}
        </div>
      </div>
    </div>
  );
}
