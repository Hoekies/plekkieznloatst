"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpeciaalItem } from "@/types/database";
import { escapeHtml } from "@/lib/html";
import { voegBasiskaartToe, bewaardeStijl, bewaarStijl, type Basiskaart, type KaartStijl, ruimKaartOp, laadLeafletCss } from "@/lib/basiskaart";
import KaartStijlKnoppen from "@/components/shared/KaartStijlKnoppen";
import KaartBediening from "@/components/shared/KaartBediening";
import { itemNaam, itemEmoji } from "@/components/speler/SpeciaalItemLegende";
import Icoon from "@/components/admin/Icoon";

// Leaflet wordt alleen client-side geladen
declare global {
  interface Window { L: typeof import("leaflet"); }
}


interface GuideCirkel {
  lat: number;
  lng: number;
  radiusM: number;
}

export interface TeamRoute {
  teamIndex: number;
  kleur: string;
  // Volledige looproute: start-hub, lus-punten in teamvolgorde, finish-hub
  coords: { lat: number; lng: number }[];
  // Per stuk (coords[i] → coords[i+1]) de lijn langs wegen en voetpaden; anders recht
  stukken?: { lat: number; lng: number }[][];
}

interface Props {
  // Knoppen voor kaartlagen (route-editor), samen met licht/donker/luchtfoto linksonder
  lagenKnoppen?: React.ReactNode;
  punten: RoutePunt[];
  addModus: boolean;
  geselecteerdId: string | null;
  specialeItems?: SpeciaalItem[];
  guideCirkel?: GuideCirkel | null;
  // Verspreid: eerste punt = start-hub (🏠), lus-punten genummerd vanaf 1
  hubModus?: boolean;
  teamRoutes?: TeamRoute[];
  // Per stuk tussen opeenvolgende punten de lijn langs de weg (zonder teamroutes)
  hoofdStukken?: { lat: number; lng: number }[][];
  // Genereer-preview
  centrumPunt?: { lat: number; lng: number } | null;
  // Gekozen finishplek bij een nieuwe route (eerste stappen), als vlaggetje op de kaart
  finishPunt?: { lat: number; lng: number } | null;
  ghostPunten?: { lat: number; lng: number }[];
  ghostRadiusM?: number;
  onCentrumVerplaatst?: (lat: number, lng: number) => void;
  onKlik: (lat: number, lng: number) => void;
  onMarkerVerplaatst: (id: string, lat: number, lng: number) => void;
  onMarkerKlik: (id: string) => void;
  onSpeciaalItemVerplaatst?: (id: string, lat: number, lng: number) => void;
  onSpeciaalItemKlik?: (id: string) => void;
  geselecteerdSpeciaalId?: string | null;
  vliegNaar?: { lat: number; lng: number; zoom?: number } | null;
  // Kaart zo zetten dat deze plekken allemaal in beeld zijn; boven = vrij te houden ruimte bovenaan (px, voor een venster)
  pasIn?: { punten: { lat: number; lng: number }[]; boven: number } | null;
  // Proeflopen: de testspeler en de weg die hij al liep
  loper?: { lat: number; lng: number } | null;
  // Verboden gebieden (rood) en het gebied dat je nu aan het tekenen bent
  verbodenGebieden?: { naam: string; punten: [number, number][] }[];
  tekenGebied?: [number, number][] | null;
  loperSpoor?: [number, number][];
  // Verspreid: voorgestelde plekken voor extra items; klikken plaatst het item
  itemVoorstellen?: { lat: number; lng: number; type: string }[];
  // Uitgeklapt team: die route dik met looprichting-pijlen, de andere vaag
  uitgelichtTeam?: number | null;
  onItemVoorstelKlik?: (v: { lat: number; lng: number; type: string }) => void;
}

