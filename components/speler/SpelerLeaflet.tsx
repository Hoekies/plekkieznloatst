"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpeciaalItem } from "@/types/database";
import type { SpelerLocatie } from "@/lib/types";
import { escapeHtml } from "@/lib/html";
import { voegBasiskaartToe, type Basiskaart, type KaartStijl, ruimKaartOp, laadLeafletCss } from "@/lib/basiskaart";
import { haversine } from "@/lib/geo";
import KaartStijlKnoppen from "@/components/shared/KaartStijlKnoppen";

const VEROUDERD_MS = 2 * 60 * 1000; // 2 minuten

// Item-iconen staan als /items/<type>.webp (zelfde stijl als de spelershandleiding)

interface Props {
  positie: GeolocationCoordinates | null;
  punten: RoutePunt[];
  verwerktIds: Set<string>;
  bereiktIds: Set<string>;
  activePuntId: string | null;
  // Doorlooppunten (geen scherm): klein bolletje in plaats van een rondje met teken
  stilleIds?: Set<string>;
  // Op volgorde: alle punten en de lijn ertussen meteen tonen
  heleRoute?: boolean;
  // ⛔ Verboden gebieden: rood gearceerd
  verbodenGebieden?: { naam: string; punten: [number, number][] }[];
  andereSpelers: SpelerLocatie[];
  specialeItems: SpeciaalItem[];
  // Teamicoon van de speler zelf (anders een blauwe stip)
  spelerIcoon?: string | null;
  // Vaste teamkleur (zelfde als in het beheer): ring om je eigen icoon
  teamKleur?: string | null;
  // Teamnaam onder het eigen icoon (zoals op de live kaart)
  spelerNaam?: string | null;
  // Elke keer dat dit getal verandert: de kaart centreren op de eigen plek (knop 🎯)
  centreerVerzoek?: number;
  // Hoogte (px) waarboven de knoppen voor licht/donker/luchtfoto staan (boven de itembalk)
  stijlOnder?: number | string;
  // Links in plaats van rechts (px van de linkerkant): op de spelerskaart naast 🎯
  stijlLinks?: number;
  ghostedPuntId: string | null;
  // Eerste meters na de start: welke kant op (het volgende punt); er komt een korte stippellijn die kant op
  richtingNaar?: { latitude: number; longitude: number } | null;
  // 🎉 Spelplezier: de vliegende schat en de eigen val (components/speler/Spelplezier.tsx)
  extraMarkers?: { id: string; lat: number; lng: number; emoji: string; titel: string }[];
}

const ZOOM_SPELER = 17;
const ZOOM_INIT = 14;

