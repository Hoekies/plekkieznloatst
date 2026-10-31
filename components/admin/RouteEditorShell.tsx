"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Route, RoutePunt, SpeciaalItem, SpeciaalItemType } from "@/types/database";
import { haversine } from "@/lib/geo";
import { useWegen } from "@/lib/wegen";
import { itemAdvies, voorgesteldePlekken, ITEM_GROEPEN } from "@/lib/item-advies";
import { schatTeamTijd, schatTeamPunten } from "@/lib/tijd-schatting";
import { duurKort } from "@/lib/tijd";
import { STARTITEM_TYPES, MAX_PER_STARTITEM, startitemsVan, startitemsMeter, STARTITEMS_METER_KEUZES } from "@/lib/startitems";
import { ITEMS_NA_FINISH, itemsNaFinishVan } from "@/lib/item-sessie";
import BevestigKnop from "@/components/admin/BevestigKnop";
import type { VraagMetAntwoorden } from "@/components/admin/VraagEditorPagina";
import { toonMelding } from "@/components/admin/Melding";
import { naamWoorden, isStandaardNaam } from "@/lib/punt-naam";
import { instappuntenMetKeuze } from "@/lib/instappunten";
import { MODUS_INFO, ModusIcoon, ModusTegel } from "./RouteModus";
import { ITEM_UITLEG } from "./editor/item-uitleg";
import { StatusPil, SpeciaalItemForm, PuntForm } from "./editor/Formulieren";
import { meldActieveRouteGewijzigd } from "./ActieveRouteLabel";
import PuntenImporteren from "./editor/PuntenImporteren";
import { loopNaar, NIEUWE_PROEF, type ProefStand } from "./editor/proeflopen";
import type { KiesModus } from "@/components/admin/editor/EersteStappen";
import ControleVenster from "./editor/ControleVenster";
import { routeControle } from "@/lib/route-controle";
import HuisstijlInstellingen from "./editor/HuisstijlInstellingen";
import PuzzelInstellingen from "./editor/PuzzelInstellingen";
import ItemLijst from "./editor/ItemLijst";
import { foutUitleg, uitlegBijStatus } from "@/lib/fout-uitleg";
import { useSluitMetEsc, VensterMetKop, vensterHoogte } from "@/components/shared/Venster";
import UitklapPijl from "@/components/shared/UitklapPijl";
import { DUEL_PUNTEN_KEUZES } from "@/lib/duel-vragen";
import { BonusLijst } from "@/components/admin/BonusKnop";
import SpelplezierInstellingen, { type PlezierVeld } from "@/components/admin/SpelplezierInstellingen";
import type { PlezierInstellingen } from "@/lib/spelplezier";
import Icoon from "@/components/admin/Icoon";
import { normaliseerPuzzel, lettersVoor } from "@/lib/puzzel";
import type { PuzzelKoppeling } from "@/components/admin/editor/PuzzelLetterKeuze";
import HusselInstelling from "@/components/admin/editor/HusselInstelling";
import SchuifTekst from "@/components/admin/SchuifTekst";
import EditorRondleiding from "@/components/admin/EditorRondleiding";
import TeamSimulatie, { type SimLoper, type DrukPlek } from "@/components/admin/editor/TeamSimulatie";
import { itemNaam } from "@/components/speler/SpeciaalItemLegende";

// Vensters die je niet meteen nodig hebt: pas laden als ze opengaan (de editor zelf start sneller)
const VraagEditorPagina = dynamic(() => import("@/components/admin/VraagEditorPagina"), { ssr: false });
const TestRonde = dynamic(() => import("./editor/TestRonde"), { ssr: false });
const SpelerProef = dynamic(() => import("./editor/SpelerProef"), { ssr: false });
const AlleVragenVenster = dynamic(() => import("./editor/AlleVragenVenster"), { ssr: false });
const EersteStappen = dynamic(() => import("@/components/admin/editor/EersteStappen"), { ssr: false });
const LeafletKaart = dynamic(() => import("./LeafletKaart"), { ssr: false, loading: () => <div className="laad-blokje kaart-laden" role="status" aria-label="Kaart laden">🗺️</div> });

type RouteMetPunten = Route & {
  route_points: (RoutePunt & { questions?: {
    id: string; points?: number; type?: string; question_text?: string | null;
    correct_text_answers?: string[] | null; numeric_answer?: number | null;
    answer_options?: { punten: number | null; text?: string | null; is_correct?: boolean }[];
  }[] })[];
};

// Alle soorten die je op de kaart kunt zetten (verspreid); bij Op volgorde alleen plek zooi
const ITEM_SOORTEN: SpeciaalItemType[] = ["ster", "verdubbeling", "radar", "bom", "spook", "dief", "banaan", "wissel", "vraagteken", "schaduw", "plekzooi"];

const TEAM_KLEUREN = ["#ff3b5c", "#22c55e", "#ffd93b", "#8b5cf6", "#ff8a00", "#ec4899", "#14b8a6", "#00d9ff"];

