"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Route, RoutePunt, SpeciaalItem, SpeciaalItemType } from "@/types/database";
import { haversine } from "@/lib/geo";
import { itemAdvies, voorgesteldePlekken, ITEM_GROEPEN } from "@/lib/item-advies";
import { schatTeamTijd, schatTeamPunten, formateerMinuten } from "@/lib/tijd-schatting";
import { STARTITEM_TYPES, MAX_PER_STARTITEM, startitemsVan } from "@/lib/startitems";
import { ITEMS_NA_FINISH, itemsNaFinishVan } from "@/lib/item-sessie";
import BevestigKnop from "@/components/admin/BevestigKnop";
import VraagEditorPagina, { type VraagMetAntwoorden } from "@/components/admin/VraagEditorPagina";
import { toonMelding } from "@/components/admin/Melding";
import { naamUitVraag, isStandaardNaam } from "@/lib/punt-naam";
import { kiesInstappunten } from "@/lib/instappunten";
import { MODUS_INFO, ModusIcoon, ModusTegel } from "./RouteModus";
import { ITEM_UITLEG } from "./editor/item-uitleg";
import { StatusPil, SpeciaalItemForm, PuntForm } from "./editor/Formulieren";
import ControleVenster from "./editor/ControleVenster";
import { routeControle } from "@/lib/route-controle";