export default function LeafletKaart({
  lagenKnoppen, punten, addModus, geselecteerdId, specialeItems = [],
  guideCirkel = null, hubModus = false, teamRoutes = [], hoofdStukken,
  centrumPunt = null, finishPunt = null, ghostPunten = [], ghostRadiusM = 0,
  onCentrumVerplaatst, onKlik, onMarkerVerplaatst, onMarkerKlik,
  onSpeciaalItemVerplaatst, onSpeciaalItemKlik, geselecteerdSpeciaalId = null,
  vliegNaar = null, pasIn = null, loper = null, loperSpoor = [], verbodenGebieden = [], tekenGebied = null, itemVoorstellen = [], onItemVoorstelKlik, uitgelichtTeam = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<import("leaflet").Map | null>(null);
  // Kaartbeeld: licht, donker of luchtfoto (zelfde keuze als de live kaart)
  const basiskaartRef = useRef<Basiskaart | null>(null);
  const [stijl, setStijl] = useState<KaartStijl>("licht");
  function kiesStijl(s: KaartStijl) {
    setStijl(s);
    bewaarStijl(s);
    basiskaartRef.current?.zetStijl(s);
  }
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const specialeItemMarkersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polylineRef = useRef<import("leaflet").Polyline | null>(null);
  const cirkelRef = useRef<import("leaflet").Circle | null>(null);
  const teamLijnenRef = useRef<import("leaflet").Polyline[]>([]);
  const startMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const centrumMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const ghostMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const voorstelMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const onItemVoorstelKlikRef = useRef(onItemVoorstelKlik);
  const ghostCirkelRef = useRef<import("leaflet").Circle | null>(null);
  const onKlikRef = useRef(onKlik);
  const onMarkerKlikRef = useRef(onMarkerKlik);
  const onMarkerVerplaatsdRef = useRef(onMarkerVerplaatst);
  const onCentrumVerplaatsdRef = useRef(onCentrumVerplaatst);
  const onSpeciaalItemVerplaatsdRef = useRef(onSpeciaalItemVerplaatst);
  const onSpeciaalItemKlikRef = useRef(onSpeciaalItemKlik);
  const prevPuntenLenRef = useRef(-1);
  const [kaartKlaar, setKaartKlaar] = useState(false);

  onKlikRef.current = onKlik;
  onItemVoorstelKlikRef.current = onItemVoorstelKlik;
  onMarkerKlikRef.current = onMarkerKlik;
  onMarkerVerplaatsdRef.current = onMarkerVerplaatst;
  onCentrumVerplaatsdRef.current = onCentrumVerplaatst;
  onSpeciaalItemVerplaatsdRef.current = onSpeciaalItemVerplaatst;
  onSpeciaalItemKlikRef.current = onSpeciaalItemKlik;

  useEffect(() => {
    if (!containerRef.current || kaartRef.current) return;

    let mounted = true;

    laadLeafletCss();

    import("leaflet").then((L) => {
      if (!mounted || !containerRef.current || kaartRef.current) return;

      const kaart = L.map(containerRef.current).setView([52.3676, 4.9041], 13);
      // Zelfde kaart als de live kaart: scherp, licht/donker of luchtfoto (handig om te zien of een plek bereikbaar is)
      const begin = bewaardeStijl();
      setStijl(begin);
      voegBasiskaartToe(L, kaart, begin).then((b) => { if (mounted) basiskaartRef.current = b; });

      kaart.on("click", (e) => {
        onKlikRef.current(e.latlng.lat, e.latlng.lng);
      });

      kaartRef.current = kaart;
      setKaartKlaar(true);
    });

    // Vak groter of kleiner (menu of puntenlijst ingeklapt): de kaart past zich aan
    const vak = containerRef.current;
    const meet = typeof ResizeObserver !== "undefined" && vak ? new ResizeObserver(() => kaartRef.current?.invalidateSize()) : null;
    if (meet && vak) meet.observe(vak);

    const markers = markersRef.current;
    const specialeItemMarkers = specialeItemMarkersRef.current;

    return () => {
      mounted = false;
      meet?.disconnect();
      ruimKaartOp(kaartRef.current);
      kaartRef.current = null;
      markers.clear();
      specialeItemMarkers.clear();
      cirkelRef.current = null;
      teamLijnenRef.current = [];
      startMarkersRef.current = [];
      centrumMarkerRef.current = null;
      ghostMarkersRef.current = [];
      ghostCirkelRef.current = null;
    };
  }, []);

  // Cursor bij addModus
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.cursor = addModus ? "crosshair" : "";
  }, [addModus]);

  // Markers en polyline bijhouden
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      const kaart = kaartRef.current!;
      const bestaandeIds = new Set(markersRef.current.keys());

      punten.forEach((pt, i) => {
        const isGeselecteerd = pt.id === geselecteerdId;
        const isHubStart = hubModus && i === 0;
        const label = pt.type === "eindpunt" ? "🏁" : isHubStart ? "🏠" : String(hubModus ? i : i + 1);
        const icon = maakIcoon(L, pt.type, label, isHubStart, isGeselecteerd);

        if (markersRef.current.has(pt.id)) {
          const marker = markersRef.current.get(pt.id)!;
          marker.setLatLng([pt.latitude, pt.longitude]);
          marker.setIcon(icon);
          bestaandeIds.delete(pt.id);
        } else {
          const marker = L.marker([pt.latitude, pt.longitude], { icon, draggable: true })
            .addTo(kaart)
            .on("click", () => onMarkerKlikRef.current(pt.id))
            .on("dragend", (e) => {
              const pos = (e.target as import("leaflet").Marker).getLatLng();
              onMarkerVerplaatsdRef.current(pt.id, pos.lat, pos.lng);
            });
          markersRef.current.set(pt.id, marker);
        }
      });

      bestaandeIds.forEach((id) => {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      });

      // Volgordelijn — bij verspreid tonen de gekleurde teamroutes de echte looproute
      polylineRef.current?.remove();
      polylineRef.current = null;
      if (punten.length >= 2 && teamRoutes.length === 0) {
        const lijn = hoofdStukken?.length === punten.length - 1
          ? hoofdStukken.flatMap((st, i) => (i === 0 ? st : st.slice(1))).map((c) => [c.lat, c.lng] as [number, number])
          : punten.map((p) => [p.latitude, p.longitude] as [number, number]);
        polylineRef.current = L.polyline(lijn, { color: "#1E40AF", weight: 2.5, opacity: 0.7, dashArray: "6 4" }).addTo(kaart);
      }

      if (punten.length !== prevPuntenLenRef.current && punten.length > 0) {
        prevPuntenLenRef.current = punten.length;
        const bounds = L.latLngBounds(punten.map((p) => [p.latitude, p.longitude]));
        // Eerst de echte maat van de kaart (de puntenlijst ernaast kan net verschenen zijn), anders valt een deel buiten beeld
        kaart.invalidateSize();
        if (punten.length === 1) {
          kaart.setView([punten[0].latitude, punten[0].longitude], 16);
        } else {
          kaart.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        }
      }
    });
  }, [punten, geselecteerdId, hubModus, teamRoutes.length, kaartKlaar, hoofdStukken]);

  // Speciale item markers
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      const kaart = kaartRef.current!;
      specialeItemMarkersRef.current.forEach((m) => m.remove());
      specialeItemMarkersRef.current.clear();
      specialeItems.forEach((item) => {
        const emoji = itemEmoji(item.type);
        const isGeselecteerd = item.id === geselecteerdSpeciaalId;
        const ring = isGeselecteerd ? "box-shadow:0 0 0 3px #fff,0 0 0 6px #00d9ff;" : "";
        const icon = L.divIcon({
          className: "",
          html: `<img src="/items/${item.type}.webp" alt="" style="width:28px;height:28px;display:block;border-radius:50%;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));opacity:${item.claimed ? 0.35 : 1};${ring}" />`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([item.latitude, item.longitude], { icon, draggable: true, zIndexOffset: 200 })
          .bindTooltip(`${emoji} ${escapeHtml(item.name)}`, { permanent: false })
          .on("click", () => onSpeciaalItemKlikRef.current?.(item.id))
          .on("dragend", (e) => {
            const pos = (e.target as import("leaflet").Marker).getLatLng();
            onSpeciaalItemVerplaatsdRef.current?.(item.id, pos.lat, pos.lng);
          })
          .addTo(kaart);
        specialeItemMarkersRef.current.set(item.id, marker);
      });
    });
  }, [specialeItems, geselecteerdSpeciaalId, kaartKlaar]);

  // Teamroutes: per team een gekleurde lijn (hub → lus in teamvolgorde → hub) + T-marker op het instappunt
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      teamLijnenRef.current.forEach((l) => l.remove());
      teamLijnenRef.current = [];
      startMarkersRef.current.forEach((m) => m.remove());
      startMarkersRef.current = [];

      if (teamRoutes.length === 0) return;

      teamRoutes.forEach((t, k) => {
        const uitgelicht = uitgelichtTeam === t.teamIndex;
        const vaag = uitgelichtTeam != null && !uitgelicht;
        // Lijnen lopen over dezelfde randen; schuif ze radiaal uit elkaar zodat elk team zichtbaar blijft
        const verschuivingM = uitgelicht ? 0 : (k - (teamRoutes.length - 1) / 2) * 4;
        // Per stuk de lijn langs de weg (of recht); de stukken van en naar de start niet verschuiven
        const stukken = t.coords.slice(1).map((c, i) => t.stukken?.[i] ?? [t.coords[i], c]);
        const stukLijnen = stukken.map((st, i) => {
          const naarStart = i === 0 || i === stukken.length - 1;
          return st.map((c) => verschuifRadiaal(c, t.coords[0], naarStart ? 0 : verschuivingM));
        });
        const lijnCoords = stukLijnen.flatMap((st, i) => (i === 0 ? st : st.slice(1)));
        // Witte rand onder de lijn: valt zo op elke ondergrond op
        const rand = L.polyline(lijnCoords, {
          color: "#FFFFFF", weight: (uitgelicht ? 6 : 3.5) + 4, opacity: vaag ? 0.1 : 0.85, interactive: false, lineCap: "round", lineJoin: "round",
        }).addTo(kaartRef.current!);
        teamLijnenRef.current.push(rand);
        const lijn = L.polyline(lijnCoords, {
          color: t.kleur, weight: uitgelicht ? 6 : 3.5, opacity: vaag ? 0.15 : uitgelicht ? 1 : 0.9, interactive: false,
        }).addTo(kaartRef.current!);
        if (uitgelicht) { rand.bringToFront(); lijn.bringToFront(); }
        teamLijnenRef.current.push(lijn);

        // Looprichting: een pijl halverwege elk stuk
        if (uitgelicht) {
          // Halverwege elk stuk, in de richting van de weg op die plek
          for (const st of stukLijnen) {
            if (st.length < 2) continue;
            const mid = Math.max(1, Math.floor(st.length / 2));
            const [aLat, aLng] = st[mid - 1], [bLat, bLng] = st[mid];
            const dx = (bLng - aLng) * Math.cos((aLat * Math.PI) / 180), dy = bLat - aLat;
            if (dx === 0 && dy === 0) continue;
            const hoek = (-Math.atan2(dy, dx) * 180) / Math.PI; // 0° = naar rechts (oost), met de klok mee
            const pijl = L.divIcon({
              className: "",
              html: `<div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;transform:rotate(${hoek}deg)">
                <div style="width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:13px solid ${t.kleur};filter:drop-shadow(0 0 2px #000)"></div>
              </div>`,
              iconSize: [22, 22], iconAnchor: [11, 11],
            });
            const m = L.marker([(aLat + bLat) / 2, (aLng + bLng) / 2], { icon: pijl, interactive: false, zIndexOffset: 250 })
              .addTo(kaartRef.current!);
            startMarkersRef.current.push(m);
          }
        }
        if (vaag) return;

        const instap = t.coords[1];
        if (!instap) return;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:26px;height:26px;border-radius:50%;
            background:${t.kleur};color:#fff;
            font-size:0.68rem;font-weight:800;
            display:flex;align-items:center;justify-content:center;
            border:2px solid #fff;
            text-shadow:0 1px 2px rgba(0,0,0,0.6);
            box-shadow:0 0 8px ${t.kleur};
          ">T${t.teamIndex}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 34],
        });
        const marker = L.marker([instap.lat, instap.lng], { icon, interactive: false, zIndexOffset: 300 })
          .addTo(kaartRef.current!);
        startMarkersRef.current.push(marker);
      });
    });
  }, [teamRoutes, kaartKlaar, uitgelichtTeam]);

  // Aanbevolen-afstand cirkel bij geselecteerd punt
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      cirkelRef.current?.remove();
      cirkelRef.current = null;
      if (!guideCirkel || guideCirkel.radiusM <= 0) return;
      cirkelRef.current = L.circle(
        [guideCirkel.lat, guideCirkel.lng],
        {
          radius: guideCirkel.radiusM,
          color: "#00d9ff",
          weight: 3,
          dashArray: "12 5",
          fill: true,
          fillColor: "#00d9ff",
          fillOpacity: 0.04,
          opacity: 0.9,
          interactive: false,
        }
      )
        .bindTooltip(`≈ ${Math.round(guideCirkel.radiusM)} m`, {
          permanent: true,
          direction: "bottom",
          opacity: 0.9,
        })
        .addTo(kaartRef.current!);
    });
  }, [guideCirkel, kaartKlaar]);

  // Voorgestelde plekken voor extra items (gouden stippelcirkel met ➕); klik = item plaatsen
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      voorstelMarkersRef.current.forEach((m) => m.remove());
      voorstelMarkersRef.current = [];
      itemVoorstellen.forEach((v) => {
        const icon = L.divIcon({
          className: "",
          // Voorstel: het item in kleur (zo zie je welk), maar half doorzichtig in een witte stippelrand met ＋
          html: `<div class="pr-voorstel" title="Voorstel: ${escapeHtml(itemNaam(v.type))} (klik om hier te plaatsen)" style="
            width:32px;height:32px;border-radius:50%;cursor:pointer;box-sizing:border-box;opacity:0.5;
            background:rgba(255,255,255,0.15);border:2px dashed #fff;
            display:flex;align-items:center;justify-content:center;position:relative;">
            <img src="/items/${v.type}.webp" style="width:20px;height:20px" alt="">
            <span style="position:absolute;right:-5px;top:-5px;width:14px;height:14px;border-radius:50%;background:#fff;color:#3a1f80;font:900 12px/14px sans-serif;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.4)">+</span>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const m = L.marker([v.lat, v.lng], { icon, zIndexOffset: 400 })
          .on("click", () => onItemVoorstelKlikRef.current?.(v))
          .addTo(kaartRef.current!);
        voorstelMarkersRef.current.push(m);
      });
    });
  }, [itemVoorstellen, kaartKlaar]);

  // Genereer-preview: draggable centerpunt + ghost markers + ghost cirkel
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      centrumMarkerRef.current?.remove();
      centrumMarkerRef.current = null;
      ghostMarkersRef.current.forEach((m) => m.remove());
      ghostMarkersRef.current = [];
      ghostCirkelRef.current?.remove();
      ghostCirkelRef.current = null;

      if (!centrumPunt) return;

      // Draggable centerpunt
      const centrumIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:38px;height:38px;border-radius:50%;
          background:rgba(0,217,255,0.15);
          border:2.5px solid #00d9ff;
          display:flex;align-items:center;justify-content:center;
          font-size:20px;color:#00d9ff;font-weight:900;
          box-shadow:0 0 0 5px rgba(0,217,255,0.12),0 0 16px rgba(0,217,255,0.4);
          cursor:grab;
        ">⊕</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      centrumMarkerRef.current = L.marker([centrumPunt.lat, centrumPunt.lng], {
        icon: centrumIcon,
        draggable: true,
        zIndexOffset: 1000,
      })
        .on("dragend", (e) => {
          const pos = (e.target as import("leaflet").Marker).getLatLng();
          onCentrumVerplaatsdRef.current?.(pos.lat, pos.lng);
        })
        .addTo(kaartRef.current!);

      if (ghostPunten.length === 0) return;

      // Ghost cirkel
      if (ghostRadiusM > 0) {
        ghostCirkelRef.current = L.circle(
          [centrumPunt.lat, centrumPunt.lng],
          {
            radius: ghostRadiusM,
            color: "#00d9ff",
            weight: 2,
            dashArray: "8 6",
            fill: true,
            fillColor: "#00d9ff",
            fillOpacity: 0.03,
            opacity: 0.5,
            interactive: false,
          }
        ).addTo(kaartRef.current!);
      }

      // Ghost punt-markers
      ghostPunten.forEach((p, i) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:30px;height:30px;border-radius:50%;
            background:rgba(0,217,255,0.1);
            border:2px dashed rgba(0,217,255,0.7);
            display:flex;align-items:center;justify-content:center;
            font-size:0.7rem;font-weight:800;
            color:rgba(0,217,255,0.9);
          ">${i + 1}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const marker = L.marker([p.lat, p.lng], { icon, interactive: false })
          .addTo(kaartRef.current!);
        ghostMarkersRef.current.push(marker);
      });
    });
  }, [centrumPunt, ghostPunten, ghostRadiusM, kaartKlaar]);

  // Finish (eerste stappen): een vlaggetje op de gekozen plek
  const finishMarkerRef = useRef<import("leaflet").Marker | null>(null);
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      finishMarkerRef.current?.remove();
      finishMarkerRef.current = null;
      if (!finishPunt || !kaartRef.current) return;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:38px;height:38px;border-radius:50%;background:#F59E0B;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:19px">🏁</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      finishMarkerRef.current = L.marker([finishPunt.lat, finishPunt.lng], { icon, interactive: false, zIndexOffset: 1100 }).addTo(kaartRef.current);
    });
  }, [finishPunt, kaartKlaar]);

  // ⛔ Verboden gebieden: rood gearceerd; tijdens het tekenen de hoekpunten en de lijn ertussen
  const gebiedLagenRef = useRef<import("leaflet").Layer[]>([]);
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      gebiedLagenRef.current.forEach((l) => l.remove());
      gebiedLagenRef.current = [];
      const kaart = kaartRef.current;
      if (!kaart) return;
      for (const g of verbodenGebieden) {
        if (g.punten.length < 3) continue;
        gebiedLagenRef.current.push(L.polygon(g.punten, { color: "#DC2626", weight: 2, fillColor: "#EF4444", fillOpacity: 0.22, dashArray: "6 4", interactive: false })
          .bindTooltip(`⛔ ${escapeHtml(g.naam)}`, { permanent: false, direction: "center" }).addTo(kaart));
      }
      if (tekenGebied?.length) {
        gebiedLagenRef.current.push(L.polyline(tekenGebied.length > 2 ? [...tekenGebied, tekenGebied[0]] : tekenGebied, { color: "#DC2626", weight: 3, dashArray: "4 4", interactive: false }).addTo(kaart));
        tekenGebied.forEach((p) => gebiedLagenRef.current.push(L.circleMarker(p, { radius: 5, color: "#fff", weight: 2, fillColor: "#DC2626", fillOpacity: 1, interactive: false }).addTo(kaart)));
      }
    });
  }, [verbodenGebieden, tekenGebied, kaartKlaar]);

  // Proeflopen: 🚶 op de plek van de testspeler, met een oranje lijn van de gelopen weg
  const loperRef = useRef<{ marker: import("leaflet").Marker; lijn: import("leaflet").Polyline } | null>(null);
  useEffect(() => {
    if (!kaartRef.current) return;
    import("leaflet").then((L) => {
      loperRef.current?.marker.remove();
      loperRef.current?.lijn.remove();
      loperRef.current = null;
      if (!loper || !kaartRef.current) return;
      const lijn = L.polyline(loperSpoor, { color: "#F97316", weight: 4, opacity: 0.85, dashArray: "8 6", interactive: false }).addTo(kaartRef.current);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:38px;height:38px;border-radius:50%;background:#F97316;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-size:20px">🚶</div>`,
        iconSize: [38, 38], iconAnchor: [19, 19],
      });
      const marker = L.marker([loper.lat, loper.lng], { icon, interactive: false, zIndexOffset: 3000 }).addTo(kaartRef.current);
      loperRef.current = { marker, lijn };
    });
  }, [loper, loperSpoor, kaartKlaar]);

  // Alle gevraagde plekken in beeld, onder het venster bovenaan
  useEffect(() => {
    if (!kaartRef.current || !pasIn || pasIn.punten.length === 0) return;
    const kaart = kaartRef.current;
    import("leaflet").then((L) => {
      kaart.invalidateSize();
      kaart.fitBounds(L.latLngBounds(pasIn.punten.map((p) => [p.lat, p.lng] as [number, number])),
        { paddingTopLeft: [30, pasIn.boven + 20], paddingBottomRight: [30, 30], maxZoom: 17 });
    });
  }, [pasIn, kaartKlaar]);

  // Navigeer naar een opgezochte plaatsnaam
  useEffect(() => {
    if (!kaartRef.current || !vliegNaar) return;
    kaartRef.current.setView([vliegNaar.lat, vliegNaar.lng], vliegNaar.zoom ?? 15);
  }, [vliegNaar, kaartKlaar]);

  // Centreren: alle punten en items in beeld (één punt: inzoomen op dat punt)
  function inBeeld() {
    const kaart = kaartRef.current;
    if (!kaart || !punten.length) return;
    import("leaflet").then((L) => {
      const plekken: [number, number][] = [
        ...punten.map((p): [number, number] => [p.latitude, p.longitude]),
        ...specialeItems.map((i): [number, number] => [i.latitude, i.longitude]),
      ];
      kaart.invalidateSize();
      if (plekken.length === 1) kaart.setView(plekken[0], 16, { animate: true });
      else kaart.fitBounds(L.latLngBounds(plekken), { padding: [40, 40], maxZoom: 17, animate: true });
    });
  }

  return (
    // z-index hier is bewust gezet: position:relative zonder z-index vormt geen eigen
    // stacking-context, waardoor Leaflet's interne panes (tot z-index 700 voor popups)
    // zouden "lekken" en boven pagina-elementen als het admin-hamburgermenu komen te staan.
    <div style={{ flex: 1, position: "relative", minWidth: 0, zIndex: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {/* Onder + en −: centreren, de hele route (punten en items) weer in beeld zoals bij het openen */}
      {punten.length > 0 && (
        <button type="button" className="kaart-alles" onClick={inBeeld} title="Centreren: hele route in beeld" aria-label="Centreren"><Icoon naam="centreren" /></button>
      )}
      {/* Linksonder op de kaart: kaartlagen en licht/donker/luchtfoto in één blok */}
      <KaartBediening>
        {lagenKnoppen}
        <KaartStijlKnoppen stijl={stijl} onKies={kiesStijl} inBlok />
      </KaartBediening>
    </div>
  );
}

// Schuift een punt `meters` weg van (of naar) het middelpunt; 0 = ongewijzigd
function verschuifRadiaal(
  p: { lat: number; lng: number },
  midden: { lat: number; lng: number },
  meters: number,
): [number, number] {
  if (meters === 0) return [p.lat, p.lng];
  const mPerGraad = 111320;
  const cosLat = Math.cos((p.lat * Math.PI) / 180);
  const dx = (p.lng - midden.lng) * mPerGraad * cosLat;
  const dy = (p.lat - midden.lat) * mPerGraad;
  const lengte = Math.hypot(dx, dy);
  if (lengte < 1) return [p.lat, p.lng];
  return [
    p.lat + ((dy / lengte) * meters) / mPerGraad,
    p.lng + ((dx / lengte) * meters) / (mPerGraad * cosLat),
  ];
}

function maakIcoon(
  L: typeof import("leaflet"),
  type: RoutePunt["type"],
  label: string,
  isHubStart: boolean,
  geselecteerd: boolean
) {
  const bg = isHubStart ? "#16A34A" : type === "eindpunt" ? "#F59E0B" : type === "informatiepunt" ? "#06B6D4" : type === "doorlooppunt" ? "#64748B" : "#1E40AF";
  const ring = geselecteerd ? `box-shadow:0 0 0 3px #fff,0 0 0 5px ${bg};` : "";
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#fff;
      display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;
      border:2px solid #fff;${ring}transition:box-shadow 0.15s">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "",
  });
}