export default function RouteEditorShell({ route: initRoute }: { route: RouteMetPunten }) {
  const zoekParams = useSearchParams();

  // Opslaan zichtbaar maken: elke wijziging toont "Opslaan…", daarna ✓ Opgeslagen of ⚠ Niet opgeslagen
  const [opslag, setOpslag] = useState<"rust" | "bezig" | "ok" | "fout">("rust");
  const lopendRef = useRef(0);
  const misluktRef = useRef(false);
  // Uitleg bij de laatste mislukte opslag (wat ging er mis en wat doe je eraan)
  const foutUitlegRef = useRef("");
  const [opslagFout, setOpslagFout] = useState("");
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
      if (!gelukt) foutUitlegRef.current = await foutUitleg(res, "Opslaan");
      return res;
    } catch {
      foutUitlegRef.current = uitlegBijStatus(0, "Opslaan");
      return new Response(JSON.stringify({ fout: "Geen verbinding" }), { status: 503 });
    } finally {
      lopendRef.current--;
      if (!gelukt) misluktRef.current = true;
      if (lopendRef.current === 0) {
        const fout = misluktRef.current;
        misluktRef.current = false;
        setOpslag(fout ? "fout" : "ok");
        if (fout) { setOpslagFout(foutUitlegRef.current); toonMelding(foutUitlegRef.current, "fout"); }
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
      return [p.id, naamWoorden(v)] as const;
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
  // Snel plaatsen: gekozen itemsoort; elke klik op de kaart zet er één neer (Esc of nogmaals klikken = stoppen)
  const [plaatsType, setPlaatsType] = useState<SpeciaalItemType | null>(null);
  useSluitMetEsc(() => setPlaatsType(null), !!plaatsType);
  const [specialeItems, setSpecialeItems] = useState<SpeciaalItem[]>([]);
  // 📊 Per punt hoe vaak de vraag goed ging, over alle gespeelde spellen (migratie 022)
  const [statistiek, setStatistiek] = useState<Record<string, { n: number; goed: number }>>({});
  useEffect(() => {
    fetch(`/api/admin/routes/${initRoute.id}/statistiek`).then((r) => (r.ok ? r.json() : {})).then(setStatistiek).catch(() => {});
  }, [initRoute.id]);
  const [geselecteerdSpeciaal, setGeselecteerdSpeciaal] = useState<SpeciaalItem | null>(null);
  const [actieveTab, setActieveTab] = useState<"punten" | "vragen" | "items" | "teams" | "spel">("punten");
  // 🚶 Proeflopen: klik over de kaart en loop als testspeler mee (er wordt niets opgeslagen)
  const [proef, setProef] = useState<ProefStand | null>(null);
  // Er staat een venster open in de testtelefoon: dan loopt de testspeler niet verder
  const [proefBezig, setProefBezig] = useState(false);
  // ⛔ Verboden gebieden: tekenen door hoekpunten aan te tikken
  const [gebieden, setGebieden] = useState<{ naam: string; punten: [number, number][] }[]>(initRoute.verboden_gebieden ?? []);
  const [tekenGebied, setTekenGebied] = useState<[number, number][] | null>(null);
  const [gebiedNaam, setGebiedNaam] = useState("");
  async function slaGebiedenOp(nieuw: { naam: string; punten: [number, number][] }[]) {
    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verboden_gebieden: nieuw }) });
    if (res.ok) setGebieden(nieuw);
    return res.ok;
  }
  async function gebiedKlaar() {
    if (!tekenGebied || tekenGebied.length < 3) return;
    if (await slaGebiedenOp([...gebieden, { naam: gebiedNaam.trim() || `Verboden gebied ${gebieden.length + 1}`, punten: tekenGebied }])) {
      setTekenGebied(null); setGebiedNaam("");
      toonMelding("Verboden gebied opgeslagen: teams krijgen een waarschuwing als ze erin lopen", "ok");
    }
  }
  // Meerdere punten tegelijk: kiezen in de lijst, dan soort wijzigen of een straatnaam geven
  const [kiesModus, setKiesModus] = useState(false);
  const [gekozenIds, setGekozenIds] = useState<Set<string>>(new Set());
  const [namenBezig, setNamenBezig] = useState<string | null>(null);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  // ⚔️ Duel aan/uit en punten (migratie 006)
  async function slaDuelOp(velden: { duel_aan?: boolean; duel_punten?: number }) {
    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(velden) });
    if (res.ok) setRoute((r) => ({ ...r, ...velden }));
    else toonMelding((await res.json().catch(() => ({}))).fout?.includes("duel") ? "Draai eerst migratie 006 (duel) in Supabase" : "Opslaan lukte niet", "fout");
  }
  // 🎉 Spelplezier aan/uit (migratie 007)
  async function slaPlezierOp(veld: PlezierVeld, aan: boolean) {
    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [veld]: aan }) });
    if (res.ok) setRoute((r) => ({ ...r, [veld]: aan }));
    else toonMelding((await res.json().catch(() => ({}))).fout?.includes(veld) ? "Draai eerst migratie 007 (spelplezier) in Supabase" : "Opslaan lukte niet", "fout");
  }
  // ⚙️ Instellingen van het spelplezier (migratie 008)
  async function slaPlezierInstOp(nieuw: PlezierInstellingen) {
    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spelplezier: nieuw }) });
    if (res.ok) setRoute((r) => ({ ...r, spelplezier: nieuw }));
    else toonMelding((await res.json().catch(() => ({}))).fout?.includes("spelplezier") ? "Draai eerst migratie 008 (instellingen spelplezier) in Supabase" : "Opslaan lukte niet", "fout");
  }
  // Instellingen die bijna niemand aanpast staan achter "⚙️ Meer instellingen"
  const [meerInstellingen, setMeerInstellingen] = useState(false);
  // 🧩 Puzzelwoord: instellingen opslaan (zie editor/PuzzelInstellingen)
  async function slaPuzzelOp(velden: Partial<Route>) {
    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(velden) });
    if (res.ok) setRoute((r) => ({ ...r, ...velden }));
  }
  // Verspreid: teams die het rondje andersom lopen
  const [omgekeerdeTeams, setOmgekeerdeTeams] = useState<number[]>(initRoute.omgekeerde_teams ?? []);
  async function wisselAndersom(team: number) {
    const nieuw = omgekeerdeTeams.includes(team) ? omgekeerdeTeams.filter((t) => t !== team) : [...omgekeerdeTeams, team];
    setOmgekeerdeTeams(nieuw);
    await api(`/api/admin/routes/${initRoute.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ omgekeerde_teams: nieuw }),
    });
  }
  // Verspreid: zelfgekozen instappunt per team (teamnummer → punt-id); de rest wordt berekend
  const [instapKeuze, setInstapKeuze] = useState<Record<string, string>>(initRoute.instappunten ?? {});
  // Team waarvoor je nu op de kaart een startpunt aanklikt
  const [kiesInstapVoor, setKiesInstapVoor] = useState<number | null>(null);
  async function zetInstappunt(team: number, puntId: string | null) {
    const nieuw = { ...instapKeuze };
    if (puntId) nieuw[String(team)] = puntId; else delete nieuw[String(team)];
    setInstapKeuze(nieuw);
    setKiesInstapVoor(null);
    await api(`/api/admin/routes/${initRoute.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instappunten: nieuw }),
    });
  }
  useSluitMetEsc(() => setKiesInstapVoor(null), kiesInstapVoor !== null);
  // Het opengeklapte team wordt op de kaart uitgelicht (dikke lijn met looprichting)
  const [uitgelichtTeam, setUitgelichtTeam] = useState<number | null>(null);
  const [instellingenTab, setInstellingenTab] = useState<"punten" | "uiterlijk">("punten");
  // ❓ Standaard punten per vraag (route) en in één keer op alle vragen zetten
  const [vraagPuntenStd, setVraagPuntenStd] = useState(initRoute.vraag_punten ?? 65);
  // 🚶 Rondje: meters lopen na het welkomstscherm voor de eerste vraag
  const [startMeter, setStartMeter] = useState(initRoute.startvraag_meter ?? 25);
  async function zetAlleVraagPunten() {
    await slaPuzzelOp({ vraag_punten: vraagPuntenStd });
    const res = await api(`/api/admin/routes/${route.id}/vraag-punten`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ punten: vraagPuntenStd }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Punten zetten", d.fout), "fout"); return; }
    // Hoogste punten per vraag bijwerken (eigen punten per antwoord kunnen hoger zijn)
    if (d.max) setVraagMaxPunten((oud) => new Map([...oud, ...Object.entries(d.max as Record<string, number>)]));
    toonMelding(`${d.aantal} ${d.aantal === 1 ? "vraag staat" : "vragen staan"} nu op ${vraagPuntenStd} punten`, "ok");
  }
  // 🧪 Testen: eerst kiezen hoe (lopen als team, of alle vragen doorlopen)
  const [testKeuze, setTestKeuze] = useState(false);
  // 🧩 Eigen venster met alle puzzelfuncties (vanuit de werkbalk en de regel boven de puntenlijst)
  const [puzzelOpen, setPuzzelOpen] = useState(false);
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
  const [aantalHandmatig, setAantalHandmatig] = useState(false);
  const [centrumPunt, setCentrumPunt] = useState<{ lat: number; lng: number } | null>(null);
  const [centrumModus, setCentrumModus] = useState(false);
  // Rondje: de punten op de cirkel verdraaid met zoveel graden ("Ander voorbeeld" in de eerste stappen)
  const [cirkelDraai, setCirkelDraai] = useState(0);
  // 🚀 Eerste stappen: bij een nieuwe (lege) route meteen open. Een lege kaart begint altijd bij
  // stap 1 (startpunt): de gekozen start en finish staan nog nergens opgeslagen.
  const [stappenOpen, setStappenOpen] = useState(() => (initRoute.route_points ?? []).length === 0);
  const [stappenStap, setStappenStap] = useState(0);
  // Schatting van het aantal punten uit de afstand en het aantal teams (tot je het zelf aanpast)
  useEffect(() => {
    if (aantalHandmatig || doelAfstandKm <= 0) return;
    setAantalPunten(Math.max(3, Math.min(30, Math.max(verwachtTeams * 2, Math.round(doelAfstandKm * 2.5)))));
  }, [doelAfstandKm, verwachtTeams, aantalHandmatig]);

  const [wizardKies, setWizardKies] = useState<KiesModus>(null);
  // Eerste stappen: kaart passend zetten op de getoonde punten (onder het venster)
  const [pasIn, setPasIn] = useState<{ punten: { lat: number; lng: number }[]; boven: number } | null>(null);
  // Verspreid: finish op een eigen plek (anders op het startpunt)
  const [finishPunt, setFinishPunt] = useState<{ lat: number; lng: number } | null>(null);
  const [finishZelfde, setFinishZelfde] = useState(false);
  const [maakBezig, setMaakBezig] = useState(false);
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
      setVliegNaar({ lat: data.lat, lng: data.lng, zoom: 18 });
    } catch {
      setPlaatsFout(uitlegBijStatus(0, "Zoeken"));
    } finally {
      setPlaatsBezig(false);
    }
  }

  // Sluit het mobiele overlay-paneel zodra de kaart iets te doen krijgt
  useEffect(() => {
    if (geselecteerd || geselecteerdSpeciaal || addModus || centrumModus || plaatsType) {
      setMobielPaneelOpen(false);
    }
  }, [geselecteerd, geselecteerdSpeciaal, addModus, centrumModus, plaatsType]);

  useEffect(() => {
    api(`/api/admin/routes/${route.id}/speciaal`).then((r) => r.ok ? r.json() : []).then((items: SpeciaalItem[]) => {
      setSpecialeItems(items);
      // Staan er al items op de kaart, dan is het geen lege route: de eerste stappen niet vanzelf openen
      if (items.length > 0 && (initRoute.route_points ?? []).length === 0) setStappenOpen(false);
    });
  // Alleen bij het openen van de route
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Zelfgekozen instappunten gaan voor
    const instap = instappuntenMetKeuze(
      { lat: hubStart.latitude, lng: hubStart.longitude },
      middenpunten.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude })),
      verwachtTeams,
      instapKeuze,
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
        handmatig: middenpunten[offset]?.id === instapKeuze[String(k + 1)],
      };
    });
  }, [route.modus, punten, verwachtTeams, omgekeerdeTeams, instapKeuze]);

  // Looproutes langs wegen en voetpaden: alle stukken van de puntenlijst, het rondje en de teamroutes
  const puntPlekken = useMemo(() => punten.map((p) => ({ lat: p.latitude, lng: p.longitude })), [punten]);
  const lusPlekken = useMemo(() => (route.modus === "verspreid" && punten.length >= 3 ? puntPlekken.slice(1, -1) : []), [route.modus, punten.length, puntPlekken]);
  const wegParen = useMemo(() => {
    const paren: [{ lat: number; lng: number }, { lat: number; lng: number }][] = [];
    puntPlekken.slice(1).forEach((p, i) => paren.push([puntPlekken[i], p]));
    if (lusPlekken.length > 1) paren.push([lusPlekken[lusPlekken.length - 1], lusPlekken[0]]);
    for (const t of teamRoutes) t.coords.slice(1).forEach((c, i) => paren.push([t.coords[i], c]));
    return paren;
  }, [puntPlekken, lusPlekken, teamRoutes]);
  // Knop 🚶 Wegen: lijnen en afstanden langs wegen en voetpaden, of hemelsbreed (onthouden per browser)
  const [wegenAan, setWegenAan] = useState(true);
  useEffect(() => {
    try { if (localStorage.getItem("pr_editor_wegen") === "uit") setWegenAan(false); } catch { /* geen opslag */ }
  }, []);
  function wisselWegen() {
    const nieuw = !wegenAan;
    setWegenAan(nieuw);
    try { localStorage.setItem("pr_editor_wegen", nieuw ? "aan" : "uit"); } catch { /* geen opslag */ }
  }
  const wegen = useWegen(wegParen, wegenAan);
  const lusMeterWeg = lusPlekken.length > 1 ? wegen.totaal([...lusPlekken, lusPlekken[0]]) : 0;
  const teamAanloopM = teamRoutes.map((t) => Math.round(t.coords.length > 1 ? wegen.afstand(t.coords[0], t.coords[1]) : 0));
  const teamRoutesKaart = useMemo(() => teamRoutes.map((t) => ({
    ...t, stukken: t.coords.slice(1).map((c, i) => wegen.lijn(t.coords[i], c)),
  })), [teamRoutes, wegen]);
  const hoofdStukken = useMemo(() => puntPlekken.slice(1).map((p, i) => wegen.lijn(puntPlekken[i], p)), [puntPlekken, wegen]);

  // Afstand en geschatte speeltijd per team (lopen + vragen + items), getoond als paneel op de kaart
  const teamSchattingen = useMemo(() => {
    const schattingItems = specialeItems.map((i) => ({ lat: i.latitude, lng: i.longitude, type: i.type, radius: i.radius_meters }));
    return teamRoutes.map((t) => ({
      teamIndex: t.teamIndex,
      kleur: t.kleur,
      ...schatTeamTijd(t.coords, {
        vragen: t.punten.filter((p) => vraagPuntIds.has(p.id)).length,
        infopunten: t.punten.filter((p) => !vraagPuntIds.has(p.id) && p.type !== "eindpunt" && p.type !== "doorlooppunt").length,
        items: schattingItems,
        teams: verwachtTeams,
        respawn: !!route.item_respawn,
        spookMin: spookMinuten,
        plekzooiMin: plekzooiMinuten,
        afstandM: wegen.totaal(t.coords),
        lijn: teamRoutesKaart.find((r) => r.teamIndex === t.teamIndex)?.stukken.flat(),
      }),
      punten: schatTeamPunten(t.coords, {
        vraagPunten: t.punten.filter((p) => vraagPuntIds.has(p.id)).map((p) => vraagMaxPunten.get(p.id) ?? 0),
        overigePunten: t.punten.filter((p) => !vraagPuntIds.has(p.id)).reduce((som, p) => som + (p.points ?? 0), 0),
        items: schattingItems,
        teams: verwachtTeams,
        respawn: !!route.item_respawn,
        sterWaarde,
        bomWaarde,
        lijn: teamRoutesKaart.find((r) => r.teamIndex === t.teamIndex)?.stukken.flat(),
      }),
    }));
  }, [teamRoutes, teamRoutesKaart, wegen, specialeItems, vraagPuntIds, vraagMaxPunten, verwachtTeams, route.item_respawn, spookMinuten, plekzooiMinuten, sterWaarde, bomWaarde]);
  // Paneel "afstand, tijd & punten per team": standaard dicht (dekt anders de kaart), keuze onthouden
  const [tijdenOpen, setTijdenOpenState] = useState(false);
  useEffect(() => { try { setTijdenOpenState(localStorage.getItem("pr_editor_tijden") === "open"); } catch { /* geen opslag */ } }, []);
  const setTijdenOpen = (f: (v: boolean) => boolean) => setTijdenOpenState((v) => {
    const nieuw = f(v);
    try { localStorage.setItem("pr_editor_tijden", nieuw ? "open" : "dicht"); } catch { /* geen opslag */ }
    return nieuw;
  });
  const [tipWeg, setTipWeg] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem("pointrush_editor_tip_weg")) setTipWeg(true); } catch { /* geen opslag */ }
  }, []);

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
  // Zelf gekozen aantal voorgestelde items (null = het advies van de app)
  const [itemDoel, setItemDoel] = useState<number | null>(null);
  const itemCheck = useMemo(() => {
    if (route.modus !== "verspreid" || punten.length < 3) return null;
    const lus = lusPlekken;
    const lusMeter = lusMeterWeg;
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
    // Voorstellen langs de weg die de teams echt lopen (met 🚶 Wegen aan), niet over de rechte
    // lijn tussen de punten. Per stuk het laatste punt weglaten: dat is het begin van het volgende.
    const lusPad = lus.flatMap((p, i) => wegen.lijn(p, lus[(i + 1) % lus.length]).slice(0, -1));
    // Zelf meer of minder gekozen: aanvullen met een rondgang langs de soorten, of inkorten
    if (itemDoel !== null) {
      const rond = ["ster", "bom", "verdubbeling", "spook", "radar", "banaan", "vraagteken", "dief", "wissel", "schaduw", "plekzooi"];
      for (let k = 0; tekortTypes.length < itemDoel; k++) tekortTypes.push(rond[k % rond.length]);
      tekortTypes.length = Math.min(tekortTypes.length, itemDoel);
    }
    const plekken = voorgesteldePlekken(lusPad.length > 1 ? lusPad : lus, specialeItems.map((i) => ({ lat: i.latitude, lng: i.longitude })), vermijd, tekortTypes.length);
    return {
      advies, nuOppakbaar,
      tekort: Math.max(0, advies.oppakbaar - nuOppakbaar) + Math.max(0, advies.plekzooi - tel(ITEM_GROEPEN.plekzooi)),
      teVeel: nuOppakbaar > advies.oppakbaar + 1,
      voorstellen: plekken.map((p, i) => ({ ...p, type: tekortTypes[i] })),
    };
  }, [route.modus, punten, lusPlekken, lusMeterWeg, verwachtTeams, route.item_respawn, gemSpeelMinuten, specialeItems, wegen, itemDoel]);
  // "Klaar om te spelen?": alles wat vóór het activeren nog aandacht nodig heeft
  const [controleOpen, setControleOpen] = useState(() => zoekParams.get("controle") === "1");
  const controle = useMemo(() => routeControle({
    punten, modus: route.modus, vraagPuntIds, verwachtTeams,
    itemTekort: itemCheck?.tekort ?? 0, itemTeVeel: !!itemCheck?.teVeel,
    teamAanloopM,
    teamMinuten: teamSchattingen.map((t) => t.totaalMin),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [punten, route.modus, vraagPuntIds, verwachtTeams, itemCheck, teamAanloopM.join(","), teamSchattingen]);
  // Klaarzetten (database: gepubliceerd) of terug naar concept
  async function zetStatus(nieuweStatus: "concept" | "gepubliceerd") {
    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nieuweStatus }) });
    if (res.ok) {
      setRoute((r) => ({ ...r, status: nieuweStatus }));
      toonMelding(nieuweStatus === "gepubliceerd" ? "Route staat klaar: je kunt hem nu activeren" : "Route staat weer op concept", "ok");
    }
  }
  // Deactiveren zoals in het routeoverzicht: lopende spellen stoppen, de route blijft klaar
  async function deactiveerRoute() {
    const res = await api("/api/admin/routes/stoppen", { method: "POST" });
    if (res.ok) { setRoute((r) => ({ ...r, is_active: false })); meldActieveRouteGewijzigd(); toonMelding("Route gedeactiveerd: hij blijft klaar voor een volgende keer", "ok"); }
  }
  // Activeren. Spelen er nog teams op een andere route, dan eerst een waarschuwing (zie het venster onderaan)
  const [lopendElders, setLopendElders] = useState<{ aantal: number; route: string } | null>(null);
  async function activeerRoute(toch = false) {
    const res = await fetch(`/api/admin/routes/${route.id}/activeren`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toch }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 409 && d.lopend) { setLopendElders({ aantal: d.lopend, route: d.route ?? "een andere route" }); return; }
    if (!res?.ok) { toonMelding(d.fout ?? uitlegBijStatus(res?.status ?? 0, "Activeren"), "fout"); return; }
    setLopendElders(null);
    setRoute((r) => ({ ...r, is_active: true })); setControleOpen(false); meldActieveRouteGewijzigd(); toonMelding("Route is actief: teams kunnen starten", "ok");
  }

  // Startitems: wat elk team bij de start gratis in de balk krijgt
  const [startitems, setStartitems] = useState<Record<string, number>>(() => startitemsVan(initRoute));
  // Na hoeveel meter lopen (0 = meteen bij het begin)
  const [itemsMeter, setItemsMeter] = useState(() => startitemsMeter(initRoute));
  async function slaStartitemsOp(items: Record<string, number>, meter: number) {
    await api(`/api/admin/routes/${route.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startitems: { ...items, _meter: meter } }),
    });
  }
  async function wijzigStartitem(type: string, delta: number) {
    const nieuw = { ...startitems, [type]: Math.max(0, Math.min(MAX_PER_STARTITEM, (startitems[type] ?? 0) + delta)) };
    setStartitems(nieuw);
    await slaStartitemsOp(nieuw, itemsMeter);
  }
  async function kiesItemsMeter(m: number) {
    setItemsMeter(m);
    await slaStartitemsOp(startitems, m);
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

  function puntenOpCirkel(lat: number, lng: number, radiusM: number, n: number, draaiGraden = 0) {
    const R = 6371000;
    return Array.from({ length: n }, (_, i) => {
      const hoek = (2 * Math.PI / n) * i - Math.PI / 2 + (draaiGraden * Math.PI) / 180;
      const dLat = (radiusM * Math.cos(hoek)) / R * (180 / Math.PI);
      const dLng = (radiusM * Math.sin(hoek)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
      return { lat: lat + dLat, lng: lng + dLng };
    });
  }

  const ghostPunten = useMemo(() => {
    if (route.modus !== "verspreid" || doelAfstandKm <= 0 || !centrumPunt) return [];
    const radiusM = (doelAfstandKm * 1000) / (2 * Math.PI);
    return puntenOpCirkel(centrumPunt.lat, centrumPunt.lng, radiusM, aantalPunten, cirkelDraai);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.modus, doelAfstandKm, centrumPunt, aantalPunten, cirkelDraai]);

  // Rondje, eerste stappen: bij teams/afstand en het voorbeeld de hele cirkel in beeld, bij de items alle punten.
  // Het venster bovenaan blijft vrij (zijn hoogte telt mee).
  useEffect(() => {
    if (!stappenOpen || route.modus !== "verspreid" || stappenStap < 2 || stappenStap > 4) return;
    const plekken = stappenStap === 4 && punten.length
      ? punten.map((p) => ({ lat: p.latitude, lng: p.longitude }))
      : [...ghostPunten, ...(centrumPunt ? [centrumPunt] : []), ...(finishPunt ? [finishPunt] : [])];
    if (!plekken.length) return;
    const t = setTimeout(() => {
      const venster = document.querySelector<HTMLElement>(".eerste-stappen");
      setPasIn({ punten: plekken, boven: venster ? venster.offsetTop + venster.offsetHeight : 0 });
    }, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stappenOpen, stappenStap, ghostPunten, finishPunt, punten.length]);

  // Start en finish van een rondje en de finish doen niet mee met "meerdere tegelijk"
  function kiesbaar(pt: RoutePunt, i: number) {
    const hub = route.modus === "verspreid" && punten.length >= 3 && (i === 0 || i === punten.length - 1);
    return !hub && pt.type !== "eindpunt";
  }
  function kiesElke(stap: number) {
    const lijst = punten.filter(kiesbaar);
    setGekozenIds(new Set(lijst.filter((_, j) => (j + 1) % stap === 0).map((p) => p.id)));
  }
  async function zetSoortVoorGekozen(type: RoutePunt["type"]) {
    const ids = [...gekozenIds];
    const res = await Promise.all(ids.map((id) => api(`/api/admin/routes/${route.id}/punten/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }),
    })));
    const gelukt = res.filter((r) => r.ok).length;
    setPunten((ps) => ps.map((p) => gekozenIds.has(p.id) ? { ...p, type } : p));
    toonMelding(gelukt === ids.length ? `${gelukt} punten aangepast` : `${gelukt} van ${ids.length} punten aangepast`, gelukt === ids.length ? "ok" : "fout");
  }
  // Straatnaam (of de naam van een gebouw of plek) opzoeken; de kaartdienst wil hooguit één vraag per seconde
  async function geefStraatnamen() {
    const lijst = punten.filter((p) => gekozenIds.has(p.id));
    const gebruikt = new Map<string, number>();
    punten.filter((p) => !gekozenIds.has(p.id)).forEach((p) => gebruikt.set(p.name, 1));
    let gelukt = 0;
    for (let k = 0; k < lijst.length; k++) {
      setNamenBezig(`${k + 1}/${lijst.length}`);
      if (k > 0) await new Promise((r) => setTimeout(r, 1100));
      const res = await fetch(`/api/admin/geocode?lat=${lijst[k].latitude}&lng=${lijst[k].longitude}`).catch(() => null);
      const naam = res?.ok ? (await res.json()).naam as string : null;
      if (!naam) continue;
      // Zelfde straat vaker? Dan een nummertje erachter
      const keer = (gebruikt.get(naam) ?? 0) + 1;
      gebruikt.set(naam, keer);
      const nieuw = keer > 1 ? `${naam} ${keer}` : naam;
      const opgeslagen = await api(`/api/admin/routes/${route.id}/punten/${lijst[k].id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nieuw }),
      });
      if (opgeslagen.ok) { gelukt++; setPunten((ps) => ps.map((p) => p.id === lijst[k].id ? { ...p, name: nieuw } : p)); }
    }
    setNamenBezig(null);
    toonMelding(`${gelukt} van ${lijst.length} punten hebben een naam gekregen`, gelukt ? "ok" : "fout");
  }

  async function herlaadPunten() {
    const res = await api(`/api/admin/routes/${route.id}/punten`);
    if (res.ok) setPunten(await res.json());
  }

  // Plekken naar de dichtstbijzijnde weg of het dichtstbijzijnde voetpad verschuiven (max. 200 m;
  // verder weg of geen antwoord van de kaartdienst: dan blijft de plek zoals hij was)
  async function opDeWeg(plekken: { lat: number; lng: number }[]): Promise<{ lat: number; lng: number }[]> {
    if (!plekken.length) return plekken;
    try {
      const res = await api("/api/admin/wegen/dichtstbij", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ punten: plekken }),
      });
      if (!res.ok) return plekken;
      const { plekken: weg } = await res.json() as { plekken: ({ lat: number; lng: number; afstand: number } | null)[] };
      return plekken.map((p, i) => (weg[i] && weg[i]!.afstand <= 200 ? { lat: weg[i]!.lat, lng: weg[i]!.lng } : p));
    } catch {
      return plekken;
    }
  }

  // "📍 Op de weg": alle punten op de dichtstbijzijnde weg of het voetpad zetten.
  // Bij Verspreid blijven start en finish (de verzamelplek) staan. Elke verschuiving is ongedaan te maken.
  const [opDeWegBezig, setOpDeWegBezig] = useState(false);
  async function puntenOpDeWeg() {
    const hub = route.modus === "verspreid" && punten.length >= 3;
    const doel = punten.filter((p, i) => !(hub && (i === 0 || i === punten.length - 1)));
    if (!doel.length) return;
    setOpDeWegBezig(true);
    const nieuw = await opDeWeg(doel.map((p) => ({ lat: p.latitude, lng: p.longitude })));
    let verschoven = 0;
    for (const [i, p] of doel.entries()) {
      if (haversine(p.latitude, p.longitude, nieuw[i].lat, nieuw[i].lng) < 3) continue;
      await markerVerplaatst(p.id, nieuw[i].lat, nieuw[i].lng);
      verschoven++;
    }
    setOpDeWegBezig(false);
    toonMelding(verschoven
      ? `${verschoven} punt${verschoven === 1 ? "" : "en"} op de weg gezet${route.is_active ? ". Druk op 📲 Naar spelers om ze bij te werken" : ""}`
      : "Alle punten liggen al op een weg of pad", "ok");
  }

  // "🗑️ Leegmaken": alle punten (met vragen) en items weg; de route en de instellingen blijven
  // Eén punt op de dichtstbijzijnde weg of het voetpad (vanuit het puntpaneel)
  async function puntOpDeWeg(p: RoutePunt) {
    const [n] = await opDeWeg([{ lat: p.latitude, lng: p.longitude }]);
    if (!n || haversine(p.latitude, p.longitude, n.lat, n.lng) < 3) { toonMelding("Dit punt ligt al op een weg of pad", "ok"); return; }
    await markerVerplaatst(p.id, n.lat, n.lng);
    setGeselecteerd((g) => (g && g.id === p.id ? { ...g, latitude: n.lat, longitude: n.lng } : g));
    toonMelding("Punt op de weg gezet (↶ om terug te zetten)", "ok");
  }

  // Kaartlagen: los aan of uit, zodat de kaart rustiger wordt (onthouden per browser)
  type Lagen = { routes: boolean; items: boolean; voorstellen: boolean; cirkel: boolean };
  const [lagen, setLagen] = useState<Lagen>({ routes: true, items: true, voorstellen: true, cirkel: true });
  useEffect(() => {
    try { const l = localStorage.getItem("pr_editor_lagen"); if (l) setLagen((oud) => ({ ...oud, ...JSON.parse(l) })); } catch { /* geen opslag */ }
  }, []);
  function wisselLaag(laag: keyof Lagen) {
    setLagen((oud) => {
      const nieuw = { ...oud, [laag]: !oud[laag] };
      try { localStorage.setItem("pr_editor_lagen", JSON.stringify(nieuw)); } catch { /* geen opslag */ }
      return nieuw;
    });
  }
  // Eerste stappen: bij het voorbeeld de gestippelde punten, bij de items de voorstellen in beeld
  useEffect(() => {
    if (!stappenOpen || route.modus !== "verspreid") return;
    if (stappenStap === 3 && !lagen.cirkel) wisselLaag("cirkel");
    if (stappenStap === 4 && !lagen.voorstellen) wisselLaag("voorstellen");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stappenOpen, stappenStap]);


  // Computer: puntenlijst links inklappen voor meer kaartruimte (onthouden per browser)
  const [lijstDicht, setLijstDicht] = useState(false);
  useEffect(() => {
    try { setLijstDicht(localStorage.getItem("pr_editor_lijst_dicht") === "1"); } catch { /* geen opslag */ }
  }, []);
  function wisselLijst() {
    setLijstDicht((d) => {
      try { localStorage.setItem("pr_editor_lijst_dicht", d ? "0" : "1"); } catch { /* geen opslag */ }
      return !d;
    });
  }

  async function maakRouteLeeg() {
    // Alleen een gekozen start/finish (nog geen punten of items): niets op de server weg te halen
    if (punten.length || specialeItems.length) {
      const res = await api(`/api/admin/routes/${route.id}/leegmaken`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Leegmaken", data.fout), "fout"); return; }
    }
    setPunten([]);
    setSpecialeItems([]);
    setGeselecteerd(null);
    setStappen([]);  // eerdere stappen verwijzen naar punten die niet meer bestaan
    // Lege kaart: de eerste stappen opnieuw, vanaf het startpunt
    setCentrumPunt(null); setFinishPunt(null); setFinishZelfde(false); setWizardKies(null); setCirkelDraai(0);
    setStappenStap(0);
    if (!route.is_active) setStappenOpen(true);
    toonMelding("De route is leeg", "ok");
  }

  // Geeft terug of het gelukt is (de eerste stappen gaan alleen dan verder)
  async function genereerPuntenInCirkel(): Promise<boolean> {
    if (!centrumPunt || doelAfstandKm <= 0) return false;
    const radiusM = (doelAfstandKm * 1000) / (2 * Math.PI);
    // Op de cirkel, en dan elk punt naar de dichtstbijzijnde weg of het voetpad
    const coords = await opDeWeg(puntenOpCirkel(centrumPunt.lat, centrumPunt.lng, radiusM, aantalPunten, cirkelDraai));
    for (const pt of punten) {
      const res = await api(`/api/admin/routes/${route.id}/punten/${pt.id}`, { method: "DELETE" });
      if (!res.ok) {
        toonMelding(`"${pt.name}" kon niet verwijderd worden — de punten zijn niet opnieuw gegenereerd.`, "fout");
        await herlaadPunten();
        return false;
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

    // Finish op de gekozen plek (eerste stappen), anders op het middelpunt
    const finish = finishPunt ?? centrumPunt;
    const resEind = await api(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: finish.lat, longitude: finish.lng, type: "eindpunt", name: "Finish", points: 0 }),
    });
    if (resEind.ok) nieuwePunten.push(await resEind.json());

    setPunten(nieuwePunten);
    // Alles gelukt? Anders melden hoeveel er wel staan (de stap blijft dan staan om het opnieuw te proberen)
    const verwacht = coords.length + 2;
    if (nieuwePunten.length < verwacht) {
      toonMelding(`Er zijn ${nieuwePunten.length} van de ${verwacht} punten gemaakt. Probeer het opnieuw.`, "fout");
      return false;
    }
    return true;
  }

  async function voegPuntToeOp(lat: number, lng: number): Promise<RoutePunt | null> {
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
      geefNieuwPuntEenNaam(nieuw);
      return nieuw;
    }
    return null;
  }

  // Nieuw punt krijgt vanzelf de straatnaam (of de naam van een gebouw); lukt dat niet, dan blijft "Punt N"
  async function geefNieuwPuntEenNaam(nieuw: RoutePunt) {
    const res = await fetch(`/api/admin/geocode?lat=${nieuw.latitude}&lng=${nieuw.longitude}`).catch(() => null);
    const naam = res?.ok ? (await res.json()).naam as string : null;
    if (!naam) return;
    const bezet = new Set(punten.map((p) => p.name));
    let keer = 1;
    while (bezet.has(keer > 1 ? `${naam} ${keer}` : naam)) keer++;
    const nieuweNaam = keer > 1 ? `${naam} ${keer}` : naam;
    const opgeslagen = await api(`/api/admin/routes/${route.id}/punten/${nieuw.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nieuweNaam }),
    });
    if (!opgeslagen.ok) return;
    // Alleen als de naam intussen niet zelf veranderd is
    setPunten((ps) => ps.map((p) => p.id === nieuw.id && p.name === nieuw.name ? { ...p, name: nieuweNaam } : p));
    setGeselecteerd((g) => g && g.id === nieuw.id && g.name === nieuw.name ? { ...g, name: nieuweNaam } : g);
  }

  // 🧲 Items op de weg leggen (standaard aan). Uit: een item blijft precies waar je het neerlegt, bijv. op een
  // speelplaats. Onthouden op dit toestel.
  const [itemsOpWeg, setItemsOpWeg] = useState(true);
  // 🧲 Venster "Op de weg": wat moet er op de weg (punten, items)
  const [opWegVenster, setOpWegVenster] = useState(false);
  const [opWegKeuze, setOpWegKeuze] = useState({ punten: true, items: true });
  async function legOpDeWeg() {
    setOpWegVenster(false);
    if (opWegKeuze.punten && punten.length) await puntenOpDeWeg();
    if (opWegKeuze.items && specialeItems.length) await itemsOpDeWeg();
  }
  useEffect(() => { try { setItemsOpWeg(localStorage.getItem("pr_items_op_weg") !== "uit"); } catch { /* geen opslag */ } }, []);
  function wisselItemsOpWeg() {
    setItemsOpWeg((a) => { try { localStorage.setItem("pr_items_op_weg", a ? "uit" : "aan"); } catch { /* geen opslag */ } return !a; });
  }

  // Na het plaatsen géén bewerkvenster: dat opent pas als je het item op de kaart aantikt
  async function voegSpeciaalItemToeOp(lat: number, lng: number, voorstelType?: string, openPaneel = false) {
    const res = await api(`/api/admin/routes/${route.id}/speciaal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Sequentieel: alleen plek zooi op de kaart (teams krijgen een startbanaan in hun balk)
      // vrij: 🧲 staat uit, dus precies hier laten liggen
      body: JSON.stringify({ ...(voorstelType
        ? { latitude: lat, longitude: lng, type: voorstelType, name: voorstelType === "plekzooi" ? "Plek zooi" : "Speciaal item", points_effect: voorstelType === "ster" ? 50 : 0, radius_meters: itemRadius }
        : route.modus === "sequentieel"
        ? { latitude: lat, longitude: lng, type: "plekzooi", name: "Plek zooi", points_effect: 0, radius_meters: itemRadius }
        : { latitude: lat, longitude: lng, type: "ster", name: "Speciaal item", points_effect: 50, radius_meters: itemRadius }), vrij: !itemsOpWeg }),
    });
    if (res.ok) {
      const nieuw: SpeciaalItem = await res.json();
      onthoud({ soort: "item-erbij", id: nieuw.id });
      setSpecialeItems((p) => [...p, nieuw]);
      if (openPaneel) setGeselecteerdSpeciaal(nieuw);
    }
    return res.ok;
  }

  // ✨ Items automatisch plaatsen: alle voorstellen (zoveel als het advies voor deze route) in één keer
  const [autoItemsBezig, setAutoItemsBezig] = useState(false);
  async function plaatsAlleVoorstellen() {
    const lijst = itemCheck?.voorstellen ?? [];
    if (!lijst.length) return;
    setAutoItemsBezig(true);
    // Tel wat echt gelukt is (niet het aantal voorstellen)
    let gelukt = 0;
    for (const v of lijst) if (await voegSpeciaalItemToeOp(v.lat, v.lng, v.type, false).catch(() => false)) gelukt++;
    setAutoItemsBezig(false);
    if (gelukt === lijst.length) toonMelding(`${gelukt} items geplaatst langs de route. Terugzetten kan met ↶ Ongedaan.`, "ok");
    else toonMelding(`${gelukt} van ${lijst.length} items geplaatst. Tik nog eens om de rest te plaatsen.`, "fout");
    return gelukt === lijst.length;
  }

  // 🛣️ Items die naast de weg liggen (in een tuin, tussen huizen) op het dichtstbijzijnde pad leggen
  const [opWegBezig, setOpWegBezig] = useState(false);
  async function itemsOpDeWeg() {
    setOpWegBezig(true);
    const res = await api(`/api/admin/routes/${route.id}/speciaal`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opDeWeg: true }) });
    const d = await res.json().catch(() => null);
    setOpWegBezig(false);
    if (!res.ok || !d) { toonMelding(d?.fout ?? "Items op de weg zetten lukte niet", "fout"); return; }
    setSpecialeItems(d.items);
    setGeselecteerdSpeciaal(null);
    toonMelding(d.verplaatst ? `${d.verplaatst} item${d.verplaatst === 1 ? "" : "s"} op de weg gezet` : "Alle items lagen al op de weg", "ok");
  }

  // Op volgorde: de finish achteraan (staat er al een, dan die verplaatsen)
  async function voegFinishToe(lat: number, lng: number) {
    const laatste = punten[punten.length - 1];
    if (laatste && laatste.type === "eindpunt") {
      const res = await api(`/api/admin/routes/${route.id}/punten/${laatste.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: lat, longitude: lng }) });
      if (res.ok) { const bij: RoutePunt = await res.json(); setPunten((p) => p.map((x) => x.id === bij.id ? bij : x)); }
      return;
    }
    const res = await api(`/api/admin/routes/${route.id}/punten`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, type: "eindpunt", name: "Finish", points: 0, radius_meters: puntRadius }),
    });
    if (res.ok) { const nieuw: RoutePunt = await res.json(); onthoud({ soort: "punt-erbij", id: nieuw.id }); setPunten((p) => [...p, nieuw]); }
  }

  async function kaartKlik(lat: number, lng: number) {
    // Verboden gebied tekenen: elke klik is een hoekpunt
    if (tekenGebied) { setTekenGebied((t) => t && [...t, [lat, lng]]); return; }
    // Proeflopen: de klik is de plek waar je naartoe loopt
    if (proef) { if (!proefBezig) setProef((s) => s && loopNaar(s, { lat, lng }, punten, specialeItems, vraagPuntIds, true)); return; }
    // Eerste stappen: start, finish of punten aantikken
    if (wizardKies === "start") { setCentrumPunt({ lat, lng }); setWizardKies(null); return; }
    if (wizardKies === "finish") {
      setWizardKies(null);
      if (route.modus === "verspreid") { setFinishPunt({ lat, lng }); setFinishZelfde(false); return; }
      return voegFinishToe(lat, lng);
    }
    if (wizardKies === "punten") return voegPuntToeOp(lat, lng);
    if (centrumModus) {
      setCentrumPunt({ lat, lng });
      setCentrumModus(false);
      return;
    }
    if (plaatsType) return voegSpeciaalItemToeOp(lat, lng, plaatsType, false);
    if (addModus) return voegPuntToeOp(lat, lng);
    // Staat er een bewerkpaneel open, dan sluit een tik ernaast dat paneel
    if (geselecteerd || geselecteerdSpeciaal) { setGeselecteerd(null); setGeselecteerdSpeciaal(null); return; }

    // Vraag wat de tik moet worden.
    setMobielTikPositie({ lat, lng });
  }

  // Rechtsklik of lang drukken op de kaart: altijd het keuzemenu (punt, item, verboden gebied), ook midden in een modus
  function kaartRechtsKlik(lat: number, lng: number) {
    if (tekenGebied || proef || kiesInstapVoor !== null) return;
    setPlaatsType(null); setAddModus(false); setCentrumModus(false);
    setMobielTikPositie({ lat, lng });
  }
  // Hoofdknop kiezen: lopende plaats-modi stoppen en de zijbalk openen
  function kiesTab(t: typeof actieveTab) {
    setActieveTab(t);
    if (t !== "items") setPlaatsType(null);
    if (t !== "punten") setAddModus(false);
    if (t !== "teams") setKiesInstapVoor(null);
    if (lijstDicht) wisselLijst();
  }
  // 🚶 Verkennen (telefoon): loop de route buiten, zet een punt op je eigen plek en vul meteen foto en vraag in
  const [verken, setVerken] = useState<{ pos: { lat: number; lng: number; nauwkeurig: number } | null; fout?: string } | null>(null);
  const [verkenBezig, setVerkenBezig] = useState(false);
  const verkenAan = verken !== null;
  useEffect(() => {
    if (!verkenAan) return;
    if (!("geolocation" in navigator)) { setVerken({ pos: null, fout: "Deze browser kan je locatie niet bepalen." }); return; }
    let eerste = true;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude, nauwkeurig: p.coords.accuracy };
        setVerken({ pos });
        if (eerste) { eerste = false; setVliegNaar({ lat: pos.lat, lng: pos.lng, zoom: 18 }); }
      },
      () => setVerken((v) => v && { ...v, fout: "Geen locatie: zet locatie aan en geef de app toestemming." }),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [verkenAan]);
  async function puntOpMijnPlek() {
    if (!verken?.pos) return;
    setVerkenBezig(true);
    try {
      const nieuw = await voegPuntToeOp(verken.pos.lat, verken.pos.lng);
      // Meteen de vraag-editor: daar maak je de foto (camera) en typ je de vraag
      if (nieuw) openVraag(nieuw);
    } finally { setVerkenBezig(false); }
  }

  // ▶️ Simulatie (👫 Teams): de teams als stipjes op de kaart, en 🔴 waar ze elkaar tegenkomen
  const [simLopers, setSimLopers] = useState<SimLoper[]>([]);
  const [drukPlekken, setDrukPlekken] = useState<DrukPlek[]>([]);
  // 🛤️ Ondergrond-check: trappen, onverharde paden en drukke wegen op de route (OpenStreetMap)
  type OndergrondMelding = { soort: "trap" | "onverhard" | "drukke weg"; naam: string | null; lat: number; lng: number; lengteM: number };
  const [ondergrond, setOndergrond] = useState<{ bezig: boolean; meldingen: OndergrondMelding[] | null } | null>(null);
  const ONDERGROND_ICOON = { trap: "🪜", onverhard: "🟫", "drukke weg": "🚗" } as const;
  const ondergrondPlekken = useMemo(() => (ondergrond?.meldingen ?? []).map((m) => ({
    lat: m.lat, lng: m.lng, icoon: ONDERGROND_ICOON[m.soort],
    tekst: m.soort === "trap" ? "Trap" : m.soort === "onverhard" ? `Onverhard pad (± ${m.lengteM} m)` : `Langs een drukke weg (± ${m.lengteM} m)`,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [ondergrond?.meldingen]);
  async function controleerOndergrond() {
    setOndergrond({ bezig: true, meldingen: null });
    const lijnen = [...hoofdStukken, ...teamRoutesKaart.flatMap((t) => t.stukken)].filter((l) => l.length > 1);
    const res = await fetch("/api/admin/ondergrond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lijnen }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { toonMelding(d.fout ?? "Controleren lukte niet", "fout"); setOndergrond(null); return; }
    setOndergrond({ bezig: false, meldingen: d.meldingen ?? [] });
  }

  // 🧭 Rondleiding: de eerste keer vanzelf (onthouden op dit toestel), later via 🧭 bij "Wat nu?"
  const [rondleidingOpen, setRondleidingOpen] = useState(false);
  // 🎉 Spel: venster met de instellingen van tussenstand of duel (⚙️ op hun regel)
  const [spelVenster, setSpelVenster] = useState<"tussenstand" | "duel" | null>(null);
  useEffect(() => {
    try { if (!localStorage.getItem("pr_editor_rondleiding")) setRondleidingOpen(true); } catch { /* geen opslag */ }
  }, []);
  function sluitRondleiding() {
    setRondleidingOpen(false);
    try { localStorage.setItem("pr_editor_rondleiding", "1"); } catch { /* geen opslag */ }
  }

  // Vraag bewerken in een venster boven de editor (geen herladen, alles blijft open)
  const [vraagVenster, setVraagVenster] = useState<{ punt: RoutePunt; vraag: VraagMetAntwoorden | null } | null>(null);
  // Alle vragen achter elkaar invullen (knop 📝 Alle vragen)
  const [alleVragenOpen, setAlleVragenOpen] = useState(false);
  // Testronde: de route punt voor punt doorlopen zonder naar buiten te gaan
  // ?test=1 (vanuit Spel klaarzetten op het dashboard): meteen de testronde open
  const [testOpen, setTestOpen] = useState(() => zoekParams.get("test") === "1");
  // ❓ De hulpkolom laat de uitleg zien bij het onderdeel waar je nu bent (vraag, punt, items, …)
  const hulpOnderdeel = vraagVenster || alleVragenOpen ? "vraag" : controleOpen ? "controle" : instellingenOpen ? "instellingen"
    : geselecteerdSpeciaal || actieveTab === "items" ? "items" : geselecteerd ? "punt" : "kaart";
  useEffect(() => {
    document.documentElement.dataset.hulp = hulpOnderdeel;
    return () => { delete document.documentElement.dataset.hulp; };
  }, [hulpOnderdeel]);
  const vraagpunten = punten.filter((p) => p.type === "vraagpunt");
  // 📝 Alle vragen: ook de verplichte startvraag (🏠 bij een rondje) en de finishopdracht, op routevolgorde
  const alleVragenPunten = punten.filter((p, i) => p.type === "vraagpunt" || p.type === "eindpunt"
    || (route.modus === "verspreid" && punten.length >= 3 && i === 0));
  // Vijf hoofdknoppen bovenin de zijbalk, in bouwvolgorde (met stapnummer): punten, teams (de looproutes bepalen
  // waar items komen), vragen, items, spel. 👫 Teams alleen bij een rondje: op volgorde lopen alle teams dezelfde route
  const hoofdKnoppen: { tab: typeof actieveTab; icoon: string; naam: string; telling: string | number | null; uitleg: string }[] = [
    { tab: "punten", icoon: "📍", naam: "Punten", telling: punten.length, uitleg: "De punten van de route: plaatsen, volgorde en soort" },
    ...(route.modus === "verspreid" ? [{ tab: "teams" as const, icoon: "👫", naam: "Teams", telling: verwachtTeams, uitleg: "Aantal teams, startpunt en looprichting per team" }] : []),
    { tab: "vragen", icoon: "❓", naam: "Vragen", telling: alleVragenPunten.length ? `${alleVragenPunten.filter((p) => vraagPuntIds.has(p.id)).length}/${alleVragenPunten.length}` : null, uitleg: "Alle vragen, het puzzelwoord en de bonusvragen" },
    { tab: "items", icoon: "🎁", naam: "Items", telling: specialeItems.length, uitleg: "Items op de kaart, startitems en wat na de finish nog mag" },
    { tab: "spel", icoon: "🎉", naam: "Spel", telling: null, uitleg: "Tussenstand, duel en spelplezier" },
  ];
  // 💡 Wat nu?: de eerstvolgende stap, met een tik ernaartoe
  const watNu: { tekst: string; actie?: () => void; klaar?: boolean } = (() => {
    const zonder = alleVragenPunten.filter((p) => !vraagPuntIds.has(p.id));
    const fout = controle.find((r) => r.niveau === "fout");
    if (route.modus === "verspreid" && punten.length === 0) {
      if (!centrumPunt) return { tekst: "tik op de kaart en kies Middelpunt.", actie: () => kiesTab("punten") };
      return { tekst: "maak de punten met 🎲 Punten maken in de cirkel.", actie: () => { kiesTab("punten"); setRondjeOpen(true); } };
    }
    if (punten.length === 0) return { tekst: "tik op de kaart en kies Punt.", actie: () => kiesTab("punten") };
    if (zonder.length) return { tekst: `vul de vragen in (nog ${zonder.length} open).`, actie: () => { kiesTab("vragen"); setAlleVragenOpen(true); } };
    if (fout) return { tekst: fout.tekst, actie: () => setControleOpen(true) };
    if (route.modus === "verspreid" && specialeItems.length === 0) return { tekst: "leg items neer, bijvoorbeeld met ✨ Items verdelen.", actie: () => kiesTab("items") };
    if (!route.is_active) return { tekst: "test de route met Testen en activeer hem daarna.", actie: () => setControleOpen(true) };
    return { tekst: "de route is actief. Wijzigingen stuur je met Naar spelers sturen.", klaar: true };
  })();
  // Vraagpunten zonder vraag (oranje stip op de kaart); alleen een nieuwe Set als de lijst echt verandert
  const zonderVraagSleutel = vraagpunten.filter((p) => !vraagPuntIds.has(p.id)).map((p) => p.id).join(",");
  const zonderVraag = useMemo(() => new Set(zonderVraagSleutel ? zonderVraagSleutel.split(",") : []), [zonderVraagSleutel]);
  // 🧩 Puzzelwoord aan: in de vraag-editor per vraag kiezen hoeveel letters een goed antwoord geeft
  const puzzelLetters = route.puzzel_aan ? normaliseerPuzzel(route.puzzelwoord).length : 0;
  const puzzelKoppeling: PuzzelKoppeling | undefined = puzzelLetters > 0 ? {
    letters: puzzelLetters,
    verdeling: route.puzzel_verdeling ?? {},
    vraagIds: vraagpunten.map((p) => p.id),
    onZet: (puntId, n) => {
      const nieuw = { ...(route.puzzel_verdeling ?? {}) };
      if (n === 1) delete nieuw[puntId]; else nieuw[puntId] = n;
      slaPuzzelOp({ puzzel_verdeling: nieuw });
    },
  } : undefined;
  const kaartNummer = (p: RoutePunt) => {
    const i = punten.findIndex((x) => x.id === p.id);
    return String(route.modus === "verspreid" && punten.length >= 3 ? i : i + 1);
  };
  // Naam gewijzigd in de vraag-editor: lijst, kaart en open paneel bijwerken
  function puntNaamGewijzigd(id: string, naam: string) {
    setPunten((p) => p.map((pt) => pt.id === id ? { ...pt, name: naam } : pt));
    setGeselecteerd((g) => (g?.id === id ? { ...g, name: naam } : g));
  }
  // Alle punten voor het kaartje in de vraag-editor, met hetzelfde label als op de grote kaart
  const kaartPunten = punten.map((p, i) => ({
    id: p.id, lat: p.latitude, lng: p.longitude,
    label: p.type === "eindpunt" && i === punten.length - 1 ? "🏁" : route.modus === "verspreid" && punten.length >= 3 && i === 0 ? "🏠" : kaartNummer(p),
  }));
  // Een laadfout is niet hetzelfde als "nog geen vraag": dan geen leeg formulier openen (opslaan zou de
  // bestaande vraag overschrijven), maar melden en opnieuw laten proberen
  async function openVraag(punt: RoutePunt) {
    const res = await api(`/api/admin/routes/${route.id}/punten/${punt.id}/vraag`).catch(() => null);
    if (!res?.ok) { toonMelding("De vraag kon niet worden geladen: probeer het opnieuw", "fout"); return; }
    setVraagVenster({ punt, vraag: await res.json() });
  }
  function vraagBijgewerkt(puntId: string, vraag: VraagMetAntwoorden | null) {
    setVraagPuntIds((oud) => { const n = new Set(oud); if (vraag) n.add(puntId); else n.delete(puntId); return n; });
    setNaamVoorstellen((oud) => {
      const n = new Map(oud);
      if (vraag) n.set(puntId, naamWoorden(vraag)); else n.delete(puntId);
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
  // Nieuwe volgorde opslaan. Mislukt het, dan de oude volgorde terug in beeld (de database heeft die nog)
  async function zetVolgorde(lijst: RoutePunt[]): Promise<boolean> {
    const vorige = punten;
    setPunten(lijst);
    const res = await api(`/api/admin/routes/${route.id}/punten/volgorde`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volgorde: lijst.map((x) => x.id) }),
    });
    if (!res.ok) {
      setPunten(vorige);
      toonMelding("Volgorde opslaan lukte niet; de oude volgorde staat er weer", "fout");
      return false;
    }
    return true;
  }

  async function maakOngedaan() {
    const st = stappen[stappen.length - 1];
    if (!st || bezigMetHerstel) return;
    setBezigMetHerstel(true);
    setHerstelToast(null);
    // De stap gaat pas uit de geschiedenis als het herstellen echt gelukt is; anders kan het opnieuw
    let gelukt = true;
    try {
      if (st.soort === "item-weg") {
        const { type, name, latitude, longitude, radius_meters, points_effect } = st.item;
        const res = await api(`/api/admin/routes/${route.id}/speciaal`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          // Ongedaan maken: terug op precies de oude plek
        body: JSON.stringify({ type, name, latitude, longitude, radius_meters, points_effect, vrij: true }),
        });
        if (res.ok) {
          const terug: SpeciaalItem = await res.json();
          idMapRef.current.set(st.item.id, terug.id);
          setSpecialeItems((p) => [...p, terug]);
        } else gelukt = false;
      } else if (st.soort === "punt-weg") {
        const p = st.punt;
        const res = await api(`/api/admin/routes/${route.id}/punten`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: p.type, name: p.name, latitude: p.latitude, longitude: p.longitude, radius_meters: p.radius_meters, points: p.points }),
        });
        if (!res.ok) { gelukt = false; return; }
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
        // Het punt staat er weer (eventueel op een andere plek): de stap is gedaan
      } else if (st.soort === "item-erbij") {
        const id = los(st.id);
        const res = await api(`/api/admin/routes/${route.id}/speciaal/${id}`, { method: "DELETE" });
        if (!res.ok) { gelukt = false; return; }
        setSpecialeItems((p) => p.filter((i) => i.id !== id));
        if (geselecteerdSpeciaal?.id === id) setGeselecteerdSpeciaal(null);
      } else if (st.soort === "punt-erbij") {
        const id = los(st.id);
        const res = await api(`/api/admin/routes/${route.id}/punten/${id}`, { method: "DELETE" });
        if (!res.ok) { gelukt = false; return; }
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
        } else gelukt = false;
      } else if (st.soort === "volgorde") {
        // Oude volgorde terug; punten die er toen nog niet waren blijven vóór de finish staan
        const perId = new Map(punten.map((p) => [p.id, p]));
        const lijst = st.ids.map(los).map((id) => perId.get(id)).filter((p): p is RoutePunt => !!p);
        const nieuw = punten.filter((p) => !lijst.includes(p));
        const eind = lijst[lijst.length - 1]?.type === "eindpunt" ? lijst.length - 1 : lijst.length;
        lijst.splice(eind, 0, ...nieuw);
        if (!await zetVolgorde(lijst)) gelukt = false;
      }
    } catch {
      gelukt = false;
    } finally {
      setBezigMetHerstel(false);
      if (gelukt) setStappen((oud) => oud[oud.length - 1] === st ? oud.slice(0, -1) : oud);
      else toonMelding(`Ongedaan maken lukte niet (${stapLabel(st)}): probeer het nog een keer`, "fout");
    }
  }
  // Sneltoetsen (pc), niet tijdens het typen in een veld of met een venster open:
  // Ctrl+Z ongedaan · Delete het gekozen punt of item weg · Esc paneel dicht · ← → vorig of volgend punt
  const maakOngedaanRef = useRef(maakOngedaan);
  maakOngedaanRef.current = maakOngedaan;
  const toetsRef = useRef({ geselecteerd, geselecteerdSpeciaal, punten });
  toetsRef.current = { geselecteerd, geselecteerdSpeciaal, punten };
  useEffect(() => {
    function toets(e: KeyboardEvent) {
      const doel = e.target as HTMLElement | null;
      if (doel && (doel.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(doel.tagName))) return;
      if (document.querySelector("[data-vraagvenster], [role=dialog]")) return;
      const { geselecteerd: punt, geselecteerdSpeciaal: item, punten: lijst } = toetsRef.current;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        maakOngedaanRef.current();
      } else if ((e.key === "Delete" || e.key === "Backspace") && (punt || item)) {
        e.preventDefault();
        if (item) { verwijderSpeciaalItemRef.current(item.id); setGeselecteerdSpeciaal(null); }
        else if (punt) { verwijderPuntRef.current(punt.id); setGeselecteerd(null); }
      } else if (e.key === "Escape" && (punt || item)) {
        setGeselecteerd(null); setGeselecteerdSpeciaal(null);
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && lijst.length && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = punt ? lijst.findIndex((p) => p.id === punt.id) : -1;
        const nieuw = e.key === "ArrowRight" ? Math.min(lijst.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
        e.preventDefault();
        setGeselecteerdSpeciaal(null);
        setGeselecteerd(lijst[nieuw]);
      }
    }
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, []);

  const verwijderSpeciaalItemRef = useRef<(id: string) => void>(() => {});
  const verwijderPuntRef = useRef<(id: string) => void>(() => {});
  verwijderSpeciaalItemRef.current = (id) => { verwijderSpeciaalItem(id); };
  verwijderPuntRef.current = (id) => { verwijderPunt(id); };

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
      // Verplaatsen: op de weg leggen, of precies hier (🧲 uit, of bij ongedaan maken)
      body: JSON.stringify("latitude" in update ? { ...update, vrij: !itemsOpWeg || !registreer } : update),
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

  // Puntpaneel dicht met nog niet opgeslagen wijzigingen: die alsnog bewaren (voor dát punt)
  async function bewaarPuntBijSluiten(punt: RoutePunt, update: Partial<RoutePunt>) {
    onthoud({ soort: "punt-gewijzigd", id: punt.id, oud: oudeWaarden(punt, update) });
    const res = await api(`/api/admin/routes/${route.id}/punten/${punt.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update),
    }).catch(() => null);
    if (res?.ok) {
      const bijgewerkt: RoutePunt = await res.json();
      setPunten((p) => p.map((pt) => pt.id === bijgewerkt.id ? bijgewerkt : pt));
      toonMelding(`Wijzigingen van "${bijgewerkt.name}" bewaard`, "ok");
    } else toonMelding(`Wijzigingen van "${punt.name}" konden niet worden bewaard: open het punt en sla opnieuw op`, "fout");
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
    } else setFout(await foutUitleg(res, "Opslaan"));
    setOpslaan(false);
  }

  // Status, spelsoort en de volgende stap (publiceren, activeren, naar spelers). Computer: in de
  // routekop naast de naam; telefoon: in de knoppenrij eronder.
  // Opslagstatus, ongedaan maken en instellingen (computer: rechts in de routekop)
  const rechtsGroep = (
    <>
            {/* Mislukt: klik voor de uitleg (wat ging er mis en wat doe je eraan) */}
            <span className={`editor-opslag editor-opslag--${opslag}`} title={opslag === "fout" ? opslagFout : undefined}
              role={opslag === "fout" ? "button" : undefined} style={opslag === "fout" ? { cursor: "pointer" } : undefined}
              onClick={opslag === "fout" ? () => toonMelding(opslagFout, "fout") : undefined}>
              {opslag === "bezig" ? "⏳ Opslaan…" : opslag === "fout" ? "⚠️ Niet opgeslagen ⓘ" : "✓ Opgeslagen"}
            </span>
            {stappen.length > 0 && <button type="button" className="rl-knop"
              disabled={bezigMetHerstel} onClick={maakOngedaan}
              title={stappen.length ? `Ongedaan maken: ${stapLabel(stappen[stappen.length - 1])} (Ctrl+Z)` : "Niets om ongedaan te maken"}>
              <Icoon naam="terug" /><span className="alleen-pc"> Ongedaan</span><span className="editor-teller">{stappen.length}</span>
            </button>}
            {/* ⚙️ Instellingen: alleen voor wat zelden verandert, dus een gewone knop */}
            <button className="rl-knop alleen-pc-knop"
              onClick={() => setInstellingenOpen(true)} title="Instellingen die zelden veranderen: afstellen van punten, verboden gebieden, uiterlijk">
              <Icoon naam="instellingen" /><span className="alleen-pc"> Instellingen</span>
            </button>
    </>
  );

  // Status (Concept, Klaar, Actief) als label en één opvallende knop voor de volgende stap
  const statusGroep = (
    <>
            {/* Status als label (Concept, Klaar, Actief); de volgende stap is de knop ernaast, de weg ernaartoe staat bij 💡 Wat nu? */}
            <StatusPil status={route.status} isActief={route.is_active} />
            <span className="editor-chip editor-modus-chip" style={{ background: MODUS_INFO[route.modus].tint, borderColor: `${MODUS_INFO[route.modus].kleur}55`, color: MODUS_INFO[route.modus].kleur }} title={MODUS_INFO[route.modus].label}>
              <ModusIcoon modus={route.modus} size={14} />
              <span className="alleen-pc editor-modus-naam">{MODUS_INFO[route.modus].label}</span>
            </span>
            {/* De volgende stap */}
            {/* De volgende stap, altijd één opvallende knop: Controleren (zolang er iets mist) → Starten → Naar spelers sturen */}
            {!route.is_active && (
              <button className={`rl-knop editor-volgende ${controle.length ? "rl-knop--goud" : "rl-knop--cyan"}`} onClick={() => setControleOpen(true)}
                title={controle.length ? `Nog ${controle.length} ${controle.length === 1 ? "punt" : "punten"} om na te kijken voordat je kunt starten` : "Laatste controle, daarna kunnen de spelers beginnen"}>
                {controle.length
                  ? <><Icoon naam="waarschuwing" /> Controleren <span className="editor-teller">{controle.length}</span></>
                  : <><Icoon naam="start" /> Starten</>}
              </button>
            )}
            {!route.is_active && route.status === "gepubliceerd" && (
              <button className="rl-knop" onClick={() => zetStatus("concept")}
                title="Terug naar concept (weer bewerken voordat je activeert)"><Icoon naam="terug" /><span className="alleen-pc"> Concept</span></button>
            )}
            {route.is_active && (
              <BevestigKnop venster gevaarlijk={false} icoon="📲" titel="Wijzigingen naar de spelers sturen?" vraag="" ja="Ja, versturen"
                className="rl-knop rl-knop--cyan" tip="De apps van de spelers lezen de route opnieuw in" tipOnder
                onBevestig={async () => {
                  const res = await api(`/api/admin/routes/${route.id}/vernieuw`, { method: "POST" });
                  const data = await res.json().catch(() => ({}));
                  toonMelding(res.ok ? "Verstuurd: de spelers zien de wijzigingen binnen een paar seconden" : uitlegBijStatus(res.status, "Versturen", data.fout), res.ok ? "ok" : "fout");
                }}><Icoon naam="delen" /><span className="alleen-pc"> Naar spelers sturen</span></BevestigKnop>
            )}
            {route.is_active && (
              <BevestigKnop venster icoon="⏹️" titel="Route deactiveren?" vraag="" knopTekst="Ja, deactiveren"
                uitleg="Lopende spellen stoppen. De route blijft Klaar, dus je kunt hem later opnieuw activeren."
                className="rl-knop rl-knop--rood" onBevestig={deactiveerRoute}><Icoon naam="stoppen" /><span className="alleen-pc"> Deactiveren</span></BevestigKnop>
            )}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Topbar */}
      <div className="admin-topbar route-editor-topbar" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        {/* Rij 1: routekop (terug, naam, status en de volgende stap) */}
        <div className="editor-kop" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/admin/routes" className="rl-knop editor-terug" title="Terug naar de routes">←<span className="alleen-pc"> Routes</span></a>
          {naamWijzig ? (
            <div className="editor-naam-wijzig" style={{ display: "flex", gap: 6, flex: 1, minWidth: 0 }}>
              <input className="form-input" value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} style={{ flex: 1 }} autoFocus />
              <button className="rl-knop rl-knop--cyan" onClick={slaRouteNaamOp}>Opslaan</button>
              <button className="rl-knop" onClick={() => setNaamWijzig(false)} title="Annuleren" aria-label="Annuleren">✕</button>
            </div>
          ) : (
            // Lange naam: schuift heen en weer, zodat de hele kop op één regel past
            <h1 className="editor-naam" style={{ minWidth: 0, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setNaamWijzig(true)} title={`${route.name}: klik om de naam te wijzigen`}>
              <SchuifTekst tekst={route.name} style={{ minWidth: 0, flex: "0 1 auto" }} /> <span style={{ fontSize: "0.7rem", color: "var(--muted)", flex: "none" }}>✏️</span>
            </h1>
          )}
          {!naamWijzig && <span className="editor-status-kop">{statusGroep}</span>}
          <span className="editor-kop-ruimte" />
          <span className="editor-rechts-kop">{rechtsGroep}</span>
          {/* Telefoon: instellingen rechts naast de naam (op de computer staat hij in de knoppenrij) */}
          <button className="rl-knop rl-knop--goud alleen-mobiel-knop"
            onClick={() => setInstellingenOpen(true)} title="Route-instellingen" aria-label="Instellingen"><Icoon naam="instellingen" /></button>
        </div>

        {/* Rij 2: status en route-stappen links, hulpmiddelen in het midden, ongedaan maken en opslagstatus rechts */}
        <div className="editor-balk">
          <span className="editor-status-groep">{statusGroep}</span>

          <span className="editor-balk-scheiding" aria-hidden />
          {/* Telefoon: hier begint een nieuwe regel met het gereedschap */}
          <span className="editor-breuk" aria-hidden />
          <span className="editor-gereedschap-rij">

          {/* Computer: puntenlijst links in- en uitklappen */}
          <button type="button" className={`rl-knop alleen-pc-knop${lijstDicht ? "" : " rl-knop--cyan"}`} onClick={wisselLijst}
            title={lijstDicht ? "Puntenlijst tonen" : "Puntenlijst verbergen (meer ruimte voor de kaart)"}><Icoon naam="lijst" /> Lijst</button>

          {/* Wegen: aan/uit-schakelaar (op de telefoon niet: daar alleen de hoofdzaken) */}
          <span className="editor-groep alleen-pc-knop">
            <button className={`rl-knop schakel${wegenAan ? " schakel--aan" : ""}`} role="switch" aria-checked={wegenAan}
              onClick={wisselWegen} disabled={wegen.bezig}
              title={wegenAan ? "Aan: lijnen en afstanden volgen wegen en voetpaden. Klik om uit te zetten (hemelsbreed). Lukt een stuk niet, dan probeert de app het vanzelf opnieuw." : "Uit: lijnen en afstanden zijn hemelsbreed. Klik om wegen en voetpaden te volgen."}>
              {wegen.bezig ? <Icoon naam="laden" /> : <Icoon naam="lopen" />}<span className="alleen-pc"> Wegen</span><span className="schakel-bol" aria-hidden />
            </button>
          </span>
          {/* 🚶 Verkennen: buiten met de telefoon punten op je eigen plek zetten */}
          <button type="button" className={`rl-knop${verken ? " rl-knop--cyan" : ""}`}
            onClick={() => { setVerken((v) => (v ? null : { pos: null })); setProef(null); setTestOpen(false); setTekenGebied(null); }}
            title={verken ? "Verkennen stoppen" : "Verkennen: loop de route met je telefoon en zet punten op je eigen plek"}>
            <Icoon naam="kompas" /><span className="alleen-pc"> Verkennen</span>
          </button>
          <button className={`rl-knop${proef || testOpen ? " rl-knop--cyan" : ""}`} disabled={!punten.length}
            onClick={() => { if (proef || testOpen) { setProef(null); setTestOpen(false); } else setTestKeuze(true); setGeselecteerd(null); setVerken(null); }}
            title={proef || testOpen ? "Testen stoppen" : "Testen: lopen als team, of alle vragen doorlopen"}>
            <Icoon naam="testen" /><span className="alleen-pc"> Testen</span>
          </button>

          <span className="editor-balk-scheiding" aria-hidden />
          {/* Gereedschap voor de punten: icoontjes met uitleg bij aanwijzen */}
          <span className="editor-groep editor-gereedschap">
            {/* Importeren alleen bij "Op volgorde": bij een rondje maakt de app de punten zelf */}
            {route.modus === "sequentieel" && <PuntenImporteren routeId={route.id} straal={puntRadius} heeftFinish={punten[punten.length - 1]?.type === "eindpunt"} leeg={punten.length === 0} onKlaar={herlaadPunten} />}
            <button type="button" className={`rl-knop alleen-pc-knop${tekenGebied ? " rl-knop--cyan" : ""}`} onClick={() => { setTekenGebied((t) => (t ? null : [])); setProef(null); setGeselecteerd(null); }}
              title="Verboden gebied tekenen: tik de hoeken aan op de kaart (bijv. een drukke weg of privéterrein)">
              <Icoon naam="verboden" /><span className="alleen-pc"> Verboden gebied</span>
            </button>
            {/* 🧲 Op de weg: één venster voor punten en items, en of nieuwe items vanzelf op de weg komen */}
            <button type="button" className="rl-knop" disabled={(!punten.length && !specialeItems.length) || opDeWegBezig || opWegBezig}
              onClick={() => { setOpWegKeuze({ punten: punten.length > 0, items: specialeItems.length > 0 }); setOpWegVenster(true); }}
              data-tip="Punten en items op de weg of het voetpad leggen" data-tip-pos="onder" aria-label="Op de weg">
              {opDeWegBezig || opWegBezig ? <Icoon naam="laden" /> : <Icoon naam="magneet" />}<span className="alleen-pc"> Op de weg</span>
            </button>
          </span>
          </span>

        </div>
      </div>

      {!tipWeg && (
        <div className="pc-tip pc-tip--alleen-mobiel editor-tip" style={{ margin: "8px 16px 0" }}>
          <span style={{ flex: 1 }}>💻 <strong>Tip:</strong> een route bewerk je het makkelijkst op een pc of laptop.</span>
          <button type="button" className="editor-tip-sluit" aria-label="Tip sluiten"
            onClick={() => { setTipWeg(true); try { localStorage.setItem("pointrush_editor_tip_weg", "1"); } catch { /* geen opslag */ } }}>✕</button>
        </div>
      )}

      {/* Plaatsnaam zoeken — alleen zinvol zolang de route nog geen eigen punten heeft om op te centreren */}
      {punten.length === 0 && !stappenOpen && (
        <form onSubmit={zoekPlaats} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0, background: "rgba(255,255,255,0.03)" }}>
          <input
            className="form-input" style={{ flex: 1, fontSize: "0.85rem" }}
            placeholder="🔍 Zoek eerst de plaats waar je route komt…" value={plaatsZoekterm}
            onChange={(e) => setPlaatsZoekterm(e.target.value)}
          />
          <button className="btn btn-ghost" type="submit" style={{ fontSize: "0.82rem", flexShrink: 0 }} disabled={plaatsBezig}>
            {plaatsBezig ? "…" : "Zoeken"}
          </button>
          {plaatsFout && <span style={{ fontSize: "0.75rem", color: "var(--red)", flexShrink: 0 }}>{plaatsFout}</span>}
        </form>
      )}

      {/* Hoofdindeling */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {/* Zijpaneel — op mobiel een overlay i.p.v. vaste kolom */}
        <div className={`route-editor-zijpaneel${mobielPaneelOpen ? " route-editor-zijpaneel--open" : ""}${lijstDicht ? " route-editor-zijpaneel--dicht" : ""}${actieveTab === "spel" || actieveTab === "items" ? " route-editor-zijpaneel--breed" : ""}`}>
          {/* Telefoon: kop met sluitknop (tikken naast het paneel sluit hem ook) */}
          <div className="zijpaneel-kop-mobiel">
            <span>≡ Route</span>
            <button type="button" className="editor-paneel-sluit" onClick={() => setMobielPaneelOpen(false)} title="Lijst sluiten" aria-label="Lijst sluiten">✕</button>
          </div>

          {/* Vijf hoofdknoppen: elk onderdeel van de route op één plek; de kaart blijft in beeld */}
          <div className="editor-hoofdknoppen" role="tablist" aria-label="Onderdeel van de route">
            {hoofdKnoppen.map((k, i) => (
              <button key={k.tab} type="button" role="tab" aria-selected={actieveTab === k.tab} className={actieveTab === k.tab ? "aan" : ""}
                onClick={() => kiesTab(k.tab)} title={`Stap ${i + 1}: ${k.uitleg}`} data-rondleiding={k.tab === "punten" ? "knoppen" : undefined}>
                <span className="editor-hoofdknop-stap" aria-hidden>{i + 1}</span>
                <span className="editor-hoofdknop-icoon" aria-hidden>{k.icoon}</span>
                <span className="editor-hoofdknop-naam">{k.naam}</span>
                {k.telling !== null && <span className="editor-hoofdknop-tel">{k.telling}</span>}
              </button>
            ))}
          </div>
          {/* 💡 Wat nu?: steeds de volgende stap; tik = naar die stap */}
          <div className="editor-watnu">
            <button type="button" className={`editor-watnu-knop${watNu.klaar ? " editor-watnu-knop--klaar" : ""}`} onClick={watNu.actie} disabled={!watNu.actie}>
              <span aria-hidden>{watNu.klaar ? "✅" : "💡"}</span><span><strong>Wat nu?</strong> {watNu.tekst}</span>
            </button>
            <button type="button" className="editor-watnu-rondleiding" onClick={() => setRondleidingOpen(true)} title="🧭 Rondleiding: zo werkt de route-editor" aria-label="Rondleiding">🧭</button>
          </div>

          {/* Verspreid-instellingen / afstand */}
          {actieveTab === "punten" && (route.modus === "verspreid" ? (rondjeOpen || punten.length === 0) : punten.length >= 2) && <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
            {route.modus === "verspreid" && (() => {
              const totaalM = punten.length >= 2 ? wegen.totaal(puntPlekken) : 0;
              const stapM = doelAfstandKm > 0 && punten.length > 0 ? doelAfstandKm * 1000 / punten.length : null;
              const teWeinigPunten = punten.length < verwachtTeams * 2;

              return (
                <>
                  {(rondjeOpen || punten.length === 0) && (
                    <>
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
                    {centrumModus ? <><Icoon naam="aanwijzen" />{" Klik op de kaart voor het middelpunt…"}</> : centrumPunt ? <><Icoon naam="doel" />{" Middelpunt verplaatsen"}</> : <><Icoon naam="doel" />{" Kies het middelpunt op de kaart"}</>}
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
                        <BevestigKnop venster icoon="🎲" titel={`De ${punten.length} punten vervangen door nieuwe?`} className="btn btn-cyan" style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                          vraag="" ja="Ja, vervang" onBevestig={async () => { await genereerPuntenInCirkel(); }}>
                          <Icoon naam="dobbelsteen" /> Punten maken in de cirkel
                        </BevestigKnop>
                      ) : (
                        <button className="btn btn-cyan" style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }} onClick={genereerPuntenInCirkel}>
                          <Icoon naam="dobbelsteen" /> Punten maken in de cirkel
                        </button>
                      )}
                    </>
                  )}

                  {/* Live preview */}
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {totaalM > 0 && <div>Gemeten: {(totaalM / 1000).toFixed(2)} km {wegen.compleet ? "🚶 langs wegen en voetpaden" : wegen.aan ? "📏 hemelsbreed (wegen laden…)" : "📏 hemelsbreed"}</div>}
                    {doelAfstandKm > 0 && <div style={{ color: "var(--cyan)" }}>Teams ≈ {(doelAfstandKm / verwachtTeams).toFixed(2)} km uit elkaar</div>}
                    {stapM !== null && punten.length > 0 && <div>Aanbevolen puntafstand: ≈ {Math.round(stapM)} m</div>}
                    {geselecteerd && doelAfstandKm > 0 && punten.length > 0 && (
                      <div style={{ color: "rgba(0,217,255,0.7)" }}>⬤ Cirkel op kaart = aanbevolen afstand</div>
                    )}
                  </div>

                    </>
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
              const totaalM = wegen.totaal(puntPlekken);
              return <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Totale afstand: {(totaalM / 1000).toFixed(1)} km {wegen.compleet ? "🚶 langs wegen en voetpaden" : wegen.aan ? "📏 hemelsbreed (wegen laden…)" : "📏 hemelsbreed"}</span>;
            })()}

          </div>}

          {/* Tab-inhoud */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>

            {/* ⭕ Rondje (teams, afstand, punten maken) en ☑️ meerdere punten tegelijk: twee knoppen boven de lijst */}
            {actieveTab === "punten" && punten.length > 0 && !kiesModus && (
              <div className="zp-knoppenrij">
                {route.modus === "verspreid" && (
                  <button type="button" className={`rl-knop${rondjeOpen ? " rl-knop--cyan" : ""}`} onClick={() => setRondjeOpen((v) => !v)} aria-expanded={rondjeOpen}
                    title={`Rondje: ${verwachtTeams} teams · ${doelAfstandKm} km · ${punten.length} punten`}>
                    <Icoon naam="rondje" /> Rondje <span className="zp-knop-klein">{doelAfstandKm} km</span>
                  </button>
                )}
                {punten.length > 1 && (
                  <button type="button" className="rl-knop" onClick={() => { setKiesModus(true); setGekozenIds(new Set()); setGeselecteerd(null); }}>
                    <Icoon naam="meerdere" /> Meerdere tegelijk
                  </button>
                )}
              </div>
            )}
            {/* Meerdere punten tegelijk */}
            {actieveTab === "punten" && punten.length > 1 && kiesModus && (
              <div className={`meerdere${kiesModus ? " meerdere--aan" : ""}`}>
                {!kiesModus ? null : (<>
                  {/* Kop: hoeveel gekozen, en klaar */}
                  <div className="meerdere-kop">
                    <span>☑️ <strong>{gekozenIds.size}</strong> gekozen</span>
                    <button type="button" className="rl-knop" onClick={() => { setKiesModus(false); setGekozenIds(new Set()); }}><Icoon naam="klaar" /> Klaar</button>
                  </div>
                  {/* Snel kiezen */}
                  <div className="segment meerdere-kies" aria-label="Snel kiezen">
                    <button type="button" onClick={() => kiesElke(1)}>Alles</button>
                    <button type="button" onClick={() => kiesElke(2)}>Elk 2e</button>
                    <button type="button" onClick={() => kiesElke(3)}>Elk 3e</button>
                    <button type="button" onClick={() => setGekozenIds(new Set())} disabled={!gekozenIds.size}>Geen</button>
                  </div>
                  {/* Wat er met de gekozen punten gebeurt */}
                  <div className="meerdere-acties">
                    <button type="button" className="rl-knop" disabled={!gekozenIds.size || !!namenBezig} onClick={() => zetSoortVoorGekozen("vraagpunt")} title="Vraagpunt maken"><Icoon naam="vraag" /><span>Vraag</span></button>
                    <button type="button" className="rl-knop" disabled={!gekozenIds.size || !!namenBezig} onClick={() => zetSoortVoorGekozen("informatiepunt")} title="Infopunt maken"><Icoon naam="info" /><span>Info</span></button>
                    <button type="button" className="rl-knop" disabled={!gekozenIds.size || !!namenBezig} onClick={() => zetSoortVoorGekozen("doorlooppunt")} title="Doorlooppunt maken (geen scherm)"><Icoon naam="lopen" /><span>Door</span></button>
                    <button type="button" className="rl-knop" disabled={!gekozenIds.size || !!namenBezig} onClick={geefStraatnamen} title="Elk gekozen punt de naam van de straat of plek geven">
                      {namenBezig ? <><Icoon naam="laden" /><span>{namenBezig}</span></> : <><Icoon naam="label" /><span>Naam</span></>}
                    </button>
                  </div>
                </>)}
              </div>
            )}

            {/* Punten-tab */}
            {actieveTab === "punten" && (
              punten.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  👆 <strong>Klik op de kaart</strong> en kies 📍 Punt om je eerste punt te zetten. Punten uit een bestand haal je binnen met 📥 Importeren.
                </p>
              ) : punten.map((pt, i) => {
                const isVerspreid = route.modus === "verspreid" && punten.length >= 3;
                const isHubStart = isVerspreid && i === 0;
                const isHubEind = isVerspreid && i === punten.length - 1;
                const isHub = isHubStart || isHubEind;
                const badge = isHubStart ? "🏠" : pt.type === "eindpunt" ? "🏁" : (isVerspreid ? i : i + 1);
                // Zelfde kleuren als de markers op de kaart
                const badgeBg = isHubStart ? "#16A34A" : pt.type === "eindpunt" ? "#F59E0B" : pt.type === "informatiepunt" ? "#06B6D4" : pt.type === "doorlooppunt" ? "#64748B" : "#1E40AF";
                // Slepen: start en finish (en een eindpunt achteraan) liggen vast
                const vast = isHub || (pt.type === "eindpunt" && i === punten.length - 1);
                const isDoel = sleepId !== null && sleepDoel === i && sleepId !== pt.id;
                return (
                  <div key={pt.id}
                    draggable={!vast && !kiesModus}
                    onDragStart={(e) => { setSleepId(pt.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", pt.id); }}
                    onDragOver={(e) => { if (sleepId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (sleepDoel !== i) setSleepDoel(i); } }}
                    onDrop={(e) => { e.preventDefault(); if (sleepId) verplaatsNaar(sleepId, i); setSleepId(null); setSleepDoel(null); }}
                    onDragEnd={() => { setSleepId(null); setSleepDoel(null); }}
                    onClick={() => {
                      if (!kiesModus) { setGeselecteerd(geselecteerd?.id === pt.id ? null : pt); return; }
                      if (!kiesbaar(pt, i)) return;
                      setGekozenIds((g) => { const n = new Set(g); if (n.has(pt.id)) n.delete(pt.id); else n.add(pt.id); return n; });
                    }}
                    className={`lijst-rij${geselecteerd?.id === pt.id ? " lijst-rij--gekozen" : ""}${pt.type === "doorlooppunt" ? " lijst-rij--door" : ""}`}
                    title={vast ? undefined : "Sleep om de volgorde te veranderen"}
                    style={{
                      padding: "4px 10px", cursor: vast ? "pointer" : "grab", display: "flex", alignItems: "center", gap: 7,
                      background: geselecteerd?.id === pt.id ? "rgba(255,255,255,0.12)" : "transparent",
                      borderLeft: geselecteerd?.id === pt.id ? "3px solid #60A5FA" : "3px solid transparent",
                      // Blauwe lijn waar het gesleepte punt terechtkomt
                      boxShadow: isDoel ? `inset 0 ${(punten.findIndex((p) => p.id === sleepId) < i) ? "-3px" : "3px"} 0 var(--cyan)` : undefined,
                      opacity: sleepId === pt.id ? 0.4 : 1,
                    }}>
                    {kiesModus && <span className={`lijst-vink${gekozenIds.has(pt.id) ? " aan" : ""}${kiesbaar(pt, i) ? "" : " uit"}`} aria-hidden>✓</span>}
                    <div className="lijst-badge" style={{
                      width: 27, height: 27, borderRadius: "50%", flexShrink: 0,
                      background: badgeBg, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.82rem", fontWeight: 800,
                    }}>{badge}</div>
                    {/* Naam met daaronder klein hoe vaak de vraag goed ging: de naam houdt zo altijd zijn ruimte
                        (naast elkaar duwde het percentage de naam in de smalle lijst helemaal weg) */}
                    <div className="lijst-naam-blok">
                      <div className="lijst-naam">{pt.name}</div>
                      {/* 📊 Hoe vaak ging deze vraag goed (alle gespeelde spellen); rood als het vaak fout gaat */}
                      {statistiek[pt.id]?.n ? (() => {
                        const t = statistiek[pt.id]; const pct = Math.round((t.goed / t.n) * 100);
                        return <span className={`lijst-stat${pct < 40 ? " lijst-stat--laag" : pct >= 75 ? " lijst-stat--hoog" : ""}`}
                          title={`${t.goed} van de ${t.n} keer goed beantwoord (alle gespeelde spellen)`}>✓ {pct}% · {t.n}×</span>;
                      })() : null}
                    </div>
                    {/* Klikbaar: opent meteen de vraag van dit punt */}
                    {vraagPuntIds.has(pt.id) ? (
                      <button type="button" className="lijst-vraagknop" title="Vraag ingevuld: klik om te bewerken" aria-label="Vraag bewerken"
                        onClick={(e) => { e.stopPropagation(); openVraag(pt); }}><Icoon naam="goed" /></button>
                    ) : pt.type === "vraagpunt" ? (
                      <button type="button" className="lijst-vraagknop lijst-vraagknop--leeg" title="Nog geen vraag: klik om hem in te vullen" aria-label="Vraag invullen"
                        onClick={(e) => { e.stopPropagation(); openVraag(pt); }}><Icoon naam="waarschuwing" /></button>
                    ) : pt.type === "doorlooppunt" ? (
                      <span className="lijst-doorloop" title="Doorlopen: de spelers krijgen hier geen scherm">🚶</span>
                    ) : pt.type === "informatiepunt" && !isHub ? (
                      <span className="lijst-doorloop" title={pt.description ? `Info: ${pt.description}` : "Info (nog zonder tekst)"}>{pt.description ? "ℹ️" : "⚠️"}</span>
                    ) : null}
                    <div className="lijst-rij-acties lijst-pijlen" style={{ display: "flex", flexDirection: "row", gap: 0 }}>
                      <button title="Omhoog" aria-label="Omhoog" onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omhoog"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: (i === 0 || isHub || (isVerspreid && i === 1)) ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▲</button>
                      <button title="Omlaag" aria-label="Omlaag" onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omlaag"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: (i === punten.length - 1 || isHub || (isVerspreid && i === punten.length - 2)) ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▼</button>
                    </div>
                    <button className="lijst-rij-acties" title="Punt verwijderen (terugzetten kan met ↶)" aria-label="Punt verwijderen" onClick={(e) => { e.stopPropagation(); verwijderPunt(pt.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.8rem", padding: "2px 3px" }}><Icoon naam="wissen" /></button>
                    {/* Greep: laat zien dat je de regel kunt verslepen (start en finish liggen vast) */}
                    <span className={`lijst-greep${vast ? " lijst-greep--vast" : ""}`} aria-hidden>≡</span>
                  </div>
                );
              })
            )}

            {/* 🛤️ Ondergrond: trap, onverhard of een drukke weg op de route (voor kinderwagen, rolstoel of kleine kinderen) */}
            {actieveTab === "punten" && punten.length > 1 && !kiesModus && (
              <div className="ondergrond">
                <button type="button" className="rl-knop" onClick={controleerOndergrond} disabled={ondergrond?.bezig}
                  title="Kijkt in OpenStreetMap of de route over trappen, onverharde paden of langs drukke wegen gaat">
                  {ondergrond?.bezig ? <><Icoon naam="laden" />{" Controleren…"}</> : <>🛤️ Ondergrond controleren</>}
                </button>
                {ondergrond?.meldingen && (
                  ondergrond.meldingen.length === 0
                    ? <p className="ondergrond-goed">✓ Geen trappen, onverharde paden of drukke wegen gevonden.</p>
                    : <ul className="ondergrond-lijst">
                        {ondergrond.meldingen.map((m, i) => (
                          <li key={i}><button type="button" onClick={() => setVliegNaar({ lat: m.lat, lng: m.lng, zoom: 18 })} title="Tik om ernaartoe te gaan">
                            <span aria-hidden>{ONDERGROND_ICOON[m.soort]}</span>
                            <span>{m.soort === "trap" ? "Trap" : m.soort === "onverhard" ? `Onverhard pad, ± ${m.lengteM} m` : `Langs een drukke weg, ± ${m.lengteM} m`}{m.naam ? ` · ${m.naam}` : ""}</span>
                          </button></li>
                        ))}
                      </ul>
                )}
                {ondergrond?.meldingen && <span className="inst-uitleg">Uit OpenStreetMap; daar staat niet alles in. Kijk bij twijfel ter plekke.</span>}
              </div>
            )}

            {/* Items-tab */}
            {/* Automatisch: alle voorgestelde items in één keer (verspreid, zodra er een rondje is) */}
            {actieveTab === "items" && itemCheck && itemCheck.voorstellen.length > 0 && (
              <div style={{ margin: "0 10px 8px" }}>
                <BevestigKnop venster gevaarlijk={false} icoon="✨" titel={`${itemCheck.voorstellen.length} items automatisch plaatsen?`} vraag=""
                  uitleg="Langs de route die de teams lopen, verdeeld over de soorten. Terugzetten kan met ↶ Ongedaan." knopTekst="Ja, plaatsen"
                  onBevestig={async () => { await plaatsAlleVoorstellen(); }} disabled={autoItemsBezig}
                  className="rl-knop rl-knop--cyan" style={{ width: "100%", height: 36, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {autoItemsBezig ? <><Icoon naam="laden" />{" Plaatsen…"}</> : <><Icoon naam="nieuw" />{` Items verdelen (${itemCheck.voorstellen.length})`}</>}
                </BevestigKnop>
              </div>
            )}
            {/* Items plaatsen: soort aantikken, daarna op de kaart klikken (zo vaak als je wilt). Dit is de enige
                plek om een bepaalde soort neer te zetten; het kaartmenu en ✨ Items verdelen doen hetzelfde */}
            {actieveTab === "items" && (
              <div className="zp-items-raster">
                {(route.modus === "sequentieel" ? ["plekzooi"] : ITEM_SOORTEN).map((t) => {
                  const actief = plaatsType === t;
                  return (
                    <button key={t} type="button" onClick={() => { setPlaatsType(actief ? null : t as SpeciaalItemType); setGeselecteerdSpeciaal(null); setGeselecteerd(null); }}
                      title={`${ITEM_UITLEG[t] ?? t}\nKlik en zet hem daarna op de kaart (zo vaak als je wilt).`}
                      className={`zp-item-knop${actief ? " aan" : ""}`} aria-pressed={actief}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/items/${t}.webp`} alt="" />
                      <span>{itemNaam(t)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {actieveTab === "items" && route.modus === "sequentieel" && (
              <p style={{ margin: "0 14px 8px", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.45 }}>
                  Op de kaart alleen plek zooi. De startitems staan hieronder.
              </p>
            )}
            {actieveTab === "items" && route.modus === "verspreid" && (() => {
              // Lengte van het rondje: de punten tussen startpunt en finish, als gesloten lus
              let lusMeter = lusMeterWeg;
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
                    <span style={{ whiteSpace: "nowrap" }} title={`Advies: ongeveer ${totaalAdvies} items, nu ${totaalNu}`}>💡 ±{totaalAdvies} · nu {totaalNu} · <span style={{ color: stand.kleur, fontWeight: 700 }}>{stand.tekst}</span></span>
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
            {/* 🎒 Startitems, na de finish en de fijnafstelling: alles van de items op één plek */}
            {actieveTab === "items" && (
              <div className="zijpaneel-inst">
                {/* Startitems */}
                {(
                  <div className="form-group">
                    <label className="form-label">🎒 Startitems — gratis bij de start</label>
                    {/* Alle soorten op één rij: de vakjes krimpen mee met de breedte */}
                    <div style={{ display: "flex", flexWrap: "nowrap", gap: 6, padding: "6px 8px 6px 0" }}>
                      {STARTITEM_TYPES.map((type) => {
                        const n = startitems[type] ?? 0;
                        return (
                          // Tik = er één bij; het rode − haalt er één af
                          <div key={type} style={{ position: "relative", flex: "1 1 0", minWidth: 0, maxWidth: 40 }}>
                            <button type="button" onClick={() => wijzigStartitem(type, 1)} disabled={n >= MAX_PER_STARTITEM}
                              title={`${ITEM_UITLEG[type] ?? type} Tik = +1 (max ${MAX_PER_STARTITEM}).`}
                              style={{
                                width: "100%", aspectRatio: "1", borderRadius: 8, cursor: n >= MAX_PER_STARTITEM ? "default" : "pointer", padding: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: `1px solid ${n > 0 ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.12)"}`,
                                background: n > 0 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                              }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/items/${type}.webp`} alt={type} style={{ width: "65%", height: "65%", objectFit: "contain", opacity: n > 0 ? 1 : 0.35, filter: n > 0 ? "none" : "grayscale(1)" }} />
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
                    {/* Na hoeveel meter lopen: 0 = meteen bij het begin */}
                    <div className="segment" role="radiogroup" aria-label="Startitems na hoeveel meter" style={{ marginTop: 4 }}>
                      {STARTITEMS_METER_KEUZES.map((m) => (
                        <button key={m} type="button" role="radio" aria-checked={itemsMeter === m} className={itemsMeter === m ? "aan" : ""}
                          onClick={() => kiesItemsMeter(m)}>{m === 0 ? "Meteen" : `${m} m`}</button>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      Tik op een item voor +1. Elk team krijgt dit {itemsMeter === 0 ? "meteen bij het begin" : `na ${itemsMeter} meter lopen`} in de balk.
                    </span>
                  </div>
                )}

                {/* Items na de finish */}
                {(
                  <div className="form-group inst-geavanceerd">
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
                            <img src={`/items/${type}.webp`} alt={type} style={{ width: 26, height: 26, opacity: aan ? 1 : 0.35, filter: aan ? "none" : "grayscale(1)" }} />
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

                <button type="button" className="es-link" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setMeerInstellingen((m) => !m)} aria-expanded={meerInstellingen}>
                  <UitklapPijl open={meerInstellingen} /> {meerInstellingen ? "Minder instellingen" : <><Icoon naam="instellingen" />{" Meer instellingen"}</>}
                </button>
                {meerInstellingen && <>
                    <div className="form-group inst-geavanceerd">
                      <label className="form-label">📏 Radius van de items (m)</label>
                      <input className="form-input" type="number" min={3} value={itemRadius}
                        onChange={(e) => setItemRadius(Math.max(3, Number(e.target.value)))}
                        onBlur={() => pasAlleItemsAan(itemRadius)} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Hoe dichtbij een team moet komen. Geldt voor alle items.</span>
                    </div>
                </>}
                {/* Item-waarden (sequentieel heeft geen sterren of bommen) */}
                {meerInstellingen && route.modus === "verspreid" && (
                  <div className="form-group inst-geavanceerd">
                    <label className="form-label">⭐ Item-waarden</label>
                    <div style={{ display: "flex", gap: 12 }}>
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
                {meerInstellingen && (
                  <div className="form-group inst-geavanceerd">
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

                {/* Respawn */}
                {meerInstellingen && route.modus === "verspreid" && (
                  <div className="form-group inst-geavanceerd">
                    <label className="form-label">🔄 Respawn (bij een Rondje)</label>
                    <span className="inst-uitleg">Een opgepakt item komt na een tijdje terug op dezelfde plek.</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="segment" role="radiogroup" aria-label="Respawn" style={{ width: 150 }}>
                        {([false, true] as const).map((aan) => (
                          <button key={String(aan)} type="button" role="radio" aria-checked={!!route.item_respawn === aan} className={!!route.item_respawn === aan ? "aan" : ""}
                            onClick={async () => {
                              if (!!route.item_respawn === aan) return;
                              const res = await api(`/api/admin/routes/${route.id}`, {
                                method: "PATCH", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ item_respawn: aan }),
                              });
                              if (res.ok) setRoute((r) => ({ ...r, item_respawn: aan }));
                            }}>{aan ? "Aan" : "Uit"}</button>
                        ))}
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
                )}
              </div>
            )}
            {actieveTab === "items" && <div className="zijpaneel-kopje">🗺️ Op de kaart ({specialeItems.length})</div>}
            {actieveTab === "items" && (
              specialeItems.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  👆 <strong>Klik op de kaart</strong> en kies 🎁 Item om een item te plaatsen.
                </p>
              ) : (
                <>
                  <ItemLijst items={specialeItems} gekozen={geselecteerdSpeciaal} onKies={setGeselecteerdSpeciaal} onVerwijder={verwijderSpeciaalItem} />
                </>
              )
            )}

            {/* ❓ Vragen: alle vragen op één plek, met het puzzelwoord en de bonusvragen */}
            {actieveTab === "vragen" && (
              <div className="zijpaneel-inst">
                <button type="button" className="rl-knop rl-knop--cyan zp-grote-knop" disabled={!alleVragenPunten.length} onClick={() => setAlleVragenOpen(true)}
                  title="Alle vragen achter elkaar invullen, ook de startvraag en de finishopdracht">
                  📝 Alle vragen <span className="editor-telling">{alleVragenPunten.filter((p) => vraagPuntIds.has(p.id)).length}/{alleVragenPunten.length}</span>
                </button>
                {/* 📄 Spiekbriefje: alle punten met vraag en goed antwoord, om af te drukken (nieuw tabblad) */}
                {punten.length > 0 && (
                  <a className="rl-knop zp-grote-knop" href={`/admin/routes/${route.id}/spiekbriefje`} target="_blank" rel="noopener noreferrer"
                    title="Alle punten met de vraag en het goede antwoord, om mee te nemen op de dag zelf (alleen voor jou)">
                    <Icoon naam="klembord" /> Spiekbriefje afdrukken
                  </a>
                )}
                {alleVragenPunten.length === 0 ? (
                  <p className="zp-leeg">Nog geen vraagpunten. Zet eerst punten op de kaart met <em>Punten</em>.</p>
                ) : (
                  <div className="zp-vragen">
                    {alleVragenPunten.map((p) => {
                      const i = punten.findIndex((x) => x.id === p.id);
                      const label = p.type === "eindpunt" && i === punten.length - 1 ? "🏁" : route.modus === "verspreid" && punten.length >= 3 && i === 0 ? "🏠" : kaartNummer(p);
                      const heeft = vraagPuntIds.has(p.id);
                      return (
                        <button key={p.id} type="button" className={`zp-vraag${heeft ? "" : " zp-vraag--leeg"}`} onClick={() => openVraag(p)}
                          title={heeft ? "Vraag ingevuld: tik om te bewerken" : "Nog geen vraag: tik om hem in te vullen"}>
                          <span className="zp-vraag-nr">{label}</span>
                          <span className="zp-vraag-naam">{p.name || "naamloos punt"}</span>
                          <span aria-hidden>{heeft ? "✓" : "⚠️"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
            {/* 🧩 Puzzelwoord: in één oogopslag aan of uit, en of het aantal letters klopt; tik = instellingen */}
            {(() => {
              const teVerdienen = vraagpunten.reduce((n, p) => n + lettersVoor(route.puzzel_verdeling, p.id), 0);
              const verschil = puzzelLetters - teVerdienen;
              return (
                <button type="button" className={`puzzel-chip${puzzelLetters ? "" : " puzzel-chip--uit"}`}
                  onClick={() => setPuzzelOpen(true)} title="Puzzelwoord instellen">
                  <span aria-hidden>🧩</span>
                  {!route.puzzel_aan ? <span>Puzzelwoord uit</span>
                    : !puzzelLetters ? <span>Puzzelwoord aan, nog geen woord</span>
                    : <>
                        <strong className="puzzel-chip-woord">{normaliseerPuzzel(route.puzzelwoord)}</strong>
                        <span className={`puzzel-chip-stand${verschil === 0 ? " puzzel-chip-stand--goed" : ""}`}>
                          {verschil === 0 ? `✓ ${puzzelLetters} letters` : verschil > 0 ? `⚠️ ${verschil} te kort` : `⚠️ ${-verschil} te veel`}
                        </span>
                      </>}
                </button>
              );
            })()}
                    <div className="form-group">
                      <label className="form-label">❓ Punten per vraag</label>
                      <span className="inst-uitleg">Wat een nieuwe vraag krijgt.</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input className="form-input" type="number" min={0} value={vraagPuntenStd}
                          onChange={(e) => setVraagPuntenStd(Math.max(0, Number(e.target.value)))}
                          onBlur={() => slaPuzzelOp({ vraag_punten: vraagPuntenStd })} style={{ width: 100 }} />
                        <BevestigKnop venster gevaarlijk={false} icoon="❓" titel={`Alle ${vraagpunten.length} vragen op ${vraagPuntenStd} punten zetten?`} vraag=""
                          uitleg="Eigen punten per antwoord blijven staan." ja="Ja, toepassen" disabled={!vraagPuntIds.size}
                          onBevestig={zetAlleVraagPunten} className="rl-knop">Op alle vragen toepassen</BevestigKnop>
                      </div>
                    </div>
                {/* ⚡ Bonusvragen van deze route (ook als hij nog niet actief is); op volgorde van het spel */}
                <div className="form-group">
                  <label className="form-label">⚡ Bonusvragen</label>
                  <BonusLijst routeId={route.id} inEditor />
                </div>

              </div>
            )}

            {/* 👫 Teams: per team het startpunt en de looprichting; ook aan te tikken op de kaart */}
            {actieveTab === "teams" && (
              <div className="zijpaneel-inst">
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

                {teamRoutes.length === 0 ? (
                  <p className="zp-leeg">Zet eerst de punten met <em>Punten</em>. Daarna zie je hier per team waar het begint.</p>
                ) : (
                  <>
                    <span className="inst-uitleg">Tik op een team, of op zijn vlag op de kaart. Elk team begint ergens anders in het rondje.</span>
                    {teamRoutes.map((t) => {
                      const open = uitgelichtTeam === t.teamIndex;
                      const andersom = omgekeerdeTeams.includes(t.teamIndex);
                      return (
                        <div key={t.teamIndex} className={`zp-team${open ? " zp-team--open" : ""}`} style={{ borderColor: open ? t.kleur : undefined }}>
                          <button type="button" className="zp-team-kop" onClick={() => setUitgelichtTeam(open ? null : t.teamIndex)}>
                            <span className="zp-team-vlag" style={{ background: t.kleur }} aria-hidden>T{t.teamIndex}</span>
                            <strong style={{ color: t.kleur }}>Team {t.teamIndex}</strong>
                            <span className="zp-team-info">start {t.nummers[0]} · {andersom ? "↻ andersom" : "→ rechtsom"}</span>
                          </button>
                          <div className="zp-team-knoppen">
                            <button type="button" className={`rl-knop${kiesInstapVoor === t.teamIndex ? " rl-knop--cyan" : ""}`}
                              onClick={() => { setUitgelichtTeam(t.teamIndex); setKiesInstapVoor(kiesInstapVoor === t.teamIndex ? null : t.teamIndex); }}
                              title="Tik daarna op de kaart op het punt waar dit team begint">📍 Ander startpunt</button>
                            <button type="button" className={`rl-knop${andersom ? " rl-knop--cyan" : ""}`} onClick={() => wisselAndersom(t.teamIndex)}
                              title="Dit team loopt het rondje in de andere richting">↻ Andersom lopen</button>
                          </div>
                          {/* 📌 Zelf gekozen startpunt: klein terug naar het berekende */}
                          {t.handmatig && (
                            <button type="button" className="zp-team-auto" onClick={() => zetInstappunt(t.teamIndex, null)} title="Terug naar het berekende startpunt">
                              📌 Zelf gekozen startpunt · <u>Automatisch</u>
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {/* ▶️ Simulatie met alle teams tegelijk, en 🔴 waar ze elkaar tegenkomen */}
                    <TeamSimulatie teams={teamRoutesKaart} vraagIds={vraagPuntIds} onLopers={setSimLopers} onDrukte={setDrukPlekken} />
                  </>
                )}
              </div>
            )}

            {/* 🎉 Spel: hoe het spel verloopt (tussenstand, duel, spelplezier) */}
            {actieveTab === "spel" && (
              <div className="zijpaneel-inst">
                {/* Spelverloop: elke instelling één regel (naam en stand links, ⚙️ en schakelaar rechts), net als Spelplezier */}
                <div className="plezier-groep">
                  <div className="plezier-groep-titel">⏱️ Spelverloop</div>
                  <div className="plezier-lijst">
                    {/* 🏆 Tussenstand: aan = elke 15 minuten (of wat er stond); ⚙️ = hoe vaak en hoe lang */}
                    <div className={`plezier-rij${tussenstandInterval > 0 ? "" : " plezier-rij--uit"}`}>
                      <div className="plezier-tekst">
                        <strong>🏆 Tussenstand</strong>
                        <span className={`plezier-samenvatting${tussenstandInterval > 0 ? "" : " plezier-samenvatting--uitleg"}`}>
                          {tussenstandInterval > 0 ? `elke ${tussenstandInterval} min · ${tussenstandDuur} s in beeld` : "De spelers zien af en toe de stand van alle teams."}
                        </span>
                      </div>
                      <div className="plezier-knoppen">
                        {<button type="button" className="rl-knop plezier-tandwiel" onClick={() => setSpelVenster("tussenstand")} title="Instellingen tussenstand" aria-label="Instellingen tussenstand">⚙️</button>}
                        <button type="button" className={`rl-knop schakel${tussenstandInterval > 0 ? " schakel--aan" : ""}`} role="switch" aria-checked={tussenstandInterval > 0} aria-label="Tussenstand aan of uit"
                          onClick={() => { const m = tussenstandInterval > 0 ? 0 : 15; setTussenstandInterval(m); slaTussenstandIntervalOp(m); }}>
                          {tussenstandInterval > 0 ? "Aan" : "Uit"}<span className="schakel-bol" aria-hidden />
                        </button>
                      </div>
                    </div>

                    {/* 🔀 Antwoorden husselen: voor de hele route, niet per vraag */}
                    <HusselInstelling routeId={route.id} />

                    {/* ⚔️ Duel: twee teams vlak bij elkaar krijgen dezelfde snelle vraag (migratie 006); ⚙️ = punten */}
                    <div className={`plezier-rij${route.duel_aan ? "" : " plezier-rij--uit"}`} title="Komen twee teams binnen 25 meter van elkaar, dan krijgen ze allebei dezelfde snelle vraag. Wie het eerst goed is, pakt punten van de ander.">
                      <div className="plezier-tekst">
                        <strong>⚔️ Duel</strong>
                        <span className={`plezier-samenvatting${route.duel_aan ? "" : " plezier-samenvatting--uitleg"}`}>
                          {route.duel_aan ? `${route.duel_punten ?? 25} pt per duel` : "Twee teams vlak bij elkaar: snelste goede antwoord pakt punten."}
                        </span>
                      </div>
                      <div className="plezier-knoppen">
                        {<button type="button" className="rl-knop plezier-tandwiel" onClick={() => setSpelVenster("duel")} title="Punten per duel" aria-label="Punten per duel">⚙️</button>}
                        <button type="button" className={`rl-knop schakel${route.duel_aan ? " schakel--aan" : ""}`} role="switch" aria-checked={!!route.duel_aan} aria-label="Duel aan of uit"
                          onClick={() => slaDuelOp({ duel_aan: !route.duel_aan })}>
                          {route.duel_aan ? "Aan" : "Uit"}<span className="schakel-bol" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ⚙️ Tussenstand: hoe vaak en hoe lang in beeld */}
                {spelVenster === "tussenstand" && (
                  <VensterMetKop icoon="🏆" label="Spelverloop" titel="Tussenstand" onSluit={() => setSpelVenster(null)} breedte={420}>
                    <span className="inst-uitleg">De spelers zien af en toe vanzelf de stand van alle teams.</span>
                    <div className="inst-rij">
                      <span className="inst-rij-label">Elke</span>
                      <div className="segment" role="radiogroup" aria-label="Hoe vaak">
                        {[10, 15, 20, 30].map((m) => (
                          <button key={m} type="button" role="radio" aria-checked={tussenstandInterval === m} className={tussenstandInterval === m ? "aan" : ""}
                            onClick={() => { setTussenstandInterval(m); slaTussenstandIntervalOp(m); }}>{m} min</button>
                        ))}
                      </div>
                    </div>
                    <div className="inst-rij">
                      <span className="inst-rij-label">In beeld</span>
                      <div className="segment" role="radiogroup" aria-label="Hoe lang in beeld">
                        {[5, 10, 15, 20].map((sec) => (
                          <button key={sec} type="button" role="radio" aria-checked={tussenstandDuur === sec} className={tussenstandDuur === sec ? "aan" : ""}
                            onClick={() => { setTussenstandDuur(sec); slaTussenstandDuurOp(sec); }}>{sec} s</button>
                        ))}
                      </div>
                    </div>
                    {tussenstandInterval > 0 && ![10, 15, 20, 30].includes(tussenstandInterval) && <span className="inst-uitleg">Nu ingesteld: elke {tussenstandInterval} min.</span>}
                    {tussenstandInterval === 0 && <span className="inst-uitleg">Staat uit: kies hierboven hoe vaak om hem aan te zetten.</span>}
                  </VensterMetKop>
                )}
                {/* ⚙️ Duel: punten per duel */}
                {spelVenster === "duel" && (
                  <VensterMetKop icoon="⚔️" label="Spelverloop" titel="Duel" onSluit={() => setSpelVenster(null)} breedte={420}>
                    <span className="inst-uitleg">Komen twee teams binnen 25 meter van elkaar, dan krijgen ze allebei dezelfde snelle vraag. Wie het eerst goed is, pakt deze punten van de ander.</span>
                    <div className="segment" role="radiogroup" aria-label="Punten per duel">
                      {DUEL_PUNTEN_KEUZES.map((p) => (
                        <button key={p} type="button" role="radio" aria-checked={(route.duel_punten ?? 25) === p} className={(route.duel_punten ?? 25) === p ? "aan" : ""}
                          onClick={() => slaDuelOp({ duel_punten: p })}>{p} pt</button>
                      ))}
                    </div>
                  </VensterMetKop>
                )}

                {/* 🎉 Spelplezier: val, reeks, badges, fotobattle, vliegende schat en rad (migratie 007) */}
                <SpelplezierInstellingen waarden={route} onZet={slaPlezierOp} onInstellingen={slaPlezierInstOp} />

                {/* Speltype: vastgezet bij het aanmaken, alleen ter info */}
                <div className="inst-speltype" title={MODUS_INFO[route.modus].omschrijving}>
                  <ModusTegel modus={route.modus} size={20} />
                  <span>Speltype <strong style={{ color: MODUS_INFO[route.modus].kleur }}>{MODUS_INFO[route.modus].label}</strong> (ligt vast)</span>
                </div>

              </div>
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
            <div className="route-editor-backdrop" onClick={() => setMobielTikPositie(null)} onContextMenu={(e) => { e.preventDefault(); setMobielTikPositie(null); }} />
            <div className="route-editor-tik-kiezer">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 700 }}>Hier toevoegen:</span>
                <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => setMobielTikPositie(null)} title="Sluiten" aria-label="Sluiten">✕</button>
              </div>
              {route.modus === "verspreid" && (
                <button className="btn btn-cyan" style={{ width: "100%", fontSize: "0.82rem" }}
                  onClick={() => { setCentrumPunt({ lat: mobielTikPositie.lat, lng: mobielTikPositie.lng }); setMobielTikPositie(null); }}>
                  <Icoon naam="thuis" /> Middelpunt (start en finish)
                </button>
              )}
              <button className="btn btn-primary" style={{ width: "100%", fontSize: "0.82rem" }}
                onClick={() => { voegPuntToeOp(mobielTikPositie.lat, mobielTikPositie.lng); setMobielTikPositie(null); }}>
                <Icoon naam="punt" /> Punt
              </button>
              {route.modus === "sequentieel" ? (
                <button className="btn btn-ghost" style={{ width: "100%", fontSize: "0.82rem" }}
                  onClick={() => { voegSpeciaalItemToeOp(mobielTikPositie.lat, mobielTikPositie.lng, "plekzooi"); setMobielTikPositie(null); }}>
                  <Icoon naam="verboden" /> Plek zooi
                </button>
              ) : (
                <>
                  <span className="tik-kiezer-kop"><Icoon naam="items" /> Item hier:</span>
                  <div className="tik-kiezer-items">
                    {ITEM_SOORTEN.map((t) => (
                      <button key={t} type="button" title={ITEM_UITLEG[t] ?? t}
                        onClick={() => { voegSpeciaalItemToeOp(mobielTikPositie.lat, mobielTikPositie.lng, t); setMobielTikPositie(null); }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/items/${t}.webp`} alt="" /><span>{itemNaam(t)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button className="btn btn-ghost" style={{ width: "100%", fontSize: "0.82rem" }}
                onClick={() => { setTekenGebied([[mobielTikPositie.lat, mobielTikPositie.lng]]); setProef(null); setGeselecteerd(null); setMobielTikPositie(null); }}>
                <Icoon naam="verboden" /> Verboden gebied hier
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
              background: "rgb(var(--o3))", color: "#e8f0ff",
              borderRadius: 18, padding: "16px 18px 20px",
              maxWidth: 560, width: "100%", boxSizing: "border-box", maxHeight: vensterHoogte(90), overflowY: "auto", overflowX: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>⚙️ Instellingen</h2>
                <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => setInstellingenOpen(false)} title="Sluiten" aria-label="Sluiten">✕</button>
              </div>

              {/* inst-inhoud: elke instelling als één regel (naam en korte uitleg links, de keuze rechts) */}
              <div className="inst-inhoud" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Onderwerpen als knoppen */}
                <div className="segment" role="tablist" aria-label="Onderwerp">
                  {([["punten", "📍 Punten"], ["uiterlijk", "🎨 Uiterlijk"]] as [typeof instellingenTab, string][]).map(([t, label]) => (
                    <button key={t} type="button" role="tab" aria-selected={instellingenTab === t} className={instellingenTab === t ? "aan" : ""} onClick={() => setInstellingenTab(t)}>{label}</button>
                  ))}
                </div>
                {/* 9. Eén zin: wat stel je hier in? */}
                <span className="inst-uitleg inst-tab-uitleg">{{
                  punten: "Wat de spelers van de route zien en hoe dichtbij ze bij een punt moeten komen.",
                  uiterlijk: "Hoe de spelersapp eruitziet en klinkt: kleur, logo, welkomstfoto en geluiden.",
                }[instellingenTab]} Spel, items, vragen en teams stel je in met de knoppen in de zijbalk.</span>

                {/* 🎉 Spel, 🎁 Items, ❓ Vragen en 👫 Teams staan in de zijbalk (hoofdknoppen); hier alleen wat zelden verandert */}

                {/* 🎨 Huisstijl en 🔔 geluiden voor de spelers */}
                {instellingenTab === "uiterlijk" && (
                  <HuisstijlInstellingen route={route} onOpslaan={async (velden) => {
                    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(velden) });
                    if (res.ok) setRoute((r) => ({ ...r, ...velden }));
                    return res.ok;
                  }} />
                )}

                {instellingenTab === "punten" && (
                  <>
                    {/* ⛔ Verboden gebieden: overzicht, verwijderen */}
                    <div className="form-group inst-geavanceerd">
                      <label className="form-label">⛔ Verboden gebieden</label>
                      {gebieden.map((g, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                          <span style={{ flex: 1 }}>{g.naam} <span style={{ color: "var(--muted)" }}>· {g.punten.length} hoeken</span></span>
                          <button type="button" className="rl-knop" title="Verwijderen" onClick={() => slaGebiedenOp(gebieden.filter((_, j) => j !== i))}><Icoon naam="wissen" /></button>
                        </div>
                      ))}
                      <button type="button" className="rl-knop" style={{ alignSelf: "flex-start" }}
                        onClick={() => { setInstellingenOpen(false); setTekenGebied([]); setProef(null); setGeselecteerd(null); }}><Icoon naam="plus" /> Gebied tekenen</button>
                      <span className="inst-uitleg">Bijv. een drukke weg of privéterrein. Teams zien het rood op hun kaart en krijgen een waarschuwing als ze erin lopen.</span>
                    </div>
                {/* Op volgorde: wat zien de spelers op de kaart */}
                {route.modus === "sequentieel" && (
                  <div className="form-group">
                    <label className="form-label">🗺️ Wat zien de spelers?</label>
                    <div className="segment" role="radiogroup" aria-label="Wat zien de spelers">
                      {([[false, "📍 Alleen volgend punt"], [true, "🗺️ Hele route"]] as const).map(([waarde, tekst]) => (
                        <button key={tekst} type="button" role="radio" aria-checked={!!route.alle_punten_zichtbaar === waarde}
                          className={!!route.alle_punten_zichtbaar === waarde ? "aan" : ""}
                          onClick={async () => {
                            if (!!route.alle_punten_zichtbaar === waarde) return;
                            const res = await api(`/api/admin/routes/${route.id}`, {
                              method: "PATCH", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ alle_punten_zichtbaar: waarde }),
                            });
                            if (res.ok) setRoute((r) => ({ ...r, alle_punten_zichtbaar: waarde }));
                          }}>{tekst}</button>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {route.alle_punten_zichtbaar ? "Alle punten en de lijn ertussen staan meteen op de kaart; het volgende punt knippert." : "Pas na elk punt verschijnt het volgende."} Per punt kies je ❓ Vraag, ℹ️ Info of 🚶 Door (geen scherm).
                    </span>
                  </div>
                )}

                    {route.modus === "verspreid" && (
                      <div className="form-group inst-geavanceerd">
                        <label className="form-label">🚶 Eerste vraag na</label>
                        <span className="inst-uitleg">Meters lopen vanaf de start (0 = meteen).</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input className="form-input" type="number" min={0} max={500} value={startMeter}
                            onChange={(e) => setStartMeter(Math.max(0, Math.min(500, Number(e.target.value))))}
                            onBlur={() => slaPuzzelOp({ startvraag_meter: startMeter })} style={{ width: 100 }} />
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>meter</span>
                        </div>
                      </div>
                    )}
                    <div className="form-group inst-geavanceerd">
                      <label className="form-label">📏 Radius van de punten (m)</label>
                      <input className="form-input" type="number" min={3} value={puntRadius}
                        onChange={(e) => setPuntRadius(Math.max(3, Number(e.target.value)))}
                        onBlur={() => pasAllePuntenAan({ radius_meters: puntRadius })} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Hoe dichtbij een team moet komen. Geldt voor alle punten.</span>
                    </div>
                    <button type="button" className="es-link" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setMeerInstellingen((m) => !m)} aria-expanded={meerInstellingen}>
                      <UitklapPijl open={meerInstellingen} /> {meerInstellingen ? "Minder instellingen" : <><Icoon naam="instellingen" />{" Meer instellingen"}</>}
                    </button>
                    {meerInstellingen && <div className="form-group inst-geavanceerd">
                      <label className="form-label">🏅 Punten voor een punt zonder vraag</label>
                      <input className="form-input" type="number" min={0} value={puntPunten}
                        onChange={(e) => setPuntPunten(Math.max(0, Number(e.target.value)))}
                        onBlur={() => pasAllePuntenAan({ points: puntPunten })} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Voor punten zonder vraag. Vraagpunten: punten bij de vraag zelf.</span>
                    </div>}
                    {/* ⚠️ Gevaarlijk: niet in de werkbalk, zodat je het niet per ongeluk aantikt */}
                    {!route.is_active && (
                      <div className="inst-gevaarlijk">
                        <div className="huisstijl-naam"><strong>Route leegmaken</strong><span>Alle punten, vragen en items weg; naam en instellingen blijven</span></div>
                        <BevestigKnop venster icoon="🗑️" titel="Route leegmaken?"
                          vraag="" uitleg={punten.length || specialeItems.length
                            ? `Alle ${punten.length} punten (met hun vragen), ${specialeItems.length} items en de gekozen start en finish gaan weg; naam en instellingen blijven. Dit kan niet ongedaan worden gemaakt.`
                            : "Het gekozen startpunt, de finish en de cirkel gaan weg. Daarna begin je weer bij de eerste stap."}
                          ja="Ja, alles weg" onBevestig={() => { setInstellingenOpen(false); return maakRouteLeeg(); }} disabled={!punten.length && !specialeItems.length && !centrumPunt && !finishPunt && !finishZelfde}
                          className="rl-knop rl-knop--rood">
                          <Icoon naam="wissen" /> Leegmaken
                        </BevestigKnop>
                      </div>
                    )}
                  </>
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

        {/* 🧭 Rondleiding voor wie de editor voor het eerst opent */}
        {rondleidingOpen && !stappenOpen && <EditorRondleiding verspreid={route.modus === "verspreid"} onSluit={sluitRondleiding} />}

        {/* Klaar om te spelen? */}
        {controleOpen && (
          <ControleVenster controle={controle} status={route.status} actief={route.is_active}
            onSluit={() => setControleOpen(false)} onActiveer={() => activeerRoute()} onKlaarzetten={() => zetStatus("gepubliceerd")} />
        )}

        {/* ⚠️ Activeren terwijl er op een andere route nog gespeeld wordt */}
        {lopendElders && (
          <VensterMetKop icoon="⚠️" label="Route activeren" titel="Er wordt nog gespeeld" breedte={420} onSluit={() => setLopendElders(null)}>
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text)" }}>
              Op <strong>{lopendElders.route}</strong> {lopendElders.aantal === 1 ? "is nog 1 team" : `zijn nog ${lopendElders.aantal} teams`} aan het spelen.
              Activeer je deze route, dan stopt hun spel.
            </p>
            <button type="button" className="rl-knop rl-knop--rood actie-knop" onClick={() => activeerRoute(true)}><Icoon naam="start" /> Toch starten</button>
          </VensterMetKop>
        )}

        {/* 🚶 Verkennen: GPS-plek, nauwkeurigheid en één grote knop */}
        {verken && (
          <div className="proefloop verken" role="status">
            <div className="proefloop-kop">
              <span className="proefloop-titel">🚶 Verkennen</span>
              {verken.pos && <span className={`proefloop-km${verken.pos.nauwkeurig > 25 ? " verken-onnauwkeurig" : ""}`}>± {Math.round(verken.pos.nauwkeurig)} m</span>}
              <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => setVerken(null)} title="Stoppen" aria-label="Stoppen">✕</button>
            </div>
            <div className="proefloop-nu">
              {verken.fout ? verken.fout
                : !verken.pos ? "📡 Locatie zoeken… sta even stil."
                : verken.pos.nauwkeurig > 25 ? "📡 Locatie nog onnauwkeurig: wacht even of ga in de open lucht staan."
                : "Sta op de plek van het punt en tik op de knop. Daarna maak je de foto en typ je de vraag."}
            </div>
            <button type="button" className="rl-knop rl-knop--cyan verken-knop" disabled={!verken.pos || verkenBezig} onClick={puntOpMijnPlek}>
              {verkenBezig ? <><Icoon naam="laden" />{" Bezig…"}</> : <><Icoon naam="punt" />{" Punt op mijn plek"}</>}
            </button>
          </div>
        )}

        {/* ⛔ Verboden gebied tekenen */}
        {tekenGebied && (
          <div className="proefloop" role="status" style={{ borderColor: "rgba(220,38,38,0.7)" }}>
            <div className="proefloop-kop">
              <span className="proefloop-titel">⛔ Verboden gebied</span>
              <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => { setTekenGebied(null); setGebiedNaam(""); }} title="Stoppen" aria-label="Stoppen">✕</button>
            </div>
            <div className="proefloop-nu">{tekenGebied.length < 3 ? `👆 Tik de hoeken aan op de kaart (nog ${3 - tekenGebied.length} of meer).` : `${tekenGebied.length} hoeken. Tik er meer aan, of sla op.`}</div>
            <input className="form-input" value={gebiedNaam} onChange={(e) => setGebiedNaam(e.target.value)} placeholder="Naam, bijv. Drukke weg" maxLength={40} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="rl-knop" disabled={!tekenGebied.length} onClick={() => setTekenGebied((t) => t && t.slice(0, -1))}><Icoon naam="terug" /> Laatste hoek</button>
              <button type="button" className="rl-knop hoofdknop" style={{ flex: 1, justifyContent: "center" }} disabled={tekenGebied.length < 3} onClick={gebiedKlaar}><Icoon naam="klaar" /> Opslaan</button>
            </div>
          </div>
        )}

        {/* Proeflopen: wat er gebeurt terwijl je over de kaart klikt */}
        {proef && (() => {
          const volgende = punten[proef.volgende];
          const afstand = proef.pos && volgende ? haversine(proef.pos.lat, proef.pos.lng, volgende.latitude, volgende.longitude) : null;
          return (
            <div className="proefloop" role="status">
              <div className="proefloop-kop">
                <span className="proefloop-titel">🧪 Testen · 🚶 lopen</span>
                <span className="proefloop-km">{(proef.gelopenM / 1000).toFixed(2).replace(".", ",")} km</span>
                <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => setProef(null)} title="Stoppen" aria-label="Stoppen">✕</button>
              </div>
              <div className="proefloop-nu">
                {proefBezig ? "📱 Beantwoord eerst de vraag in de telefoon."
                  : !proef.pos ? "👆 Klik op de kaart waar je begint, en dan steeds waar je heen loopt."
                  : proef.klaar ? "🏁 Klaar: de hele route is gelopen."
                  : volgende ? <>Volgende: <strong>{volgende.name}</strong>{afstand !== null && <> · {afstand < 1000 ? `${Math.round(afstand)} m` : `${(afstand / 1000).toFixed(1).replace(".", ",")} km`}</>}</> : null}
              </div>
              {proef.log.length > 0 && (
                <div className="proefloop-log">
                  {proef.log.slice(0, 6).map((r, i) => <div key={`${proef.log.length - i}`} className={`proefloop-regel proefloop-regel--${r.soort}`}>{r.tekst}</div>)}
                </div>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {proef.pos && <button type="button" className="es-link" onClick={() => { setProef(NIEUWE_PROEF); setProefBezig(false); }}>↺ Opnieuw beginnen</button>}
                <button type="button" className="es-link" onClick={() => { setProef(null); setTestOpen(true); }}><Icoon naam="klembord" /> Vragen punt voor punt</button>
              </div>
            </div>
          );
        })()}

        {/* 🧪 Testen als speler: de telefoon met het echte spelersscherm */}
        {proef && (
          <SpelerProef route={route} punten={punten} items={specialeItems} proef={proef} vraagIds={vraagPuntIds} onBezig={setProefBezig} />
        )}

        {/* Testronde */}
        {testOpen && (
          <TestRonde routeId={route.id} punten={punten} items={specialeItems} verspreid={route.modus === "verspreid"}
            onLopen={() => { setTestOpen(false); setProef(NIEUWE_PROEF); }}
            onGaNaar={(lat, lng) => setVliegNaar({ lat, lng, zoom: 18 })} onSluit={() => setTestOpen(false)} />
        )}

        {/* Alle vragen achter elkaar */}
        {alleVragenOpen && (
          <AlleVragenVenster routeId={route.id} punten={alleVragenPunten} kaartPunten={kaartPunten} nummer={kaartNummer} puzzel={puzzelKoppeling} standaardPunten={route.vraag_punten ?? 65}
            heeftVraag={(id) => vraagPuntIds.has(id)} onBijgewerkt={vraagBijgewerkt} onNaamGewijzigd={puntNaamGewijzigd}
            onSluit={() => setAlleVragenOpen(false)} />
        )}

        {/* Vraag bewerken als venster over de hele editor */}
        {vraagVenster && (
          <div data-vraagvenster style={{ position: "fixed", inset: 0, zIndex: 2000, background: "var(--bg)", display: "flex", flexDirection: "column" }}>
            <VraagEditorPagina routeId={route.id} punt={vraagVenster.punt} bestaandeVraag={vraagVenster.vraag} kaartPunten={kaartPunten} onNaamGewijzigd={puntNaamGewijzigd} puzzel={puzzelKoppeling} standaardPunten={route.vraag_punten ?? 65}
              onSluit={(vraag) => {
                if (vraag !== undefined) vraagBijgewerkt(vraagVenster.punt.id, vraag);
                setVraagVenster(null);
              }} />
          </div>
        )}

        {/* 🧪 Testen: één venster met de manieren van testen */}
        {testKeuze && (
          <VensterMetKop icoon="🧪" label="Testen" titel="Hoe wil je testen?" onSluit={() => setTestKeuze(false)} breedte={440}>
            <button type="button" className="test-keuze" onClick={() => { setTestKeuze(false); setTestOpen(false); setProef(NIEUWE_PROEF); }}>
              <Icoon naam="lopen" /><span><strong>Lopen als team</strong><span>Klik over de kaart en loop mee: punten, vragen, items en vallen gaan af zoals op straat</span></span>
            </button>
            <button type="button" className="test-keuze" disabled={!vraagpunten.length} onClick={() => { setTestKeuze(false); setProef(null); setTestOpen(true); }}>
              <Icoon naam="klembord" /><span><strong>Alle vragen doorlopen</strong><span>Punt voor punt, zonder te lopen: de kaart vliegt mee, je ziet elke vraag zoals de speler</span></span>
            </button>
            <span className="inst-uitleg">Een punt op straat openen zonder erheen te lopen: zet in de vraag-editor (⚙️ Meer instellingen) <em>Openen met QR-code</em> aan en print de code.</span>
          </VensterMetKop>
        )}

        {/* 🧲 Op de weg: kies punten en/of items; en of nieuwe items vanzelf op de weg komen */}
        {opWegVenster && (
          <VensterMetKop icoon="🧲" label="Gereedschap" titel="Op de weg leggen" onSluit={() => setOpWegVenster(false)} breedte={420}>
            <span className="inst-uitleg">Alles schuift naar de dichtstbijzijnde weg, stoep of het voetpad. Wat er al op ligt, blijft staan; items op een speelplaats of schoolplein ook.</span>
            <div className="opweg-keuzes">
              <button type="button" role="checkbox" aria-checked={opWegKeuze.punten} disabled={!punten.length}
                className={`opweg-keuze${opWegKeuze.punten && punten.length ? " opweg-keuze--aan" : ""}`} onClick={() => setOpWegKeuze((k) => ({ ...k, punten: !k.punten }))}>
                <span className="opweg-vink" aria-hidden>{opWegKeuze.punten && punten.length ? "✓" : ""}</span>
                <Icoon naam="punt" /> Punten <span className="opweg-aantal">{punten.length}</span>
              </button>
              <button type="button" role="checkbox" aria-checked={opWegKeuze.items} disabled={!specialeItems.length}
                className={`opweg-keuze${opWegKeuze.items && specialeItems.length ? " opweg-keuze--aan" : ""}`} onClick={() => setOpWegKeuze((k) => ({ ...k, items: !k.items }))}>
                <span className="opweg-vink" aria-hidden>{opWegKeuze.items && specialeItems.length ? "✓" : ""}</span>
                <Icoon naam="items" /> Items <span className="opweg-aantal">{specialeItems.length}</span>
              </button>
            </div>
            {route.modus === "verspreid" && opWegKeuze.punten && <span className="inst-uitleg">Start en finish blijven staan. Punten terugzetten kan met ↶ Ongedaan.</span>}
            <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 42, justifyContent: "center", fontWeight: 800 }}
              disabled={!(opWegKeuze.punten && punten.length) && !(opWegKeuze.items && specialeItems.length)} onClick={legOpDeWeg}>
              <Icoon naam="magneet" /> Op de weg leggen
            </button>
            <div className="opweg-instelling">
              <div className="huisstijl-naam"><strong>Nieuwe items vanzelf op de weg</strong><span>Uit: een item blijft precies waar je het neerlegt, bijv. op een speelplaats</span></div>
              <button type="button" className={`rl-knop schakel${itemsOpWeg ? " schakel--aan" : ""}`} role="switch" aria-checked={itemsOpWeg} onClick={wisselItemsOpWeg}
                aria-label="Nieuwe items vanzelf op de weg" style={{ height: 32 }}>{itemsOpWeg ? "Aan" : "Uit"}<span className="schakel-bol" aria-hidden /></button>
            </div>
          </VensterMetKop>
        )}

        {/* 🧩 Puzzelwoord: aan/uit, woord, bedenken, letters verdelen en per vraag, zonder het hele instellingenvenster */}
        {puzzelOpen && (
          <VensterMetKop icoon="🧩" label="Route-instelling" titel="Puzzelwoord" onSluit={() => setPuzzelOpen(false)} breedte={560} maxHoogte={92}>
            <PuzzelInstellingen route={route} vraagpunten={vraagpunten.map((p) => ({ id: p.id, name: p.name }))} onOpslaan={slaPuzzelOp} />
          </VensterMetKop>
        )}

        {/* Startpunt voor een team kiezen */}
        {kiesInstapVoor !== null && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 600,
            display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 12px", borderRadius: 12,
            background: "rgba(var(--o3),0.95)", border: `1px solid ${TEAM_KLEUREN[(kiesInstapVoor - 1) % TEAM_KLEUREN.length]}`, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            fontSize: "0.8rem", color: "var(--text)", whiteSpace: "nowrap",
          }}>
            📍 Klik op het punt waar Team {kiesInstapVoor} begint · Esc = stoppen
            <button type="button" className="editor-paneel-sluit" style={{ marginLeft: 0 }} onClick={() => setKiesInstapVoor(null)} title="Stoppen">✕</button>
          </div>
        )}

        {/* Snel plaatsen actief */}
        {plaatsType && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 600,
            display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 12px", borderRadius: 12,
            background: "rgba(var(--o3),0.95)", border: "1px solid var(--cyan)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            fontSize: "0.8rem", color: "var(--text)", whiteSpace: "nowrap",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/items/${plaatsType}.webp`} alt="" style={{ width: 22, height: 22 }} />
            Klik op de kaart om te plaatsen · Esc = stoppen
            <button type="button" className="editor-paneel-sluit" style={{ marginLeft: 0 }} onClick={() => setPlaatsType(null)} title="Stoppen">✕</button>
          </div>
        )}

        {/* Net verwijderd: een paar seconden terug te halen */}
        {herstelToast && stappen.length > 0 && (
          <div style={{
            position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 600,
            display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 8px 14px", borderRadius: 12,
            background: "rgba(var(--o3),0.95)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            fontSize: "0.8rem", color: "var(--text)", whiteSpace: "nowrap",
          }}>
            🗑️ {herstelToast.charAt(0).toUpperCase() + herstelToast.slice(1)}
            <button type="button" className="rl-knop rl-knop--cyan" onClick={maakOngedaan} disabled={bezigMetHerstel}
              style={{ height: 30, fontSize: "0.78rem" }}>
              {bezigMetHerstel ? "Bezig…" : <><Icoon naam="terug" />{" Ongedaan maken"}</>}
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
              background: "rgba(var(--o3),0.92)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              border: `1px solid ${t.kleur}`, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, fontSize: "0.78rem", color: "var(--text)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: t.kleur, flexShrink: 0 }} />
                <span style={{ color: t.kleur, fontWeight: 800, fontSize: "0.9rem" }}>Team {t.teamIndex}</span>
                <button type="button" className="editor-paneel-sluit" onClick={() => setUitgelichtTeam(null)} title="Sluiten">✕</button>
              </div>
              <div style={{ color: "var(--muted)" }}>
                Start bij punt {t.nummers[0]} {t.handmatig ? "📌 zelf gekozen" : "(automatisch)"} · {t.nummers.length} punten{andersom ? " · ↺ andersom" : ""}
              </div>
              <div style={{ color: "var(--muted)" }}>Aanloop vanaf de start: <strong style={{ color: "var(--text)" }}>{teamAanloopM[teamRoutes.indexOf(t)] ?? 0} m</strong>{wegen.compleet ? "" : " (hemelsbreed)"}</div>
              <div style={{ lineHeight: 1.6 }}>🏠 → {t.nummers.join(" → ")} → 🏁</div>
              <button type="button" onClick={() => wisselAndersom(t.teamIndex)}
                className={`rl-knop${andersom ? " rl-knop--cyan" : ""}`}
                style={{ display: "flex", height: 28, fontSize: "0.72rem" }}
                title="Dit team loopt het rondje in tegengestelde richting, vanaf hetzelfde instappunt">
                ↻ Andersom lopen: {andersom ? "aan" : "uit"}
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setKiesInstapVoor(kiesInstapVoor === t.teamIndex ? null : t.teamIndex)}
                  className={`rl-knop${kiesInstapVoor === t.teamIndex ? " rl-knop--cyan" : ""}`}
                  style={{ flex: 1, height: 28, fontSize: "0.72rem" }}
                  title="Klik daarna op de kaart op het punt waar dit team het rondje begint">
                  📍 Ander startpunt
                </button>
                {t.handmatig && (
                  <button type="button" onClick={() => zetInstappunt(t.teamIndex, null)} className="rl-knop"
                    style={{ height: 28, fontSize: "0.72rem" }} title="Terug naar het berekende startpunt">
                    Automatisch
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Kaart */}
        <LeafletKaart
          lagenKnoppen={
            <div className="kaart-lagen" onClick={(e) => e.stopPropagation()}>
              {route.modus === "verspreid" && teamRoutes.length > 0 && (
                <button type="button" className={lagen.routes ? "aan" : ""} onClick={() => wisselLaag("routes")} aria-pressed={lagen.routes} title="Routes van de teams tonen of verbergen"><Icoon naam="kompas" /><span className="laag-tekst"> Routes</span></button>
              )}
              <button type="button" className={lagen.items ? "aan" : ""} onClick={() => wisselLaag("items")} aria-pressed={lagen.items} title="Items tonen of verbergen"><Icoon naam="items" /><span className="laag-tekst"> Items</span></button>
              {route.modus === "verspreid" && (
                <>
                  <button type="button" className={lagen.voorstellen ? "aan" : ""} onClick={() => wisselLaag("voorstellen")} aria-pressed={lagen.voorstellen} title="Voorgestelde itemplekken tonen of verbergen"><Icoon naam="nieuw" /><span className="laag-tekst"> Voorstellen</span></button>
                  <button type="button" className={lagen.cirkel ? "aan" : ""} onClick={() => wisselLaag("cirkel")} aria-pressed={lagen.cirkel} title="Afstandscirkel tonen of verbergen"><Icoon naam="rondje" /><span className="laag-tekst"> Cirkel</span></button>
                </>
              )}
            </div>
          }
          punten={punten}
          zonderVraag={zonderVraag}
          addModus={addModus || centrumModus || !!plaatsType}
          geselecteerdId={geselecteerd?.id ?? null}
          specialeItems={lagen.items ? specialeItems : []}
          guideCirkel={
            lagen.cirkel && route.modus === "verspreid" && doelAfstandKm > 0 && geselecteerd && punten.length > 0
              ? { lat: geselecteerd.latitude, lng: geselecteerd.longitude, radiusM: doelAfstandKm * 1000 / punten.length }
              : null
          }
          hubModus={route.modus === "verspreid" && punten.length >= 3}
          teamRoutes={lagen.routes || actieveTab === "teams" ? teamRoutesKaart : []}
          teamVlaggen={actieveTab === "teams"}
          onTeamKlik={(team) => { setActieveTab("teams"); setUitgelichtTeam(team); setMobielPaneelOpen(true); }}
          onRechtsKlik={kaartRechtsKlik}
          hoofdStukken={hoofdStukken}
          centrumPunt={route.modus === "verspreid" ? centrumPunt : null}
          finishPunt={route.modus === "verspreid" && punten.length === 0 ? (finishPunt ?? (finishZelfde ? centrumPunt : null)) : null}
          ghostPunten={lagen.cirkel ? ghostPunten : []}
          ghostRadiusM={lagen.cirkel && doelAfstandKm > 0 ? (doelAfstandKm * 1000) / (2 * Math.PI) : 0}
          onCentrumVerplaatst={(lat, lng) => setCentrumPunt({ lat, lng })}
          onKlik={kaartKlik}
          onMarkerVerplaatst={markerVerplaatst}
          onMarkerKlik={(id) => {
            if (kiesInstapVoor !== null) {
              // Alleen punten in het rondje (niet de start of de finish)
              const i = punten.findIndex((p) => p.id === id);
              if (i > 0 && i < punten.length - 1) zetInstappunt(kiesInstapVoor, id);
              else toonMelding("Kies een punt in het rondje, niet de start of de finish.", "info");
              return;
            }
            setGeselecteerd(punten.find((p) => p.id === id) ?? null);
          }}
          onSpeciaalItemVerplaatst={specialItemVerplaatst}
          onSpeciaalItemKlik={(id) => { setGeselecteerdSpeciaal(specialeItems.find((i) => i.id === id) ?? null); setGeselecteerd(null); }}
          geselecteerdSpeciaalId={geselecteerdSpeciaal?.id ?? null}
          vliegNaar={vliegNaar}
          loper={proef?.pos ?? (verken?.pos ? { lat: verken.pos.lat, lng: verken.pos.lng } : null)} loperSpoor={proef?.spoor ?? []}
          verbodenGebieden={gebieden} tekenGebied={tekenGebied}
          pasIn={pasIn}
          itemVoorstellen={lagen.voorstellen && itemCheck ? itemCheck.voorstellen : []}
          meldingPlekken={ondergrondPlekken}
          simLopers={simLopers} drukPlekken={drukPlekken}
          uitgelichtTeam={uitgelichtTeam}
          onItemVoorstelKlik={(v) => voegSpeciaalItemToeOp(v.lat, v.lng, v.type)}
        />

        {stappenOpen ? (
          <EersteStappen
            modus={route.modus}
            stap={stappenStap} onStap={setStappenStap}
            onSluit={() => { setStappenOpen(false); setWizardKies(null); }}
            zoekterm={plaatsZoekterm} onZoekterm={setPlaatsZoekterm} onZoek={zoekPlaats} zoekBezig={plaatsBezig} zoekFout={plaatsFout}
            kies={wizardKies} onKies={setWizardKies}
            startGekozen={!!centrumPunt} finishGekozen={!!finishPunt} finishZelfde={finishZelfde}
            onFinishZelfde={() => { setFinishPunt(null); setFinishZelfde(true); setWizardKies(null); }}
            teams={verwachtTeams} onTeams={setVerwachtTeams}
            km={doelAfstandKm} onKm={setDoelAfstandKm}
            aantal={aantalPunten} onAantal={(n) => { setAantalHandmatig(true); setAantalPunten(n); }}
            onBewaarInstellingen={() => slaVerspreideInstellingenOp(verwachtTeams, doelAfstandKm)}
            onMaakPunten={async () => { setMaakBezig(true); try { return await genereerPuntenInCirkel(); } finally { setMaakBezig(false); } }}
            maakBezig={maakBezig}
            onAnderVoorbeeld={() => setCirkelDraai((d) => (d + 15) % 360)}
            aantalPunten={punten.length}
            heeftFinish={punten[punten.length - 1]?.type === "eindpunt"}
            itemAantal={itemCheck?.voorstellen.length ?? 0} onItemAantal={(n) => setItemDoel(n)} aantalItems={specialeItems.length}
            onItems={plaatsAlleVoorstellen} itemsBezig={autoItemsBezig}
            vraagpunten={alleVragenPunten.length} metVraag={alleVragenPunten.filter((p) => vraagPuntIds.has(p.id)).length}
            onVragen={() => setAlleVragenOpen(true)}
            onControleren={() => { setStappenOpen(false); setControleOpen(true); }}
          />
        ) : !route.is_active && route.status !== "gepubliceerd" && punten.length === 0 && specialeItems.length === 0 && (
          <button type="button" className="eerste-stappen-knop" onClick={() => { setStappenStap(0); setStappenOpen(true); }} title="Stap voor stap de route opzetten"><Icoon naam="starten" /> Eerste stappen</button>
        )}


        {/* Afstand en tijd per team: klein, inklapbaar paneel op de kaart */}
        {route.modus === "verspreid" && teamSchattingen.length > 0 && (
          <div className="route-editor-tijden">
            <button className="route-editor-tijden-kop" onClick={() => setTijdenOpen((v) => !v)} aria-expanded={tijdenOpen}>
              <UitklapPijl open={tijdenOpen} /> <Icoon naam="tijd" /> Afstand, tijd &amp; punten per team
            </button>
            {tijdenOpen && (
              <>
                {teamSchattingen.map((s) => (
                  <div key={s.teamIndex} className="route-editor-tijden-rij"
                    // Klik = de looproute van dit team op de kaart (nogmaals klikken = weer alle teams)
                    onClick={() => setUitgelichtTeam(uitgelichtTeam === s.teamIndex ? null : s.teamIndex)}
                    style={{ cursor: "pointer", borderRadius: 6, background: uitgelichtTeam === s.teamIndex ? "rgba(255,255,255,0.1)" : undefined }}
                    title={`Klik om de route van Team ${s.teamIndex} te zien
Tijd: lopen ≈ ${duurKort(s.lopenMin)} · vragen ≈ ${duurKort(s.vragenMin)} · items ≈ ${duurKort(s.itemsMin)}
Punten: vragen ≈ ${s.punten.vragen} (max ${s.punten.maxVragen}, bij ~70% goed) · items ≈ ${s.punten.items >= 0 ? "+" : ""}${s.punten.items}`}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: s.kleur, flexShrink: 0 }} />
                    <span style={{ color: s.kleur, fontWeight: 700 }}>Team {s.teamIndex}</span>
                    <span style={{ marginLeft: "auto" }}>{(s.afstandM / 1000).toFixed(2).replace(".", ",")} km</span>
                    <span style={{ fontWeight: 700, minWidth: 54, textAlign: "right" }}>≈ {duurKort(s.totaalMin)}</span>
                    <span style={{ fontWeight: 700, minWidth: 50, textAlign: "right", color: "#FFE680" }}>≈ {s.punten.totaal} pt</span>
                  </div>
                ))}
                {teamSchattingen.length > 0 && (
                  <div className="route-editor-tijden-voet">4,5 km/u · 2 min/vraag · 70% goed · items meegerekend</div>
                )}
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
                key={geselecteerd.id}
                punt={geselecteerd}
                onBewaarBijSluiten={bewaarPuntBijSluiten}
                onVraag={() => openVraag(geselecteerd)}
                opslaan={opslaan}
                fout={fout}
                heeftVraag={vraagPuntIds.has(geselecteerd.id)}
                naamWoorden={naamVoorstellen.get(geselecteerd.id) ?? []}
                onOpslaan={slaPuntOp}
                onVerwijder={() => verwijderPunt(geselecteerd.id)}
                onSluit={() => setGeselecteerd(null)}
                info={{
                  vraagTekst: (geselecteerd as RoutePunt & { questions?: { question_text?: string | null }[] }).questions?.[0]?.question_text ?? null,
                  teams: teamRoutes.filter((t) => t.punten[1]?.id === geselecteerd.id).map((t) => ({ naam: `Team ${t.teamIndex}`, kleur: t.kleur })),
                  items: specialeItems.filter((it) => haversine(it.latitude, it.longitude, geselecteerd.latitude, geselecteerd.longitude) <= 40).map((it) => it.type),
                }}
                onOpDeWeg={() => puntOpDeWeg(geselecteerd)}
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
