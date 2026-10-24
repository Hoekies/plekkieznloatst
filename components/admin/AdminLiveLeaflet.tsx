"use client";

import { useEffect, useRef, useState } from "react";
import type { SpelerOverzicht, RoutePuntKort } from "@/lib/admin-live";
import type { SpeciaalItem } from "@/types/database";
import { escapeHtml } from "@/lib/html";
import { voegBasiskaartToe, bewaardeStijl, bewaarStijl, type Basiskaart, type KaartStijl, ruimKaartOp, laadLeafletCss } from "@/lib/basiskaart";
import { speelgebiedLaag } from "@/lib/speelgebied";
import KaartStijlKnoppen from "@/components/shared/KaartStijlKnoppen";
import KaartBediening from "@/components/shared/KaartBediening";
import Icoon from "@/components/admin/Icoon";

interface Props {
  spelers: SpelerOverzicht[];
  route_punten: RoutePuntKort[];
  speciale_items?: SpeciaalItem[];
  // Speltype: bij Verspreid is het eerste punt het startpunt (🏠), net als in de route-editor
  modus?: string | null;
  // Vaste kleur per speler (zelfde als op het dashboard)
  kleuren?: Map<string, string>;
  // Spoor van de laatste minuten per speler: een vervagende lijn achter de speler
  sporen?: Record<string, [number, number][]>;
  // Speler die de kaart volgt; slepen stopt het volgen
  volgId?: string | null;
  onStopVolgen?: () => void;
  // Kaartlagen van buitenaf (live kaart: knop in de bovenbalk); zonder: eigen keuze, onthouden per toestel
  lagen?: { sporen: boolean; items: boolean };
  onWisselLaag?: (laag: "sporen" | "items") => void;
}

