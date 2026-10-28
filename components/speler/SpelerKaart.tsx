"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { haversine, richting, afstandTekst, binnenVlak } from "@/lib/geo";
import { createClient } from "@/lib/supabase-browser";
import { speelPuntBereikt, speelFinish, speelDong } from "@/lib/sounds";
import { tril, TRIL } from "@/lib/tril";
import { useSchermAan } from "@/lib/scherm-aan";
import { stuur, verstuurWachtrij, opWachtrij, wachtrijAantal, zetWachtrijSessie, leesMislukt, opMislukt, wisMislukt, type MislukteOpdracht } from "@/lib/wachtrij";
import { laadVragenVooruit, wisVraagCache } from "@/lib/vraag-cache";
import EindtijdTeller from "@/components/speler/EindtijdTeller";
import VraagPopup from "./VraagPopup";
import SpeciaalItemPopup from "./SpeciaalItemPopup";
import SpeciaalItemLegende, { ITEM_INFO, SPELUITLEG, START_AFSLUITING, type RouteWaarden } from "./SpeciaalItemLegende";
import { VRIJGAVE_BERICHT } from "@/lib/vrijgave";
import { puzzelUitleg } from "@/lib/puzzel";
import { vraagKompas } from "@/lib/kompas";

// Na het welkomstscherm op het startpunt: zoveel meter lopen voordat de startvraag komt
const STARTVRAAG_NA_METER = 25;
// Startitems van de organisatie komen pas als het team zoveel meter heeft gelopen
const STARTITEMS_NA_METER = 100;
import InventarisBar from "./InventarisBar";
import PuzzelWoord from "./PuzzelWoord";
import TussenstandPopup from "./TussenstandPopup";
import type { SpelerLocatie, LeaderboardEntry } from "@/lib/types";
import type { RoutePunt, SpelerSessie, SpelerPuntVoortgang, SpeciaalItem } from "@/types/database";
import { bewaarKaartGebied } from "@/lib/kaart-offline";

const SpelerLeaflet = dynamic(() => import("./SpelerLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="laad-blokje kaart-laden" role="status" aria-label="Kaart laden">🗺️</div>
  ),
});

interface Props {
  sessie: SpelerSessie;
  // Het gekozen teamicoon: zo staat de speler zelf op de kaart
  spelerIcoon?: string | null;
  // Teamnaam: staat onder het eigen icoon op de kaart
  spelerNaam?: string | null;
  punten: RoutePunt[];
  initVoortgang: SpelerPuntVoortgang[];
  modus: "sequentieel" | "verspreid";
  waarden: RouteWaarden;
  // 🚶 Zoveel meter lopen na het welkomstscherm voor de eerste vraag (route-instelling, migratie 026)
  startVraagMeter?: number;
  // 🎒 Na hoeveel meter lopen de startitems komen (0 = meteen)
  startitemsNaMeter?: number;
  // Itemtypen die in deze route voorkomen (kaart + startitems): alleen die staan in de uitleg (ℹ️)
  itemTypen?: string[];
  // Punten zonder tekst, foto of vraag: tellen vanzelf als gepasseerd, zonder venster
  stilleIds?: string[];
  // Op volgorde: alle punten en de lijn ertussen meteen op de kaart
  heleRoute?: boolean;
  // ⛔ Verboden gebieden: rood op de kaart, waarschuwing als het team erin loopt
  verbodenGebieden?: { naam: string; punten: [number, number][] }[];
  // 🌈 Vaste teamkleur: rand onder de puntenbalk en ring om je eigen icoon op de kaart
  teamKleur?: string | null;
  // 🧩 Puzzelwoord van de route (punten), of null: dan geen uitleg erover bij de start
  puzzel?: { letterPunten: number; alleBonus: number; raadBonus: number } | null;
}

type GpsStatus = "laden" | "ok" | "zwak" | "weg";

const GPS_TIMEOUT_MS = 12000;

// Het emoji waarmee een aanvalsmelding begint → item-icoon in /items
const MELDING_ITEM_TYPE: Record<string, string> = {
  "👻": "spook", "💣": "bom", "🔄": "wissel", "🦹": "dief", "🍌": "banaan", "❓": "vraagteken",
};
// Bericht van ± Punten (app/api/admin/sessies/[id]/punten): "+10 punten · reden" → aantal en reden apart
const PUNTEN_BERICHT = /^([+-]\d+) punten(?: · ([\s\S]+))?$/;
const SLECHTE_NAUWKEURIGHEID_M = 30;
const LOCATIE_PUBLICEER_INTERVAL_MS = 15000;
// Voor de "gelopen route" na de finish: ook tussendoor opslaan zodra de speler een stukje verder is
const SPOOR_STAP_M = 10;
const SPOOR_MIN_INTERVAL_MS = 4000;
// Ver van elk open punt: grover spoor (scheelt batterij en data); dichtbij weer fijn
const VER_AF_M = 300;
const SPOOR_STAP_VER_M = 25;
const SPOOR_INTERVAL_VER_MS = 10000;
// Stilstaan: toch af en toe een plek sturen, zodat de spelleider ziet dat de telefoon er nog is
const LEVENSTEKEN_MS = 60000;
// Score, items, aanvallen, berichten en tussenstand: samen in één verzoek, zo vaak
const STATUS_POLL_MS = 4000;

// Antwoorden van de server zoals de app ze verwerkt (ongetypeerde JSON, net als bij de losse verzoeken)
type EffectenData = any;
type TussenstandData = any;
type BerichtenData = { berichten: { id: string; bericht: string }[] };


// Getal in de statistiekhokjes zo groot mogelijk; bij meer cijfers iets kleiner zodat het past
function hudGetalGrootte(tekst: string): string {
  if (tekst.length <= 4) return "1.85rem";
  if (tekst.length === 5) return "1.6rem";
  return "1.35rem";
}

