"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Route, RoutePunt, SpeciaalItem, SpeciaalItemType } from "@/types/database";
import { haversine } from "@/lib/geo";
import { itemAdvies, voorgesteldePlekken, ITEM_GROEPEN } from "@/lib/item-advies";
import { schatTeamTijd, schatTeamPunten, formateerMinuten } from "@/lib/tijd-schatting";
import { STARTITEM_TYPES, MAX_PER_STARTITEM, startitemsVan } from "@/lib/startitems";
import { naamUitVraag } from "@/lib/punt-naam";
import { MODUS_INFO, ModusIcoon, ModusTegel } from "./RouteModus";

const LeafletKaart = dynamic(() => import("./LeafletKaart"), { ssr: false, loading: () => <div style={{ flex: 1, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Kaart laden…</div> });

// Korte uitleg per item (tooltip in de editor)
const ITEM_UITLEG: Record<string, string> = {
  ster: "Ster: het team krijgt meteen extra punten (sterwaarde).",
  verdubbeling: "Verdubbeling: de volgende vraag met punten telt dubbel.",
  radar: "Radar: 2 minuten zien waar de andere teams lopen.",
  bom: "Bom: een tegenstander verliest punten (bomwaarde).",
  spook: "Spook: het volgende punt van een tegenstander verdwijnt een tijdje.",
  dief: "Dief: de punten van het volgende goede antwoord van een tegenstander gaan naar dit team.",
  banaan: "Banaan: het volgende punt van een tegenstander ruilt met het punt daarna.",
  wissel: "Wissel: het team ruilt zijn score met een tegenstander.",
  vraagteken: "Vraagteken: een gok, van een jackpot tot punten kwijt.",
  plekzooi: "Plek zooi: onzichtbare val; wie erin loopt, staat even stil.",
};

type RouteMetPunten = Route & {
  route_points: (RoutePunt & { questions?: {
    id: string; points?: number; type?: string; question_text?: string | null;
    correct_text_answers?: string[] | null; numeric_answer?: number | null;
    answer_options?: { punten: number | null; text?: string | null; is_correct?: boolean }[];
  }[] })[];
};

const TEAM_KLEUREN = ["#ff3b5c", "#22c55e", "#ffd93b", "#8b5cf6", "#ff8a00", "#ec4899", "#14b8a6", "#00d9ff"];

export default function RouteEditorShell({ route: initRoute }: { route: RouteMetPunten }) {
  const zoekParams = useSearchParams();
  const [route, setRoute] = useState(initRoute);
  const [punten, setPunten] = useState<RoutePunt[]>(initRoute.route_points ?? []);
  // Welke punten een vraag hebben (de pagina laadt opnieuw na het bewerken van een vraag)
  const [vraagPuntIds] = useState(() => new Set(
    (initRoute.route_points ?? []).filter((p) => (p.questions?.length ?? 0) > 0).map((p) => p.id),
  ));
  // Naamvoorstel per punt, bedacht uit de vraag of het goede antwoord (knop 💡 in het puntpaneel)
  const [naamVoorstellen] = useState(() => new Map(
    (initRoute.route_points ?? []).filter((p) => p.questions?.length && p.questions[0].type).map((p) => {
      const v = p.questions![0];
      return [p.id, naamUitVraag({ ...v, type: v.type! })] as const;
    }),
  ));
  // Maximaal te halen punten per vraag (hoogste van de vraagpunten en de punten per antwoord)
  const [vraagMaxPunten] = useState(() => new Map(
    (initRoute.route_points ?? []).filter((p) => p.questions?.length).map((p) => {
      const v = p.questions![0];
      const perAntwoord = (v.answer_options ?? []).map((o) => o.punten).filter((n): n is number => typeof n === "number");
      return [p.id, Math.max(v.points ?? 0, ...perAntwoord)] as const;
    }),
  ));
  const [geselecteerd, setGeselecteerd] = useState<RoutePunt | null>(null);
  const [addModus, setAddModus] = useState(false);
  const [addSpeciaalModus, setAddSpeciaalModus] = useState(false);
  const [specialeItems, setSpecialeItems] = useState<SpeciaalItem[]>([]);
  const [geselecteerdSpeciaal, setGeselecteerdSpeciaal] = useState<SpeciaalItem | null>(null);
  const [actieveTab, setActieveTab] = useState<"punten" | "items">("punten");
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  // Verspreid: teams die het rondje andersom lopen
  const [omgekeerdeTeams, setOmgekeerdeTeams] = useState<number[]>(initRoute.omgekeerde_teams ?? []);
  async function wisselAndersom(team: number) {
    const nieuw = omgekeerdeTeams.includes(team) ? omgekeerdeTeams.filter((t) => t !== team) : [...omgekeerdeTeams, team];
    setOmgekeerdeTeams(nieuw);
    await fetch(`/api/admin/routes/${initRoute.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ omgekeerde_teams: nieuw }),
    });
  }
  // Het opengeklapte team wordt op de kaart uitgelicht (dikke lijn met looprichting)
  const [uitgelichtTeam, setUitgelichtTeam] = useState<number | null>(null);
  const [instellingenTab, setInstellingenTab] = useState<"algemeen" | "punten" | "items">("algemeen");
  const [opslaan, setOpslaan] = useState(false);
  const [naamWijzig, setNaamWijzig] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState(route.name);
  const [fout, setFout] = useState("");
  const [verwachtTeams, setVerwachtTeams] = useState(initRoute.verwacht_aantal_teams ?? 2);
  const [doelAfstandKm, setDoelAfstandKm] = useState(initRoute.doel_afstand_km ?? 0);
  const [sterWaarde, setSterWaarde] = useState(initRoute.ster_waarde ?? 50);
  const [bomWaarde, setBomWaarde] = useState(initRoute.bom_waarde ?? 30);
  const [respawnMinuten, setRespawnMinuten] = useState(initRoute.respawn_minuten ?? 15);
  const [plekzooiMinuten, setPlekzooiMinuten] = useState((initRoute.plekzooi_duur_seconden ?? 300) / 60);
  const [spookMinuten, setSpookMinuten] = useState((initRoute.spook_duur_seconden ?? 600) / 60);
  const [tussenstandInterval, setTussenstandInterval] = useState(initRoute.tussenstand_interval_minuten ?? 0);
  const [tussenstandDuur, setTussenstandDuur] = useState(initRoute.tussenstand_duur_seconden ?? 10);
  const [mistM2PerSter, setMistM2PerSter] = useState(initRoute.mist_m2_per_ster ?? 2500);
  const [aantalPunten, setAantalPunten] = useState(6);
  const [centrumPunt, setCentrumPunt] = useState<{ lat: number; lng: number } | null>(null);
  const [centrumModus, setCentrumModus] = useState(false);
  const [mobielPaneelOpen, setMobielPaneelOpen] = useState(false);
  const [mobielTikPositie, setMobielTikPositie] = useState<{ lat: number; lng: number } | null>(null);
  const [plaatsZoekterm, setPlaatsZoekterm] = useState("");
  const [plaatsBezig, setPlaatsBezig] = useState(false);
  const [plaatsFout, setPlaatsFout] = useState("");
  const [vliegNaar, setVliegNaar] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Bij een net aangemaakte route: navigeer naar de opgegeven plaatsnaam i.p.v. Amsterdam
  useEffect(() => {
    const lat = zoekParams.get("lat");
    const lng = zoekParams.get("lng");
    if (lat && lng) setVliegNaar({ lat: parseFloat(lat), lng: parseFloat(lng), zoom: 14 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function zoekPlaats(e: React.FormEvent) {
    e.preventDefault();
    if (!plaatsZoekterm.trim()) return;
    setPlaatsBezig(true); setPlaatsFout("");
    try {
      const res = await fetch(`/api/admin/geocode?q=${encodeURIComponent(plaatsZoekterm.trim())}`);
      const data = await res.json();
      if (!res.ok) { setPlaatsFout(data.fout ?? "Plaats niet gevonden"); return; }
      setVliegNaar({ lat: data.lat, lng: data.lng, zoom: 14 });
    } catch {
      setPlaatsFout("Zoeken mislukt");
    } finally {
      setPlaatsBezig(false);
    }
  }

  // Sluit het mobiele overlay-paneel zodra de kaart iets te doen krijgt
  useEffect(() => {
    if (geselecteerd || geselecteerdSpeciaal || addModus || addSpeciaalModus || centrumModus) {
      setMobielPaneelOpen(false);
    }
  }, [geselecteerd, geselecteerdSpeciaal, addModus, addSpeciaalModus, centrumModus]);

  useEffect(() => {
    fetch(`/api/admin/routes/${route.id}/speciaal`).then((r) => r.ok ? r.json() : []).then(setSpecialeItems);
  }, [route.id]);

  useEffect(() => {
    if (centrumPunt || punten.length === 0) return;
    const avgLat = punten.reduce((s, p) => s + p.latitude, 0) / punten.length;
    const avgLng = punten.reduce((s, p) => s + p.longitude, 0) / punten.length;
    setCentrumPunt({ lat: avgLat, lng: avgLng });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Looproute per team voor verspreid-modus — zelfde berekening als bij het starten
  // van een sessie (app/api/speler/sessie/route.ts), zodat de preview klopt met het spel
  const teamRoutes = useMemo(() => {
    if (route.modus !== "verspreid" || punten.length < 4 || verwachtTeams < 2) return [];
    const hubStart = punten[0];
    const hubEind = punten[punten.length - 1];
    const middenpunten = punten.slice(1, -1);
    if (middenpunten.length < 2) return [];
    const cumulatief = [0];
    for (let i = 1; i < middenpunten.length; i++) {
      cumulatief.push(
        cumulatief[i - 1] +
        haversine(middenpunten[i - 1].latitude, middenpunten[i - 1].longitude, middenpunten[i].latitude, middenpunten[i].longitude)
      );
    }
    const totalM = cumulatief[cumulatief.length - 1];
    if (totalM === 0) return [];
    return Array.from({ length: verwachtTeams }, (_, k) => {
      const targetM = (totalM / verwachtTeams) * k;
      let offset = 0, minDelta = Infinity;
      cumulatief.forEach((d, i) => {
        const delta = Math.abs(d - targetM);
        if (delta < minDelta) { minDelta = delta; offset = i; }
      });
      // Lus-punt j heeft in de lijst index j+1 en dus nummer j+1 (de start-hub is 🏠, geen nummer).
      // Een team dat "andersom" loopt, gaat vanaf hetzelfde instappunt de andere kant op.
      const andersom = omgekeerdeTeams.includes(k + 1);
      const n = middenpunten.length;
      const lusIndices = middenpunten.map((_, j) => (((andersom ? offset - j : offset + j) % n) + n) % n);
      const volgorde = [hubStart, ...lusIndices.map((j) => middenpunten[j]), hubEind];
      return {
        teamIndex: k + 1,
        kleur: TEAM_KLEUREN[k % TEAM_KLEUREN.length],
        nummers: lusIndices.map((j) => j + 1),
        coords: volgorde.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        punten: volgorde,
      };
    });
  }, [route.modus, punten, verwachtTeams, omgekeerdeTeams]);

  // Afstand en geschatte speeltijd per team (lopen + vragen + items), getoond als paneel op de kaart
  const teamSchattingen = useMemo(() => {
    const schattingItems = specialeItems.map((i) => ({ lat: i.latitude, lng: i.longitude, type: i.type, radius: i.radius_meters }));
    return teamRoutes.map((t) => ({
      teamIndex: t.teamIndex,
      kleur: t.kleur,
      ...schatTeamTijd(t.coords, {
        vragen: t.punten.filter((p) => vraagPuntIds.has(p.id)).length,
        infopunten: t.punten.filter((p) => !vraagPuntIds.has(p.id) && p.type !== "eindpunt").length,
        items: schattingItems,
        teams: verwachtTeams,
        respawn: !!route.item_respawn,
        spookMin: spookMinuten,
        plekzooiMin: plekzooiMinuten,
      }),
      punten: schatTeamPunten(t.coords, {
        vraagPunten: t.punten.filter((p) => vraagPuntIds.has(p.id)).map((p) => vraagMaxPunten.get(p.id) ?? 0),
        overigePunten: t.punten.filter((p) => !vraagPuntIds.has(p.id)).reduce((som, p) => som + (p.points ?? 0), 0),
        items: schattingItems,
        teams: verwachtTeams,
        respawn: !!route.item_respawn,
        sterWaarde,
        bomWaarde,
      }),
    }));
  }, [teamRoutes, specialeItems, vraagPuntIds, vraagMaxPunten, verwachtTeams, route.item_respawn, spookMinuten, plekzooiMinuten, sterWaarde, bomWaarde]);
  const [tijdenOpen, setTijdenOpen] = useState(true);
  const [openTeamRoutes, setOpenTeamRoutes] = useState<Set<number>>(new Set());
  // Rondje-instellingen (teams, afstand, genereren): dicht zodra er punten staan
  const [rondjeOpen, setRondjeOpen] = useState(false);
  const [adviesOpen, setAdviesOpen] = useState(false);

  // Bewerkpaneel versleepbaar aan de kop; de plek wordt onthouden (alleen op een groot scherm)
  const paneelRef = useRef<HTMLDivElement>(null);
  const [paneelPlek, setPaneelPlek] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("pr_editor_paneel_plek") ?? "null");
      if (p && typeof p.x === "number" && typeof p.y === "number") setPaneelPlek(p);
    } catch { /* geen opslag */ }
  }, []);
  function startPaneelSlepen(e: React.PointerEvent<HTMLDivElement>) {
    const doel = e.target as HTMLElement;
    if (!doel.closest(".editor-paneel-kop") || doel.closest("button") || window.innerWidth <= 768) return;
    const paneel = paneelRef.current, ouder = paneel?.offsetParent as HTMLElement | null;
    if (!paneel || !ouder) return;
    e.preventDefault();
    const start = { muisX: e.clientX, muisY: e.clientY, x: paneel.offsetLeft, y: paneel.offsetTop };
    let laatste = { x: start.x, y: start.y };
    const beweeg = (ev: PointerEvent) => {
      // Binnen het kaartvlak houden
      const x = Math.min(Math.max(0, start.x + ev.clientX - start.muisX), ouder.clientWidth - paneel.offsetWidth);
      const y = Math.min(Math.max(0, start.y + ev.clientY - start.muisY), ouder.clientHeight - 40);
      laatste = { x, y };
      setPaneelPlek(laatste);
    };
    const los = () => {
      window.removeEventListener("pointermove", beweeg);
      window.removeEventListener("pointerup", los);
      try { localStorage.setItem("pr_editor_paneel_plek", JSON.stringify(laatste)); } catch { /* geen opslag */ }
    };
    window.addEventListener("pointermove", beweeg);
    window.addEventListener("pointerup", los);
  }

  // Radius en punten staan in de instellingen en gelden voor de hele route.
  // Startwaarde: wat het meest voorkomt bij de bestaande punten/items.
  const meestVoorkomend = (waarden: number[], standaard: number) => {
    const tel = new Map<number, number>();
    waarden.forEach((w) => tel.set(w, (tel.get(w) ?? 0) + 1));
    return [...tel].sort((a, b) => b[1] - a[1])[0]?.[0] ?? standaard;
  };
  const [puntRadius, setPuntRadius] = useState(() => meestVoorkomend((initRoute.route_points ?? []).map((p) => p.radius_meters), 15));
  const [puntPunten, setPuntPunten] = useState(() => meestVoorkomend((initRoute.route_points ?? []).filter((p) => !p.questions?.length).map((p) => p.points), 10));
  const [itemRadius, setItemRadius] = useState(15);
  useEffect(() => {
    if (specialeItems.length) setItemRadius(meestVoorkomend(specialeItems.map((i) => i.radius_meters), 15));
  // Alleen bij het laden van de items de startwaarde bepalen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialeItems.length > 0]);

  // Pas een waarde toe op alle punten van de route (radius, of punten voor punten zonder vraag)
  async function pasAllePuntenAan(update: { radius_meters?: number; points?: number }) {
    const doel = punten.filter((p) => update.points === undefined || !vraagPuntIds.has(p.id));
    setPunten((ps) => ps.map((p) => (doel.some((d) => d.id === p.id) ? { ...p, ...update } : p)));
    await Promise.all(doel.map((p) => fetch(`/api/admin/routes/${route.id}/punten/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update),
    })));
  }
  async function pasAlleItemsAan(radius: number) {
    setSpecialeItems((its) => its.map((i) => ({ ...i, radius_meters: radius })));
    await Promise.all(specialeItems.map((i) => fetch(`/api/admin/routes/${route.id}/speciaal/${i.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ radius_meters: radius }),
    })));
  }
  const gemSpeelMinuten = teamSchattingen.length
    ? teamSchattingen.reduce((som, s) => som + s.totaalMin, 0) / teamSchattingen.length : 0;

  // Check: zijn er genoeg items voor de lengte en speeltijd? En waar zouden extra items goed liggen?
  const [toonVoorstellen, setToonVoorstellen] = useState(true);
  const itemCheck = useMemo(() => {
    if (route.modus !== "verspreid" || punten.length < 3) return null;
    const lus = punten.slice(1, -1).map((p) => ({ lat: p.latitude, lng: p.longitude }));
    let lusMeter = 0;
    for (let i = 0; i < lus.length && lus.length > 1; i++) {
      const a = lus[i], b = lus[(i + 1) % lus.length];
      lusMeter += haversine(a.lat, a.lng, b.lat, b.lng);
    }
    if (lusMeter < 100) return null;
    const advies = itemAdvies(lusMeter, verwachtTeams, !!route.item_respawn, gemSpeelMinuten);
    const tel = (types: readonly string[]) => specialeItems.filter((i) => types.includes(i.type)).length;
    const nuOppakbaar = specialeItems.filter((i) => i.type !== "plekzooi").length;
    // Welke items ontbreken er? Per groep het minst gebruikte type eerst
    const tekortTypes: string[] = [];
    const vul = (groep: readonly string[], tekort: number) => {
      const aantallen = new Map(groep.map((t) => [t, specialeItems.filter((i) => i.type === t).length]));
      for (let k = 0; k < tekort; k++) {
        const minst = [...aantallen].sort((a, b) => a[1] - b[1])[0][0];
        tekortTypes.push(minst);
        aantallen.set(minst, (aantallen.get(minst) ?? 0) + 1);
      }
    };
    vul(ITEM_GROEPEN.voordeel, Math.max(0, advies.voordeel - tel(ITEM_GROEPEN.voordeel)));
    vul(ITEM_GROEPEN.aanval, Math.max(0, advies.aanval - tel(ITEM_GROEPEN.aanval)));
    vul(ITEM_GROEPEN.vraagteken, Math.max(0, advies.vraagteken - tel(ITEM_GROEPEN.vraagteken)));
    vul(ITEM_GROEPEN.plekzooi, Math.max(0, advies.plekzooi - tel(ITEM_GROEPEN.plekzooi)));
    const vermijd = [
      ...punten.map((p) => ({ lat: p.latitude, lng: p.longitude, r: 50 })),
      { lat: punten[0].latitude, lng: punten[0].longitude, r: 120 }, // niet vlak bij start/finish
    ];
    const plekken = voorgesteldePlekken(lus, specialeItems.map((i) => ({ lat: i.latitude, lng: i.longitude })), vermijd, tekortTypes.length);
    return {
      advies, nuOppakbaar,
      tekort: Math.max(0, advies.oppakbaar - nuOppakbaar) + Math.max(0, advies.plekzooi - tel(ITEM_GROEPEN.plekzooi)),
      teVeel: nuOppakbaar > advies.oppakbaar + 1,
      voorstellen: plekken.map((p, i) => ({ ...p, type: tekortTypes[i] })),
    };
  }, [route.modus, punten, verwachtTeams, route.item_respawn, gemSpeelMinuten, specialeItems]);
  // Startitems: wat elk team bij de start gratis in de balk krijgt
  const [startitems, setStartitems] = useState<Record<string, number>>(() => startitemsVan(initRoute));
  async function wijzigStartitem(type: string, delta: number) {
    const nieuw = { ...startitems, [type]: Math.max(0, Math.min(MAX_PER_STARTITEM, (startitems[type] ?? 0) + delta)) };
    setStartitems(nieuw);
    await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startitems: nieuw }),
    });
  }

  function puntenOpCirkel(lat: number, lng: number, radiusM: number, n: number) {
    const R = 6371000;
    return Array.from({ length: n }, (_, i) => {
      const hoek = (2 * Math.PI / n) * i - Math.PI / 2;
      const dLat = (radiusM * Math.cos(hoek)) / R * (180 / Math.PI);
      const dLng = (radiusM * Math.sin(hoek)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
      return { lat: lat + dLat, lng: lng + dLng };
    });
  }

  const ghostPunten = useMemo(() => {
    if (route.modus !== "verspreid" || doelAfstandKm <= 0 || !centrumPunt) return [];
    const radiusM = (doelAfstandKm * 1000) / (2 * Math.PI);
    return puntenOpCirkel(centrumPunt.lat, centrumPunt.lng, radiusM, aantalPunten);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.modus, doelAfstandKm, centrumPunt, aantalPunten]);

  async function herlaadPunten() {
    const res = await fetch(`/api/admin/routes/${route.id}/punten`);
    if (res.ok) setPunten(await res.json());
  }

  async function genereerPuntenInCirkel() {
    if (!centrumPunt || doelAfstandKm <= 0) return;
    if (punten.length > 0 && !confirm(`Dit verwijdert ${punten.length} bestaand(e) punt(en). Doorgaan?`)) return;
    const radiusM = (doelAfstandKm * 1000) / (2 * Math.PI);
    const coords = puntenOpCirkel(centrumPunt.lat, centrumPunt.lng, radiusM, aantalPunten);
    for (const pt of punten) {
      const res = await fetch(`/api/admin/routes/${route.id}/punten/${pt.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert(`"${pt.name}" kon niet verwijderd worden — de punten zijn niet opnieuw gegenereerd.`);
        await herlaadPunten();
        return;
      }
    }
    setPunten([]);
    setGeselecteerd(null);
    const nieuwePunten: RoutePunt[] = [];

    // Startpunt op het middelpunt
    const resStart = await fetch(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: centrumPunt.lat, longitude: centrumPunt.lng, type: "informatiepunt", name: "Startpunt", points: 0 }),
    });
    if (resStart.ok) nieuwePunten.push(await resStart.json());

    // Circulaire vraagpunten — genummerd vanaf 1, gelijk aan de nummers in lijst en kaart
    for (const [n, coord] of coords.entries()) {
      const res = await fetch(`/api/admin/routes/${route.id}/punten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coord.lat, longitude: coord.lng, points: 10, name: `Punt ${n + 1}` }),
      });
      if (res.ok) nieuwePunten.push(await res.json());
    }

    // Finish op het middelpunt
    const resEind = await fetch(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: centrumPunt.lat, longitude: centrumPunt.lng, type: "eindpunt", name: "Finish", points: 0 }),
    });
    if (resEind.ok) nieuwePunten.push(await resEind.json());

    setPunten(nieuwePunten);
  }

  async function voegPuntToeOp(lat: number, lng: number) {
    const res = await fetch(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, points: puntPunten, radius_meters: puntRadius }),
    });
    if (res.ok) {
      const nieuw: RoutePunt = await res.json();
      // Is het laatste punt de finish (eindpunt), dan komt het nieuwe punt ervóór, niet erachter
      const laatste = punten[punten.length - 1];
      if (laatste && laatste.type === "eindpunt") {
        const volgorde = [...punten.slice(0, -1), nieuw, laatste];
        setPunten(volgorde);
        await fetch(`/api/admin/routes/${route.id}/punten/volgorde`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volgorde: volgorde.map((p) => p.id) }),
        });
      } else {
        setPunten((p) => [...p, nieuw]);
      }
      setGeselecteerd(nieuw);
      setAddModus(false);
    }
  }

  async function voegSpeciaalItemToeOp(lat: number, lng: number, voorstelType?: string) {
    const res = await fetch(`/api/admin/routes/${route.id}/speciaal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Sequentieel: alleen plek zooi op de kaart (teams krijgen een startbanaan in hun balk)
      body: JSON.stringify(voorstelType
        ? { latitude: lat, longitude: lng, type: voorstelType, name: voorstelType === "plekzooi" ? "Plek zooi" : "Speciaal item", points_effect: voorstelType === "ster" ? 50 : 0, radius_meters: itemRadius }
        : route.modus === "sequentieel"
        ? { latitude: lat, longitude: lng, type: "plekzooi", name: "Plek zooi", points_effect: 0, radius_meters: itemRadius }
        : { latitude: lat, longitude: lng, type: "ster", name: "Speciaal item", points_effect: 50, radius_meters: itemRadius }),
    });
    if (res.ok) {
      const nieuw: SpeciaalItem = await res.json();
      setSpecialeItems((p) => [...p, nieuw]);
      setGeselecteerdSpeciaal(nieuw);
      setAddSpeciaalModus(false);
    }
  }

  async function kaartKlik(lat: number, lng: number) {
    if (centrumModus) {
      setCentrumPunt({ lat, lng });
      setCentrumModus(false);
      return;
    }
    if (addSpeciaalModus) return voegSpeciaalItemToeOp(lat, lng);
    if (addModus) return voegPuntToeOp(lat, lng);
    // Staat er een bewerkpaneel open, dan sluit een tik ernaast dat paneel
    if (geselecteerd || geselecteerdSpeciaal) { setGeselecteerd(null); setGeselecteerdSpeciaal(null); return; }

    // Vraag wat de tik moet worden.
    setMobielTikPositie({ lat, lng });
  }

  async function verwijderSpeciaalItem(id: string) {
    if (!confirm("Speciaal item verwijderen?")) return;
    await fetch(`/api/admin/routes/${route.id}/speciaal/${id}`, { method: "DELETE" });
    if (geselecteerdSpeciaal?.id === id) setGeselecteerdSpeciaal(null);
    setSpecialeItems((p) => p.filter((i) => i.id !== id));
  }

  async function slaSpeciaalItemOp(id: string, update: Partial<SpeciaalItem>) {
    const res = await fetch(`/api/admin/routes/${route.id}/speciaal/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      const bijgewerkt: SpeciaalItem = await res.json();
      setSpecialeItems((p) => p.map((i) => i.id === id ? bijgewerkt : i));
      setGeselecteerdSpeciaal((g) => (g?.id === id ? bijgewerkt : g));
    }
  }

  async function specialItemVerplaatst(id: string, lat: number, lng: number) {
    await slaSpeciaalItemOp(id, { latitude: lat, longitude: lng });
  }

  async function markerVerplaatst(id: string, lat: number, lng: number) {
    await fetch(`/api/admin/routes/${route.id}/punten/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    setPunten((p) => p.map((pt) => pt.id === id ? { ...pt, latitude: lat, longitude: lng } : pt));
  }

  async function verwijderPunt(id: string) {
    if (!confirm("Punt verwijderen?")) return;
    await fetch(`/api/admin/routes/${route.id}/punten/${id}`, { method: "DELETE" });
    if (geselecteerd?.id === id) setGeselecteerd(null);
    await herlaadPunten();
  }

  async function verplaatsVolgorde(id: string, richting: "omhoog" | "omlaag") {
    const idx = punten.findIndex((p) => p.id === id);
    if (richting === "omhoog" && idx === 0) return;
    if (richting === "omlaag" && idx === punten.length - 1) return;
    const wissel = richting === "omhoog" ? idx - 1 : idx + 1;
    // Bij verspreid liggen start- en finish-hub vast op de eerste en laatste plek
    if (route.modus === "verspreid" && punten.length >= 3) {
      const isHubPlek = (i: number) => i === 0 || i === punten.length - 1;
      if (isHubPlek(idx) || isHubPlek(wissel)) return;
    }
    const nieuw = [...punten];
    [nieuw[idx], nieuw[wissel]] = [nieuw[wissel], nieuw[idx]];
    setPunten(nieuw);
    await fetch(`/api/admin/routes/${route.id}/punten/volgorde`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volgorde: nieuw.map((p) => p.id) }),
    });
  }

  async function slaRouteNaamOp() {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuweNaam }),
    });
    if (res.ok) { setRoute((r) => ({ ...r, name: nieuweNaam })); setNaamWijzig(false); }
  }

  async function slaVerspreideInstellingenOp(teams: number, afstand: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verwacht_aantal_teams: teams, doel_afstand_km: afstand }),
    });
    if (res.ok) setRoute((r) => ({ ...r, verwacht_aantal_teams: teams, doel_afstand_km: afstand }));
  }

  async function slaItemWaardenOp(ster: number, bom: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ster_waarde: ster, bom_waarde: bom }),
    });
    if (res.ok) setRoute((r) => ({ ...r, ster_waarde: ster, bom_waarde: bom }));
  }

  async function slaRespawnMinutenOp(minuten: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respawn_minuten: minuten }),
    });
    if (res.ok) setRoute((r) => ({ ...r, respawn_minuten: minuten }));
  }

  async function slaItemDuurOp(veld: "plekzooi_duur_seconden" | "spook_duur_seconden", minuten: number) {
    const seconden = Math.round(minuten * 60);
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [veld]: seconden }),
    });
    if (res.ok) setRoute((r) => ({ ...r, [veld]: seconden }));
  }

  async function slaTussenstandIntervalOp(minuten: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tussenstand_interval_minuten: minuten }),
    });
    if (res.ok) setRoute((r) => ({ ...r, tussenstand_interval_minuten: minuten }));
  }

  async function slaTussenstandDuurOp(seconden: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tussenstand_duur_seconden: seconden }),
    });
    if (res.ok) setRoute((r) => ({ ...r, tussenstand_duur_seconden: seconden }));
  }

  async function slaMistM2PerSterOp(m2: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mist_m2_per_ster: m2 }),
    });
    if (res.ok) setRoute((r) => ({ ...r, mist_m2_per_ster: m2 }));
  }

  async function slaStartLocatieOp(lat: number, lng: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_latitude: lat, start_longitude: lng }),
    });
    if (res.ok) setRoute((r) => ({ ...r, start_latitude: lat, start_longitude: lng }));
  }

  async function slaPuntOp(update: Partial<RoutePunt>) {
    if (!geselecteerd) return;
    setOpslaan(true); setFout("");
    const res = await fetch(`/api/admin/routes/${route.id}/punten/${geselecteerd.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      const bijgewerkt = await res.json();
      setPunten((p) => p.map((pt) => pt.id === bijgewerkt.id ? bijgewerkt : pt));
      setGeselecteerd(bijgewerkt);
    } else setFout("Opslaan mislukt");
    setOpslaan(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Topbar */}
      <div className="admin-topbar" style={{ flexDirection: "column", alignItems: "stretch", gap: 8, padding: "10px 16px" }}>
        {/* Rij 1: navigatie + naam */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/admin/routes" className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "6px 12px", flexShrink: 0 }}>← Routes</a>
          {naamWijzig ? (
            <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0 }}>
              <input className="form-input" value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} style={{ flex: 1 }} autoFocus />
              <button className="btn btn-primary" onClick={slaRouteNaamOp}>Opslaan</button>
              <button className="btn btn-ghost" onClick={() => setNaamWijzig(false)}>✕</button>
            </div>
          ) : (
            <h1 style={{ flex: 1, minWidth: 0, cursor: "pointer", fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onClick={() => setNaamWijzig(true)} title="Klik om naam te wijzigen">
              {route.name} <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>✏️</span>
            </h1>
          )}
          {/* Instellingen: goed zichtbaar rechts bovenaan */}
          <button className="rl-knop rl-knop--goud" style={{ flexShrink: 0 }}
            onClick={() => setInstellingenOpen(true)} title="Route-instellingen: punten, items, tijden, tussenstand…">
            ⚙️ Instellingen
          </button>
        </div>

        {/* Rij 2: status + acties */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StatusPil status={route.status} isActief={route.is_active} />
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
            padding: "4px 11px 4px 6px", borderRadius: 99,
            background: MODUS_INFO[route.modus].tint,
            border: `1px solid ${MODUS_INFO[route.modus].kleur}55`,
            color: MODUS_INFO[route.modus].kleur, fontSize: "0.78rem", fontWeight: 700,
          }}>
            <ModusIcoon modus={route.modus} size={16} />
            {MODUS_INFO[route.modus].label}
          </span>
          {!route.is_active && (
            <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={async () => {
                const nieuweStatus = route.status === "gepubliceerd" ? "concept" : "gepubliceerd";
                const res = await fetch(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nieuweStatus }) });
                if (res.ok) setRoute((r) => ({ ...r, status: nieuweStatus }));
              }}>
              {route.status === "gepubliceerd" ? "↩ Concept" : "📢 Publiceer"}
            </button>
          )}
          {!route.is_active && route.status === "gepubliceerd" && (
            <button className="btn btn-cyan" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={async () => {
                const res = await fetch(`/api/admin/routes/${route.id}/activeren`, { method: "POST" });
                if (res.ok) setRoute((r) => ({ ...r, is_active: true }));
              }}>▶ Activeer</button>
          )}
          {route.is_active && (
            <button className="btn btn-danger" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={async () => {
                if (!confirm("Route deactiveren en terugzetten naar concept?")) return;
                const res = await fetch(`/api/admin/routes/${route.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ is_active: false, status: "concept" }),
                });
                if (res.ok) setRoute((r) => ({ ...r, is_active: false, status: "concept" }));
              }}>⏹ Deactiveer</button>
          )}
        </div>
      </div>

      {/* Plaatsnaam zoeken — alleen zinvol zolang de route nog geen eigen punten heeft om op te centreren */}
      {punten.length === 0 && (
        <form onSubmit={zoekPlaats} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0, background: "rgba(255,255,255,0.03)" }}>
          <input
            className="form-input" style={{ flex: 1, fontSize: "0.85rem" }}
            placeholder="🔍 Zoek plaats…" value={plaatsZoekterm}
            onChange={(e) => setPlaatsZoekterm(e.target.value)}
          />
          <button className="btn btn-ghost" type="submit" style={{ fontSize: "0.82rem", flexShrink: 0 }} disabled={plaatsBezig}>
            {plaatsBezig ? "…" : "Ga"}
          </button>
          {plaatsFout && <span style={{ fontSize: "0.75rem", color: "var(--red)", flexShrink: 0 }}>{plaatsFout}</span>}
        </form>
      )}

      {/* Hoofdindeling */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {/* Zijpaneel — op mobiel een overlay i.p.v. vaste kolom */}
        <div className={`route-editor-zijpaneel${mobielPaneelOpen ? " route-editor-zijpaneel--open" : ""}`}>

          {/* Verspreid-instellingen / afstand */}
          {(route.modus === "verspreid" || punten.length >= 2) && <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
            {route.modus === "verspreid" && (() => {
              const totaalM = punten.length >= 2 ? punten.reduce((som, pt, i) => {
                if (i === 0) return som;
                const v = punten[i - 1];
                return som + haversine(v.latitude, v.longitude, pt.latitude, pt.longitude);
              }, 0) : 0;
              const stapM = doelAfstandKm > 0 && punten.length > 0 ? doelAfstandKm * 1000 / punten.length : null;
              const teWeinigPunten = punten.length < verwachtTeams * 2;

              return (
                <>
                  {/* Staan er punten, dan kan dit blok dicht: één regel als samenvatting */}
                  {punten.length > 0 && (
                    <button type="button" onClick={() => setRondjeOpen((v) => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "2px 0", background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontSize: "0.74rem", fontWeight: 700, textAlign: "left" }}>
                      🔄 Rondje
                      <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                        {verwachtTeams} teams · {doelAfstandKm} km · {punten.length} punten
                      </span>
                      <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{rondjeOpen ? "▾" : "▸"}</span>
                    </button>
                  )}
                  {(rondjeOpen || punten.length === 0) && (
                    <>
                  {/* Teams input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0 }}>Aantal teams:</span>
                    <input
                      type="number" min={2} max={20} value={verwachtTeams}
                      onChange={(e) => setVerwachtTeams(Math.max(2, Number(e.target.value)))}
                      onBlur={() => slaVerspreideInstellingenOp(verwachtTeams, doelAfstandKm)}
                      style={{
                        width: 56, padding: "3px 7px", fontSize: "0.78rem", fontWeight: 700,
                        background: "rgba(0,217,255,0.07)", border: "1px solid rgba(0,217,255,0.25)",
                        borderRadius: 6, color: "var(--cyan)", outline: "none",
                      }}
                    />
                  </div>

                  {/* Doelafstand + Aantal punten op één regel */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0 }}>Afstand:</span>
                    <input
                      type="number" min={0} step={0.1} value={doelAfstandKm}
                      onChange={(e) => setDoelAfstandKm(Math.max(0, Number(e.target.value)))}
                      onBlur={() => slaVerspreideInstellingenOp(verwachtTeams, doelAfstandKm)}
                      style={{
                        width: 52, padding: "3px 7px", fontSize: "0.78rem", fontWeight: 700,
                        background: "rgba(0,217,255,0.07)", border: "1px solid rgba(0,217,255,0.25)",
                        borderRadius: 6, color: "var(--cyan)", outline: "none", flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0 }}>km</span>
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0, marginLeft: 4 }}>Punten:</span>
                    <input
                      type="number" min={3} max={30} value={aantalPunten}
                      onChange={(e) => setAantalPunten(Math.max(3, Math.min(30, Number(e.target.value))))}
                      style={{
                        width: 48, padding: "3px 7px", fontSize: "0.78rem", fontWeight: 700,
                        background: "rgba(0,217,255,0.07)", border: "1px solid rgba(0,217,255,0.25)",
                        borderRadius: 6, color: "var(--cyan)", outline: "none", flexShrink: 0,
                      }}
                    />
                  </div>

                  {/* Middelpunt kiezen */}
                  <button
                    className={`btn ${centrumModus ? "btn-cyan" : centrumPunt ? "btn-ghost" : "btn-primary"}`}
                    style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                    onClick={() => { setCentrumModus((v) => !v); }}>
                    {centrumModus ? "✅ Klik op kaart voor middelpunt…" : centrumPunt ? "📍 Verplaats middelpunt" : "📍 Kies middelpunt op kaart"}
                  </button>
                  {doelAfstandKm <= 0 && (
                    <div style={{ fontSize: "0.68rem", color: "var(--gold)" }}>
                      Vul een afstand in om het voorstel met {aantalPunten} punten op de kaart te zien.
                    </div>
                  )}

                  {/* Genereer knop */}
                  {centrumPunt && doelAfstandKm > 0 && (
                    <>
                      <button
                        className="btn btn-cyan"
                        style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                        onClick={genereerPuntenInCirkel}>
                        🔄 Genereer punten in cirkel
                      </button>
                    </>
                  )}

                  {/* Live preview */}
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {totaalM > 0 && <div>Gemeten: {(totaalM / 1000).toFixed(2)} km</div>}
                    {doelAfstandKm > 0 && <div style={{ color: "var(--cyan)" }}>Teams ≈ {(doelAfstandKm / verwachtTeams).toFixed(2)} km uit elkaar</div>}
                    {stapM !== null && punten.length > 0 && <div>Aanbevolen puntafstand: ≈ {Math.round(stapM)} m</div>}
                    {geselecteerd && doelAfstandKm > 0 && punten.length > 0 && (
                      <div style={{ color: "rgba(0,217,255,0.7)" }}>⬤ Cirkel op kaart = aanbevolen afstand</div>
                    )}
                  </div>

                    </>
                  )}

                  {/* Looproute per team, in dezelfde kleur als op de kaart */}
                  {teamRoutes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.7rem" }}>
                      {teamRoutes.map((t) => {
                        const open = openTeamRoutes.has(t.teamIndex);
                        return (
                          <div key={t.teamIndex}>
                            {/* Per team inklapbaar: standaard alleen de kop */}
                            <button type="button"
                              onClick={() => {
                                const wordtOpen = !openTeamRoutes.has(t.teamIndex);
                                setOpenTeamRoutes((s) => { const n = new Set(s); if (n.has(t.teamIndex)) n.delete(t.teamIndex); else n.add(t.teamIndex); return n; });
                                setUitgelichtTeam(wordtOpen ? t.teamIndex : (uitgelichtTeam === t.teamIndex ? null : uitgelichtTeam));
                              }}
                              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "3px 0", background: "none", border: "none", cursor: "pointer", color: "var(--text)", textAlign: "left" }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: t.kleur, flexShrink: 0 }} />
                              <span style={{ color: t.kleur, fontWeight: 700 }}>Team {t.teamIndex}</span>
                              <span style={{ color: "var(--muted)" }}>start bij punt {t.nummers[0]} · {t.nummers.length} punten{omgekeerdeTeams.includes(t.teamIndex) ? " · ↺ andersom" : ""}</span>
                              <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{open ? "▾" : "▸"}</span>
                            </button>
                            {open && (
                              <div style={{ paddingLeft: 16, color: "var(--text)", lineHeight: 1.5, paddingBottom: 4 }}>
                                🏠 → {t.nummers.join(" → ")} → 🏁
                                <button type="button" onClick={() => wisselAndersom(t.teamIndex)}
                                  className={`rl-knop${omgekeerdeTeams.includes(t.teamIndex) ? " rl-knop--cyan" : ""}`}
                                  style={{ display: "flex", marginTop: 4, height: 28, fontSize: "0.72rem" }}
                                  title="Dit team loopt het rondje in tegengestelde richting, vanaf hetzelfde instappunt">
                                  ↺ Andersom lopen: {omgekeerdeTeams.includes(t.teamIndex) ? "aan" : "uit"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Waarschuwing */}
                  {teWeinigPunten && (
                    <div style={{ fontSize: "0.68rem", color: "var(--gold)", background: "var(--gold-soft)", padding: "5px 8px", borderRadius: 6 }}>
                      ⚠ Minimaal {verwachtTeams * 2} punten aanbevolen voor {verwachtTeams} teams
                    </div>
                  )}
                </>
              );
            })()}

            {/* Gemeten afstand voor sequentieel */}
            {route.modus === "sequentieel" && punten.length >= 2 && (() => {
              const totaalM = punten.reduce((som, pt, i) => {
                if (i === 0) return som;
                const vorige = punten[i - 1];
                return som + haversine(vorige.latitude, vorige.longitude, pt.latitude, pt.longitude);
              }, 0);
              return <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Totale afstand: {(totaalM / 1000).toFixed(1)} km</span>;
            })()}
          </div>}

          {route.modus === "mist" ? (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ padding: "14px", borderBottom: "1px solid var(--line)" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">🌫️ Startlocatie</label>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
                    Nog geen startlocatie. Tik op de kaart → 🚩 Startlocatie.
                  </p>
                  {route.start_latitude !== null && route.start_longitude !== null ? (
                    <div style={{ fontSize: "0.75rem", color: "var(--cyan)", marginTop: 6 }}>
                      📍 {route.start_latitude.toFixed(5)}, {route.start_longitude.toFixed(5)}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.75rem", color: "var(--red)", marginTop: 6 }}>
                      Nog geen startlocatie gezet
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", fontSize: "0.74rem", color: "var(--muted)" }}>
                👆 Tik op de kaart om toe te voegen · sleep om te verplaatsen ({punten.length} vragen)
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {punten.length === 0 ? (
                  <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                    Nog geen vragen. Tik op de kaart → ❓ Vraagpunt.
                  </p>
                ) : punten.map((pt) => (
                  <div key={pt.id}
                    onClick={() => setGeselecteerd(geselecteerd?.id === pt.id ? null : pt)}
                    style={{
                      padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      background: geselecteerd?.id === pt.id ? "rgba(255,255,255,0.12)" : "transparent",
                      borderLeft: geselecteerd?.id === pt.id ? "3px solid #60A5FA" : "3px solid transparent",
                    }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: "var(--blue)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.72rem", fontWeight: 700,
                    }}>❓</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>{pt.name}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); verwijderPunt(pt.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.85rem", padding: "2px 4px" }}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <>
          {/* Tabbladen */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
            <button
              onClick={() => { setActieveTab("punten"); setAddSpeciaalModus(false); }}
              style={{
                flex: 1, padding: "10px 0", fontSize: "0.82rem", fontWeight: 700,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: actieveTab === "punten" ? "2px solid var(--cyan)" : "2px solid transparent",
                color: actieveTab === "punten" ? "var(--cyan)" : "var(--muted)",
              }}>
              📍 Punten ({punten.length})
            </button>
            <button
              onClick={() => { setActieveTab("items"); setAddModus(false); }}
              style={{
                flex: 1, padding: "10px 0", fontSize: "0.82rem", fontWeight: 700,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: actieveTab === "items" ? "2px solid var(--cyan)" : "2px solid transparent",
                color: actieveTab === "items" ? "var(--cyan)" : "var(--muted)",
              }}>
              ⭐ Items ({specialeItems.length})
            </button>
          </div>

          {/* Toevoegen gaat via de kaart: tik op een plek en kies wat het wordt */}
          <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", fontSize: "0.74rem", color: "var(--muted)" }}>
            👆 Tik op de kaart om toe te voegen · sleep om te verplaatsen
          </div>

          {/* Tab-inhoud */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>

            {/* Punten-tab */}
            {actieveTab === "punten" && (
              punten.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Nog geen punten. Tik op de kaart → 📍 Punt.
                </p>
              ) : punten.map((pt, i) => {
                const isVerspreid = route.modus === "verspreid" && punten.length >= 3;
                const isHubStart = isVerspreid && i === 0;
                const isHubEind = isVerspreid && i === punten.length - 1;
                const isHub = isHubStart || isHubEind;
                const badge = isHubStart ? "🏠" : pt.type === "eindpunt" ? "🏁" : (isVerspreid ? i : i + 1);
                const badgeBg = isHubStart ? "var(--green)" : pt.type === "eindpunt" ? "var(--gold)" : pt.type === "informatiepunt" ? "var(--cyan)" : "var(--blue)";
                return (
                  <div key={pt.id}
                    onClick={() => setGeselecteerd(geselecteerd?.id === pt.id ? null : pt)}
                    style={{
                      padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                      background: geselecteerd?.id === pt.id ? "rgba(255,255,255,0.12)" : "transparent",
                      borderLeft: geselecteerd?.id === pt.id ? "3px solid #60A5FA" : "3px solid transparent",
                    }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: badgeBg,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.68rem", fontWeight: 700,
                    }}>{badge}</div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>
                      {pt.name}
                    </div>
                    {vraagPuntIds.has(pt.id) ? (
                      <span title="Aan dit punt hangt een vraag" style={{ fontSize: "0.8rem", flexShrink: 0 }}>❓</span>
                    ) : pt.type === "vraagpunt" ? (
                      <span title="Vraagpunt zonder vraag: spelers krijgen hier alleen informatie" style={{ fontSize: "0.8rem", flexShrink: 0 }}>⚠️</span>
                    ) : null}
                    <div style={{ display: "flex", flexDirection: "row", gap: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omhoog"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: (i === 0 || isHub || (isVerspreid && i === 1)) ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omlaag"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: (i === punten.length - 1 || isHub || (isVerspreid && i === punten.length - 2)) ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▼</button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); verwijderPunt(pt.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.8rem", padding: "2px 3px" }}>🗑️</button>
                  </div>
                );
              })
            )}

            {/* Items-tab */}
            {actieveTab === "items" && route.modus === "sequentieel" && (
              <p style={{ margin: "0 14px 8px", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.45 }}>
                🎒 Startitems stel je in bij ⚙️ Instellingen. Op de kaart alleen plek zooi.
              </p>
            )}
            {actieveTab === "items" && route.modus === "verspreid" && (() => {
              // Lengte van het rondje: de punten tussen startpunt en finish, als gesloten lus
              const lus = punten.length >= 3 ? punten.slice(1, -1) : punten;
              let lusMeter = 0;
              for (let i = 0; i < lus.length; i++) {
                const a = lus[i], b = lus[(i + 1) % lus.length];
                if (lus.length > 1) lusMeter += haversine(a.latitude, a.longitude, b.latitude, b.longitude);
              }
              if (lusMeter < 100) lusMeter = doelAfstandKm * 1000;
              if (lusMeter < 100) {
                return (
                  <p style={{ margin: "0 14px 8px", fontSize: "0.72rem", color: "var(--muted)" }}>
                    💡 Advies volgt zodra er punten staan.
                  </p>
                );
              }
              const advies = itemAdvies(lusMeter, verwachtTeams, !!route.item_respawn, gemSpeelMinuten);
              const tel = (types: readonly string[]) => specialeItems.filter((i) => types.includes(i.type)).length;
              const regels: { label: string; advies: number; nu: number; maxOk: boolean }[] = [
                { label: "⭐ Voordeel (ster, verdubbeling, radar)", advies: advies.voordeel, nu: tel(ITEM_GROEPEN.voordeel), maxOk: false },
                { label: "💣 Aanval (bom, spook, dief, banaan, wissel)", advies: advies.aanval, nu: tel(ITEM_GROEPEN.aanval), maxOk: true },
                { label: "❓ Vraagteken", advies: advies.vraagteken, nu: tel(ITEM_GROEPEN.vraagteken), maxOk: true },
                { label: "⛔ Plek zooi", advies: advies.plekzooi, nu: tel(ITEM_GROEPEN.plekzooi), maxOk: true },
              ];
              // Compacte stand; de volledige tabel en tips zitten achter de ⓘ
              const totaalAdvies = advies.oppakbaar + advies.plekzooi;
              const totaalNu = specialeItems.length;
              const stand = totaalNu > totaalAdvies + 1 ? { tekst: "te veel", kleur: "#F87171" }
                : totaalNu < totaalAdvies - 1 ? { tekst: "te weinig", kleur: "#FBBF24" }
                : { tekst: "goed", kleur: "#4ADE80" };
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 14px 8px", fontSize: "0.72rem", color: "var(--muted)" }}>
                    <span>💡 Advies: ±{totaalAdvies} items · nu {totaalNu} — <span style={{ color: stand.kleur, fontWeight: 700 }}>{stand.tekst}</span></span>
                    <button type="button" onClick={() => setAdviesOpen((v) => !v)} title="Advies voor een eerlijk spel" aria-expanded={adviesOpen}
                      style={{ marginLeft: "auto", width: 22, height: 22, borderRadius: "50%", cursor: "pointer", flexShrink: 0,
                        border: `1px solid ${adviesOpen ? "#FFE680" : "rgba(255,255,255,0.25)"}`, background: adviesOpen ? "rgba(255,217,59,0.15)" : "transparent",
                        color: adviesOpen ? "#FFE680" : "var(--muted)", fontWeight: 800, fontSize: "0.75rem", fontStyle: "italic", fontFamily: "Georgia, serif" }}>
                      i
                    </button>
                  </div>
                  {adviesOpen && (
                <div style={{ margin: "0 10px 10px", padding: "10px 12px", borderRadius: 10, background: "rgba(255,217,59,0.08)", border: "1px solid rgba(255,217,59,0.35)", fontSize: "0.74rem", color: "var(--text)", lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, color: "#FFE680", marginBottom: 4 }}>💡 Advies voor een eerlijk spel</div>
                  <div style={{ color: "var(--muted)", marginBottom: 6 }}>
                    Rondje ≈ {(lusMeter / 1000).toFixed(1).replace(".", ",")} km · {verwachtTeams} teams · respawn {route.item_respawn ? "aan" : "uit"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", columnGap: 10, rowGap: 2 }}>
                    <span style={{ color: "var(--muted)" }}>Soort</span><span style={{ color: "var(--muted)" }}>advies</span><span style={{ color: "var(--muted)" }}>nu</span>
                    {regels.map((r) => {
                      const teVeel = r.nu > r.advies + (r.maxOk ? 0 : 1);
                      const teWeinig = r.nu < r.advies - 1;
                      return [
                        <span key={r.label + "l"}>{r.label}</span>,
                        <span key={r.label + "a"} style={{ textAlign: "right", fontWeight: 700 }}>{r.advies}</span>,
                        <span key={r.label + "n"} style={{ textAlign: "right", fontWeight: 700, color: teVeel ? "#F87171" : teWeinig ? "#FBBF24" : "#4ADE80" }}>{r.nu}</span>,
                      ];
                    })}
                  </div>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 16, color: "var(--muted)" }}>
                    <li>Gelijkmatig verdelen: ±1 item per {advies.tussenafstandM} m.</li>
                    <li>Niet vlak bij start of finish.</li>
                    <li>Minstens 50 m van een vraagpunt; plek zooi niet op een plek waar iedereen langs moet.</li>
                  </ul>
                </div>
                  )}
                </>
              );
            })()}
            {actieveTab === "items" && (
              specialeItems.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Nog geen items. Tik op de kaart → 🎁 Item.
                </p>
              ) : specialeItems.map((item) => {
                return (
                  <div key={item.id}
                    onClick={() => setGeselecteerdSpeciaal(geselecteerdSpeciaal?.id === item.id ? null : item)}
                    style={{
                      padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                      background: geselecteerdSpeciaal?.id === item.id ? "rgba(255,255,255,0.12)" : "transparent",
                      borderLeft: geselecteerdSpeciaal?.id === item.id ? "3px solid #60A5FA" : "3px solid transparent",
                      opacity: item.claimed ? 0.55 : 1,
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/items/${item.type}.png`} alt="" style={{ width: 22, height: 22, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>
                      {item.name}
                    </div>
                    {item.claimed && (
                      <span style={{ fontSize: "0.66rem", color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>gepakt</span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); verwijderSpeciaalItem(item.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.8rem", padding: "2px 3px" }}>🗑️</button>
                  </div>
                );
              })
            )}

          </div>
          </>
          )}

        </div>

        {/* Mobiel: donkere achtergrond achter het open overlay-paneel */}
        {mobielPaneelOpen && (
          <div className="route-editor-paneel-backdrop" onClick={() => setMobielPaneelOpen(false)} />
        )}

        {/* Kies wat een "kale" tik op de kaart moet worden (geen modus vooraf geselecteerd) */}
        {mobielTikPositie && (
          <>
            <div className="route-editor-backdrop" onClick={() => setMobielTikPositie(null)} />
            <div className="route-editor-tik-kiezer">
              <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Hier toevoegen:</div>
              {route.modus === "verspreid" && (
                <button className="btn btn-cyan" style={{ width: "100%", fontSize: "0.82rem" }}
                  onClick={() => { setCentrumPunt({ lat: mobielTikPositie.lat, lng: mobielTikPositie.lng }); setMobielTikPositie(null); }}>
                  🏠 Middelpunt (start en finish)
                </button>
              )}
              <button className="btn btn-primary" style={{ width: "100%", fontSize: "0.82rem" }}
                onClick={() => { voegPuntToeOp(mobielTikPositie.lat, mobielTikPositie.lng); setMobielTikPositie(null); }}>
                {route.modus === "mist" ? "❓ Vraagpunt" : "📍 Punt"}
              </button>
              {route.modus === "mist" ? (
                <button className="btn btn-ghost" style={{ width: "100%", fontSize: "0.82rem" }}
                  onClick={() => { slaStartLocatieOp(mobielTikPositie.lat, mobielTikPositie.lng); setMobielTikPositie(null); }}>
                  🚩 Startlocatie
                </button>
              ) : (
                <button className="btn btn-ghost" style={{ width: "100%", fontSize: "0.82rem" }}
                  onClick={() => { voegSpeciaalItemToeOp(mobielTikPositie.lat, mobielTikPositie.lng); setMobielTikPositie(null); }}>
                  {route.modus === "sequentieel" ? "⛔ Plek zooi" : "🎁 Item"}
                </button>
              )}
              <button className="btn btn-ghost" style={{ width: "100%", fontSize: "0.82rem" }}
                onClick={() => setMobielTikPositie(null)}>
                Annuleer
              </button>
            </div>
          </>
        )}

        {/* Instellingen-modal, geopend via het tandwiel in de header */}
        {instellingenOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 800,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }} onClick={() => setInstellingenOpen(false)}>
            <div style={{
              background: "#0f1c2e", color: "#e8f0ff",
              borderRadius: 18, padding: 24,
              maxWidth: 420, width: "100%", boxSizing: "border-box", maxHeight: "90vh", overflowY: "auto", overflowX: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>⚙️ Instellingen</h2>
                <button onClick={() => setInstellingenOpen(false)} style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16, color: "#e8f0ff", fontWeight: 700 }}>✕</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Onderwerpen als knoppen */}
                <div style={{ display: "flex", gap: 4 }}>
                  {([["algemeen", "⚙️ Algemeen"], ["punten", "📍 Punten & vragen"], ...(route.modus !== "mist" ? [["items", "🎁 Items"]] : [])] as [typeof instellingenTab, string][]).map(([t, label]) => (
                    <button key={t} type="button" onClick={() => setInstellingenTab(t)}
                      style={{
                        flex: 1, padding: "8px 4px", borderRadius: 9, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
                        border: `2px solid ${instellingenTab === t ? "var(--cyan)" : "rgba(255,255,255,0.12)"}`,
                        background: instellingenTab === t ? "rgba(0,217,255,0.15)" : "rgba(255,255,255,0.04)",
                        color: instellingenTab === t ? "#fff" : "var(--muted)",
                      }}>{label}</button>
                  ))}
                </div>

                {instellingenTab === "algemeen" && (
                  <>
                {/* Speltype (vastgezet bij aanmaken, niet meer te wijzigen) */}
                <div className="form-group">
                  <label className="form-label">Speltype</label>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 10,
                    background: MODUS_INFO[route.modus].tint,
                    border: `1px solid ${MODUS_INFO[route.modus].kleur}55`,
                  }}>
                    <ModusTegel modus={route.modus} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: MODUS_INFO[route.modus].kleur }}>
                        {MODUS_INFO[route.modus].label}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                        {MODUS_INFO[route.modus].omschrijving}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Kan na aanmaken niet meer gewijzigd worden.</span>
                </div>

                {/* Mist-instellingen */}
                {route.modus === "mist" && (
                  <div className="form-group">
                    <label className="form-label">🌫️ Mist-instellingen</label>
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Elke … m² weggespeelde mist = 1 ster</span>
                    <input
                      className="form-input" type="number" min={1} value={mistM2PerSter}
                      onChange={(e) => setMistM2PerSter(Math.max(1, Number(e.target.value)))}
                      onBlur={() => slaMistM2PerSterOp(mistM2PerSter)}
                    />
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Startwaarde; stel bij na een proefronde.</span>
                  </div>
                )}

                {/* Tussenstand */}
                <div className="form-group">
                  <label className="form-label">🏆 Tussenstand — automatische reveal</label>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Elke … minuten (0 = uit)</span>
                  <input
                    className="form-input" type="number" min={0} value={tussenstandInterval}
                    onChange={(e) => setTussenstandInterval(Math.max(0, Number(e.target.value)))}
                    onBlur={() => slaTussenstandIntervalOp(tussenstandInterval)}
                  />
                  <div style={{ height: 8 }} />
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>… seconden zichtbaar</span>
                  <input
                    className="form-input" type="number" min={1} value={tussenstandDuur}
                    onChange={(e) => setTussenstandDuur(Math.max(1, Number(e.target.value)))}
                    onBlur={() => slaTussenstandDuurOp(tussenstandDuur)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Telt vanaf de eerste start. Duur liefst meer dan 5 s.</span>
                </div>

                  </>
                )}

                {instellingenTab === "punten" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">📏 Radius van de punten (m)</label>
                      <input className="form-input" type="number" min={3} value={puntRadius}
                        onChange={(e) => setPuntRadius(Math.max(3, Number(e.target.value)))}
                        onBlur={() => pasAllePuntenAan({ radius_meters: puntRadius })} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Hoe dichtbij een team moet komen. Geldt voor alle punten.</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">🏅 Punten voor een punt zonder vraag</label>
                      <input className="form-input" type="number" min={0} value={puntPunten}
                        onChange={(e) => setPuntPunten(Math.max(0, Number(e.target.value)))}
                        onBlur={() => pasAllePuntenAan({ points: puntPunten })} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Voor punten zonder vraag. Vraagpunten: punten bij de vraag zelf.</span>
                    </div>
                  </>
                )}

                {instellingenTab === "items" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">📏 Radius van de items (m)</label>
                      <input className="form-input" type="number" min={3} value={itemRadius}
                        onChange={(e) => setItemRadius(Math.max(3, Number(e.target.value)))}
                        onBlur={() => pasAlleItemsAan(itemRadius)} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Hoe dichtbij een team moet komen. Geldt voor alle items.</span>
                    </div>
                {/* Item-waarden (sequentieel heeft geen sterren of bommen) */}
                {route.modus === "verspreid" && (
                  <div className="form-group">
                    <label className="form-label">⭐ Item-waarden</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Ster</span>
                        <input
                          className="form-input" type="number" min={1} value={sterWaarde}
                          onChange={(e) => setSterWaarde(Math.max(1, Number(e.target.value)))}
                          onBlur={() => slaItemWaardenOp(sterWaarde, bomWaarde)}
                          style={{ width: "100%", boxSizing: "border-box", color: "var(--gold)", fontWeight: 700 }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Bom</span>
                        <input
                          className="form-input" type="number" min={1} value={bomWaarde}
                          onChange={(e) => setBomWaarde(Math.max(1, Number(e.target.value)))}
                          onBlur={() => slaItemWaardenOp(sterWaarde, bomWaarde)}
                          style={{ width: "100%", boxSizing: "border-box", color: "var(--red)", fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Duur van spook en plekzooi */}
                {route.modus !== "mist" && (
                  <div className="form-group">
                    <label className="form-label">⏱️ Duur van effecten (minuten)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {route.modus === "verspreid" && <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>👻 Spook</span>
                        <input
                          className="form-input" type="number" min={0.5} step={0.5} value={spookMinuten}
                          onChange={(e) => setSpookMinuten(Math.max(0.5, Number(e.target.value)))}
                          onBlur={() => slaItemDuurOp("spook_duur_seconden", spookMinuten)}
                          style={{ width: "100%", boxSizing: "border-box", fontWeight: 700 }}
                        />
                      </div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>⛔ Plekzooi</span>
                        <input
                          className="form-input" type="number" min={0.5} step={0.5} value={plekzooiMinuten}
                          onChange={(e) => setPlekzooiMinuten(Math.max(0.5, Number(e.target.value)))}
                          onBlur={() => slaItemDuurOp("plekzooi_duur_seconden", plekzooiMinuten)}
                          style={{ width: "100%", boxSizing: "border-box", fontWeight: 700 }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {route.modus === "verspreid" && "Spook: punt onzichtbaar · "}Plek zooi: team staat stil
                    </span>
                  </div>
                )}

                {/* Startitems */}
                {route.modus !== "mist" && (
                  <div className="form-group">
                    <label className="form-label">🎒 Startitems — gratis bij de start</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 6 }}>
                      {STARTITEM_TYPES.map((type) => {
                        const n = startitems[type] ?? 0;
                        return (
                          <div key={type} style={{
                            display: "flex", alignItems: "center", gap: 4, padding: "3px 4px 3px 3px", borderRadius: 8,
                            border: `1px solid ${n > 0 ? "rgba(34,197,94,0.55)" : "rgba(255,255,255,0.12)"}`,
                            background: n > 0 ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                          }} title={ITEM_UITLEG[type] ?? type}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/items/${type}.png`} alt={type} style={{ width: 24, height: 24, flexShrink: 0 }} />
                            <button type="button" onClick={() => wijzigStartitem(type, -1)} disabled={n === 0}
                              style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#fff", cursor: "pointer" }}>−</button>
                            <span style={{ minWidth: 14, textAlign: "center", fontWeight: 700, color: n > 0 ? "var(--green)" : "var(--muted)" }}>{n}</span>
                            <button type="button" onClick={() => wijzigStartitem(type, 1)} disabled={n >= MAX_PER_STARTITEM}
                              style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#fff", cursor: "pointer" }}>+</button>
                          </div>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      Elk team krijgt dit bij de start in de balk.
                    </span>
                  </div>
                )}

                {/* Items na de finish */}
                {route.modus !== "mist" && (
                  <div className="form-group">
                    <label className="form-label">🎁 Items inzetten na de finish</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                      onClick={async () => {
                        const nieuw = !route.items_na_finish;
                        const res = await fetch(`/api/admin/routes/${route.id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ items_na_finish: nieuw }),
                        });
                        if (res.ok) setRoute((r) => ({ ...r, items_na_finish: nieuw }));
                      }}>
                      <span style={{ fontSize: "0.78rem", color: route.items_na_finish ? "var(--green)" : "var(--muted)", flexShrink: 0, userSelect: "none" }}>
                        {route.items_na_finish ? "Aan" : "Uit"}
                      </span>
                      <div style={{
                        width: 36, height: 20, borderRadius: 10, flexShrink: 0, position: "relative",
                        background: route.items_na_finish ? "var(--green)" : "rgba(255,255,255,0.15)", transition: "background 0.2s",
                      }}>
                        <div style={{
                          position: "absolute", top: 3, left: route.items_na_finish ? 19 : 3, width: 14, height: 14, borderRadius: "50%",
                          background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {route.items_na_finish
                        ? "Gefinishte teams zetten hun items nog in op teams die onderweg zijn, tot de uitslag vrij is."
                        : "Items vervallen bij de finish."}
                    </span>
                  </div>
                )}

                {/* Respawn */}
                {route.modus === "verspreid" && (
                  <div className="form-group">
                    <label className="form-label">🔄 Respawn (verspreid-modus)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                        onClick={async () => {
                          const nieuw = !route.item_respawn;
                          const res = await fetch(`/api/admin/routes/${route.id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ item_respawn: nieuw }),
                          });
                          if (res.ok) setRoute((r) => ({ ...r, item_respawn: nieuw }));
                        }}>
                        <span style={{ fontSize: "0.78rem", color: route.item_respawn ? "var(--green)" : "var(--muted)", flexShrink: 0, userSelect: "none" }}>
                          {route.item_respawn ? "Aan" : "Uit"}
                        </span>
                        <div style={{
                          width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                          background: route.item_respawn ? "var(--green)" : "rgba(255,255,255,0.15)",
                          transition: "background 0.2s",
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", top: 3, left: route.item_respawn ? 19 : 3,
                            width: 14, height: 14, borderRadius: "50%",
                            background: "#fff",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                          }} />
                        </div>
                      </div>
                      {route.item_respawn && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="number" min={1} value={respawnMinuten}
                            onChange={(e) => setRespawnMinuten(Math.max(1, Number(e.target.value)))}
                            onBlur={() => slaRespawnMinutenOp(respawnMinuten)}
                            style={{
                              width: 56, fontSize: "0.78rem", padding: "5px 8px", borderRadius: 6,
                              border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)",
                              color: "var(--green)", textAlign: "center",
                            }}
                          />
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>min</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}                  </>
                )}

              </div>
            </div>
          </div>
        )}

        {/* Mobiel: knop om het overlay-paneel te openen (kaart blijft altijd zichtbaar) */}
        {!mobielPaneelOpen && (
          <button className="route-editor-mobiel-toggle" onClick={() => setMobielPaneelOpen(true)}>
            ☰ Lijst
          </button>
        )}

        {/* Kaart */}
        <LeafletKaart
          punten={punten}
          addModus={addModus || addSpeciaalModus || centrumModus}
          geselecteerdId={geselecteerd?.id ?? null}
          specialeItems={specialeItems}
          guideCirkel={
            route.modus === "verspreid" && doelAfstandKm > 0 && geselecteerd && punten.length > 0
              ? { lat: geselecteerd.latitude, lng: geselecteerd.longitude, radiusM: doelAfstandKm * 1000 / punten.length }
              : null
          }
          hubModus={route.modus === "verspreid" && punten.length >= 3}
          teamRoutes={teamRoutes}
          centrumPunt={
            route.modus === "mist"
              ? (route.start_latitude !== null && route.start_longitude !== null ? { lat: route.start_latitude, lng: route.start_longitude } : null)
              : (route.modus === "verspreid" ? centrumPunt : null)
          }
          ghostPunten={ghostPunten}
          ghostRadiusM={doelAfstandKm > 0 ? (doelAfstandKm * 1000) / (2 * Math.PI) : 0}
          onCentrumVerplaatst={(lat, lng) => route.modus === "mist" ? slaStartLocatieOp(lat, lng) : setCentrumPunt({ lat, lng })}
          onKlik={kaartKlik}
          onMarkerVerplaatst={markerVerplaatst}
          onMarkerKlik={(id) => setGeselecteerd(punten.find((p) => p.id === id) ?? null)}
          onSpeciaalItemVerplaatst={specialItemVerplaatst}
          onSpeciaalItemKlik={(id) => { setGeselecteerdSpeciaal(specialeItems.find((i) => i.id === id) ?? null); setGeselecteerd(null); }}
          geselecteerdSpeciaalId={geselecteerdSpeciaal?.id ?? null}
          vliegNaar={vliegNaar}
          itemVoorstellen={toonVoorstellen && itemCheck ? itemCheck.voorstellen : []}
          uitgelichtTeam={uitgelichtTeam}
          onItemVoorstelKlik={(v) => voegSpeciaalItemToeOp(v.lat, v.lng, v.type)}
        />

        {/* Afstand en tijd per team: klein, inklapbaar paneel op de kaart */}
        {route.modus === "verspreid" && (teamSchattingen.length > 0 || specialeItems.length > 0 || itemCheck) && (
          <div className="route-editor-tijden">
            <button className="route-editor-tijden-kop" onClick={() => setTijdenOpen((v) => !v)} aria-expanded={tijdenOpen}>
              ⏱️ Afstand, tijd &amp; punten per team <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{tijdenOpen ? "▾" : "▸"}</span>
            </button>
            {tijdenOpen && (
              <>
                {teamSchattingen.map((s) => (
                  <div key={s.teamIndex} className="route-editor-tijden-rij"
                    title={`Tijd: lopen ≈ ${formateerMinuten(s.lopenMin)} · vragen ≈ ${formateerMinuten(s.vragenMin)} · items ≈ ${formateerMinuten(s.itemsMin)}
Punten: vragen ≈ ${s.punten.vragen} (max ${s.punten.maxVragen}, bij ~70% goed) · items ≈ ${s.punten.items >= 0 ? "+" : ""}${s.punten.items}`}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: s.kleur, flexShrink: 0 }} />
                    <span style={{ color: s.kleur, fontWeight: 700 }}>Team {s.teamIndex}</span>
                    <span style={{ marginLeft: "auto" }}>{(s.afstandM / 1000).toFixed(2).replace(".", ",")} km</span>
                    <span style={{ fontWeight: 700, minWidth: 54, textAlign: "right" }}>≈ {formateerMinuten(s.totaalMin)}</span>
                    <span style={{ fontWeight: 700, minWidth: 50, textAlign: "right", color: "#FFE680" }}>≈ {s.punten.totaal} pt</span>
                  </div>
                ))}
                {teamSchattingen.length > 0 && (
                  <div className="route-editor-tijden-voet">4,5 km/u · 2 min/vraag · 70% goed · items meegerekend</div>
                )}
                {/* Check: genoeg items voor deze lengte en speeltijd? */}
                {itemCheck && (
                  <div style={{ marginTop: 6, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "0.7rem", lineHeight: 1.4 }}>
                    {itemCheck.tekort > 0 ? (
                      <span style={{ color: "#FBBF24" }}>
                        🎁 {itemCheck.nuOppakbaar}/±{itemCheck.advies.oppakbaar} items (+{itemCheck.advies.plekzooi} plek zooi) — nog {itemCheck.tekort}
                        {itemCheck.voorstellen.length > 0 && ", zie gouden ➕"}
                      </span>
                    ) : itemCheck.teVeel ? (
                      <span style={{ color: "#F87171" }}>🎁 {itemCheck.nuOppakbaar} items, advies ±{itemCheck.advies.oppakbaar}: te veel</span>
                    ) : (
                      <span style={{ color: "#4ADE80" }}>🎁 Genoeg items (±{itemCheck.advies.oppakbaar} + {itemCheck.advies.plekzooi} plek zooi)</span>
                    )}
                    {itemCheck.voorstellen.length > 0 && (
                      <button onClick={() => setToonVoorstellen((v) => !v)}
                        style={{ display: "block", marginTop: 3, background: "none", border: "none", padding: 0, color: "var(--muted)", fontSize: "0.66rem", cursor: "pointer", textDecoration: "underline" }}>
                        {toonVoorstellen ? "Voorstellen verbergen" : "Voorstellen tonen"}
                      </button>
                    )}
                  </div>
                )}
                {/* Geplaatste items per soort (bewust klein en ingetogen) */}
                {specialeItems.length > 0 && (() => {
                  const perType = new Map<string, number>();
                  specialeItems.forEach((i) => perType.set(i.type, (perType.get(i.type) ?? 0) + 1));
                  return (
                    <div className="route-editor-tijden-items" title="Geplaatste items op de kaart">
                      {[...perType].sort((a, b) => b[1] - a[1]).map(([type, n]) => (
                        <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/items/${type}.png`} alt={type} style={{ width: 16, height: 16, opacity: 0.85 }} />
                          {n}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Rechter bewerkdrawer — op mobiel een bottom-sheet */}
        {(geselecteerd || (geselecteerdSpeciaal && !geselecteerd)) && (
          <div className="route-editor-drawer" ref={paneelRef} onPointerDown={startPaneelSlepen}
            style={paneelPlek ? { left: paneelPlek.x, top: paneelPlek.y } : undefined}>
            {geselecteerd && (
              <PuntForm
                punt={geselecteerd}
                routeId={route.id}
                opslaan={opslaan}
                fout={fout}
                alleenVraag={route.modus === "mist"}
                heeftVraag={vraagPuntIds.has(geselecteerd.id)}
                naamVoorstel={naamVoorstellen.get(geselecteerd.id) ?? null}
                onOpslaan={slaPuntOp}
                onVerwijder={() => verwijderPunt(geselecteerd.id)}
                onSluit={() => setGeselecteerd(null)}
              />
            )}
            {geselecteerdSpeciaal && !geselecteerd && (
              <SpeciaalItemForm
                item={geselecteerdSpeciaal}
                alleenPlekzooi={route.modus === "sequentieel"}
                onOpslaan={(update) => slaSpeciaalItemOp(geselecteerdSpeciaal.id, update)}
                onVerwijder={() => { verwijderSpeciaalItem(geselecteerdSpeciaal.id); setGeselecteerdSpeciaal(null); }}
                onSluit={() => setGeselecteerdSpeciaal(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── StatusPil ─────────────────────────────────────────────────────────────────
function StatusPil({ status, isActief }: { status: string; isActief: boolean }) {
  if (isActief) return <span style={{ background: "var(--green-soft)", color: "var(--green)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>✓ Actief</span>;
  if (status === "gepubliceerd") return <span style={{ background: "var(--cyan-soft)", color: "var(--cyan)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>Gepubliceerd</span>;
  return <span style={{ background: "var(--line)", color: "var(--muted)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>Concept</span>;
}

// ── SpeciaalItemForm ──────────────────────────────────────────────────────────
function SpeciaalItemForm({ item, alleenPlekzooi, onOpslaan, onVerwijder, onSluit }: {
  item: SpeciaalItem;
  alleenPlekzooi: boolean;
  onOpslaan: (u: Partial<SpeciaalItem>) => void;
  onVerwijder: () => void;
  onSluit: () => void;
}) {
  // Een klik op een type slaat meteen op; radius staat in ⚙️ Instellingen → Items
  const type = item.type;
  return (
    <div className="editor-paneel-inhoud">
      <div className="editor-paneel-kop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/items/${type}.png`} alt="" style={{ width: 22, height: 22 }} />
        <span>Item</span>
        <button onClick={onSluit} className="editor-paneel-sluit" aria-label="Sluiten">✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
        {(["ster", "verdubbeling", "radar", "bom", "spook", "dief", "banaan", "wissel", "vraagteken", "plekzooi"] as SpeciaalItemType[]).map((t) => {
          const gekozen = type === t;
          const uit = alleenPlekzooi && t !== "plekzooi";
          return (
            <button key={t} type="button" disabled={uit} title={ITEM_UITLEG[t] ?? t}
              onClick={() => { if (!gekozen) onOpslaan({ type: t, points_effect: t === "ster" ? 50 : 0, name: t === "plekzooi" ? "Plek zooi" : "Speciaal item" }); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "4px 2px",
                borderRadius: 8, cursor: uit ? "not-allowed" : "pointer", opacity: uit ? 0.3 : 1,
                border: `2px solid ${gekozen ? "var(--cyan)" : "rgba(255,255,255,0.12)"}`,
                background: gekozen ? "rgba(0,217,255,0.15)" : "rgba(255,255,255,0.04)",
                color: gekozen ? "#fff" : "var(--muted)", fontSize: "0.58rem", fontWeight: 700,
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${t}.png`} alt="" style={{ width: 26, height: 26 }} />
              {t === "plekzooi" ? "plek zooi" : t === "verdubbeling" ? "dubbel" : t}
            </button>
          );
        })}
      </div>

      {type === "plekzooi" && (
        <div className="editor-paneel-noot">⚠️ Onzichtbaar voor spelers. Duur: ⚙️ Instellingen.</div>
      )}
      {alleenPlekzooi && type !== "plekzooi" && (
        <div className="editor-paneel-noot" style={{ color: "#F87171" }}>Sequentieel toont alleen plek zooi; dit item ziet niemand.</div>
      )}
      {item.claimed && <div className="editor-paneel-noot">✅ Dit item is al opgepakt.</div>}

      <button className="rl-knop rl-knop--rood" style={{ width: "100%" }} onClick={onVerwijder}>🗑️ Verwijderen</button>
    </div>
  );
}

// ── PuntForm ──────────────────────────────────────────────────────────────────
function PuntForm({ punt, routeId, opslaan, fout, alleenVraag, heeftVraag, naamVoorstel, onOpslaan, onVerwijder, onSluit }: {
  punt: RoutePunt; routeId: string; opslaan: boolean; fout: string; alleenVraag?: boolean; heeftVraag: boolean;
  naamVoorstel: string | null;
  onOpslaan: (u: Partial<RoutePunt>) => void; onVerwijder: () => void; onSluit: () => void;
}) {
  const [naam, setNaam] = useState(punt.name);
  const [beschrijving, setBeschrijving] = useState(punt.description ?? "");
  const [type, setType] = useState(punt.type);

  useEffect(() => {
    setNaam(punt.name); setBeschrijving(punt.description ?? ""); setType(punt.type);
  // Alleen resetten bij wisselen van punt, niet bij elke prop-update (anders vecht dit met lokale invoer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punt.id]);

  return (
    <div className="editor-paneel-inhoud">
      <div className="editor-paneel-kop">
        <span style={{ fontSize: "1.1rem" }}>{type === "eindpunt" ? "🏁" : type === "informatiepunt" ? "ℹ️" : "📍"}</span>
        <span>Punt</span>
        <button onClick={onSluit} className="editor-paneel-sluit" aria-label="Sluiten">✕</button>
      </div>

      {/* Vraag: het belangrijkste, dus bovenaan */}
      <div className="editor-paneel-noot" style={{ fontWeight: 600, color: heeftVraag ? "#93C5FD" : punt.type === "vraagpunt" ? "#FBBF24" : "var(--muted)" }}>
        {heeftVraag ? "❓ Aan dit punt hangt een vraag." : punt.type === "vraagpunt" ? "⚠️ Dit vraagpunt heeft nog geen vraag." : "Aan dit punt hangt geen vraag."}
      </div>
      <a href={`/admin/routes/${routeId}/punten/${punt.id}`} className="rl-knop rl-knop--cyan"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
        {heeftVraag ? "❓ Vraag bewerken →" : "➕ Vraag toevoegen →"}
      </a>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Naam</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="form-input" spellCheck lang="nl" value={naam} onChange={(e) => setNaam(e.target.value)} style={{ fontSize: "0.85rem", flex: 1, minWidth: 0 }} />
          {/* Naamvoorstel uit de vraag: alleen invullen als je erop klikt */}
          {naamVoorstel && naamVoorstel !== naam && (
            <button type="button" className="rl-knop rl-knop--icoon" onClick={() => setNaam(naamVoorstel)}
              title={`Voorstel: "${naamVoorstel}" (uit de vraag)`} aria-label="Naam voorstellen" style={{ height: 38, width: 38 }}>💡</button>
          )}
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Beschrijving</label>
        <textarea className="form-textarea" spellCheck lang="nl" value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} style={{ fontSize: "0.85rem", minHeight: 48 }} />
      </div>
      {!alleenVraag && (
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Type</label>
          <div style={{ display: "flex", gap: 3 }}>
            {([["vraagpunt", "❓ Vraag"], ["informatiepunt", "ℹ️ Info"], ["eindpunt", "🏁 Eind"]] as const).map(([t, label]) => (
              <button key={t} type="button" onClick={() => setType(t)}
                style={{
                  flex: 1, padding: "7px 2px", borderRadius: 8, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
                  border: `2px solid ${type === t ? "var(--cyan)" : "rgba(255,255,255,0.12)"}`,
                  background: type === t ? "rgba(0,217,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: type === t ? "#fff" : "var(--muted)", whiteSpace: "nowrap",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="editor-paneel-noot">Radius en punten: ⚙️ Instellingen.</div>
      {fout && <div className="melding melding-fout" style={{ fontSize: "0.78rem" }}>⚠️ {fout}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="rl-knop rl-knop--cyan" style={{ flex: 1 }} disabled={opslaan}
          onClick={() => onOpslaan({ name: naam, description: beschrijving, type })}>
          {opslaan ? "Opslaan…" : "Opslaan"}
        </button>
        <button className="rl-knop rl-knop--rood rl-knop--icoon" title="Verwijderen" aria-label="Verwijderen" onClick={onVerwijder}>🗑️</button>
      </div>
    </div>
  );
}
