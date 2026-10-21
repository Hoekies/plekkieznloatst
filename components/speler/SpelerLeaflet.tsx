"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpeciaalItem } from "@/types/database";
import type { SpelerLocatie } from "@/lib/types";
import { escapeHtml } from "@/lib/html";
import { voegBasiskaartToe, type Basiskaart, type KaartStijl } from "@/lib/basiskaart";
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
  andereSpelers: SpelerLocatie[];
  specialeItems: SpeciaalItem[];
  // Teamicoon van de speler zelf (anders een blauwe stip)
  spelerIcoon?: string | null;
  // Teamnaam onder het eigen icoon (zoals op de live kaart)
  spelerNaam?: string | null;
  // Elke keer dat dit getal verandert: de kaart centreren op de eigen plek (knop 🎯)
  centreerVerzoek?: number;
  // Hoogte (px) waarboven de knoppen voor licht/donker/luchtfoto staan (boven de itembalk)
  stijlOnder?: number;
  ghostedPuntId: string | null;
}

const ZOOM_SPELER = 17;
const ZOOM_INIT = 14;

export default function SpelerLeaflet({ positie, punten, verwerktIds, bereiktIds, activePuntId, stilleIds, heleRoute = false, andereSpelers, specialeItems, ghostedPuntId, spelerIcoon = null, spelerNaam = null, stijlOnder = 84, centreerVerzoek = 0 }: Props) {
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

    async function init() {
      const L = (await import("leaflet")).default;
      LRef.current = L;

      if (!document.querySelector("#leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "/leaflet/1.9.4/leaflet.css";
        document.head.appendChild(link);
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
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
      mapRef.current?.remove();
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
    map.setView([positie.latitude, positie.longitude], Math.max(map.getZoom(), ZOOM_SPELER), { animate: true });
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
          ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:40px;height:40px;border-radius:50%;box-sizing:border-box;background:#fff;border:3px solid #3B82F6;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1">${spelerIcoon}</div>${naamLabel}</div>`
          : `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 6px rgba(0,0,0,0.4)"></div>${naamLabel}</div>`,
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

      const puls = isActief
        ? `animation:puls 1.4s ease-in-out infinite;`
        : "";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${kleur};border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          font-size:${punt.type === "eindpunt" ? "17px" : "13px"};
          font-weight:700;color:#fff;${puls}
        ">${label}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([punt.latitude, punt.longitude], { icon, interactive: false }).addTo(map);
      puntMarkersRef.current.set(punt.id, marker);
    });
  }, [punten, verwerktIds, bereiktIds, activePuntId, ghostedPuntId, kaartKlaar, heleRoute, stilleIds]);

  // Stippellijn naar het actieve punt, zodra dat punt zichtbaar is
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    guideLijnRef.current?.remove();
    guideLijnRef.current = null;

    const actiefPunt = punten.find((p) => p.id === activePuntId);
    if (!positie || !actiefPunt || activePuntId === ghostedPuntId) return;

    guideLijnRef.current = L.polyline(
      [[positie.latitude, positie.longitude], [actiefPunt.latitude, actiefPunt.longitude]],
      { color: "#8b5cf6", weight: 2.5, opacity: 0.75, dashArray: "6 8", interactive: false }
    ).addTo(map);
  }, [positie, punten, activePuntId, ghostedPuntId, kaartKlaar]);

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
      {/* Rechts, onder elkaar, net boven de itembalk: licht, donker of luchtfoto (zonder vectorkaart geen donker) */}
      <KaartStijlKnoppen stijl={stijl} onKies={kiesStijl} verticaal enkel onderAfstand={stijlOnder} />
    </>
  );
}