export default function SpelerKaart({ sessie, punten, initVoortgang, modus, waarden, spelerIcoon = null, spelerNaam = null, stilleIds = [], heleRoute = false, verbodenGebieden = [], teamKleur = null, puzzel = null, startVraagMeter = STARTVRAAG_NA_METER, startitemsNaMeter = STARTITEMS_NA_METER, itemTypen }: Props) {
  const router = useRouter();
  const effectGezienKey = `pointrush_effect_gezien_${sessie.id}`;
  const [voortgang, setVoortgang] = useState<SpelerPuntVoortgang[]>(initVoortgang);
  const [positie, setPositie] = useState<GeolocationCoordinates | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("laden");
  const [popupPunt, setPopupPunt] = useState<RoutePunt | null>(null);
  // Startvraag: afgelegde meters op het moment dat het team "Op pad!" tikte (null = niet aan het wachten)
  const [startVraagVanaf, setStartVraagVanaf] = useState<number | null>(null);
  // Afstand tot het eerste punt na de start op het moment dat het team begon te lopen
  const [startVraagAfstand, setStartVraagAfstand] = useState<number | null>(null);
  const [startVraagKlaar, setStartVraagKlaar] = useState(false);
  const [andereSpelers, setAndereSpelers] = useState<SpelerLocatie[]>([]);
  // Items waarmee je een al gefinisht team nog mag raken (instelling van de beheerder)
  const [doelNaFinish, setDoelNaFinish] = useState<string[]>([]);
  const [realtimeVerbonden, setRealtimeVerbonden] = useState(true);

  // Gelopen meters van dit spel: na herladen verder tellen vanaf wat al op de server staat
  // (anders begon de teller opnieuw bij 0 en overschreef hij de opgeslagen afstand)
  const [kmAfgelegd, setKmAfgelegd] = useState(() => Math.max(0, Number(sessie.afstand_m) || 0));
  // Startitems: gelopen meters per sessie bewaren (ook na herladen), daarna één keer ophalen
  const startitemsKey = `pr_startitems_${sessie.id}`;
  // Punt vrijgegeven door de organisatie: na het herladen eerst een melding, dan de vraag
  const vrijgegevenKey = `pointrush_vrijgegeven_${sessie.id}`;
  const [vrijgegevenMelding, setVrijgegevenMelding] = useState<"organisatie" | "hulp" | null>(null);
  useEffect(() => {
    try {
      const soort = localStorage.getItem(vrijgegevenKey);
      if (soort === "organisatie" || soort === "hulp") setVrijgegevenMelding(soort);
      localStorage.removeItem(vrijgegevenKey);
    } catch { /* geen opslag */ }
  }, [vrijgegevenKey]);
  function onthoudVrijgegeven(soort: "organisatie" | "hulp") {
    try { localStorage.setItem(vrijgegevenKey, soort); } catch { /* geen opslag */ }
  }
  const gelopenBasisRef = useRef<number | null>(null);
  const startitemsBezigRef = useRef(false);
  const [startitemsScherm, setStartitemsScherm] = useState<string[] | null>(null);

  const [specialeItems, setSpecialeItems] = useState<SpeciaalItem[]>([]);
  const [inventaris, setInventaris] = useState<SpeciaalItem[]>([]);
  // Nieuwe soort item in de balk? Dan één keer uitleggen wat het doet
  useEffect(() => {
    const sleutel = `pr_items_uitgelegd_${sessie.id}`;
    let gezien: string[] = [];
    try { gezien = JSON.parse(localStorage.getItem(sleutel) ?? "[]"); } catch { /* geen opslag */ }
    const nieuw = inventaris.map((i) => i.type).find((t) => !gezien.includes(t) && ITEM_INFO[t]);
    if (!nieuw) return;
    setEersteItem(nieuw);
    try { localStorage.setItem(sleutel, JSON.stringify([...gezien, nieuw])); } catch { /* geen opslag */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventaris]);
  const [ghostTot, setGhostTot] = useState<number | null>(null);
  // Knop 🎯: de kaart op de eigen plek centreren
  const [centreerVerzoek, setCentreerVerzoek] = useState(0);
  const [ghostSecondsLeft, setGhostSecondsLeft] = useState(0);
  const gehadPlekzooiRef = useRef<Set<string>>(new Set());
  const [opgepakt, setOpgepakt] = useState<{ item: SpeciaalItem; extra: string } | null>(null);
  const [hulpOpen, setHulpOpen] = useState(false);
  // "Niet bereikbaar?" eerst rustig (grijs); fel oranje pas als het team 5 minuten op weg is naar hetzelfde
  // punt, of er dichtbij is (binnen 150 m) maar het niet haalt
  const [doelSinds, setDoelSinds] = useState(() => Date.now());
  const [klok, setKlok] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setKlok(Date.now()), 30000); return () => clearInterval(t); }, []);
  const hulpIdRef = useRef<string | null>(null);
  const [activeSpeciaalItem, setActiveSpeciaalItem] = useState<SpeciaalItem | null>(null);
  const [effectNotificatie, setEffectNotificatie] = useState<string | null>(null);
  // Wie het item op ons inzette (naam en icoon), groot bovenin de melding
  const [effectVan, setEffectVan] = useState<{ naam: string; icon: string | null } | null>(null);
  const [opgehaaldToast, setOpgehaaldToast] = useState<string | null>(null);
  const [legendeOpen, setLegendeOpen] = useState(false);
  const [score, setScore] = useState(sessie.score);
  // 📸 Foto's die nog op keuring wachten (null = nog niet bekend)
  const [fotosWacht, setFotosWacht] = useState<number | null>(null);
  // 🎁 Eerste item van een soort: een kaartje met wat het doet (per soort één keer, onthouden op dit toestel)
  const [eersteItem, setEersteItem] = useState<string | null>(null);
  // Score omhoog of omlaag: "+N" of "−N" zweeft even op uit het puntenvlak
  const vorigeScore = useRef(sessie.score);
  const [sprong, setSprong] = useState<{ id: number; verschil: number } | null>(null);
  useEffect(() => {
    const verschil = score - vorigeScore.current;
    vorigeScore.current = score;
    if (!verschil) return;
    const id = Date.now();
    setSprong({ id, verschil });
    const t = setTimeout(() => setSprong((x) => (x?.id === id ? null : x)), 2100);  // even lang als de animatie
    return () => clearTimeout(t);
  }, [score]);
  // Eindtijd van het spel (door de beheerder ingesteld), telt af in de statistiekenbalk
  const [eindtijd, setEindtijd] = useState<string | null>(null);
  // Gepauzeerd door de organisatie (sinds): pauzescherm, niets bereiken of inzetten
  const [pauze, setPauze] = useState<string | null>(null);
  const pauzeRef = useRef(false);
  pauzeRef.current = !!pauze;
  const [plekzooiActief, setPlekzooiActief] = useState(false);
  const [plekzooiSecondsLeft, setPlekzooiSecondsLeft] = useState(0);
  const [tussenstand, setTussenstand] = useState<LeaderboardEntry[] | null>(null);
  const [tussenstandResterend, setTussenstandResterend] = useState(0);
  const tussenstandActiefRef = useRef(false);
  const effectNotificatieTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opgehaaldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plekzooiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bezigSpeciaalRef = useRef(false);
  const effectNotificatieAtRef = useRef<string | null>(null);

  const bezigRef = useRef(false);
  const positieRef = useRef<GeolocationCoordinates | null>(null);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locatieTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radarPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vorigePositieRef = useRef<GeolocationCoordinates | null>(null);
  const kmAfgelegdRef = useRef(Math.max(0, Number(sessie.afstand_m) || 0));
  const laatstGepubliceerdRef = useRef<{ lat: number; lng: number; tijd: number } | null>(null);

  // Afgeleid uit voortgang
  const verwerktIds = new Set(voortgang.filter((v) => v.answered_at).map((v) => v.route_point_id));
  const bereiktIds = new Set(voortgang.filter((v) => v.reached_at && !v.answered_at).map((v) => v.route_point_id));
  const activePunt = punten[verwerktIds.size] ?? null;
  // 🧭 Kompas: de pijl naar het punt draait mee met de telefoon (tik op de afstand om het aan te zetten; de
  // iPhone vraagt dan toestemming). Zonder kompas wijst de pijl zoals de kaart: noorden boven. De pijl wordt
  // direct bijgewerkt (niet via state), anders tekent de hele kaart tientallen keren per seconde opnieuw.
  const pijlRef = useRef<HTMLSpanElement>(null);
  const koersRef = useRef(0);
  // Dezelfde pijl in de melding over de eerste meters (naar het eerste punt)
  const startPijlRef = useRef<HTMLSpanElement>(null);
  const startKoersRef = useRef(0);
  const kopRef = useRef<number | null>(null);
  // kompasAan: het kompas geeft echt een richting door (dan draait de pijl mee). We luisteren altijd; komt er
  // niets binnen (iPhone zonder toestemming, of geen kompas), dan blijft het "noorden boven".
  const [kompasAan, setKompasAan] = useState(false);
  const kompasAanRef = useRef(false);
  async function zetKompasAan() { await vraagKompas(); }
  useEffect(() => {
    const draai = (e: Event) => {
      const o = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      const kop = typeof o.webkitCompassHeading === "number" ? o.webkitCompassHeading : o.absolute && o.alpha !== null ? 360 - o.alpha : null;
      if (kop === null || Number.isNaN(kop)) return;
      kopRef.current = kop;
      if (!kompasAanRef.current) { kompasAanRef.current = true; setKompasAan(true); }
      if (pijlRef.current) pijlRef.current.style.transform = `rotate(${koersRef.current - kop}deg)`;
      if (startPijlRef.current) startPijlRef.current.style.transform = `rotate(${startKoersRef.current - kop}deg)`;
    };
    window.addEventListener("deviceorientationabsolute", draai);
    window.addEventListener("deviceorientation", draai);
    return () => { window.removeEventListener("deviceorientationabsolute", draai); window.removeEventListener("deviceorientation", draai); };
  }, []);

  // Nieuw doel: de klok voor "Niet bereikbaar?" begint opnieuw
  useEffect(() => { setDoelSinds(Date.now()); }, [activePunt?.id]);
  const hulpOpvallend = hulpOpen || klok - doelSinds > 5 * 60000
    || (!!positie && !!activePunt && haversine(positie.latitude, positie.longitude, activePunt.latitude, activePunt.longitude) < 150);
  const stilSet = new Set(stilleIds);
  // ⛔ In welk verboden gebied staat het team nu (naam), of null; trillen bij binnenlopen
  const inVerbodenGebied = positie ? verbodenGebieden.find((g) => g.punten.length >= 3 && binnenVlak(positie.latitude, positie.longitude, g.punten))?.naam ?? null : null;
  const vorigVerbodenRef = useRef<string | null>(null);
  useEffect(() => {
    if (inVerbodenGebied && inVerbodenGebied !== vorigVerbodenRef.current) tril(TRIL.fout);
    vorigVerbodenRef.current = inVerbodenGebied;
  }, [inVerbodenGebied]);
  // 🔆 Scherm aan laten (keuze in ℹ️)
  const schermAan = useSchermAan();
  const spelAfgelopen = verwerktIds.size >= punten.length;
  // Voor de check of de organisatie het punt heeft vrijgegeven (die draait in een timer en zou
  // anders de waarden van het begin blijven zien)
  const vrijgaveRef = useRef({ puntId: null as string | null, bereikt: false, popup: false, start: false });
  // Laatst gezien "vernieuwen"-tijdstip van de beheerder (undefined = nog niet opgehaald)
  const vernieuwRef = useRef<string | null | undefined>(undefined);
  vrijgaveRef.current = {
    puntId: activePunt?.id ?? null,
    bereikt: !!activePunt && (bereiktIds.has(activePunt.id) || verwerktIds.has(activePunt.id)),
    popup: !!popupPunt,
    start: false,  // hieronder ingevuld, zodra het startpunt bekend is
  };

  // Verspreid: het eerste punt is het startpunt (start en finish op dezelfde plek)
  const startPunt = modus === "verspreid" && punten.length >= 3 ? punten[0] : null;
  const wachtOpStartVraag = startVraagVanaf !== null;
  // Vrijgeven op de start: de vraag van het startpunt komt dan meteen (zonder de 25 meter)
  vrijgaveRef.current.start = !!startPunt && activePunt?.id === startPunt.id && !startVraagKlaar;
  // Richting voor de eerste meters: het punt na de start. Alleen meters díe kant op tellen;
  // zonder GPS-plek of volgend punt telt gewoon elke gelopen meter.
  const richtPunt = startPunt ? punten[1] ?? null : null;
  const afstandTotRichtPunt = positie && richtPunt ? haversine(positie.latitude, positie.longitude, richtPunt.latitude, richtPunt.longitude) : null;
  const richtingTelt = startVraagAfstand !== null && afstandTotRichtPunt !== null && !!richtPunt;
  const startDoelMeter = richtingTelt ? Math.min(startVraagMeter, Math.max(5, startVraagAfstand! - richtPunt!.radius_meters)) : startVraagMeter;
  const startGelopen = !wachtOpStartVraag ? 0 : richtingTelt ? startVraagAfstand! - afstandTotRichtPunt! : kmAfgelegd - startVraagVanaf!;
  const nogTeLopen = wachtOpStartVraag ? Math.max(0, Math.ceil(startDoelMeter - startGelopen)) : 0;

  // Genoeg gelopen (instelling van de route, standaard 100 m; 0 = meteen) → startitems ophalen en tonen
  useEffect(() => {
    let opslag: { gelopen: number; klaar?: boolean } = { gelopen: 0 };
    try { opslag = JSON.parse(localStorage.getItem(startitemsKey) ?? "null") ?? opslag; } catch { /* geen opslag */ }
    if (opslag.klaar) return;
    // De teller loopt na herladen door, dus de opgeslagen waarde is alleen nog een ondergrens
    if (gelopenBasisRef.current === null) gelopenBasisRef.current = opslag.gelopen ?? 0;
    const gelopen = Math.max(gelopenBasisRef.current, kmAfgelegd);
    try { localStorage.setItem(startitemsKey, JSON.stringify({ gelopen })); } catch { /* geen opslag */ }
    if (gelopen < startitemsNaMeter || startitemsBezigRef.current) return;
    startitemsBezigRef.current = true;
    fetch("/api/speler/startitems", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items: SpeciaalItem[] } | null) => {
        if (!data) { startitemsBezigRef.current = false; return; }  // later opnieuw proberen
        try { localStorage.setItem(startitemsKey, JSON.stringify({ gelopen, klaar: true })); } catch { /* geen opslag */ }
        if (data.items.length) {
          setInventaris((prev) => [...prev, ...data.items]);
          setStartitemsScherm(data.items.map((i) => i.type));
          speelPuntBereikt(); tril(TRIL.startitems);
        }
      })
      .catch(() => { startitemsBezigRef.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kmAfgelegd]);

  // 25 meter de goede kant op gelopen na het welkomstscherm → de vraag van het startpunt verschijnt
  useEffect(() => {
    if (startVraagVanaf === null || !startPunt) return;
    // Eerste GPS-plek na het welkomstscherm: vanaf hier tellen de meters richting het volgende punt
    if (startVraagAfstand === null && afstandTotRichtPunt !== null) { setStartVraagAfstand(afstandTotRichtPunt); return; }
    if (nogTeLopen <= 0) {
      setStartVraagVanaf(null);
      setStartVraagAfstand(null);
      setStartVraagKlaar(true);
      speelPuntBereikt(); tril(TRIL.puntBereikt);
      setPopupPunt(startPunt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kmAfgelegd, startVraagVanaf, positie]);

  // Itemknoppen staan onderin het midden, half op de smalle balk: de hoekknoppen staan net boven die balk,
  // en pas bij meer dan 3 soorten (dan raken ze de hoekknoppen) helemaal boven de itemknoppen
  const soortenItems = new Set(inventaris.map((i) => i.type)).size;
  const knoepBottomOffset = soortenItems > 3 ? 70 : soortenItems > 0 ? 38 : 28;

  useEffect(() => {
    if (bereiktIds.size > 0 && activePunt && bereiktIds.has(activePunt.id) && !popupPunt) {
      // Stil punt al bereikt maar nog niet afgerond (bijv. verbinding weg): alsnog stil afronden
      if (stilSet.has(activePunt.id)) verwerkStil(activePunt);
      else setPopupPunt(activePunt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kaart van het speelgebied alvast bewaren voor als het bereik wegvalt
  useEffect(() => {
    const t = setTimeout(() => bewaarKaartGebied(sessie.route_id, punten), 5000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS starten
  useEffect(() => {
    if (!navigator?.geolocation) { setGpsStatus("weg"); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPositieUpdate,
      () => setGpsStatus("weg"),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ver van elk open punt? (bijgehouden in een ref: de GPS-handler hieronder is maar één keer gekoppeld)
  const verAfRef = useRef(false);
  useEffect(() => {
    if (!positie) return;
    const klaar = new Set(voortgang.filter((v) => v.answered_at).map((v) => v.route_point_id));
    const open = punten.filter((p) => !klaar.has(p.id));
    verAfRef.current = open.length > 0 && open.every((p) => haversine(positie.latitude, positie.longitude, p.latitude, p.longitude) > VER_AF_M);
  }, [positie, punten, voortgang]);

  // Locatie publiceren: alleen als je een stukje verder bent, of als levensteken na een minuut stilstaan
  useEffect(() => {
    locatieTimerRef.current = setInterval(() => {
      const p = positieRef.current, laatst = laatstGepubliceerdRef.current;
      if (!p) return;
      const verplaatst = !laatst || haversine(laatst.lat, laatst.lng, p.latitude, p.longitude) >= SPOOR_STAP_M;
      if (verplaatst || Date.now() - laatst!.tijd >= LEVENSTEKEN_MS) publiceerLocatie(p);
    }, LOCATIE_PUBLICEER_INTERVAL_MS);
    return () => { if (locatieTimerRef.current) clearInterval(locatieTimerRef.current); };
  // publiceerLocatie gebruikt enkel het meegegeven coords-argument + de stabiele router-ref/kmAfgelegdRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime + initiële data
  useEffect(() => {
    // Al getoonde aanval niet opnieuw laten piepen na herladen van de pagina
    try { effectNotificatieAtRef.current = localStorage.getItem(effectGezienKey); } catch { /* geen opslag */ }
    haalAndereSpelersOp();
    haalInventarisOp();
    haalHulpOp();
    haalStatusOp();
    // Eén verzoek elke 4s voor score, items, aanvallen, berichten en tussenstand. Realtime mist
    // soms een update; zo komt alles toch binnen 4s binnen (een ander team pakte een item, een aanval, …)
    // Scherm uit of app op de achtergrond: niet pollen (batterij); bij terugkomen meteen bijwerken
    const statusTimer = setInterval(() => { if (!document.hidden) haalStatusOp(); }, STATUS_POLL_MS);
    // Andere teams: binnen 25 meter zie je ze ook zonder radar; zo verschijnen ze vanzelf
    const andereTimer = setInterval(() => { if (!document.hidden) haalAndereSpelersOp(); }, 10000);
    const weerZichtbaar = () => { if (!document.hidden) { haalStatusOp(); haalAndereSpelersOp(); } };
    document.addEventListener("visibilitychange", weerZichtbaar);

    const supabase = createClient();
    const kanaal = supabase
      .channel("locaties-en-broadcasts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_updates" }, () => { haalAndereSpelersOp(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "special_item_effects" }, () => { haalEffectenOp(); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "player_sessions", filter: `id=eq.${sessie.id}` }, () => {
        router.push("/speler?gestopt=1");
      })
      .subscribe((status) => { setRealtimeVerbonden(status === "SUBSCRIBED"); });

    return () => {
      supabase.removeChannel(kanaal);
      clearInterval(statusTimer);
      clearInterval(andereTimer);
      document.removeEventListener("visibilitychange", weerZichtbaar);
      if (radarPollRef.current) clearInterval(radarPollRef.current);
      if (plekzooiTimerRef.current) clearInterval(plekzooiTimerRef.current);
      if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
      if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Openstaande melding "punt niet bereikbaar": elke 5s kijken of de organisatie al gereageerd heeft
  useEffect(() => {
    if (!hulpOpen) return;
    const timer = setInterval(haalHulpOp, 5000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hulpOpen]);

  // Spook: aftellen tot het verborgen punt weer terugkomt
  useEffect(() => {
    if (!ghostTot) return;
    const tik = () => {
      const rem = Math.max(0, Math.ceil((ghostTot - Date.now()) / 1000));
      setGhostSecondsLeft(rem);
      if (rem <= 0) setGhostTot(null);
    };
    tik();
    const timer = setInterval(tik, 1000);
    return () => clearInterval(timer);
  }, [ghostTot]);

  // Puntdetectie bij iedere positiewijziging
  useEffect(() => {
    if (!positie || !activePunt || bezigRef.current || popupPunt || plekzooiActief || ghostTot) return;
    // Stil punt wel bereikt maar het afronden mislukte (verbinding): opnieuw proberen
    if (bereiktIds.has(activePunt.id)) {
      if (stilSet.has(activePunt.id)) { bezigRef.current = true; verwerkStil(activePunt).finally(() => { bezigRef.current = false; }); }
      return;
    }
    const binnen = (p: RoutePunt) => haversine(positie.latitude, positie.longitude, p.latitude, p.longitude) <= p.radius_meters;
    if (binnen(activePunt)) { markeerBereikt(activePunt); return; }
    // Een stil punt gemist (bocht afgesneden)? Bereikt het team een later punt en zijn alle punten
    // daartussen stil, dan tellen die als gepasseerd
    for (let i = verwerktIds.size; i < punten.length && stilSet.has(punten[i].id); i++) {
      const later = punten[i + 1];
      if (later && binnen(later)) { passeerTot(i + 1); return; }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positie]);

  // Speciale item detectie bij positiewijziging
  useEffect(() => {
    // Tijdens plek zooi of spook geen items oppakken (de server weigert het ook)
    if (!positie || bezigSpeciaalRef.current || plekzooiActief || ghostTot) return;
    for (const item of specialeItems) {
      if (item.claimed || gehadPlekzooiRef.current.has(item.id)) continue;
      const afstand = haversine(positie.latitude, positie.longitude, item.latitude, item.longitude);
      if (afstand <= item.radius_meters) {
        claimSpeciaalItem(item);
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positie, specialeItems]);

  // Redirect naar finish als alle punten verwerkt zijn. Staat er nog iets te wachten (geen bereik),
  // dan eerst dat versturen: anders kent de server de finish nog niet
  useEffect(() => {
    if (!spelAfgelopen) return;
    let weg = false;
    const naarFinish = async () => {
      await verstuurWachtrij();
      if (weg) return;
      if (wachtrijAantal()) { setTimeout(naarFinish, 5000); return; }
      speelFinish(); tril(TRIL.finish); router.push("/speler/finish");
    };
    naarFinish();
    return () => { weg = true; };
  }, [spelAfgelopen, router]);

  // Zonder bereik: hoeveel stappen er nog wachten; versturen zodra er weer bereik is (en elke 15 s)
  const [wachtend, setWachtend] = useState(0);
  // Wat de server weigerde (met de reden), of wat bij een eerder spel hoorde: niet stil weg, maar in beeld
  const [mislukt, setMislukt] = useState<MislukteOpdracht[]>([]);
  useEffect(() => {
    // Nieuwe opdrachten horen bij dit spel; wachtende van een eerder spel gaan niet meer mee
    zetWachtrijSessie(sessie.id);
    setMislukt(leesMislukt());
    const afMislukt = opMislukt(setMislukt);
    setWachtend(wachtrijAantal());
    const af = opWachtrij(setWachtend);
    const probeer = () => { if (wachtrijAantal()) verstuurWachtrij(); };
    probeer();
    window.addEventListener("online", probeer);
    const t = setInterval(probeer, 15000);
    return () => { af(); afMislukt(); window.removeEventListener("online", probeer); clearInterval(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vragen van het volgende punt en de twee daarna alvast ophalen (ook bruikbaar zonder bereik)
  useEffect(() => {
    laadVragenVooruit(punten.slice(verwerktIds.size, verwerktIds.size + 3).map((p) => p.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verwerktIds.size, punten]);

  async function haalStatusOp() {
    try {
      const res = await fetch("/api/speler/status");
      if (!res.ok) return;
      type Deel = { status: number; data: unknown };
      const s = await res.json() as Record<"sessie" | "speciaal" | "effecten" | "berichten" | "tussenstand", Deel>;
      const ok = (d: Deel) => d.status >= 200 && d.status < 300;
      // Eerst de sessie: is het spel voorbij of gestopt, dan de rest overslaan
      if (verwerkScore(s.sessie.status, s.sessie.data)) return;
      if (ok(s.speciaal)) verwerkSpecialeItems(s.speciaal.data as SpeciaalItem[]);
      if (ok(s.effecten)) verwerkEffecten(s.effecten.data as EffectenData);
      if (ok(s.berichten)) verwerkBerichten(s.berichten.data as BerichtenData);
      if (ok(s.tussenstand)) verwerkTussenstand(s.tussenstand.data as TussenstandData);
    } catch { /* verbindingsfout */ }
  }

  async function haalAndereSpelersOp() {
    try {
      // Eigen plek van nu meesturen: dan rekent de server "dichtbij" met de verse plek, niet met de laatst opgeslagen
      const p = positieRef.current;
      const res = await fetch(p ? `/api/speler/locaties?lat=${p.latitude}&lng=${p.longitude}` : "/api/speler/locaties");
      if (res.ok) {
        const data = await res.json();
        setAndereSpelers(data.locaties ?? []);
        setDoelNaFinish(data.doelNaFinish ?? []);
      }
    } catch { /* verbindingsfout */ }
  }

  function verwerkSpecialeItems(items: SpeciaalItem[]) {
    setSpecialeItems(items);
  }

  async function haalInventarisOp() {
    try {
      const res = await fetch("/api/speler/speciaal/inventaris");
      if (res.ok) setInventaris(await res.json());
    } catch { /* verbindingsfout */ }
  }

  async function haalScoreOp() {
    try {
      const res = await fetch("/api/speler/sessie");
      verwerkScore(res.status, res.ok ? await res.json() : null);
    } catch { /* verbindingsfout */ }
  }

  // Geeft true als de speler weg moet van de kaart (gestopt, uitgelogd of het spel is voorbij)
  function verwerkScore(status: number, data: any): boolean {
    if (status === 403) { router.push("/speler"); return true; }
    if (status >= 200 && status < 300) {
      // Geen lopend spel meer: gestopt of gereset door de beheerder (gefinisht gaat via /speler door naar de finish)
      if (data === null) { router.push("/speler?gestopt=1"); return true; }
      // Eindtijd voorbij: het spel is voor iedereen afgelopen, de stand telt
      if (data?.tijd_op) { speelFinish(); tril(TRIL.finish); router.push("/speler/finish"); return true; }
      setEindtijd(data?.eindtijd ?? null);
      // 📸 Foto beoordeeld? Dan is het aantal wachtende foto's gedaald: even melden
      const wacht = typeof data?.fotos_wacht === "number" ? data.fotos_wacht : 0;
      setFotosWacht((oud) => { if (oud !== null && wacht < oud) setOpgehaaldToast("📸 Jullie foto is beoordeeld: kijk bij je score"); return wacht; });
      setPauze(data?.pauze ?? null);
      if (data?.score !== undefined) setScore(data.score);
      // De beheerder heeft wijzigingen naar de spelers gestuurd: route opnieuw inlezen
      if (vernieuwRef.current !== undefined && data?.vernieuw_at && data.vernieuw_at !== vernieuwRef.current) {
        // Ook de vooruit opgehaalde vragen vergeten: die kunnen zijn aangepast
        wisVraagCache();
        laadVragenVooruit(punten.slice(verwerktIds.size, verwerktIds.size + 3).map((p) => p.id));
        router.refresh();
        setOpgehaaldToast("🔄 De route is bijgewerkt");
        if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
        opgehaaldTimerRef.current = setTimeout(() => setOpgehaaldToast(null), 3500);
      }
      if (data) vernieuwRef.current = data.vernieuw_at ?? null;
      // De organisatie heeft ons volgende punt vrijgegeven ("Volgend punt vrijgeven" op het dashboard):
      // de server zet dat punt als bereikt. Herladen opent de vraag, net als na een hulpmelding.
      const v = vrijgaveRef.current;
      if (v.puntId && data?.current_point_id === v.puntId && !v.bereikt && !v.popup && !bezigRef.current) {
        onthoudVrijgegeven("organisatie");
        speelPuntBereikt(); tril(TRIL.puntBereikt);
        window.location.reload();
        return true;
      }
    }
    return false;
  }

  // Berichten van de organisatie: elk nieuw bericht één keer tonen, als groot venster dat
  // blijft staan tot het team het wegtikt (gezien-lijst per sessie in localStorage)
  function verwerkBerichten({ berichten }: BerichtenData) {
    const sleutel = `pr_berichten_gezien_${sessie.id}`;
    let gezien: string[] = [];
    try { gezien = JSON.parse(localStorage.getItem(sleutel) ?? "[]"); } catch { /* geen opslag */ }
    const alleNieuw = berichten.filter((b) => !gezien.includes(b.id));
    if (alleNieuw.length === 0) return;
    try { localStorage.setItem(sleutel, JSON.stringify([...gezien, ...alleNieuw.map((b) => b.id)])); } catch { /* geen opslag */ }
    // ⏭️ Punt vrijgegeven door de organisatie: geen bericht tonen, maar de vraag openen
    if (alleNieuw.some((b) => b.bericht === VRIJGAVE_BERICHT)) verwerkVrijgave();
    const nieuw = alleNieuw.filter((b) => b.bericht !== VRIJGAVE_BERICHT);
    if (nieuw.length === 0) return;
    const laatste = nieuw[nieuw.length - 1];
    if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
    setEffectNotificatie(`📢 ${laatste.bericht}`);
    speelDong();
    navigator.vibrate?.([200, 100, 200]);
  }

  // De organisatie gaf ons volgende punt vrij: de vraag meteen openen. Op de start vervalt het wachten
  // op de eerste 25 meter. Was het punt nog niet bereikt, dan zet de server het als bereikt en opent
  // herladen de vraag (zie hierboven, current_point_id).
  function verwerkVrijgave() {
    const v = vrijgaveRef.current;
    if (!v.puntId || bezigRef.current) return;
    // Op de start: niet meer wachten op 25 meter. Staat het welkomstscherm nog open, dan toont dat nu de vraag.
    if (v.start) { setStartVraagVanaf(null); setStartVraagAfstand(null); setStartVraagKlaar(true); }
    else if (!v.bereikt) return;
    if (v.popup) return;
    const punt = punten.find((p) => p.id === v.puntId);
    if (!punt) return;
    setVrijgegevenMelding("organisatie");
    speelPuntBereikt(); tril(TRIL.puntBereikt);
    setPopupPunt(punt);
  }

  async function haalHulpOp() {
    try {
      const res = await fetch("/api/speler/hulp");
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "open") {
        hulpIdRef.current = data.id;
        setHulpOpen(true);
        return;
      }
      // Alleen reageren op een melding die we in deze sessie open hebben zien staan
      if (!hulpIdRef.current || data.id !== hulpIdRef.current) return;
      hulpIdRef.current = null;
      setHulpOpen(false);
      if (data.status === "toegekend") {
        // Punt is vrijgegeven: herladen zet het als bereikt en opent de vraag (met eerst een melding)
        onthoudVrijgegeven("hulp");
        speelPuntBereikt(); tril(TRIL.puntBereikt);
        window.location.reload();
      } else if (data.status === "genegeerd") {
        setEffectNotificatie("📨 De organisatie heeft je melding bekeken: probeer het punt toch te bereiken.");
      }
    } catch { /* verbindingsfout */ }
  }

  async function meldOnbereikbaar() {
    if (!confirm("Kunnen jullie het volgende punt echt niet bereiken, bijvoorbeeld omdat het afgesloten of onveilig is?\n\nDan krijgt de organisatie een melding en kan die het punt voor jullie vrijgeven.")) return;
    try {
      const res = await fetch("/api/speler/hulp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setOpgehaaldToast(data.fout ?? "Melden lukte niet, probeer het opnieuw.");
      } else {
        hulpIdRef.current = data.id;
        setHulpOpen(true);
        setOpgehaaldToast("📨 De organisatie is gewaarschuwd");
      }
      if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
      opgehaaldTimerRef.current = setTimeout(() => setOpgehaaldToast(null), 3500);
    } catch { /* verbindingsfout */ }
  }

  function activeerPlekzooi(verlooptOp: Date) {
    const remaining = Math.max(0, Math.floor((verlooptOp.getTime() - Date.now()) / 1000));
    if (remaining <= 0) return;
    setPlekzooiActief(true);
    setPlekzooiSecondsLeft(remaining);
    if (plekzooiTimerRef.current) clearInterval(plekzooiTimerRef.current);
    plekzooiTimerRef.current = setInterval(() => {
      const rem = Math.max(0, Math.floor((verlooptOp.getTime() - Date.now()) / 1000));
      setPlekzooiSecondsLeft(rem);
      if (rem <= 0) {
        clearInterval(plekzooiTimerRef.current!);
        plekzooiTimerRef.current = null;
        setPlekzooiActief(false);
      }
    }, 1000);
  }

  async function haalEffectenOp() {
    try {
      const res = await fetch("/api/speler/speciaal/effecten");
      if (res.ok) verwerkEffecten(await res.json());
    } catch { /* verbindingsfout */ }
  }

  function verwerkEffecten(data: EffectenData) {
    setGhostTot(data.ghost?.active && data.ghost.expires_at ? new Date(data.ghost.expires_at).getTime() : null);
    if (data.notification && data.notification_at !== effectNotificatieAtRef.current) {
      effectNotificatieAtRef.current = data.notification_at;
      try { localStorage.setItem(effectGezienKey, data.notification_at); } catch { /* geen opslag */ }
      // Aanval: blijft staan tot het team hem zelf wegklikt
      if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
      setEffectNotificatie(data.notification);
      setEffectVan(data.notification_van ?? null);
      speelDong();
      navigator.vibrate?.([300, 120, 300, 120, 300]);
      haalScoreOp();
      // Banaan: de puntvolgorde is op de server omgewisseld — kaart opnieuw laden met de nieuwe volgorde
      if (data.notification.startsWith("🍌")) router.refresh();
    }

    // Plek zooi actief: herstel afteltimer bij herverbinding
    if (data.plekzooi?.active && data.plekzooi.expires_at) {
      activeerPlekzooi(new Date(data.plekzooi.expires_at));
    } else if (plekzooiTimerRef.current) {
      // De organisatie heeft de wachttijd ingekort: niet langer stilstaan
      clearInterval(plekzooiTimerRef.current);
      plekzooiTimerRef.current = null;
      setPlekzooiActief(false);
    }

    // Radar actief: poll andere spelers elke 5 seconden
    if (data.radar?.active) {
      if (!radarPollRef.current) {
        radarPollRef.current = setInterval(() => haalAndereSpelersOp(), 5000);
      }
    } else {
      if (radarPollRef.current) {
        clearInterval(radarPollRef.current);
        radarPollRef.current = null;
        haalAndereSpelersOp(); // radar afgelopen: de andere teams verdwijnen weer van de kaart
      }
    }
  }

  // Plek van het team nu, meegestuurd bij bereiken/oppakken/inzetten (voor het verslag en de routekaart, en
  // de server controleert ermee of het team echt bij het punt of item is)
  function huidigePlek() {
    const p = positieRef.current;
    return p ? { latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy } : {};
  }

  async function claimSpeciaalItem(item: SpeciaalItem) {
    if (bezigSpeciaalRef.current) return;
    bezigSpeciaalRef.current = true;
    try {
      const res = await fetch("/api/speler/speciaal/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ special_item_id: item.id, ...huidigePlek() }),
      });
      if (!res.ok) return;
      const data = await res.json();

      // Plek zooi blijft liggen voor andere teams; dit team kan hem maar één keer raken
      if (data.status === "plekzooi" || data.status === "al_gehad") {
        gehadPlekzooiRef.current.add(item.id);
        if (data.status === "plekzooi" && data.expires_at) activeerPlekzooi(new Date(data.expires_at));
        return;
      }

      if (data.status === "geclaimd" && data.item) {
        setSpecialeItems((prev) => prev.map((i) => i.id === item.id ? { ...i, claimed: true } : i));

        speelPuntBereikt(); tril(TRIL.itemGepakt);
        if (data.item.type === "ster") {
          // Direct inzetten: punten meteen bijschrijven. Lukt dat niet (geen bereik, serverfout), dan komt de
          // ster in de balk: het team kan hem dan zelf nog inzetten en raakt hem niet kwijt.
          const effectRes = await fetch("/api/speler/speciaal/effect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ special_item_id: data.item.id, ...huidigePlek() }),
          }).catch(() => null);
          if (effectRes?.ok) {
            setScore((prev) => prev + data.item.points_effect);
            haalScoreOp();
            setOpgepakt({ item: data.item, extra: "De bonuspunten staan al op je score!" });
          } else {
            setInventaris((prev) => [...prev, data.item]);
            setOpgepakt({ item: data.item, extra: "Nog niet bijgeschreven: tik erop in je balk om de punten te pakken." });
          }
        } else if (data.item.type === "vraagteken") {
          // Een vraagteken komt niet in de balk: hij wordt meteen gespeeld
          const effectRes = await fetch("/api/speler/speciaal/effect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ special_item_id: data.item.id, ...huidigePlek() }),
          }).catch(() => null);
          const effect = effectRes?.ok ? await effectRes.json() : null;
          if (effect?.ok) {
            inventarisItemGebruikt(data.item.id, effect.eigen_notificatie ?? "❓ Vraagteken gespeeld!");
          } else {
            // Lukte het niet, dan toch in de balk zodat hij niet verloren gaat
            setInventaris((prev) => [...prev, data.item]);
            setOpgepakt({ item: data.item, extra: "Tik erop in je balk om hem te spelen." });
          }
        } else if (data.item.type === "wissel") {
          setInventaris((prev) => [...prev, data.item]);
          setOpgepakt({ item: data.item, extra: "Kies zo meteen met welk team je van score wisselt." });
        } else {
          setInventaris((prev) => [...prev, data.item]);
          setOpgepakt({ item: data.item, extra: "Staat in je balk onderin — tik erop wanneer je hem wilt inzetten." });
        }
      }
    } finally {
      bezigSpeciaalRef.current = false;
    }
  }

  function inventarisItemGebruikt(itemId: string, eigenNotificatie?: string) {
    setActiveSpeciaalItem(null);
    haalScoreOp(); // wissel, vraagteken enz. veranderen je eigen score meteen
    setInventaris((prev) => {
      const idx = prev.findIndex((i) => i.id === itemId);
      return idx === -1 ? prev : [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    if (eigenNotificatie) {
      setEffectNotificatie(eigenNotificatie);
      if (effectNotificatieTimerRef.current) clearTimeout(effectNotificatieTimerRef.current);
      effectNotificatieTimerRef.current = setTimeout(() => setEffectNotificatie(null), 8000);
    }
  }

  async function publiceerLocatie(coords: GeolocationCoordinates) {
    laatstGepubliceerdRef.current = { lat: coords.latitude, lng: coords.longitude, tijd: Date.now() };
    try {
      const res = await fetch("/api/speler/locatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy,
          afstandM: kmAfgelegdRef.current,
        }),
      });
      if (res.status === 403) router.push("/speler");
    } catch { /* verbindingsfout */ }
  }

  function resetGpsTimeout() {
    if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
    gpsTimeoutRef.current = setTimeout(() => setGpsStatus("weg"), GPS_TIMEOUT_MS);
  }

  function onPositieUpdate(pos: GeolocationPosition) {
    resetGpsTimeout();
    positieRef.current = pos.coords;
    setPositie(pos.coords);
    setGpsStatus(pos.coords.accuracy <= SLECHTE_NAUWKEURIGHEID_M ? "ok" : "zwak");
    // Gelopen afstand: GPS-ruis niet meetellen. Binnen of tussen hoge gebouwen springt de positie
    // tientallen meters heen en weer, ook als je stilstaat; zonder filter liep de teller dan vanzelf op.
    // Daarom: alleen nauwkeurige metingen, en alleen een stap die groter is dan de onnauwkeurigheid.
    const acc = pos.coords.accuracy ?? 0;
    if (acc <= SLECHTE_NAUWKEURIGHEID_M) {
      if (vorigePositieRef.current) {
        const d = haversine(vorigePositieRef.current.latitude, vorigePositieRef.current.longitude, pos.coords.latitude, pos.coords.longitude);
        if (d > Math.max(8, acc)) {
          kmAfgelegdRef.current += d;
          setKmAfgelegd(prev => prev + d);
          vorigePositieRef.current = pos.coords;
        }
      } else {
        vorigePositieRef.current = pos.coords;
      }
    }
    // Spoor bijhouden: 10 m verder dan de laatst opgeslagen plek (en niet vaker dan elke 4 s);
    // ver van elk open punt 25 m en elke 10 s
    const laatst = laatstGepubliceerdRef.current;
    const ver = verAfRef.current;
    if (!laatst || (Date.now() - laatst.tijd >= (ver ? SPOOR_INTERVAL_VER_MS : SPOOR_MIN_INTERVAL_MS) &&
        haversine(laatst.lat, laatst.lng, pos.coords.latitude, pos.coords.longitude) >= (ver ? SPOOR_STAP_VER_M : SPOOR_STAP_M))) {
      publiceerLocatie(pos.coords);
    }
  }

  async function markeerBereikt(punt: RoutePunt) {
    if (bezigRef.current) return;
    bezigRef.current = true;
    try {
      const r = await stuur("/api/speler/voortgang/bereik", { route_point_id: punt.id, ...huidigePlek() });
      if (r.status === "fout" && r.res.status === 423) { bezigRef.current = false; return; }
      if (r.status !== "fout") {
        // Zonder bereik: alvast zo in de app, de server krijgt het later uit de wachtrij
        const nieuweVoortgang: SpelerPuntVoortgang = r.status === "ok" ? await r.res.json() : lokaleVoortgang(punt.id, false);
        setVoortgang((v) => [...v, nieuweVoortgang]);
        // Stil punt: meteen verwerken, zonder venster; alleen een kort seintje
        if (stilSet.has(punt.id)) {
          const klaar = await verwerkStil(punt);
          if (klaar) toonGepasseerd(punt);
          return;
        }
        speelPuntBereikt(); tril(TRIL.puntBereikt);
        setPopupPunt(punt);
      }
    } finally {
      bezigRef.current = false;
    }
  }

  // Stil punt afronden op de server (zoals "Doorgaan" bij een infopunt)
  async function verwerkStil(punt: RoutePunt): Promise<boolean> {
    const r = await stuur("/api/speler/voortgang/verwerk", { route_point_id: punt.id });
    if (r.status === "bewaard") { puntVerwerkt(lokaleVoortgang(punt.id, true)); return true; }
    if (r.status !== "ok") return false;
    const data = await r.res.json();
    puntVerwerkt(data.voortgang ?? data);
    return true;
  }

  // Punt bereikt of afgerond zonder bereik: zo staat het alvast in de app
  function lokaleVoortgang(puntId: string, afgerond: boolean): SpelerPuntVoortgang {
    const nu = new Date().toISOString();
    return { id: `lokaal-${puntId}`, session_id: sessie.id, route_point_id: puntId, reached_at: nu, answered_at: afgerond ? nu : null,
      selected_answer_id: null, open_answer_text: null, is_correct: null, points_awarded: 0 };
  }

  function toonGepasseerd(punt: RoutePunt) {
    tril(TRIL.gepasseerd);
    setOpgehaaldToast(`✓ ${punt.name} gepasseerd`);
    if (opgehaaldTimerRef.current) clearTimeout(opgehaaldTimerRef.current);
    opgehaaldTimerRef.current = setTimeout(() => setOpgehaaldToast(null), 2000);
  }

  // Gemiste stille punten tot (niet met) index tot afronden, daarna het bereikte punt zelf
  async function passeerTot(tot: number) {
    if (bezigRef.current) return;
    bezigRef.current = true;
    try {
      for (let i = verwerktIds.size; i < tot; i++) {
        const punt = punten[i];
        const r = await stuur("/api/speler/voortgang/bereik", { route_point_id: punt.id, ...huidigePlek() });
        // 409 = al bereikt (bijv. na herladen): dan alleen nog verwerken
        if (r.status === "fout" && r.res.status !== 409) return;
        if (r.status !== "fout") {
          const v: SpelerPuntVoortgang = r.status === "ok" ? await r.res.json() : lokaleVoortgang(punt.id, false);
          setVoortgang((oud) => [...oud, v]);
        }
        if (!await verwerkStil(punt)) return;
      }
    } finally {
      bezigRef.current = false;
    }
    markeerBereikt(punten[tot]);
  }

  function puntVerwerkt(bijgewerktVoortgang: SpelerPuntVoortgang) {
    setVoortgang((v) =>
      v.some((vp) => vp.route_point_id === bijgewerktVoortgang.route_point_id)
        ? v.map((vp) => vp.route_point_id === bijgewerktVoortgang.route_point_id ? bijgewerktVoortgang : vp)
        : [...v, bijgewerktVoortgang]
    );
    setPopupPunt(null);
    setStartVraagKlaar(false);
    haalScoreOp();
  }

  function bewaarItemVoorLater() {
    setActiveSpeciaalItem(null);
  }

  function verwerkTussenstand(data: TussenstandData) {
    if (data.zichtbaar) {
      if (!tussenstandActiefRef.current) {
        tussenstandActiefRef.current = true;
        setTussenstand(data.tussenstand);
        setTussenstandResterend(data.resterende_seconden);
      }
    } else {
      tussenstandActiefRef.current = false;
    }
  }

  function sluitTussenstand() {
    setTussenstand(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%", position: "relative" }}>

      {/* Statistiekenbalk, in de teamkleur getint */}
      <div style={{
        display: "flex", gap: 10, padding: "10px 14px", flexShrink: 0,
        background: teamKleur ? `linear-gradient(90deg, ${teamKleur}55, rgba(42,21,102,0.45) 70%)` : "rgba(42,21,102, 0.45)",
        boxShadow: teamKleur ? `inset 0 -3px 0 ${teamKleur}` : undefined,
        backdropFilter: "blur(14px) saturate(130%)",
        WebkitBackdropFilter: "blur(14px) saturate(130%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        alignItems: "center",
      }}>
        <div className="pr-hud-gem pr-hud-gem--purple pr-hud-gem--groot">
          <span className="pr-hud-icoon">🗺️</span>
          <span className="pr-hud-getal" style={{ fontSize: hudGetalGrootte((kmAfgelegd / 1000).toFixed(2)) }}>{(kmAfgelegd / 1000).toFixed(2)}</span>
        </div>
        {/* In de min: het puntenvlak kleurt iets rood */}
        <div className={`pr-hud-gem ${score < 0 ? "pr-hud-gem--min" : "pr-hud-gem--orange"} pr-hud-gem--groot pr-hud-gem--score`}>
          <span className="pr-hud-icoon">⭐</span>
          <span className="pr-hud-getal" style={{ fontSize: hudGetalGrootte(String(score)) }}>{score}</span>
          {/* Groot midden in beeld, daarna zweeft hij omhoog naar de score (via een portal: los van de kop) */}
          {sprong && createPortal(<span key={sprong.id} className={`score-sprong${sprong.verschil < 0 ? " score-sprong--min" : ""}`} aria-hidden>{sprong.verschil > 0 ? "+" : "−"}{Math.abs(sprong.verschil)}</span>, document.body)}
        </div>
        {eindtijd && <EindtijdTeller eindtijd={eindtijd} sessieId={sessie.id} onVoorbij={haalScoreOp} pauze={pauze} />}
        <button
          onClick={() => setLegendeOpen(true)}
          title="Uitleg: het spel en de items" aria-label="Uitleg"
          style={{
            position: "relative", overflow: "hidden",
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(180deg, #ffc24a 0%, var(--pr-orange) 48%, #e35d00 50%, #c44900 100%)",
            border: "2px solid #000",
            color: "#fff", fontSize: "1rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontFamily: "var(--font-display)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), 0 3px 0 #8a3300, 0 5px 10px rgba(0,0,0,0.4)",
          }}>
          ?
        </button>
      </div>

      {/* 📸 Ingestuurde foto's die nog op keuring wachten */}
      {!!fotosWacht && <div className="foto-wacht-balk">📸 {fotosWacht} foto{fotosWacht === 1 ? "" : "'s"} {fotosWacht === 1 ? "wacht" : "wachten"} op keuring; de punten komen daarna</div>}

      {/* 🧩 Puzzelwoord (alleen als de route er een heeft): ververst bij elke goede vraag */}
      <PuzzelWoord ververs={voortgang.filter((v) => v.is_correct === true).length} />

      {/* GPS / realtime toasts */}
      {!realtimeVerbonden && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(234, 179, 8, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ⚠️ Live verbinding onderbroken…
        </div>
      )}
      {gpsStatus === "laden" && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(6, 182, 212, 0.8)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          📡 GPS-signaal ophalen…
        </div>
      )}
      {gpsStatus === "zwak" && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(234, 179, 8, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          📡 Zwak GPS-signaal{positie ? ` (± ${Math.round(positie.accuracy)} m)` : ""}: loop naar open lucht
        </div>
      )}
      {gpsStatus === "weg" && (
        <div style={{ position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", zIndex: 900, whiteSpace: "nowrap", background: "rgba(239, 68, 68, 0.85)", backdropFilter: "blur(10px)", color: "#fff", padding: "7px 18px", borderRadius: 30, fontSize: "0.78rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ❌ GPS-verbinding weg
        </div>
      )}

      {/* Item opgehaald toast */}
      {opgehaaldToast && (
        <div style={{
          position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, maxWidth: "calc(100% - 32px)", width: "max-content",
          background: "rgba(5, 150, 105, 0.95)", backdropFilter: "blur(12px)",
          color: "#fff", padding: "14px 22px", borderRadius: 16,
          fontSize: "1rem", fontWeight: 700, boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", gap: 10, textAlign: "center",
          border: "1px solid rgba(255,255,255,0.25)",
        }}>
          {opgehaaldToast}
        </div>
      )}


      {/* Pauze van de organisatie: over alles heen, verdwijnt vanzelf als het spel verder gaat */}
      {pauze && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(12,3,34,0.86)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="pr-panel" style={{ maxWidth: 360, width: "100%" }}>
            <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", paddingTop: 22 }}>
              <div style={{ fontSize: "3.4rem", lineHeight: 1 }}>⏸️</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "var(--pr-gold)" }}>Even pauze</div>
              <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.45, color: "#fff", fontWeight: 600 }}>
                De organisatie heeft het spel gepauzeerd. Blijf waar je bent; zodra het verder gaat, verdwijnt dit vanzelf.
              </p>
              {eindtijd && <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--pr-muted, #C9B6FF)" }}>De eindtijd loopt niet door tijdens de pauze.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Melding: de organisatie heeft het punt vrijgegeven (ligt boven de vraag, die daarna zichtbaar is) */}
      {vrijgegevenMelding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1700, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="pr-panel" style={{ maxWidth: 360, width: "100%", animation: "pr-effect-pop 0.4s ease" }}>
            <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", paddingTop: 22 }}>
              <div style={{ fontSize: "3.2rem", lineHeight: 1 }}>📨</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: "var(--pr-gold)" }}>
                {vrijgegevenMelding === "hulp" ? "Je melding is gezien" : "Punt vrijgegeven"}
              </div>
              <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.45, color: "#fff", fontWeight: 600 }}>
                De organisatie heeft dit punt voor jullie vrijgegeven. Je hoeft er niet meer heen: beantwoord de vraag hier.
              </p>
              <button className="btn-premium--compact" style={{ marginTop: 4 }} onClick={() => setVrijgegevenMelding(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Startitems van de organisatie, na 100 meter lopen */}
      {startitemsScherm && (() => {
        const aantallen = startitemsScherm.reduce<Record<string, number>>((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {});
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 1600, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="pr-panel" style={{ maxWidth: 360, width: "100%", animation: "pr-effect-pop 0.4s ease" }}>
              <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", paddingTop: 22 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.35rem", color: "var(--pr-gold)" }}>🎁 Van de organisatie</div>
                <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.45, color: "#fff", fontWeight: 600 }}>
                  Om je een beetje op weg te helpen krijg je alvast
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
                  {Object.entries(aantallen).map(([type, n]) => (
                    <div key={type} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/items/${type}.webp`} alt={type} style={{ width: 64, height: 64, filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" }} />
                      {n > 1 && (
                        <span style={{ position: "absolute", top: -4, right: -6, minWidth: 22, height: 22, borderRadius: 11, padding: "0 5px",
                          background: "var(--pr-gold)", color: "#2a1050", fontWeight: 800, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {n}×
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.45, color: "#fff", fontWeight: 600 }}>
                  van de organisatie. Doe er je voordeel mee, gebruik ze verstandig.
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>Je vindt ze in de balk onderin.</p>
                <button className="btn-premium--compact" style={{ marginTop: 4 }} onClick={() => setStartitemsScherm(null)}>
                  TOP, BEDANKT!
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Effect notificatie */}
      {effectNotificatie && (() => {
        // Meldingen beginnen met het emoji van het item (of 📨 van de organisatie): toon dat groot als icoon
        const [eerste, ...rest] = effectNotificatie.split(" ");
        const itemType = MELDING_ITEM_TYPE[eerste];
        const isIcoon = !!itemType || /\p{Extended_Pictographic}/u.test(eerste);
        const tekst = isIcoon ? rest.join(" ") : effectNotificatie;
        // ± Punten van de spelleider: het aantal groot, het getypte bericht eronder
        const punten = itemType ? null : PUNTEN_BERICHT.exec(tekst);
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1600,
            background: "rgba(12,3,34,0.72)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div className="pr-panel" style={{ maxWidth: 360, width: "100%", animation: "pr-effect-pop 0.4s ease" }}>
              <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", paddingTop: 22 }}>
                {itemType ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/items/${itemType}.webp`} alt="" style={{ width: 110, height: 110, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))" }} />
                ) : (
                  <span style={{ fontSize: "4rem", lineHeight: 1 }}>{isIcoon ? eerste : "🚨"}</span>
                )}
                {itemType && effectVan ? (
                  // Duidelijk wie dit op je afvuurde: icoon en teamnaam groot
                  <div className="aanvaller-blok">
                    <span className="aanvaller-label">Ingezet door</span>
                    <span className="aanvaller-team">
                      {effectVan.icon && <span aria-hidden className="aanvaller-icoon">{effectVan.icon}</span>}
                      {effectVan.naam}
                    </span>
                  </div>
                ) : itemType ? (
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.35rem", color: "var(--pr-gold)" }}>Let op!</div>
                ) : null}
                {punten ? (
                  <>
                    <div className={`punten-bericht${Number(punten[1]) < 0 ? " punten-bericht--min" : ""}`}>
                      <span className="punten-bericht-getal">{punten[1]}</span>
                      <span className="punten-bericht-label">{Number(punten[1]) < 0 ? "punten eraf" : "punten erbij"}</span>
                    </div>
                    {punten[2] && <p className="punten-bericht-reden">{punten[2]}</p>}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: itemType ? "1.02rem" : "1.15rem", lineHeight: 1.45, color: "#fff", fontWeight: itemType ? 600 : 700 }}>
                    {tekst}
                  </p>
                )}
                <button className="btn-premium--compact" style={{ marginTop: 4 }} onClick={() => { setEffectNotificatie(null); setEffectVan(null); }}>
                  OK, BEGREPEN
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Kaart */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <SpelerLeaflet
          spelerIcoon={spelerIcoon}
          spelerNaam={spelerNaam}
          teamKleur={teamKleur}
          centreerVerzoek={centreerVerzoek}
          // Op dezelfde hoogte als 🎯 linksonder; staat "Niet bereikbaar?" rechtsonder, dan erboven
          stijlOnder={activePunt && !bereiktIds.has(activePunt.id) && !popupPunt && !ghostTot ? knoepBottomOffset + 46 : knoepBottomOffset}
          positie={positie}
          punten={punten}
          verwerktIds={verwerktIds}
          bereiktIds={bereiktIds}
          stilleIds={stilSet}
          heleRoute={heleRoute}
          verbodenGebieden={verbodenGebieden}
          activePuntId={wachtOpStartVraag ? null : activePunt?.id ?? null}
          andereSpelers={andereSpelers}
          specialeItems={specialeItems.filter((i) => i.type !== "plekzooi")}
          ghostedPuntId={ghostTot ? activePunt?.id ?? null : null}
          richtingNaar={wachtOpStartVraag && richtingTelt ? richtPunt : null}
        />

        {/* Na het welkomstscherm: eerst 25 meter de goede kant op lopen voor de startvraag */}
        {wachtOpStartVraag && (
          // Naast de zoomknoppen (niet eroverheen); de pijl in een rondje, net als rechtsboven bij het volgende punt
          // Tik = kompas aan (iPhone vraagt toestemming); de pijl draait dan mee met de telefoon
          <div className="startvraag-melding" role="button" tabIndex={0} onClick={kompasAan ? undefined : zetKompasAan}
            title={kompasAan ? "De pijl wijst de kant op waar je heen moet" : "Tik om de pijl mee te laten draaien met je telefoon"}>
            {richtingTelt && positie && richtPunt && (() => {
              startKoersRef.current = richting(positie.latitude, positie.longitude, richtPunt.latitude, richtPunt.longitude) - 90;
              return (
                <span className="startvraag-pijl" aria-hidden>
                  <span ref={startPijlRef} style={{ transform: `rotate(${startKoersRef.current - (kompasAan ? kopRef.current ?? 0 : 0)}deg)` }}>➤</span>
                  <span className="startvraag-kompas">{kompasAan ? "🧭" : "N↑"}</span>
                </span>
              );
            })()}
            <span>🚶 Loop nog <strong>{nogTeLopen} meter</strong>{richtingTelt ? " langs de oranje stippellijn" : ""}, dan krijg je je eerste vraag!</span>
          </div>
        )}

        {/* Zonder bereik: wat er nog wacht om verstuurd te worden */}
        {wachtend > 0 && (
          <div className="geen-bereik" role="status">
            {spelAfgelopen
              ? <>🏁 Bijna klaar! Je laatste {wachtend === 1 ? "stap gaat" : `${wachtend} stappen gaan`} mee zodra er bereik is.</>
              : <>📡 Geen bereik · {wachtend === 1 ? "1 stap wacht" : `${wachtend} stappen wachten`}, gaat vanzelf mee</>}
          </div>
        )}
        {/* Bewaard zonder bereik, maar later door de server geweigerd: laten zien waarom (tik = weg) */}
        {mislukt.length > 0 && (
          <button type="button" className="geen-bereik geen-bereik--mislukt" onClick={wisMislukt}
            title={mislukt.map((m) => m.reden).join("\n")}>
            ⚠️ {mislukt.length === 1 ? "1 stap kon" : `${mislukt.length} stappen konden`} niet mee: {mislukt[mislukt.length - 1].reden}. Vraag zo nodig de organisatie. (tik = sluiten)
          </button>
        )}

        {/* ⛔ In een verboden gebied: duidelijke waarschuwing tot het team eruit is */}
        {inVerbodenGebied && (
          <div className="verboden-melding" role="alert">⛔ Je bent in een verboden gebied: <strong>{inVerbodenGebied}</strong>. Loop terug!</div>
        )}

        {/* Afstand en richting naar het volgende punt (de kaart staat altijd met het noorden boven) */}
        {positie && activePunt && !wachtOpStartVraag && !ghostTot && !popupPunt && !bereiktIds.has(activePunt.id) && (
          <button type="button" className="doel-wijzer" aria-live="polite" onClick={kompasAan ? undefined : zetKompasAan}
            title={kompasAan ? "De pijl wijst de kant op waar je heen moet (kompas aan)" : "Afstand en richting (noorden boven). Tik om de pijl mee te laten draaien met je telefoon"}>
            {(() => {
              koersRef.current = richting(positie.latitude, positie.longitude, activePunt.latitude, activePunt.longitude);
              return <span ref={pijlRef} className="doel-wijzer-pijl" aria-hidden style={{ transform: `rotate(${koersRef.current - (kompasAan ? kopRef.current ?? 0 : 0)}deg)` }}>➤</span>;
            })()}
            <span>{afstandTekst(haversine(positie.latitude, positie.longitude, activePunt.latitude, activePunt.longitude))}</span>
            <span className="doel-wijzer-kompas" aria-hidden>{kompasAan ? "🧭" : "N↑"}</span>
          </button>
        )}

        {/* Centreren op de eigen plek (naast 📍, of op die plek als 📍 er niet staat) */}
        {positie && !popupPunt && (
          <button onClick={() => setCentreerVerzoek((n) => n + 1)} title="Kaart op mijn plek zetten" aria-label="Kaart op mijn plek zetten"
            className="pr-loc-btn"
            style={{ bottom: knoepBottomOffset, left: 16, zIndex: 1000 }}>
            🎯
          </button>
        )}


        {/* Punt niet bereikbaar → organisatie waarschuwen (rechtsonder, op één lijn met 📍) */}
        {activePunt && !bereiktIds.has(activePunt.id) && !popupPunt && !ghostTot && (
          <button
            onClick={hulpOpen ? undefined : meldOnbereikbaar}
            disabled={hulpOpen}
            title="Meld dat jullie het volgende punt niet kunnen bereiken"
            className={hulpOpvallend ? undefined : "hulp-knop-rustig"}
            style={{
              position: "absolute", bottom: knoepBottomOffset, right: 16, zIndex: 1000,
              padding: "7px 12px", borderRadius: 99,
              background: hulpOpen ? "rgba(15,23,42,0.85)" : hulpOpvallend ? "rgba(255,138,0,0.92)" : "rgba(15,23,42,0.6)",
              border: "2px solid #fff", color: "#fff",
              fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-display)",
              boxShadow: "0 3px 10px rgba(0,0,0,0.4)", cursor: hulpOpen ? "default" : "pointer",
            }}>
            {hulpOpen ? "⏳ Organisatie gewaarschuwd" : "⚠️ Niet bereikbaar?"}
          </button>
        )}


        {/* Inventaris balk onderin de kaart */}
        {/* Eerste keer een item van deze soort: kort wat het doet */}
        {eersteItem && ITEM_INFO[eersteItem] && (
          <div className="eerste-item" role="status" style={{ bottom: knoepBottomOffset + 52 }} onClick={() => setEersteItem(null)}>
            <span className="eerste-item-emoji" aria-hidden>{ITEM_INFO[eersteItem].emoji}</span>
            <span><strong>Je hebt een {ITEM_INFO[eersteItem].naam.toLowerCase()}!</strong> {ITEM_INFO[eersteItem].beschrijving(waarden)} Tik onderin op het item om het te gebruiken.</span>
            <button type="button" className="eerste-item-sluit" aria-label="Sluiten">✕</button>
          </div>
        )}
        <InventarisBar inventaris={inventaris} onGebruik={(item) => { setEersteItem(null); setActiveSpeciaalItem(item); }} />
      </div>

      {/* Punt bereikt → vraag/info popup */}
      {popupPunt && (
        <VraagPopup
          punt={popupPunt}
          onVerwerkt={puntVerwerkt}
          start={startPunt && popupPunt.id === startPunt.id ? (startVraagKlaar ? "vraag" : "uitleg") : undefined}
          startUitleg={{ regels: puzzel ? [...SPELUITLEG[modus], puzzelUitleg(puzzel)] : SPELUITLEG[modus], ...START_AFSLUITING, meter: startVraagMeter }}
          onStartVraagLater={() => { vraagKompas(); setPopupPunt(null); setStartVraagVanaf(kmAfgelegdRef.current); }}
        />
      )}

      {/* Speciaal item gebruiken */}
      {activeSpeciaalItem && (
        <SpeciaalItemPopup
          item={activeSpeciaalItem}
          // Gefinishte teams alleen met de items die de beheerder voor na de finish heeft aangezet
          andereSessies={andereSpelers
            .filter((s) => !s.gefinisht || doelNaFinish.includes(activeSpeciaalItem.type))
            .map((s) => ({ session_id: s.session_id, teamnaam: s.teamnaam, icon: s.icon ?? null, gefinisht: s.gefinisht }))}
          waarden={waarden}
          plek={positie ? { lat: positie.latitude, lng: positie.longitude } : null}
          onVerwerkt={inventarisItemGebruikt}
          onSluit={bewaarItemVoorLater}
        />
      )}

      {/* Speciale items legende */}
      {legendeOpen && (
        <SpeciaalItemLegende
          extraUitleg={puzzel ? [puzzelUitleg(puzzel)] : []}
          onSluit={() => setLegendeOpen(false)}
          itemTypen={itemTypen}
          modus={modus}
          waarden={waarden}
          schermAan={schermAan}
        />
      )}

      {/* Item opgepakt — groot icoon dat de speler zelf wegtikt */}
      {opgepakt && (() => {
        const info = ITEM_INFO[opgepakt.item.type];
        const sluit = () => {
          if (opgepakt.item.type === "wissel") setActiveSpeciaalItem(opgepakt.item);
          setOpgepakt(null);
        };
        return (
          <div onClick={sluit} style={{
            position: "fixed", inset: 0, zIndex: 2500,
            background: "rgba(12,3,34,0.78)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div onClick={(e) => e.stopPropagation()} className="pr-panel" style={{ maxWidth: 340, width: "100%" }}>
              <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", paddingTop: 24 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/items/${opgepakt.item.type}.webp`} alt="" style={{
                  width: 150, height: 150,
                  filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(255,217,59,0.45))",
                  animation: "pr-item-pop 0.45s cubic-bezier(.2,1.6,.4,1)",
                }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", color: "#fff" }}>
                  {info?.naam ?? opgepakt.item.name} opgepakt!
                </div>
                {info && (
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.45 }}>
                    {info.beschrijving(waarden)}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--pr-gold)", fontWeight: 700 }}>
                  {opgepakt.extra}
                </p>
                <button className="btn-premium--compact" style={{ marginTop: 6 }} onClick={sluit}>
                  {opgepakt.item.type === "wissel" ? "KIES EEN TEAM →" : "TOP!"}
                </button>
              </div>
            </div>
            <style>{`@keyframes pr-item-pop { 0% { transform: scale(0.3) rotate(-12deg); opacity: 0 } 100% { transform: scale(1) rotate(0); opacity: 1 } }`}</style>
          </div>
        );
      })()}

      {/* Spook — groot spook met aftelling; kaart blijft eronder bruikbaar voor items */}
      {ghostTot && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1500, pointerEvents: "none",
          // Doorzichtig genoeg om de kaart eronder te blijven zien; tekst leesbaar door de schaduw
          background: "radial-gradient(circle at 50% 45%, rgba(88,28,135,0.32) 0%, rgba(15,10,40,0.42) 70%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "#fff", gap: 10, textAlign: "center", padding: "0 24px",
        }}>
          <div style={{ fontSize: "9rem", lineHeight: 1, filter: "drop-shadow(0 0 30px rgba(196,181,253,0.8))", animation: "pr-spook-zweef 2.4s ease-in-out infinite" }}>👻</div>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 900, letterSpacing: "0.05em", textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
            BOE! Je punt is weg
          </h1>
          <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
            Een ander team heeft je volgende punt verstopt. Het komt terug over:
          </p>
          <div style={{ fontSize: "4.5rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", textShadow: "0 4px 20px rgba(0,0,0,0.85)" }}>
            {String(Math.floor(ghostSecondsLeft / 60)).padStart(2, "0")}:{String(ghostSecondsLeft % 60).padStart(2, "0")}
          </div>
          <style>{`@keyframes pr-spook-zweef { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }`}</style>
        </div>
      )}

      {/* Tussenstand — door admin getoond */}
      {tussenstand && (
        <TussenstandPopup
          tussenstand={tussenstand}
          resterendeSeconden={tussenstandResterend}
          onSluit={sluitTussenstand}
        />
      )}

      {/* Plek zooi overlay — rood scherm met afteltimer */}
      {plekzooiActief && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "linear-gradient(160deg, #7f1d1d 0%, #b91c1c 55%, #991b1b 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "#fff", gap: 20,
          userSelect: "none",
        }}>
          <div style={{ fontSize: "5rem", lineHeight: 1 }}>💥</div>
          <h1 style={{
            margin: 0, fontSize: "2.6rem", fontWeight: 900,
            letterSpacing: "0.06em", textShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}>PLEK ZOOI!</h1>
          <p style={{ margin: 0, fontSize: "1rem", opacity: 0.85, textAlign: "center", padding: "0 32px" }}>
            Je zit vast — de kaart is niet beschikbaar
          </p>
          <div style={{
            fontSize: "5rem", fontWeight: 800,
            fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em",
            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            marginTop: 8,
          }}>
            {String(Math.floor(plekzooiSecondsLeft / 60)).padStart(2, "0")}:{String(plekzooiSecondsLeft % 60).padStart(2, "0")}
          </div>
          <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.55 }}>
            Wacht tot de timer op nul staat
          </p>
        </div>
      )}
    </div>
  );
}