export default function SpelerLeaflet({ positie, punten, verwerktIds, bereiktIds, activePuntId, stilleIds, heleRoute = false, verbodenGebieden = [], andereSpelers, specialeItems, ghostedPuntId, richtingNaar = null, spelerIcoon = null, spelerNaam = null, teamKleur = null, stijlOnder = 84, stijlLinks, centreerVerzoek = 0, extraMarkers = [] }: Props) {
  const ring = teamKleur ?? "#3B82F6";
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  // GPS kan binnenkomen voordat Leaflet geladen is; effecten draaien opnieuw zodra de kaart klaar staat
  const [kaartKlaar, setKaartKlaar] = useState(false);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const andereSpelersMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const spelerMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const accuracyCirkelRef = useRef<import("leaflet").Circle | null>(null);
  const puntMarkersRef = useRef<Map<string, import("leaflet").Layer>>(new Map());
  const specialeItemMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
  const heleLijnRef = useRef<import("leaflet").Polyline | null>(null);
  const gebiedenRef = useRef<import("leaflet").Polygon[]>([]);
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    gebiedenRef.current.forEach((g) => g.remove());
    gebiedenRef.current = verbodenGebieden.filter((g) => g.punten.length >= 3).map((g) =>
      L.polygon(g.punten, { color: "#DC2626", weight: 2, fillColor: "#EF4444", fillOpacity: 0.25, dashArray: "6 4", interactive: false }).addTo(map));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verbodenGebieden, kaartKlaar]);
  const guideLijnRef = useRef<import("leaflet").Polyline | null>(null);
  const gecenterRef = useRef(false);
  // Licht, donker of luchtfoto met één knop; de kaart begint altijd licht
  const basiskaartRef = useRef<Basiskaart | null>(null);
  const [stijl, setStijl] = useState<KaartStijl>("licht");
  const [vector, setVector] = useState(false);
  function kiesStijl(s: KaartStijl) {
    // Zonder scherpe kaart (vectortegels) bestaat donker niet: door naar de luchtfoto
    if (s === "donker" && !vector) s = "luchtfoto";
    setStijl(s);
    basiskaartRef.current?.zetStijl(s);
  }

  // Kaart initialiseren
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let weg = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (weg || !containerRef.current) return;
      LRef.current = L;

      laadLeafletCss();

      const map = L.map(containerRef.current, {
        zoom: ZOOM_INIT,
        center: [52.37, 4.9],
        zoomControl: true,
        attributionControl: false,
      });

      mapRef.current = map;
      setKaartKlaar(true);
      // Scherpe kaart (vectortegels) met duidelijke paden, huizen en groen; anders de gewone OSM-plaatjes
      voegBasiskaartToe(L, map, "licht").then((b) => {
        if (!mapRef.current) return;
        basiskaartRef.current = b;
        setVector(b.vector);
      });
    }

    init();

    const puntMarkers = puntMarkersRef.current;
    const specialeItemMarkers = specialeItemMarkersRef.current;

    return () => {
      weg = true;
      ruimKaartOp(mapRef.current);
      mapRef.current = null;
      LRef.current = null;
      puntMarkers.clear();
      specialeItemMarkers.clear();
      guideLijnRef.current = null;
      gecenterRef.current = false;
    };
  }, []);

  // 🎯 Centreren op de eigen plek (zoomt zo nodig in tot het gewone spelersniveau)
  useEffect(() => {
    if (!centreerVerzoek || !positie || !mapRef.current) return;
    const map = mapRef.current;
    // iPhone: de adresbalk en thuisbalk veranderen de schermhoogte zonder dat Leaflet het merkt; eerst de maat
    // opnieuw meten, anders komt de eigen plek scheef in beeld
    map.invalidateSize({ pan: false });
    const doel: [number, number] = [positie.latitude, positie.longitude];
    const zoom = Math.max(map.getZoom(), ZOOM_SPELER);
    // Inzoomen met animatie hapert op de iPhone (de scherpe kaart loopt dan achter): inzoomen meteen,
    // alleen het verschuiven op hetzelfde zoomniveau gaat vloeiend
    if (zoom !== map.getZoom()) map.setView(doel, zoom, { animate: false });
    else map.panTo(doel, { animate: true, duration: 0.4 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreerVerzoek]);

  // Spelermarker bijwerken bij positiewijziging
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !positie) return;

    const latlng: [number, number] = [positie.latitude, positie.longitude];

    if (!spelerMarkerRef.current) {
      // Eigen icoon met de teamnaam eronder (zelfde opbouw als de tegenstanders en de live kaart)
      const naamLabel = spelerNaam
        ? `<div style="background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:700;white-space:nowrap;padding:1px 5px;border-radius:4px;line-height:1.3">${escapeHtml(spelerNaam)}</div>`
        : "";
      const icon = L.divIcon({
        className: "",
        html: spelerIcoon
          ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:40px;height:40px;border-radius:50%;box-sizing:border-box;background:#fff;border:3px solid ${ring};box-shadow:0 0 0 4px ${ring}55,0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1">${spelerIcoon}</div>${naamLabel}</div>`
          : `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:20px;height:20px;border-radius:50%;background:${ring};border:3px solid #fff;box-shadow:0 0 0 4px ${ring}55,0 2px 6px rgba(0,0,0,0.4)"></div>${naamLabel}</div>`,
        iconSize: spelerIcoon ? [40, 60] : [20, 40],
        iconAnchor: spelerIcoon ? [20, 20] : [10, 10],
      });
      spelerMarkerRef.current = L.marker(latlng, { icon, interactive: false, zIndexOffset: 2000 }).addTo(map);
    } else {
      spelerMarkerRef.current.setLatLng(latlng);
    }

    if (!accuracyCirkelRef.current) {
      accuracyCirkelRef.current = L.circle(latlng, {
        radius: positie.accuracy,
        color: "#3B82F6",
        fillColor: "#3B82F6",
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map);
    } else {
      accuracyCirkelRef.current.setLatLng(latlng).setRadius(positie.accuracy);
    }

    if (!gecenterRef.current) {
      map.setView(latlng, ZOOM_SPELER);
      gecenterRef.current = true;
    }
  // Icoon en naam veranderen tijdens het spel niet: de marker wordt één keer gemaakt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positie, kaartKlaar]);

  // Punt-markers en polyline bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    puntMarkersRef.current.forEach((m) => m.remove());
    puntMarkersRef.current.clear();

    // Polyline langs verwerkte punten
    const polylinePunten = punten
      .filter((p) => verwerktIds.has(p.id))
      .map((p): [number, number] => [p.latitude, p.longitude]);

    // Hele route: gestippelde lijn langs alle punten, onder de gelopen lijn
    heleLijnRef.current?.remove();
    heleLijnRef.current = null;
    if (heleRoute && punten.length >= 2) {
      heleLijnRef.current = L.polyline(punten.map((p): [number, number] => [p.latitude, p.longitude]), {
        color: "#7C3AED", weight: 3, opacity: 0.55, dashArray: "6 6",
      }).addTo(map);
    }

    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polylinePunten.length >= 2) {
      polylineRef.current = L.polyline(polylinePunten, {
        color: "#1E40AF", weight: 3, opacity: 0.6,
      }).addTo(map);
    }

    punten.forEach((punt) => {
      const isVerwerkt = verwerktIds.has(punt.id);
      const isActief = punt.id === activePuntId;
      const isBereikt = bereiktIds.has(punt.id);

      const isStil = !!stilleIds?.has(punt.id);
      const isLater = !isVerwerkt && !isActief && !isBereikt;

      // Toekomstige punten: verborgen, tenzij de hele route zichtbaar is
      if (isLater && !heleRoute) return;

      // Hele route: een later of gepasseerd stil punt is een klein bolletje op de lijn
      if (isStil && !isActief && !isBereikt && punt.type !== "eindpunt") {
        const bolletje = L.circleMarker([punt.latitude, punt.longitude], {
          radius: 5, color: "#fff", weight: 2, fillColor: isVerwerkt ? "#16A34A" : "#7C3AED", fillOpacity: 1, interactive: false,
        }).addTo(map);
        puntMarkersRef.current.set(punt.id, bolletje);
        return;
      }

      // Ghosted punt: onzichtbaar maken
      if (punt.id === ghostedPuntId && !isVerwerkt) return;

      let kleur: string;
      let label: string;

      if (isVerwerkt) {
        kleur = "#16A34A"; label = "✓";
      } else if (isBereikt) {
        kleur = "#F59E0B"; label = "!";
      } else if (isLater) {
        // Hele route: een later punt staat er al, maar rustiger
        kleur = "#7C3AED";
        label = punt.type === "eindpunt" ? "🏁" : punt.type === "informatiepunt" ? "i" : "?";
      } else {
        kleur = "#1E40AF";
        label = punt.type === "eindpunt" ? "🏁" : isStil ? "•" : punt.type === "informatiepunt" ? "i" : "?";
      }

      // Zwevende pin met schaduw op de grond; het volgende punt veert op en neer met een puls-ring
      const icon = L.divIcon({
        className: "",
        html: `<div class="pr-pin${isActief ? " pr-pin--actief" : ""}${isLater ? " pr-pin--later" : ""}" style="--pin:${kleur}">
          <span class="pr-pin-ring"></span><span class="pr-pin-schaduw"></span>
          <span class="pr-pin-kop"><span class="pr-pin-label" style="font-size:${punt.type === "eindpunt" ? "16px" : "14px"}">${label}</span></span>
        </div>`,
        iconSize: [40, 52],
        iconAnchor: [20, 43],
      });

      const marker = L.marker([punt.latitude, punt.longitude], { icon, interactive: false }).addTo(map);
      puntMarkersRef.current.set(punt.id, marker);
    });
  }, [punten, verwerktIds, bereiktIds, activePuntId, ghostedPuntId, kaartKlaar, heleRoute, stilleIds]);

  // Stippellijn naar het actieve punt, zodra dat punt zichtbaar is. Bij de eerste meters na de start:
  // een korte lijn (60 m) de goede kant op, zonder het volgende punt zelf te verklappen
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    guideLijnRef.current?.remove();
    guideLijnRef.current = null;

    if (!positie) return;
    const actiefPunt = punten.find((p) => p.id === activePuntId);
    if (actiefPunt && activePuntId !== ghostedPuntId) {
      guideLijnRef.current = L.polyline(
        [[positie.latitude, positie.longitude], [actiefPunt.latitude, actiefPunt.longitude]],
        { color: "#8b5cf6", weight: 2.5, opacity: 0.75, dashArray: "6 8", interactive: false }
      ).addTo(map);
    } else if (richtingNaar) {
      const deel = Math.min(1, 60 / Math.max(1, haversine(positie.latitude, positie.longitude, richtingNaar.latitude, richtingNaar.longitude)));
      guideLijnRef.current = L.polyline(
        [[positie.latitude, positie.longitude], [positie.latitude + (richtingNaar.latitude - positie.latitude) * deel, positie.longitude + (richtingNaar.longitude - positie.longitude) * deel]],
        { color: "#F59E0B", weight: 4, opacity: 0.9, dashArray: "2 9", lineCap: "round", interactive: false }
      ).addTo(map);
    }
  }, [positie, punten, activePuntId, ghostedPuntId, richtingNaar, kaartKlaar]);

  // Speciale item markers bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Alle bestaande markers verwijderen en opnieuw tekenen
    specialeItemMarkersRef.current.forEach((m) => m.remove());
    specialeItemMarkersRef.current.clear();

    specialeItems.forEach((item) => {
      if (item.claimed) return;

      // Vraagteken iets groter en pulserend, zodat hij extra opvalt
      const isVraagteken = item.type === "vraagteken";
      const maat = isVraagteken ? 48 : 42;
      const icon = L.divIcon({
        className: "",
        html: `<img src="/items/${item.type}.webp" alt="" style="
          width:${maat}px;height:${maat}px;display:block;
          filter:drop-shadow(0 3px 5px rgba(0,0,0,0.55))${isVraagteken ? " drop-shadow(0 0 8px rgba(255,217,59,0.9))" : ""};
          ${isVraagteken ? "animation:pr-vraagteken-puls 1.6s ease-in-out infinite;" : ""}
        " />`,
        iconSize: [maat, maat],
        iconAnchor: [maat / 2, maat / 2],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon, interactive: false, zIndexOffset: 1000 }).addTo(map);
      specialeItemMarkersRef.current.set(item.id, marker);
    });
  }, [specialeItems, kaartKlaar]);

  // 🎉 Schat en eigen val: een groot emoji dat zachtjes pulseert
  const extraLaagRef = useRef<import("leaflet").LayerGroup | null>(null);
  const extraSleutel = extraMarkers.map((m) => `${m.id}:${m.lat}:${m.lng}`).join("|");
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    extraLaagRef.current ??= L.layerGroup().addTo(map);
    const laag = extraLaagRef.current;
    laag.clearLayers();
    for (const m of extraMarkers) {
      const icon = L.divIcon({ className: "", html: `<div class="kaart-extra" title="${m.titel}">${m.emoji}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] });
      L.marker([m.lat, m.lng], { icon, interactive: false, zIndexOffset: 900 }).addTo(laag);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraSleutel, kaartKlaar]);

  // Andere spelers bijwerken
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const nu = Date.now();

    // Alleen teams met een plek tonen (dat is alleen tijdens een eigen radar). Wat geen plek
    // meer heeft (radar afgelopen), verdwijnt meteen van de kaart.
    const zichtbaar = andereSpelers.filter((s) => s.latitude != null && s.longitude != null && s.created_at);
    const actieveIds = new Set(zichtbaar.map((s) => s.session_id));
    andereSpelersMarkersRef.current.forEach((marker, id) => {
      if (!actieveIds.has(id)) { marker.remove(); andereSpelersMarkersRef.current.delete(id); }
    });

    zichtbaar.forEach((speler) => {
      const isVerouderd = nu - new Date(speler.created_at!).getTime() > VEROUDERD_MS;
      const kleur = isVerouderd ? "#9CA3AF" : "#F97316";
      // Het icoon van het team (zoals bij het kiezen van een tegenstander), anders de eerste letter
      const label = isVerouderd ? "?" : escapeHtml(speler.icon ?? speler.teamnaam.charAt(0).toUpperCase());
      const naam = isVerouderd ? `${escapeHtml(speler.teamnaam)}\n>2 min` : escapeHtml(speler.teamnaam);

      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="
            width:38px;height:38px;border-radius:50%;box-sizing:border-box;
            background:${speler.icon && !isVerouderd ? "#fff" : kleur};border:3px ${isVerouderd ? "dashed" : "solid"} ${kleur};
            box-shadow:0 0 0 3px rgba(249,115,22,0.25),0 2px 6px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
            font-size:${speler.icon && !isVerouderd ? 21 : 13}px;font-weight:700;color:#fff;line-height:1;
          ">${label}</div>
          <div style="
            background:rgba(0,0,0,0.65);color:#fff;
            font-size:10px;white-space:nowrap;
            padding:1px 5px;border-radius:4px;line-height:1.3;
            text-align:center;
          ">${naam.replace("\n", "<br/>")}</div>
        </div>`,
        iconSize: [38, 58],
        iconAnchor: [19, 19],
      });

      const bestaand = andereSpelersMarkersRef.current.get(speler.session_id);
      if (bestaand) {
        bestaand.setLatLng([speler.latitude!, speler.longitude!]);
        bestaand.setIcon(icon);
      } else {
        const marker = L.marker([speler.latitude!, speler.longitude!], { icon, interactive: false, zIndexOffset: 1500 }).addTo(map);
        andereSpelersMarkersRef.current.set(speler.session_id, marker);
      }
    });
  }, [andereSpelers, kaartKlaar]);

  return (
    <>
      <style>{`
        @keyframes pr-vraagteken-puls {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes puls {
          0%   { box-shadow: 0 0 0 0 rgba(30,64,175,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(30,64,175,0); }
          100% { box-shadow: 0 0 0 0 rgba(30,64,175,0); }
        }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {/* Net boven de itembalk (rechts, of links naast 🎯): licht, donker of luchtfoto (zonder vectorkaart geen donker) */}
      <KaartStijlKnoppen stijl={stijl} onKies={kiesStijl} verticaal enkel onderAfstand={stijlOnder} linksAfstand={stijlLinks} />
    </>
  );
}