const LeafletKaart = dynamic(() => import("./LeafletKaart"), { ssr: false, loading: () => <div style={{ flex: 1, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Kaart laden…</div> });

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

  // Opslaan zichtbaar maken: elke wijziging toont "Opslaan…", daarna ✓ Opgeslagen of ⚠ Niet opgeslagen
  const [opslag, setOpslag] = useState<"rust" | "bezig" | "ok" | "fout">("rust");
  const lopendRef = useRef(0);
  const misluktRef = useRef(false);
  const opslagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function api(url: string, init?: RequestInit): Promise<Response> {
    if (!init?.method || init.method === "GET") return fetch(url, init);
    lopendRef.current++;
    if (opslagTimerRef.current) clearTimeout(opslagTimerRef.current);
    setOpslag("bezig");
    let gelukt = false;
    try {
      const res = await fetch(url, init);
      gelukt = res.ok;
      return res;
    } catch {
      return new Response(JSON.stringify({ fout: "Geen verbinding" }), { status: 503 });
    } finally {
      lopendRef.current--;
      if (!gelukt) misluktRef.current = true;
      if (lopendRef.current === 0) {
        const fout = misluktRef.current;
        misluktRef.current = false;
        setOpslag(fout ? "fout" : "ok");
        if (fout) toonMelding("Niet opgeslagen. Controleer de verbinding en probeer het opnieuw.", "fout");
        else opslagTimerRef.current = setTimeout(() => setOpslag("rust"), 2500);
      }
    }
  }
  const [route, setRoute] = useState(initRoute);
  const [punten, setPunten] = useState<RoutePunt[]>(initRoute.route_points ?? []);
  // Welke punten een vraag hebben (bijgewerkt via vraagBijgewerkt na het vraagvenster)
  const [vraagPuntIds, setVraagPuntIds] = useState(() => new Set(
    (initRoute.route_points ?? []).filter((p) => (p.questions?.length ?? 0) > 0).map((p) => p.id),
  ));
  // Naamvoorstel per punt, bedacht uit de vraag of het goede antwoord (knop 💡 in het puntpaneel)
  const [naamVoorstellen, setNaamVoorstellen] = useState(() => new Map(
    (initRoute.route_points ?? []).filter((p) => p.questions?.length && p.questions[0].type).map((p) => {
      const v = p.questions![0];
      return [p.id, naamUitVraag({ ...v, type: v.type! })] as const;
    }),
  ));
  // Maximaal te halen punten per vraag (hoogste van de vraagpunten en de punten per antwoord)
  const [vraagMaxPunten, setVraagMaxPunten] = useState(() => new Map(
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
    await api(`/api/admin/routes/${initRoute.id}`, {
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
    api(`/api/admin/routes/${route.id}/speciaal`).then((r) => r.ok ? r.json() : []).then(setSpecialeItems);
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
    // Instappunten met ongeveer gelijke aanloop vanaf de startplek (zelfde berekening als in het spel)
    const instap = kiesInstappunten(
      { lat: hubStart.latitude, lng: hubStart.longitude },
      middenpunten.map((p) => ({ lat: p.latitude, lng: p.longitude })),
      verwachtTeams,
    );
    return Array.from({ length: verwachtTeams }, (_, k) => {
      const offset = instap[k] ?? 0;
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

  // Standaardnamen ("Punt 8") volgen het nummer op de kaart, ook na verschuiven of verwijderen.
  // Zelfgekozen namen blijven staan.
  const volgordeSleutel = punten.map((p) => `${p.id}:${p.name}`).join("|");
  useEffect(() => {
    const hub = route.modus === "verspreid" && punten.length >= 3;
    const fout = punten
      .map((p, i) => ({ p, juist: `Punt ${hub ? i : i + 1}`, i }))
      .filter(({ p, juist, i }) => p.type !== "eindpunt" && !(hub && i === 0) && isStandaardNaam(p.name) && p.name !== juist);
    if (!fout.length) return;
    setPunten((ps) => ps.map((p) => fout.find((f) => f.p.id === p.id) ? { ...p, name: fout.find((f) => f.p.id === p.id)!.juist } : p));
    fout.forEach((f) => api(`/api/admin/routes/${route.id}/punten/${f.p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.juist }),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volgordeSleutel, route.modus]);
  // Rondje-instellingen (teams, afstand, genereren): dicht zodra er punten staan
  const [rondjeOpen, setRondjeOpen] = useState(false);
  // Uitleg "tik op de kaart…" zit achter een ⓘ
  const [tikUitlegOpen, setTikUitlegOpen] = useState(false);
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
    await Promise.all(doel.map((p) => api(`/api/admin/routes/${route.id}/punten/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update),
    })));
  }
  async function pasAlleItemsAan(radius: number) {
    setSpecialeItems((its) => its.map((i) => ({ ...i, radius_meters: radius })));
    await Promise.all(specialeItems.map((i) => api(`/api/admin/routes/${route.id}/speciaal/${i.id}`, {
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
  // "Klaar om te spelen?": alles wat vóór het activeren nog aandacht nodig heeft
  const [controleOpen, setControleOpen] = useState(() => zoekParams.get("controle") === "1");
  const controle = useMemo(() => routeControle({
    punten, modus: route.modus, vraagPuntIds, verwachtTeams,
    itemTekort: itemCheck?.tekort ?? 0, itemTeVeel: !!itemCheck?.teVeel,
    teamStarts: teamRoutes.map((t) => t.coords.slice(0, 2)),
    teamMinuten: teamSchattingen.map((t) => t.totaalMin),
  }), [punten, route.modus, vraagPuntIds, verwachtTeams, itemCheck, teamRoutes, teamSchattingen]);
  async function activeerRoute() {
    const res = await api(`/api/admin/routes/${route.id}/activeren`, { method: "POST" });
    if (res.ok) { setRoute((r) => ({ ...r, is_active: true })); setControleOpen(false); toonMelding("Route is actief: teams kunnen starten", "ok"); }
  }

  // Startitems: wat elk team bij de start gratis in de balk krijgt
  const [startitems, setStartitems] = useState<Record<string, number>>(() => startitemsVan(initRoute));
  async function wijzigStartitem(type: string, delta: number) {
    const nieuw = { ...startitems, [type]: Math.max(0, Math.min(MAX_PER_STARTITEM, (startitems[type] ?? 0) + delta)) };
    setStartitems(nieuw);
    await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startitems: nieuw }),
    });
  }
  // Per item: mag een gefinisht team dit nog inzetten (tot de uitslag vrij is)
  const naFinishTypes = itemsNaFinishVan(route);
  async function wisselNaFinish(type: string) {
    const nieuw = naFinishTypes.includes(type) ? naFinishTypes.filter((t) => t !== type) : [...naFinishTypes, type];
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items_na_finish_types: nieuw }),
    });
    if (res.ok) setRoute((r) => ({ ...r, items_na_finish_types: nieuw, items_na_finish: nieuw.length > 0 }));
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
    const res = await api(`/api/admin/routes/${route.id}/punten`);
    if (res.ok) setPunten(await res.json());
  }

  async function genereerPuntenInCirkel() {
    if (!centrumPunt || doelAfstandKm <= 0) return;
    const radiusM = (doelAfstandKm * 1000) / (2 * Math.PI);
    const coords = puntenOpCirkel(centrumPunt.lat, centrumPunt.lng, radiusM, aantalPunten);
    for (const pt of punten) {
      const res = await api(`/api/admin/routes/${route.id}/punten/${pt.id}`, { method: "DELETE" });
      if (!res.ok) {
        toonMelding(`"${pt.name}" kon niet verwijderd worden — de punten zijn niet opnieuw gegenereerd.`, "fout");
        await herlaadPunten();
        return;
      }
    }
    setPunten([]);
    setGeselecteerd(null);
    const nieuwePunten: RoutePunt[] = [];

    // Startpunt op het middelpunt
    const resStart = await api(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: centrumPunt.lat, longitude: centrumPunt.lng, type: "informatiepunt", name: "Startpunt", points: 0 }),
    });
    if (resStart.ok) nieuwePunten.push(await resStart.json());

    // Circulaire vraagpunten — genummerd vanaf 1, gelijk aan de nummers in lijst en kaart
    for (const [n, coord] of coords.entries()) {
      const res = await api(`/api/admin/routes/${route.id}/punten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coord.lat, longitude: coord.lng, points: 10, name: `Punt ${n + 1}` }),
      });
      if (res.ok) nieuwePunten.push(await res.json());
    }

    // Finish op het middelpunt
    const resEind = await api(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: centrumPunt.lat, longitude: centrumPunt.lng, type: "eindpunt", name: "Finish", points: 0 }),
    });
    if (resEind.ok) nieuwePunten.push(await resEind.json());

    setPunten(nieuwePunten);
  }

  async function voegPuntToeOp(lat: number, lng: number) {
    const res = await api(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, points: puntPunten, radius_meters: puntRadius }),
    });
    if (res.ok) {
      const nieuw: RoutePunt = await res.json();
      onthoud({ soort: "punt-erbij", id: nieuw.id });
      // Is het laatste punt de finish (eindpunt), dan komt het nieuwe punt ervóór, niet erachter
      const laatste = punten[punten.length - 1];
      if (laatste && laatste.type === "eindpunt") {
        const volgorde = [...punten.slice(0, -1), nieuw, laatste];
        setPunten(volgorde);
        await api(`/api/admin/routes/${route.id}/punten/volgorde`, {
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
    const res = await api(`/api/admin/routes/${route.id}/speciaal`, {
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
      onthoud({ soort: "item-erbij", id: nieuw.id });
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

  // Vraag bewerken in een venster boven de editor (geen herladen, alles blijft open)
  const [vraagVenster, setVraagVenster] = useState<{ punt: RoutePunt; vraag: VraagMetAntwoorden | null } | null>(null);
  async function openVraag(punt: RoutePunt) {
    const res = await api(`/api/admin/routes/${route.id}/punten/${punt.id}/vraag`);
    setVraagVenster({ punt, vraag: res.ok ? await res.json() : null });
  }
  function vraagBijgewerkt(puntId: string, vraag: VraagMetAntwoorden | null) {
    setVraagPuntIds((oud) => { const n = new Set(oud); if (vraag) n.add(puntId); else n.delete(puntId); return n; });
    setNaamVoorstellen((oud) => {
      const n = new Map(oud);
      if (vraag?.type) n.set(puntId, naamUitVraag({ ...vraag, type: vraag.type })); else n.delete(puntId);
      return n;
    });
    setVraagMaxPunten((oud) => {
      const n = new Map(oud);
      if (vraag) {
        const perAntwoord = (vraag.answer_options ?? []).map((o) => o.punten).filter((x): x is number => typeof x === "number");
        n.set(puntId, Math.max(vraag.points ?? 0, ...perAntwoord));
      } else n.delete(puntId);
      return n;
    });
  }

  // Ongedaan maken in meerdere stappen: knop ↶ bovenin of Ctrl+Z.
  // Een teruggezet punt of item krijgt een nieuw id; idMapRef zet oude id's om, zodat
  // eerdere stappen voor dat punt (verschuiven, wijzigen) daarna nog steeds werken.
  type Stap =
    | { soort: "item-weg"; item: SpeciaalItem }
    | { soort: "punt-weg"; punt: RoutePunt; plek: number; vraag: Record<string, unknown> | null }
    | { soort: "item-erbij"; id: string }
    | { soort: "punt-erbij"; id: string }
    | { soort: "item-gewijzigd"; id: string; oud: Partial<SpeciaalItem> }
    | { soort: "punt-gewijzigd"; id: string; oud: Partial<RoutePunt> }
    | { soort: "volgorde"; ids: string[] };
  const [stappen, setStappen] = useState<Stap[]>([]);
  const [herstelToast, setHerstelToast] = useState<string | null>(null);
  const [bezigMetHerstel, setBezigMetHerstel] = useState(false);
  const herstelToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idMapRef = useRef(new Map<string, string>());
  const los = (id: string) => { let x = id; while (idMapRef.current.has(x)) x = idMapRef.current.get(x)!; return x; };
  function stapLabel(st: Stap): string {
    switch (st.soort) {
      case "item-weg": return "item verwijderd";
      case "punt-weg": return `${st.punt.name} verwijderd`;
      case "item-erbij": return "item toegevoegd";
      case "punt-erbij": return "punt toegevoegd";
      case "item-gewijzigd": return "latitude" in st.oud ? "item verschoven" : "item gewijzigd";
      case "punt-gewijzigd": return "latitude" in st.oud ? "punt verschoven" : "punt gewijzigd";
      case "volgorde": return "volgorde gewijzigd";
    }
  }
  function onthoud(st: Stap, metToast = false) {
    setStappen((oud) => [...oud.slice(-29), st]);
    if (!metToast) return;
    setHerstelToast(stapLabel(st));
    if (herstelToastTimerRef.current) clearTimeout(herstelToastTimerRef.current);
    herstelToastTimerRef.current = setTimeout(() => setHerstelToast(null), 10000);
  }
  // Huidige waarden van de velden die een wijziging gaat aanpassen
  function oudeWaarden<T extends object>(bron: T | undefined, update: Partial<T>): Partial<T> {
    const oud: Partial<T> = {};
    if (bron) for (const k of Object.keys(update) as (keyof T)[]) oud[k] = bron[k];
    return oud;
  }
  async function zetVolgorde(lijst: RoutePunt[]) {
    setPunten(lijst);
    await api(`/api/admin/routes/${route.id}/punten/volgorde`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volgorde: lijst.map((x) => x.id) }),
    });
  }

  async function maakOngedaan() {
    const st = stappen[stappen.length - 1];
    if (!st || bezigMetHerstel) return;
    setBezigMetHerstel(true);
    setHerstelToast(null);
    setStappen((oud) => oud.slice(0, -1));
    try {
      if (st.soort === "item-weg") {
        const { type, name, latitude, longitude, radius_meters, points_effect } = st.item;
        const res = await api(`/api/admin/routes/${route.id}/speciaal`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, name, latitude, longitude, radius_meters, points_effect }),
        });
        if (res.ok) {
          const terug: SpeciaalItem = await res.json();
          idMapRef.current.set(st.item.id, terug.id);
          setSpecialeItems((p) => [...p, terug]);
        }
      } else if (st.soort === "punt-weg") {
        const p = st.punt;
        const res = await api(`/api/admin/routes/${route.id}/punten`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: p.type, name: p.name, latitude: p.latitude, longitude: p.longitude, radius_meters: p.radius_meters, points: p.points }),
        });
        if (!res.ok) return;
        const terug: RoutePunt = await res.json();
        idMapRef.current.set(p.id, terug.id);
        // Overige velden en de vraag met antwoorden terugzetten
        await api(`/api/admin/routes/${route.id}/punten/${terug.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: p.description, image_path: p.image_path, sound_path: p.sound_path, qr_unlock_enabled: p.qr_unlock_enabled, qr_secret: p.qr_secret }),
        });
        if (st.vraag) {
          await api(`/api/admin/routes/${route.id}/punten/${terug.id}/vraag`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...st.vraag, antwoorden: st.vraag.answer_options ?? [] }),
          });
          vraagBijgewerkt(terug.id, st.vraag as unknown as VraagMetAntwoorden);
        }
        // Terug op dezelfde plek in de volgorde
        const lijst = punten.filter((x) => x.id !== terug.id);
        lijst.splice(Math.min(st.plek, lijst.length), 0, { ...p, id: terug.id });
        await zetVolgorde(lijst);
        await herlaadPunten();
      } else if (st.soort === "item-erbij") {
        const id = los(st.id);
        await api(`/api/admin/routes/${route.id}/speciaal/${id}`, { method: "DELETE" });
        setSpecialeItems((p) => p.filter((i) => i.id !== id));
        if (geselecteerdSpeciaal?.id === id) setGeselecteerdSpeciaal(null);
      } else if (st.soort === "punt-erbij") {
        const id = los(st.id);
        await api(`/api/admin/routes/${route.id}/punten/${id}`, { method: "DELETE" });
        if (geselecteerd?.id === id) setGeselecteerd(null);
        await herlaadPunten();
      } else if (st.soort === "item-gewijzigd") {
        await slaSpeciaalItemOp(los(st.id), st.oud, false);
      } else if (st.soort === "punt-gewijzigd") {
        const id = los(st.id);
        const res = await api(`/api/admin/routes/${route.id}/punten/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(st.oud),
        });
        if (res.ok) {
          const bijgewerkt: RoutePunt = await res.json();
          setPunten((p) => p.map((pt) => pt.id === id ? bijgewerkt : pt));
          setGeselecteerd((g) => (g?.id === id ? bijgewerkt : g));
        }
      } else if (st.soort === "volgorde") {
        // Oude volgorde terug; punten die er toen nog niet waren blijven vóór de finish staan
        const perId = new Map(punten.map((p) => [p.id, p]));
        const lijst = st.ids.map(los).map((id) => perId.get(id)).filter((p): p is RoutePunt => !!p);
        const nieuw = punten.filter((p) => !lijst.includes(p));
        const eind = lijst[lijst.length - 1]?.type === "eindpunt" ? lijst.length - 1 : lijst.length;
        lijst.splice(eind, 0, ...nieuw);
        await zetVolgorde(lijst);
      }
    } finally {
      setBezigMetHerstel(false);
    }
  }
  // Ctrl+Z (of Cmd+Z), behalve tijdens het typen in een veld
  const maakOngedaanRef = useRef(maakOngedaan);
  maakOngedaanRef.current = maakOngedaan;
  useEffect(() => {
    function toets(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
      const doel = e.target as HTMLElement | null;
      if (doel && (doel.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(doel.tagName))) return;
      if (document.querySelector("[data-vraagvenster]")) return;
      e.preventDefault();
      maakOngedaanRef.current();
    }
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, []);

  async function verwijderSpeciaalItem(id: string) {
    // Geen bevestiging: met "Ongedaan maken" komt het terug
    const item = specialeItems.find((i) => i.id === id);
    await api(`/api/admin/routes/${route.id}/speciaal/${id}`, { method: "DELETE" });
    if (geselecteerdSpeciaal?.id === id) setGeselecteerdSpeciaal(null);
    setSpecialeItems((p) => p.filter((i) => i.id !== id));
    if (item) onthoud({ soort: "item-weg", item }, true);
  }

  async function slaSpeciaalItemOp(id: string, update: Partial<SpeciaalItem>, registreer = true) {
    if (registreer) onthoud({ soort: "item-gewijzigd", id, oud: oudeWaarden(specialeItems.find((i) => i.id === id), update) });
    const res = await api(`/api/admin/routes/${route.id}/speciaal/${id}`, {
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
    const oud = punten.find((p) => p.id === id);
    if (oud) onthoud({ soort: "punt-gewijzigd", id, oud: { latitude: oud.latitude, longitude: oud.longitude } });
    await api(`/api/admin/routes/${route.id}/punten/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    setPunten((p) => p.map((pt) => pt.id === id ? { ...pt, latitude: lat, longitude: lng } : pt));
  }

  async function verwijderPunt(id: string) {
    // Eerst bewaren (met vraag en antwoorden), zodat "Ongedaan maken" alles terug kan zetten
    const plek = punten.findIndex((p) => p.id === id);
    const punt = punten[plek];
    let vraag: Record<string, unknown> | null = null;
    if (punt && vraagPuntIds.has(id)) {
      const res = await api(`/api/admin/routes/${route.id}/punten/${id}/vraag`);
      if (res.ok) vraag = await res.json();
    }
    await api(`/api/admin/routes/${route.id}/punten/${id}`, { method: "DELETE" });
    if (punt) onthoud({ soort: "punt-weg", punt, plek, vraag }, true);
    if (geselecteerd?.id === id) setGeselecteerd(null);
    await herlaadPunten();
  }

  // Slepen in de puntenlijst: een punt in één keer naar een andere plek
  const [sleepId, setSleepId] = useState<string | null>(null);
  const [sleepDoel, setSleepDoel] = useState<number | null>(null);
  async function verplaatsNaar(id: string, doel: number) {
    const van = punten.findIndex((p) => p.id === id);
    if (van < 0 || van === doel) return;
    const lijst = [...punten];
    const [punt] = lijst.splice(van, 1);
    // Start (verspreid) en finish blijven vast op de eerste en laatste plek
    const hub = route.modus === "verspreid" && punten.length >= 3;
    const laag = hub ? 1 : 0;
    const laatsteIsEind = lijst[lijst.length - 1]?.type === "eindpunt";
    const hoog = laatsteIsEind || hub ? lijst.length - 1 : lijst.length;
    lijst.splice(Math.min(Math.max(doel, laag), hoog), 0, punt);
    onthoud({ soort: "volgorde", ids: punten.map((p) => p.id) });
    await zetVolgorde(lijst);
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
    onthoud({ soort: "volgorde", ids: punten.map((p) => p.id) });
    await zetVolgorde(nieuw);
  }

  async function slaRouteNaamOp() {
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuweNaam }),
    });
    if (res.ok) { setRoute((r) => ({ ...r, name: nieuweNaam })); setNaamWijzig(false); }
  }

  async function slaVerspreideInstellingenOp(teams: number, afstand: number) {
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verwacht_aantal_teams: teams, doel_afstand_km: afstand }),
    });
    if (res.ok) setRoute((r) => ({ ...r, verwacht_aantal_teams: teams, doel_afstand_km: afstand }));
  }

  async function slaItemWaardenOp(ster: number, bom: number) {
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ster_waarde: ster, bom_waarde: bom }),
    });
    if (res.ok) setRoute((r) => ({ ...r, ster_waarde: ster, bom_waarde: bom }));
  }

  async function slaRespawnMinutenOp(minuten: number) {
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respawn_minuten: minuten }),
    });
    if (res.ok) setRoute((r) => ({ ...r, respawn_minuten: minuten }));
  }

  async function slaItemDuurOp(veld: "plekzooi_duur_seconden" | "spook_duur_seconden", minuten: number) {
    const seconden = Math.round(minuten * 60);
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [veld]: seconden }),
    });
    if (res.ok) setRoute((r) => ({ ...r, [veld]: seconden }));
  }

  async function slaTussenstandIntervalOp(minuten: number) {
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tussenstand_interval_minuten: minuten }),
    });
    if (res.ok) setRoute((r) => ({ ...r, tussenstand_interval_minuten: minuten }));
  }

  async function slaTussenstandDuurOp(seconden: number) {
    const res = await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tussenstand_duur_seconden: seconden }),
    });
    if (res.ok) setRoute((r) => ({ ...r, tussenstand_duur_seconden: seconden }));
  }

  async function slaPuntOp(update: Partial<RoutePunt>) {
    if (!geselecteerd) return;
    onthoud({ soort: "punt-gewijzigd", id: geselecteerd.id, oud: oudeWaarden(geselecteerd, update) });
    setOpslaan(true); setFout("");
    const res = await api(`/api/admin/routes/${route.id}/punten/${geselecteerd.id}`, {
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
                const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nieuweStatus }) });
                if (res.ok) setRoute((r) => ({ ...r, status: nieuweStatus }));
              }}>
              {route.status === "gepubliceerd" ? "↩ Concept" : "📢 Publiceer"}
            </button>
          )}
          {!route.is_active && route.status === "gepubliceerd" && (
            <button className="btn btn-cyan" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={() => setControleOpen(true)}>▶ Activeer</button>
          )}
          {!route.is_active && (
            <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "5px 10px" }} onClick={() => setControleOpen(true)}
              title="Klaar om te spelen? Controleer de route vóór het activeren">
              🩺 Controle{controle.length ? ` (${controle.length})` : " ✓"}
            </button>
          )}
          {route.is_active && (
            <BevestigKnop className="btn btn-danger" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              vraag="Terug naar concept?" ja="Ja, deactiveer"
              onBevestig={async () => {
                const res = await api(`/api/admin/routes/${route.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ is_active: false, status: "concept" }),
                });
                if (res.ok) setRoute((r) => ({ ...r, is_active: false, status: "concept" }));
              }}>⏹ Deactiveer</BevestigKnop>
          )}
          <button type="button" className="rl-knop" style={{ marginLeft: "auto", height: 30, fontSize: "0.76rem" }}
            disabled={!stappen.length || bezigMetHerstel} onClick={maakOngedaan}
            title={stappen.length ? `Ongedaan maken: ${stapLabel(stappen[stappen.length - 1])} (Ctrl+Z)` : "Niets om ongedaan te maken"}>
            ↶ Ongedaan maken{stappen.length ? ` (${stappen.length})` : ""}
          </button>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, whiteSpace: "nowrap",
            color: opslag === "fout" ? "#FCA5A5" : opslag === "ok" ? "#86EFAC" : "var(--muted)",
            visibility: opslag === "rust" ? "hidden" : "visible" }}>
            {opslag === "bezig" ? "⏳ Opslaan…" : opslag === "fout" ? "⚠️ Niet opgeslagen" : "✓ Opgeslagen"}
          </span>
        </div>
      </div>

      <div className="pc-tip pc-tip--alleen-mobiel" style={{ margin: "8px 16px 0" }}>
        💻 <strong>Tip:</strong> een route bewerk je het makkelijkst op een pc of laptop.
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
                      {punten.length > 0 ? (
                        <BevestigKnop className="btn btn-cyan" style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                          vraag={`Vervangt ${punten.length} punten.`} ja="Ja, vervang" onBevestig={genereerPuntenInCirkel}>
                          🔄 Genereer punten in cirkel
                        </BevestigKnop>
                      ) : (
                        <button className="btn btn-cyan" style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }} onClick={genereerPuntenInCirkel}>
                          🔄 Genereer punten in cirkel
                        </button>
                      )}
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
                        const open = uitgelichtTeam === t.teamIndex;
                        return (
                          // Kort: team en instappunt. Tik = venster op de kaart met de hele looproute
                          <button key={t.teamIndex} type="button"
                            onClick={() => setUitgelichtTeam(open ? null : t.teamIndex)}
                            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "3px 4px", borderRadius: 6, border: "none", cursor: "pointer", color: "var(--text)", textAlign: "left",
                              background: open ? "rgba(255,255,255,0.08)" : "none" }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: t.kleur, flexShrink: 0 }} />
                            <span style={{ color: t.kleur, fontWeight: 700 }}>Team {t.teamIndex}</span>
                            <span style={{ color: "var(--muted)" }}>start {t.nummers[0]}{omgekeerdeTeams.includes(t.teamIndex) ? " · ↺" : ""}</span>
                            <span style={{ marginLeft: "auto", color: "var(--muted)" }}>▸</span>
                          </button>
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
            {/* Toevoegen gaat via de kaart: uitleg achter de ⓘ */}
            <button type="button" onClick={() => setTikUitlegOpen((v) => !v)} title="Tik op de kaart om toe te voegen · sleep om te verplaatsen" aria-expanded={tikUitlegOpen}
              style={{ alignSelf: "center", margin: "0 10px 0 4px", width: 22, height: 22, borderRadius: "50%", cursor: "pointer", flexShrink: 0,
                border: `1px solid ${tikUitlegOpen ? "#FFE680" : "rgba(255,255,255,0.25)"}`, background: tikUitlegOpen ? "rgba(255,217,59,0.15)" : "transparent",
                color: tikUitlegOpen ? "#FFE680" : "var(--muted)", fontWeight: 800, fontSize: "0.75rem", fontStyle: "italic", fontFamily: "Georgia, serif" }}>
              i
            </button>
          </div>
          {tikUitlegOpen && (
            <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", fontSize: "0.74rem", color: "var(--muted)" }}>
              👆 Tik op de kaart om toe te voegen · sleep om te verplaatsen
            </div>
          )}

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
                // Zelfde kleuren als de markers op de kaart
                const badgeBg = isHubStart ? "#16A34A" : pt.type === "eindpunt" ? "#F59E0B" : pt.type === "informatiepunt" ? "#06B6D4" : "#1E40AF";
                // Slepen: start en finish (en een eindpunt achteraan) liggen vast
                const vast = isHub || (pt.type === "eindpunt" && i === punten.length - 1);
                const isDoel = sleepId !== null && sleepDoel === i && sleepId !== pt.id;
                return (
                  <div key={pt.id}
                    draggable={!vast}
                    onDragStart={(e) => { setSleepId(pt.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", pt.id); }}
                    onDragOver={(e) => { if (sleepId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (sleepDoel !== i) setSleepDoel(i); } }}
                    onDrop={(e) => { e.preventDefault(); if (sleepId) verplaatsNaar(sleepId, i); setSleepId(null); setSleepDoel(null); }}
                    onDragEnd={() => { setSleepId(null); setSleepDoel(null); }}
                    onClick={() => setGeselecteerd(geselecteerd?.id === pt.id ? null : pt)}
                    title={vast ? undefined : "Sleep om de volgorde te veranderen"}
                    style={{
                      padding: "4px 10px", cursor: vast ? "pointer" : "grab", display: "flex", alignItems: "center", gap: 7,
                      background: geselecteerd?.id === pt.id ? "rgba(255,255,255,0.12)" : "transparent",
                      borderLeft: geselecteerd?.id === pt.id ? "3px solid #60A5FA" : "3px solid transparent",
                      // Blauwe lijn waar het gesleepte punt terechtkomt
                      boxShadow: isDoel ? `inset 0 ${(punten.findIndex((p) => p.id === sleepId) < i) ? "-3px" : "3px"} 0 var(--cyan)` : undefined,
                      opacity: sleepId === pt.id ? 0.4 : 1,
                    }}>
                    <div style={{
                      width: 27, height: 27, borderRadius: "50%", flexShrink: 0,
                      background: badgeBg, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.82rem", fontWeight: 800,
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
                📍 Punt
              </button>
              <button className="btn btn-ghost" style={{ width: "100%", fontSize: "0.82rem" }}
                onClick={() => { voegSpeciaalItemToeOp(mobielTikPositie.lat, mobielTikPositie.lng); setMobielTikPositie(null); }}>
                {route.modus === "sequentieel" ? "⛔ Plek zooi" : "🎁 Item"}
              </button>
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
                  {([["algemeen", "⚙️ Algemeen"], ["punten", "📍 Punten & vragen"], ["items", "🎁 Items"]] as [typeof instellingenTab, string][]).map(([t, label]) => (
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
                {(
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
                {(
                  <div className="form-group">
                    <label className="form-label">🎒 Startitems — gratis bij de start</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "6px 6px 6px 0" }}>
                      {STARTITEM_TYPES.map((type) => {
                        const n = startitems[type] ?? 0;
                        return (
                          // Tik = er één bij; het rode − haalt er één af
                          <div key={type} style={{ position: "relative" }}>
                            <button type="button" onClick={() => wijzigStartitem(type, 1)} disabled={n >= MAX_PER_STARTITEM}
                              title={`${ITEM_UITLEG[type] ?? type} Tik = +1 (max ${MAX_PER_STARTITEM}).`}
                              style={{
                                width: 40, height: 40, borderRadius: 8, cursor: n >= MAX_PER_STARTITEM ? "default" : "pointer", padding: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: `1px solid ${n > 0 ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.12)"}`,
                                background: n > 0 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                              }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/items/${type}.png`} alt={type} style={{ width: 26, height: 26, opacity: n > 0 ? 1 : 0.35, filter: n > 0 ? "none" : "grayscale(1)" }} />
                            </button>
                            {n > 0 && (
                              <>
                                <span style={{
                                  position: "absolute", top: -6, right: -6, minWidth: 17, height: 17, borderRadius: 9, padding: "0 4px",
                                  background: "var(--green)", color: "#06240f", fontSize: "0.7rem", fontWeight: 800,
                                  display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
                                }}>{n}</span>
                                <button type="button" onClick={() => wijzigStartitem(type, -1)} title="Eén minder"
                                  style={{
                                    position: "absolute", bottom: -6, right: -6, width: 17, height: 17, borderRadius: 9, padding: 0,
                                    border: "none", background: "#ef4444", color: "#fff", fontSize: "0.8rem", fontWeight: 800, lineHeight: 1,
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>−</button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      Tik op een item voor +1; elk team krijgt dit bij de start in de balk.
                    </span>
                  </div>
                )}

                {/* Items na de finish */}
                {(
                  <div className="form-group">
                    <label className="form-label">🎁 Items inzetten na de finish</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ITEMS_NA_FINISH.map((type) => {
                        const aan = naFinishTypes.includes(type);
                        return (
                          <button key={type} type="button" onClick={() => wisselNaFinish(type)}
                            title={`${ITEM_UITLEG[type] ?? type}${aan ? " (mag na de finish)" : ""}`}
                            style={{
                              width: 40, height: 40, borderRadius: 8, cursor: "pointer", padding: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: `1px solid ${aan ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.12)"}`,
                              background: aan ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                            }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/items/${type}.png`} alt={type} style={{ width: 26, height: 26, opacity: aan ? 1 : 0.35, filter: aan ? "none" : "grayscale(1)" }} />
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {naFinishTypes.length
                        ? "Groen = mag na de finish nog, tot de uitslag vrij is. Een gefinisht team inzetten én raken (bom, wissel); de rest vervalt bij de finish."
                        : "Tik items aan die na de finish nog mogen. Nu vervalt alles bij de finish."}
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
                          const res = await api(`/api/admin/routes/${route.id}`, {
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

        {/* Klaar om te spelen? */}
        {controleOpen && (
          <ControleVenster controle={controle} status={route.status} actief={route.is_active}
            onSluit={() => setControleOpen(false)} onActiveer={activeerRoute} />
        )}

        {/* Vraag bewerken als venster over de hele editor */}
        {vraagVenster && (
          <div data-vraagvenster style={{ position: "fixed", inset: 0, zIndex: 2000, background: "var(--bg)", display: "flex", flexDirection: "column" }}>
            <VraagEditorPagina routeId={route.id} punt={vraagVenster.punt} bestaandeVraag={vraagVenster.vraag}
              onSluit={(vraag) => {
                if (vraag !== undefined) vraagBijgewerkt(vraagVenster.punt.id, vraag);
                setVraagVenster(null);
              }} />
          </div>
        )}

        {/* Net verwijderd: een paar seconden terug te halen */}
        {herstelToast && stappen.length > 0 && (
          <div style={{
            position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 600,
            display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 14px", borderRadius: 12,
            background: "rgba(8,28,48,0.95)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            fontSize: "0.8rem", color: "var(--text)", whiteSpace: "nowrap",
          }}>
            🗑️ {herstelToast.charAt(0).toUpperCase() + herstelToast.slice(1)}
            <button type="button" className="rl-knop rl-knop--cyan" onClick={maakOngedaan} disabled={bezigMetHerstel}
              style={{ height: 30, fontSize: "0.78rem" }}>
              {bezigMetHerstel ? "Bezig…" : "↶ Ongedaan maken"}
            </button>
            <button type="button" className="editor-paneel-sluit" style={{ marginLeft: 0 }} onClick={() => setHerstelToast(null)} title="Sluiten">✕</button>
          </div>
        )}

        {/* Looproute van één team: venster op de kaart, sluiten met de X */}
        {(() => {
          const t = teamRoutes.find((r) => r.teamIndex === uitgelichtTeam);
          if (!t) return null;
          const andersom = omgekeerdeTeams.includes(t.teamIndex);
          return (
            <div style={{
              // Rechtsonder, zodat het tijdenpaneel rechtsboven zichtbaar blijft
              position: "absolute", bottom: 28, right: 12, zIndex: 500, width: 260, maxHeight: "calc(100% - 24px)", overflowY: "auto",
              background: "rgba(8,28,48,0.92)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              border: `1px solid ${t.kleur}`, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, fontSize: "0.78rem", color: "var(--text)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: t.kleur, flexShrink: 0 }} />
                <span style={{ color: t.kleur, fontWeight: 800, fontSize: "0.9rem" }}>Team {t.teamIndex}</span>
                <button type="button" className="editor-paneel-sluit" onClick={() => setUitgelichtTeam(null)} title="Sluiten">✕</button>
              </div>
              <div style={{ color: "var(--muted)" }}>Start bij punt {t.nummers[0]} · {t.nummers.length} punten{andersom ? " · ↺ andersom" : ""}</div>
              <div style={{ lineHeight: 1.6 }}>🏠 → {t.nummers.join(" → ")} → 🏁</div>
              <button type="button" onClick={() => wisselAndersom(t.teamIndex)}
                className={`rl-knop${andersom ? " rl-knop--cyan" : ""}`}
                style={{ display: "flex", height: 28, fontSize: "0.72rem" }}
                title="Dit team loopt het rondje in tegengestelde richting, vanaf hetzelfde instappunt">
                ↺ Andersom lopen: {andersom ? "aan" : "uit"}
              </button>
            </div>
          );
        })()}

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
          centrumPunt={route.modus === "verspreid" ? centrumPunt : null}
          ghostPunten={ghostPunten}
          ghostRadiusM={doelAfstandKm > 0 ? (doelAfstandKm * 1000) / (2 * Math.PI) : 0}
          onCentrumVerplaatst={(lat, lng) => setCentrumPunt({ lat, lng })}
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
                onVraag={() => openVraag(geselecteerd)}
                opslaan={opslaan}
                fout={fout}
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