export default function AdminLiveLeaflet({ spelers, route_punten, speciale_items = [], modus = null, kleuren, sporen = {}, volgId = null, onStopVolgen, lagen: lagenVanBuiten, onWisselLaag }: Props) {
  const sporenLaagRef = useRef<import("leaflet").LayerGroup | null>(null);
  // Laatste versie van de callback voor de sleep-handler (die wordt maar één keer gekoppeld)
  const stopVolgenRef = useRef(onStopVolgen);
  stopVolgenRef.current = onStopVolgen;
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
  // Vectorkaart (OpenFreeMap): licht of donker; null = de oude plaatjes (geen WebGL)
  const basiskaartRef = useRef<Basiskaart | null>(null);
  const [stijl, setStijl] = useState<KaartStijl>("licht");
  // Kaartlagen: sporen en items los aan of uit (onthouden per toestel)
  const [eigenLagen, setLagen] = useState<{ sporen: boolean; items: boolean }>(() => {
    try { return { sporen: true, items: true, ...JSON.parse(localStorage.getItem("pr_live_lagen") ?? "{}") }; } catch { return { sporen: true, items: true }; }
  });
  const lagen = lagenVanBuiten ?? eigenLagen;
  const wisselLaag = (k: "sporen" | "items") => onWisselLaag ? onWisselLaag(k) : setLagen((l) => {
    const nieuw = { ...l, [k]: !l[k] };
    try { localStorage.setItem("pr_live_lagen", JSON.stringify(nieuw)); } catch { /* geen opslag */ }
    return nieuw;
  });
  const [vector, setVector] = useState(false);
  // Speelgebied: buiten de route iets grijzer
  const gebiedRef = useRef<ReturnType<typeof speelgebiedLaag> | null>(null);
  function kiesStijl(s: KaartStijl) {
    setStijl(s);
    bewaarStijl(s);
    basiskaartRef.current?.zetStijl(s);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    async function init() {
      const L = (await import("leaflet")).default;
      if (!mounted || !containerRef.current || mapRef.current) return;

      LRef.current = L;

      laadLeafletCss();

      const map = L.map(containerRef.current, {
        zoom: 14,
        center: [52.37, 4.9],
        zoomControl: true,
        attributionControl: false,
      });

      map.on("dragstart", () => { setVolgen(false); stopVolgenRef.current?.(); });
      sporenLaagRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;
      gebiedRef.current = speelgebiedLaag(L, map);
      setKaartKlaar(true);

      // Basiskaart daarna: vectortegels van OpenFreeMap (scherp op elk zoomniveau),
      // anders de gewone OSM-plaatjes. Markers en sporen staan er al.
      const beginStijl = bewaardeStijl("donker");
      setStijl(beginStijl);
      voegBasiskaartToe(L, map, beginStijl).then((b) => {
        if (!mounted) return;
        basiskaartRef.current = b;
        setVector(b.vector);
      });
    }

    init();

    // Vak groter of kleiner (menu ingeklapt): de kaart past zich aan
    const vak = containerRef.current;
    const meet = typeof ResizeObserver !== "undefined" && vak ? new ResizeObserver(() => mapRef.current?.invalidateSize()) : null;
    if (meet && vak) meet.observe(vak);

    const spelerMarkers = spelerMarkersRef.current;
    const puntMarkers = puntMarkersRef.current;
    const specialeItemMarkers = specialeItemMarkersRef.current;

    return () => {
      mounted = false;
      meet?.disconnect();
      ruimKaartOp(mapRef.current);
      mapRef.current = null;
      LRef.current = null;
      sporenLaagRef.current = null;
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

    // Zelfde nummering als de route-editor: bij Verspreid 🏠 = startpunt en het rondje vanaf 1
    const hubModus = modus === "verspreid" && route_punten.length >= 3;
    // Teams die meedoen: hoeveel hebben elk punt al gehad, en wie loopt er nu heen?
    const teams = spelers.filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid");
    route_punten.forEach((punt, i) => {
      const isEind = punt.type === "eindpunt";
      const gehad = teams.filter((s) => s.bezochte_ids?.includes(punt.id)).length;
      const allemaal = teams.length > 0 && gehad === teams.length;
      const opWeg = teams.filter((s) => s.volgend_punt_id === punt.id);
      const nummer = isEind ? "🏁" : hubModus && i === 0 ? "🏠" : String(hubModus ? i : i + 1);
      const ring = opWeg.length ? `<span class="lk-punt-ring" style="border-color:${kleuren?.get(opWeg[0].player_id) ?? "#F97316"}"></span>` : "";
      const teller = gehad && !allemaal && teams.length > 1 ? `<span class="lk-punt-teller">${gehad}/${teams.length}</span>` : "";
      const icon = L.divIcon({
        className: "",
        html: `<div class="lk-punt${allemaal ? " lk-punt--gehad" : gehad ? " lk-punt--deels" : ""}${isEind ? " lk-punt--eind" : ""}">${ring}<span>${allemaal && !isEind ? "✓" : nummer}</span>${teller}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const uitleg = teams.length ? ` · ${gehad} van ${teams.length} teams geweest${opWeg.length ? ` · nu onderweg: ${opWeg.map((s) => s.display_name).join(", ")}` : ""}` : "";
      const marker = L.marker([punt.latitude, punt.longitude], { icon })
        .bindTooltip(escapeHtml(punt.name + uitleg), { permanent: false })
        .addTo(map);
      puntMarkersRef.current.set(punt.id, marker);
    });
  }, [route_punten, kaartKlaar, modus, spelers, kleuren]);

  // Speelgebied: alles buiten de route iets grijzer (donkerder bij de donkere kaart)
  useEffect(() => {
    gebiedRef.current?.(route_punten.map((p) => ({ lat: p.latitude, lng: p.longitude })), stijl === "donker");
  }, [route_punten, kaartKlaar, stijl]);

  // Spelermarkers bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Alleen wie nu speelt of gefinisht is: een gestopt (vervallen) spel hoort niet op de kaart
    const opKaart = spelers.filter((s) => (s.sessie_status === "actief" || s.sessie_status === "voltooid") && s.laatste_lat !== null);
    const actieveIds = new Set(opKaart.map((s) => s.player_id));
    spelerMarkersRef.current.forEach((marker, id) => {
      if (!actieveIds.has(id)) { marker.remove(); spelerMarkersRef.current.delete(id); }
    });

    const nieuwePosities: [number, number][] = [];

    opKaart.forEach((speler) => {
      if (speler.laatste_lat === null || speler.laatste_lng === null) return;
      const latlng: [number, number] = [speler.laatste_lat, speler.laatste_lng];
      nieuwePosities.push(latlng);

      const isKlaar = speler.sessie_status === "voltooid";
      const kleur = kleuren?.get(speler.player_id) ?? (isKlaar ? "#16A34A" : "#F97316");
      const label = isKlaar ? "🏁" : escapeHtml(speler.icon ?? speler.display_name.charAt(0).toUpperCase());
      const gevolgd = volgId === speler.player_id;
      const maat = gevolgd ? 44 : 34;

      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="
            width:${maat}px;height:${maat}px;border-radius:50%;
            background:#3a1f80;border:3px solid ${kleur};
            box-shadow:0 0 0 2px #fff, 0 2px 10px rgba(0,0,0,0.45)${gevolgd ? `, 0 0 18px ${kleur}` : ""};
            display:flex;align-items:center;justify-content:center;
            font-size:${gevolgd ? 22 : 17}px;font-weight:700;color:#fff;
          ">${label}</div>
          <div style="
            background:${kleur};color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.65);
            font-size:${gevolgd ? 12 : 10.5}px;font-weight:800;white-space:nowrap;
            padding:${gevolgd ? "2px 8px" : "1px 6px"};border-radius:999px;line-height:1.4;
            box-shadow:0 0 0 1.5px rgba(255,255,255,0.85), 0 2px 6px rgba(0,0,0,0.4);
          ">${escapeHtml(speler.display_name)}</div>
        </div>`,
        iconSize: [maat, maat + (gevolgd ? 22 : 20)],
        iconAnchor: [maat / 2, maat / 2],
      });

      const bestaand = spelerMarkersRef.current.get(speler.player_id);
      if (bestaand) {
        bestaand.setLatLng(latlng);
        bestaand.setIcon(icon);
        bestaand.setZIndexOffset(gevolgd ? 1000 : 0);
      } else {
        const marker = L.marker(latlng, { icon, interactive: false, zIndexOffset: gevolgd ? 1000 : 0 }).addTo(map);
        spelerMarkersRef.current.set(speler.player_id, marker);
      }
    });

    // Eén speler volgen: die blijft in het midden, ingezoomd
    const gevolgde = volgId ? spelers.find((s) => s.player_id === volgId && s.laatste_lat !== null) : undefined;
    if (gevolgde) {
      map.setView([gevolgde.laatste_lat!, gevolgde.laatste_lng!], Math.max(map.getZoom(), 17), { animate: true });
    } else if (volgen && nieuwePosities.length > 0) {
      // Spelers volgen: bij elke update alle teams in beeld houden
      map.fitBounds(L.latLngBounds(nieuwePosities), { padding: [60, 60], maxZoom: 17, animate: true });
    } else if (!routeGetoondRef.current && route_punten.length > 0) {
      // Nog geen spelers op pad: toon de route i.p.v. de standaardplek
      routeGetoondRef.current = true;
      map.fitBounds(L.latLngBounds(route_punten.map((p): [number, number] => [p.latitude, p.longitude])), { padding: [40, 40] });
    }
  }, [spelers, route_punten, volgen, kaartKlaar, kleuren, volgId]);

  // Stippellijn van elk team naar het punt waar het nu heen loopt, in de teamkleur
  const doelLaagRef = useRef<import("leaflet").LayerGroup | null>(null);
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    doelLaagRef.current ??= L.layerGroup().addTo(map);
    const laag = doelLaagRef.current;
    laag.clearLayers();
    for (const s of spelers) {
      if (s.sessie_status !== "actief" || s.laatste_lat == null || s.laatste_lng == null || !s.volgend_punt) continue;
      L.polyline([[s.laatste_lat, s.laatste_lng], [s.volgend_punt.lat, s.volgend_punt.lng]],
        { color: kleuren?.get(s.player_id) ?? "#F97316", weight: 3, opacity: 0.85, dashArray: "2 8", lineCap: "round", interactive: false }).addTo(laag);
    }
  }, [spelers, kleuren, kaartKlaar]);

  // 🔍 Alles in beeld: de hele route en alle teams, en weer meebewegen met de teams
  function allesInBeeld() {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    const plekken: [number, number][] = [
      ...route_punten.map((p): [number, number] => [p.latitude, p.longitude]),
      ...spelers.filter((s) => s.laatste_lat != null && s.laatste_lng != null).map((s): [number, number] => [s.laatste_lat!, s.laatste_lng!]),
    ];
    if (plekken.length) map.fitBounds(L.latLngBounds(plekken), { padding: [40, 40], maxZoom: 17, animate: true });
    // Niet meer één team of alleen de teams volgen, anders springt de kaart bij de volgende update weer weg
    setVolgen(false);
    stopVolgenRef.current?.();
  }

  // Spoor van de laatste minuten: in stukjes die naar het heden toe steeds feller worden
  useEffect(() => {
    const L = LRef.current;
    const laag = sporenLaagRef.current;
    if (!L || !laag) return;
    laag.clearLayers();
    if (!lagen.sporen) return;
    const STUKKEN = 6;
    for (const [id, punten] of Object.entries(sporen)) {
      const speler = spelers.find((s) => s.player_id === id);
      if (!speler || speler.sessie_status !== "actief") continue;
      // Tot de huidige plek doortrekken, zodat de lijn aan de speler vastzit
      const lijn = speler.laatste_lat !== null ? [...punten, [speler.laatste_lat, speler.laatste_lng!] as [number, number]] : punten;
      if (lijn.length < 2) continue;
      const kleur = kleuren?.get(id) ?? "#F97316";
      // Witte rand onder het hele spoor, zodat het op de kaart opvalt
      L.polyline(lijn, { color: "#FFFFFF", weight: 9, opacity: 0.6, lineCap: "round", lineJoin: "round", interactive: false }).addTo(laag);
      const per = Math.ceil((lijn.length - 1) / STUKKEN);
      for (let i = 0, n = 0; i < lijn.length - 1; i += per, n++) {
        const stuk = lijn.slice(i, Math.min(lijn.length, i + per + 1));
        const deel = (n + 1) / Math.ceil((lijn.length - 1) / per);
        L.polyline(stuk, { color: kleur, weight: 5, opacity: 0.12 + 0.75 * deel, lineCap: "round", lineJoin: "round", interactive: false }).addTo(laag);
      }
    }
  }, [sporen, spelers, kleuren, kaartKlaar, lagen.sporen]);

  // Speciale item markers bijwerken (admin ziet geclaimd = transparant)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    specialeItemMarkersRef.current.forEach((m) => m.remove());
    specialeItemMarkersRef.current.clear();
    if (!lagen.items) return;

    speciale_items.forEach((item) => {
      const icon = L.divIcon({
        className: "",
        html: `<img src="/items/${item.type}.webp" alt="" style="width:32px;height:32px;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));opacity:${item.claimed ? 0.3 : 1}" />`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([item.latitude, item.longitude], { icon })
        .bindTooltip(`${escapeHtml(item.name)}${item.claimed ? " (geclaimd)" : ""}`, { permanent: false })
        .addTo(map);
      specialeItemMarkersRef.current.set(item.id, marker);
    });
  }, [speciale_items, kaartKlaar, lagen.items]);

  // flex:1 i.p.v. height:100% — percentage-hoogtes door geneste containers bleken op
  // sommige mobiele browsers niet betrouwbaar te resolven (zelfde klasse bug als de
  // ontbrekende kaart in de route-editor). position+zIndex vormen een eigen stacking-
  // context, zodat Leaflet's interne panes (tot z-index 700) niet boven pagina-
  // elementen als het admin-hamburgermenu lekken.
  return (
    <div style={{ flex: 1, minHeight: 0, width: "100%", position: "relative", zIndex: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {/* Licht, donker of luchtfoto (zonder vectorkaart: licht of luchtfoto) */}
      {/* Linksonder: kaartlagen en licht/donker/luchtfoto in één paneel, zoals in de route-editor */}
      <KaartBediening>
        <div className="kaart-lagen">
          <button type="button" className={lagen.sporen ? "aan" : ""} aria-pressed={lagen.sporen} onClick={() => wisselLaag("sporen")} title="Gelopen sporen tonen of verbergen"><Icoon naam="sporen" /><span className="laag-tekst"> Sporen</span></button>
          <button type="button" className={lagen.items ? "aan" : ""} aria-pressed={lagen.items} onClick={() => wisselLaag("items")} title="Items op de kaart tonen of verbergen"><Icoon naam="items" /><span className="laag-tekst"> Items</span></button>
        </div>
        <KaartStijlKnoppen stijl={!vector && stijl === "donker" ? "licht" : stijl} onKies={kiesStijl} inBlok />
      </KaartBediening>
      {/* Onder de zoomknoppen: alles weer in beeld */}
      <button type="button" className="kaart-alles" onClick={allesInBeeld} title="Hele route en alle teams in beeld" aria-label="Alles in beeld"><Icoon naam="inbeeld" /></button>
      {!volgen && !volgId && (
        <button
          onClick={() => setVolgen(true)}
          className="btn-premium--cyan"
          style={{ position: "absolute", top: 12, left: 60, zIndex: 1000, fontSize: "0.8rem", padding: "8px 14px" }}>
          <Icoon naam="punt" /> Volg spelers
        </button>
      )}
    </div>
  );
}
