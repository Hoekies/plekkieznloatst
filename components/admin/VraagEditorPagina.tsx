"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { RoutePunt, Vraag, AntwoordOptie, VraagType } from "@/types/database";
import AfbeeldingUpload from "./AfbeeldingUpload";
import BevestigKnop from "./BevestigKnop";
import { naamWoorden } from "@/lib/punt-naam";
import NaamKiezer from "./NaamKiezer";
import Vragenbank, { type BankVraag } from "./editor/Vragenbank";
import { toonMelding } from "./Melding";
import { foutUitleg, uitlegBijStatus } from "@/lib/fout-uitleg";
import dynamic from "next/dynamic";
import type { KaartPunt } from "./PuntMiniKaart";
import Venster from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";
import PuzzelLetterKeuze, { type PuzzelKoppeling } from "@/components/admin/editor/PuzzelLetterKeuze";
import KaartPrikker from "@/components/shared/KaartPrikker";
import { KLEUR_RAND, KLEUR_TEKST } from "@/components/speler/VraagPopup";
import { KAART_STRALEN } from "@/lib/vraag-soorten";

const PuntMiniKaart = dynamic(() => import("./PuntMiniKaart"), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export type VraagMetAntwoorden = Vraag & { answer_options: AntwoordOptie[] };

const KLEUREN = ["geel", "blauw", "rood", "groen"] as const;
// Lichtere varianten voor tekst en rondjes op de donkere admin-achtergrond (#1E40AF was onleesbaar)
const LABEL_KLEUR: Record<string, string> = {
  geel: "#F59E0B", blauw: "#60A5FA", rood: "#F87171", groen: "#22C55E",
};
const KLEUR_NAAM = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

// 🚧 Nieuwe vraagsoorten nog niet kiezen: de spelersapp kan ze nog niet tonen
const NIEUWE_SOORTEN_AAN = false;

const TYPE_LABEL: Record<VraagType, string> = {
  meerkeuze_tekst: "📝 Meerkeuze",
  meerkeuze_afbeelding: "🖼️ Meerkeuze met plaatjes",
  open: "✍️ Open vraag",
  foto_opdracht: "📷 Foto-opdracht",
  stemvraag: "🗳️ Stemvraag",
  anagram: "🔤 Anagram",
  volgorde: "🔀 Volgorde",
  kaartvraag: "🗺️ Kaartvraag",
};

// Korte namen voor de knoppen (de volledige naam staat in de tooltip)
const TYPE_KORT: Record<VraagType, string> = {
  meerkeuze_tekst: "📝 Meerkeuze", meerkeuze_afbeelding: "🖼️ Plaatjes", open: "✍️ Open", foto_opdracht: "📷 Foto", stemvraag: "🗳️ Stemmen",
  anagram: "🔤 Anagram", volgorde: "🔀 Volgorde", kaartvraag: "🗺️ Kaart",
};
// Snelkeuze voor de punten
const PUNTEN_SNEL = [25, 50, 65, 100];

// "Wijzigingen niet opgeslagen?": zelfde opbouw als de andere bevestigingen (icoon, titel, één knop, ✕)
export function NietOpgeslagenVenster({ onWeg, onSluit }: { onWeg: () => void; onSluit: () => void }) {
  return (
    <Venster onSluit={onSluit} breedte={340} rand={20} relatief>
        <button type="button" className="editor-paneel-sluit venster-sluit" onClick={onSluit} title="Terug naar de vraag" aria-label="Terug naar de vraag">✕</button>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "18px 44px 14px" }}>
          <div style={{ fontSize: "2rem", lineHeight: 1 }}>✋</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "#fff", lineHeight: 1.3 }}>Wijzigingen niet opgeslagen</div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.4 }}>Ga je verder, dan zijn je wijzigingen aan deze vraag weg.</div>
          <button type="button" className="rl-knop rl-knop--rood" style={{ height: 40, minWidth: 120, padding: "0 22px", justifyContent: "center", fontWeight: 800, marginTop: 4 }}
            onClick={onWeg} autoFocus>Weggooien</button>
        </div>
    </Venster>
  );
}

// "Hoe heet dit punt?": bij het opslaan van een vraag, met de woorden uit de vraag als voorstel
function NaamVenster({ naam, onNaam, woorden, bezig, onSluit, onOpslaan }: {
  naam: string; onNaam: (n: string) => void; woorden: string[]; bezig: boolean; onSluit: () => void; onOpslaan: () => void;
}) {
  return (
    <Venster onSluit={onSluit} breedte={420} rand={20} relatief>
        <button type="button" className="editor-paneel-sluit venster-sluit" onClick={onSluit} title="Terug naar de vraag" aria-label="Terug naar de vraag">✕</button>
        <form className="pr-gem-panel-inner" onSubmit={(e) => { e.preventDefault(); if (naam.trim()) onOpslaan(); }}
          style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 22px 16px" }}>
          <div style={{ textAlign: "center", fontSize: "2rem", lineHeight: 1 }}>🏷️</div>
          <div style={{ textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "#fff" }}>Hoe heet dit punt?</div>
          <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--muted)" }}>Spelers zien de naam pas na afloop. Tik op 💡 voor een woord uit de vraag.</div>
          <NaamKiezer naam={naam} onNaam={onNaam} woorden={woorden} hoogte={42} startOpen autoFocus />
          <button type="submit" className="rl-knop hoofdknop" disabled={bezig || !naam.trim()}
            style={{ height: 42, fontWeight: 800, justifyContent: "center", display: "inline-flex", alignItems: "center" }}>
            {bezig ? "Opslaan…" : <><Icoon naam="opslaan" />{" Opslaan"}</>}
          </button>
        </form>
    </Venster>
  );
}

interface Props {
  routeId: string;
  punt: RoutePunt;
  bestaandeVraag: VraagMetAntwoorden | null;
  // Geopend als venster in de route-editor: sluiten zonder de pagina te herladen.
  // Krijgt de opgeslagen vraag mee, null na verwijderen, of undefined bij gewoon terug.
  onSluit?: (vraag: VraagMetAntwoorden | null | undefined) => void;
  // Andere tekst op de opslaanknop, bijvoorbeeld "Opslaan & volgende →" bij alle vragen achter elkaar
  opslaanLabel?: string;
  // Andere punten van de route, klein op het kaartje ter oriëntatie; label = nummer op de kaart
  kaartPunten?: KaartPunt[];
  // De naam van het punt is hier ook te wijzigen; zo hoort de route-editor het
  onNaamGewijzigd?: (puntId: string, naam: string) => void;
  // Bij alle vragen achter elkaar: bladeren, direct naast de titel
  navigatie?: { positie: string; onVorige?: () => void; onVolgende?: () => void };
  // Zijn er niet-opgeslagen wijzigingen? (zodat de lijst bij alle vragen kan waarschuwen)
  onGewijzigd?: (gewijzigd: boolean) => void;
  // 🧩 Puzzelwoord aan: per vraag kiezen hoeveel letters een goed antwoord geeft (meteen opgeslagen)
  puzzel?: PuzzelKoppeling;
  // ❓ Punten voor een nieuwe vraag (route-instelling); anders 65
  standaardPunten?: number;
  // Opslaan en meteen de volgende vraag zonder vraag openen (route-editor); naam = welk punt dat is
  onOpslaanVolgende?: (vraag: VraagMetAntwoorden) => void;
  volgendeNaam?: string;
}

export default function VraagEditorPagina({ routeId, punt, bestaandeVraag, onSluit, opslaanLabel, kaartPunten, onNaamGewijzigd, navigatie, onGewijzigd, puzzel, standaardPunten = 65, onOpslaanVolgende, volgendeNaam }: Props) {
  const router = useRouter();
  // Terug naar de route: als venster gewoon sluiten, als losse pagina naar de route-editor
  const terug = (vraag?: VraagMetAntwoorden | null) => onSluit ? onSluit(vraag) : router.push(`/admin/routes/${routeId}`);
  const [type, setType] = useState<VraagType>(bestaandeVraag?.type ?? "meerkeuze_tekst");
  const [tekst, setTekst] = useState(bestaandeVraag?.question_text ?? "");
  // 💡 Vraagideeën uit wat er rond het punt op de kaart staat
  const [ideeen, setIdeeen] = useState<{ tekst: string; type: "open" | "foto_opdracht"; bij: string }[] | null>(null);
  const [ideeenStatus, setIdeeenStatus] = useState<"dicht" | "laden" | "open">("dicht");
  async function haalIdeeen() {
    if (ideeenStatus === "open") { setIdeeenStatus("dicht"); return; }
    if (ideeen) { setIdeeenStatus("open"); return; }
    setIdeeenStatus("laden");
    const res = await fetch(`/api/admin/vraag-ideeen?lat=${punt.latitude}&lng=${punt.longitude}`).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { toonMelding(data.fout ?? "Ideeën ophalen lukte niet", "fout"); setIdeeenStatus("dicht"); return; }
    setIdeeen(data.ideeen ?? []);
    setIdeeenStatus("open");
  }
  const [vraagAfbeelding, setVraagAfbeelding] = useState<string | null>(bestaandeVraag?.question_image_path ?? null);
  // Nieuwe vraag: standaard 65 punten
  const [punten, setPunten] = useState(bestaandeVraag?.points ?? standaardPunten);
  // 🗺️ Kaartvraag (migratie 009): de goede plek en de straal waarbinnen het helemaal goed is
  const [kaartPlek, setKaartPlek] = useState<{ lat: number; lng: number } | null>(
    typeof bestaandeVraag?.kaart_lat === "number" && typeof bestaandeVraag?.kaart_lng === "number" ? { lat: bestaandeVraag.kaart_lat, lng: bestaandeVraag.kaart_lng } : null);
  const [kaartStraal, setKaartStraal] = useState<number>(bestaandeVraag?.kaart_straal ?? 50);
  // Per vraag aan of uit: een geluidsfragment en een tijdslimiet (migratie 014); husselen staat bij de route
  const [geluidPad, setGeluidPad] = useState<string | null>(bestaandeVraag?.geluid_pad ?? null);
  const [tijdslimiet, setTijdslimiet] = useState<number | null>(bestaandeVraag?.tijdslimiet_seconden ?? null);
  const [geluidBezig, setGeluidBezig] = useState(false);
  async function kiesGeluid(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    e.target.value = "";
    if (!bestand) return;
    setGeluidBezig(true);
    const data = new FormData();
    data.append("bestand", bestand);
    data.append("bucket", "vraag-geluid");
    const res = await fetch("/api/admin/upload", { method: "POST", body: data }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setGeluidBezig(false);
    if (!res?.ok) { toonMelding(json.fout ?? "Geluid uploaden lukte niet", "fout"); return; }
    setGeluidPad(json.pad);
  }

  const [antwoorden, setAntwoorden] = useState<{
    color: typeof KLEUREN[number];
    text: string;
    image_path: string | null;
    is_correct: boolean;
    // Leeg = standaard (goed antwoord krijgt de vraagpunten, fout 0); mag negatief zijn
    punten: string;
    // 💬 Waarom dit antwoord (niet) goed is; leeg = geen uitleg
    uitleg: string;
  }[]>(
    bestaandeVraag?.answer_options.length === 4
      ? bestaandeVraag.answer_options.map((a) => ({
          color: a.color as typeof KLEUREN[number],
          text: a.text ?? "",
          image_path: a.image_path,
          is_correct: a.is_correct,
          punten: a.punten === null || a.punten === undefined ? "" : String(a.punten),
          uitleg: a.uitleg ?? "",
        }))
      // Stemvraag met 2 of 3 keuzes: op hun kleur terugzetten, de rest leeg
      : bestaandeVraag?.type === "stemvraag"
        ? KLEUREN.map((c) => {
            const a = bestaandeVraag.answer_options.find((o) => o.color === c);
            return { color: c, text: a?.text ?? "", image_path: null, is_correct: false, punten: "", uitleg: "" };
          })
        : KLEUREN.map((c) => ({ color: c, text: "", image_path: null, is_correct: c === "geel", punten: "", uitleg: "" }))
  );
  // Punten per antwoord: een uitzondering, dus pas zichtbaar als je hem aanzet (of als hij al gebruikt wordt)
  const [perAntwoord, setPerAntwoord] = useState(() => antwoorden.some((a) => a.punten !== ""));
  // 💬 Uitleg per antwoord (bijv. waarom een antwoord fout is): ook een optie, zichtbaar als je hem aanzet
  const [perUitleg, setPerUitleg] = useState(() => antwoorden.some((a) => a.uitleg !== ""));
  const antwoordRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [openAntwoorden, setOpenAntwoorden] = useState(
    bestaandeVraag?.correct_text_answers?.join("\n") ?? ""
  );
  const [numeriekeWaarde, setNumeriekeWaarde] = useState(
    bestaandeVraag?.numeric_answer?.toString() ?? ""
  );
  const [tolerantie, setTolerantie] = useState(
    bestaandeVraag?.numeric_tolerance?.toString() ?? "0"
  );
  const [isNumeriek, setIsNumeriek] = useState(
    bestaandeVraag?.numeric_answer !== null && bestaandeVraag?.numeric_answer !== undefined
  );

  // Naam van het punt, met een voorstel uit de vraag zoals in het puntpaneel (knop 💡)
  const [naam, setNaam] = useState(punt.name ?? "");
  const woorden = naamWoorden({
    question_text: tekst,
    correct_text_answers: openAntwoorden.split("\n").map((r) => r.trim()).filter(Boolean),
    answer_options: antwoorden.map((a) => ({ text: a.text, is_correct: a.is_correct })),
  });

  const [opslaan, setOpslaan] = useState(false);
  const [fout, setFout] = useState("");
  const [opgeslagen, setOpgeslagen] = useState(false);

  // Niet-opgeslagen wijzigingen: vergelijken met hoe de vraag binnenkwam
  // (ook geluid en tijdslimiet: die gaan pas mee bij Opslaan)
  const huidig = JSON.stringify({ type, tekst, vraagAfbeelding, punten, antwoorden, openAntwoorden, numeriekeWaarde, tolerantie, isNumeriek, naam: naam.trim(), geluidPad, tijdslimiet, kaartPlek, kaartStraal });
  const beginRef = useRef<string | null>(null);
  if (beginRef.current === null) beginRef.current = huidig;
  const gewijzigd = huidig !== beginRef.current;
  useEffect(() => { onGewijzigd?.(gewijzigd); }, [gewijzigd, onGewijzigd]);
  // Weggaan met wijzigingen: eerst vragen
  const [verlaatNa, setVerlaatNa] = useState<(() => void) | null>(null);
  const verlaat = (doe: () => void) => { if (gewijzigd) setVerlaatNa(() => doe); else doe(); };

  // Instellingen als chips onder de vraag (geluid, tijdslimiet, QR-test): één tegelijk open
  const [instelling, setInstelling] = useState<"geluid" | "tijd" | "qr" | null>(null);
  const wisselInstelling = (i: "geluid" | "tijd" | "qr") => setInstelling((x) => (x === i ? null : i));
  // 📱 Voorbeeld: het goede antwoord pas tonen als je dat wilt (zoals de speler het na het antwoorden ziet)
  const [toonAntwoord, setToonAntwoord] = useState(false);
  const [kaartGroot, setKaartGroot] = useState(false);
  // Opslaan en meteen de volgende vraag (ook als eerst de naam van het punt gevraagd wordt)
  const volgendeRef = useRef(false);

  // QR-unlock
  const [qrEnabled, setQrEnabled] = useState(punt.qr_unlock_enabled ?? false);
  const [qrSecret, setQrSecret] = useState(punt.qr_secret ?? "");
  const [qrOpslaan, setQrOpslaan] = useState(false);
  // QR-code: opent de proefversie van deze vraag op de telefoon (niets opgeslagen); van daaruit kan een ingelogd
  // testteam het punt ook echt openen
  const qrUrl = qrSecret ? `${SITE_URL}/proef/${punt.id}?s=${qrSecret}` : "";

  // Vraag uit de vragenbank overnemen: vult het formulier, opslaan doe je zelf
  function neemOver(v: BankVraag) {
    setType(v.type as VraagType);
    setTekst(v.question_text);
    setVraagAfbeelding(v.question_image_path);
    setPunten(v.points);
    if (v.answer_options.length === 4) {
      const nieuw = v.answer_options.map((a) => ({
        color: a.color as typeof KLEUREN[number], text: a.text ?? "", image_path: a.image_path, is_correct: a.is_correct,
        punten: a.punten === null || a.punten === undefined ? "" : String(a.punten),
        uitleg: a.uitleg ?? "",
      }));
      setAntwoorden(nieuw);
      if (nieuw.some((a) => a.punten !== "")) setPerAntwoord(true);
      if (nieuw.some((a) => a.uitleg !== "")) setPerUitleg(true);
    } else if (v.type === "stemvraag") {
      setAntwoorden(KLEUREN.map((c) => ({ color: c, text: v.answer_options.find((o) => o.color === c)?.text ?? "", image_path: null, is_correct: false, punten: "", uitleg: "" })));
    } else {
      setAntwoorden(KLEUREN.map((c) => ({ color: c, text: "", image_path: null, is_correct: c === "geel", punten: "", uitleg: "" })));
    }
    setOpenAntwoorden((v.correct_text_answers ?? []).join("\n"));
    const numeriek = v.numeric_answer !== null && v.numeric_answer !== undefined;
    setIsNumeriek(numeriek);
    setNumeriekeWaarde(numeriek ? String(v.numeric_answer) : "");
    setTolerantie(String(v.numeric_tolerance ?? 0));
    setGeluidPad(v.geluid_pad);
    setTijdslimiet(v.tijdslimiet_seconden);
    toonMelding("Vraag overgenomen: pas aan en sla op", "ok");
  }

  // Goed of fout per antwoord: meerdere goede antwoorden mag, maar er moet er minstens één goed blijven
  function setCorrect(index: number) {
    setAntwoorden((a) => {
      if (a[index].is_correct && a.filter((x) => x.is_correct).length === 1) {
        toonMelding("Er moet minstens één antwoord goed zijn", "info");
        return a;
      }
      return a.map((ant, i) => i === index ? { ...ant, is_correct: !ant.is_correct } : ant);
    });
  }

  function wisselPerAntwoord() {
    // Uitzetten = weer de standaard (goed krijgt de vraagpunten, fout 0)
    if (perAntwoord) setAntwoorden((a) => a.map((x) => ({ ...x, punten: "" })));
    setPerAntwoord(!perAntwoord);
  }

  // Fout bij een antwoord: melding met de kleur, en de cursor meteen in dat veld
  function antwoordFout(i: number, melding: string) {
    setFout(melding);
    setOpslaan(false);
    antwoordRefs.current[i]?.focus();
  }

  // Bij opslaan eerst de naam van het punt vragen (venster); daarna pas echt opslaan
  const [naamVenster, setNaamVenster] = useState(false);

  async function slaOp(e?: React.FormEvent, naamGekozen = false) {
    e?.preventDefault();
    setFout(""); setOpslaan(true);

    if (!tekst.trim()) { setFout("De vraag is nog leeg. Typ bij Vraag wat de spelers moeten beantwoorden."); setOpslaan(false); return; }

    const body: Record<string, unknown> = {
      type,
      question_text: tekst.trim(),
      question_image_path: vraagAfbeelding,
      points: punten,
      geluid_pad: geluidPad,
      tijdslimiet_seconden: type === "foto_opdracht" ? null : tijdslimiet,
    };

    if (type === "foto_opdracht") {
      // Foto-opdracht: alleen tekst en punten, geen antwoordopties
    } else if (type === "open") {
      if (isNumeriek) {
        const num = parseFloat(numeriekeWaarde.replace(",", "."));
        if (isNaN(num)) { setFout("Het goede antwoord is geen getal. Vul een getal in, bijvoorbeeld 1980 of 1,5."); setOpslaan(false); return; }
        body.numeric_answer = num;
        body.numeric_tolerance = parseFloat(tolerantie.replace(",", ".")) || 0;
      } else {
        const regels = openAntwoorden.split("\n").map((r) => r.trim()).filter(Boolean);
        if (!regels.length) { setFout("Er staat nog geen goed antwoord. Vul er minstens één in (één per regel)."); setOpslaan(false); return; }
        body.correct_text_answers = regels;
      }
    } else if (type === "anagram") {
      // 🔤 Het woord; de spelers zien de letters door elkaar
      const woord = openAntwoorden.split("\n")[0]?.trim() ?? "";
      if (woord.replace(/\s+/g, "").length < 3) { setFout("Vul het woord in (minstens 3 letters)."); setOpslaan(false); return; }
      body.correct_text_answers = [woord];
    } else if (type === "volgorde") {
      // 🔀 De items in de goede volgorde (van boven naar beneden); 3 of 4
      const gevuld = antwoorden.filter((a) => a.text.trim());
      if (gevuld.length < 3) return antwoordFout(antwoorden.findIndex((a) => !a.text.trim()), "Een volgordevraag heeft minstens 3 items. Vul er nog een in.");
      body.antwoorden = gevuld.map((a) => ({ color: a.color, answer_type: "tekst", text: a.text.trim(), image_path: null, is_correct: false, punten: null }));
    } else if (type === "kaartvraag") {
      // 🗺️ De goede plek op de kaart
      if (!kaartPlek) { setFout("Tik op de kaart waar het goede antwoord ligt."); setOpslaan(false); return; }
      body.kaart_lat = kaartPlek.lat; body.kaart_lng = kaartPlek.lng; body.kaart_straal = kaartStraal;
    } else if (type === "stemvraag") {
      // Lege keuzes vallen weg; minstens twee nodig
      const gevuld = antwoorden.filter((a) => a.text.trim());
      if (gevuld.length < 2) return antwoordFout(antwoorden.findIndex((a) => !a.text.trim()), "Een stemvraag heeft minstens twee keuzes. Vul er nog een in.");
      body.antwoorden = gevuld.map((a) => ({ color: a.color, answer_type: "tekst", text: a.text.trim(), image_path: null, is_correct: false, punten: null }));
    } else {
      const antwoordType = type === "meerkeuze_afbeelding" ? "afbeelding" : "tekst";
      const leeg = antwoorden.findIndex((a) => antwoordType === "tekst" ? !a.text.trim() : !a.image_path);
      if (leeg >= 0) {
        const kleur = KLEUR_NAAM(antwoorden[leeg].color);
        return antwoordFout(leeg, antwoordType === "tekst"
          ? `Antwoord ${kleur} is nog leeg. Vul het in; alle vier de antwoorden zijn nodig.`
          : `Antwoord ${kleur} heeft nog geen plaatje. Upload er een; alle vier de antwoorden zijn nodig.`);
      }
      const foutePunten = antwoorden.findIndex((a) => a.punten.trim() !== "" && !Number.isFinite(Number(a.punten)));
      if (foutePunten >= 0) {
        setFout(`Bij antwoord ${KLEUR_NAAM(antwoorden[foutePunten].color)} staan geen geldige punten. Vul een getal in (bijv. 10 of -5) of laat het leeg.`);
        setOpslaan(false); return;
      }
      body.antwoorden = antwoorden.map((a) => ({
        color: a.color,
        answer_type: antwoordType,
        text: antwoordType === "tekst" ? a.text.trim() : null,
        image_path: antwoordType === "afbeelding" ? a.image_path : null,
        is_correct: a.is_correct,
        punten: a.punten.trim() === "" ? null : Math.round(Number(a.punten)),
        uitleg: perUitleg ? a.uitleg.trim() || null : null,
      }));
    }

    // Naam van het punt alleen vragen als het nog een standaardnaam heeft (bijv. "Punt 3"); een bewust gekozen
    // naam niet bij elke opslag opnieuw
    const standaardNaam = punt.type !== "eindpunt" && /^(punt \d+|startpunt|nieuw punt)?$/i.test(naam.trim());
    if (!naamGekozen && standaardNaam) { setOpslaan(false); setNaamVenster(true); return; }
    setNaamVenster(false);

    if (naam.trim() && naam.trim() !== punt.name) {
      const naamRes = await fetch(`/api/admin/routes/${routeId}/punten/${punt.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: naam.trim() }),
      }).catch(() => null);
      if (!naamRes?.ok) { setFout(await foutUitleg(naamRes, "Naam van het punt opslaan")); setOpslaan(false); return; }
      onNaamGewijzigd?.(punt.id, naam.trim());
    }

    const res = await fetch(`/api/admin/routes/${routeId}/punten/${punt.id}/vraag`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (!res?.ok) {
      setFout(await foutUitleg(res, "Opslaan"));
    } else if (volgendeRef.current && onOpslaanVolgende) {
      // Opslaan en volgende: meteen de volgende vraag zonder vraag
      volgendeRef.current = false;
      onOpslaanVolgende(await res.json());
      return;
    } else if (onSluit) {
      // Als venster: na opslaan meteen terug naar de kaart
      onSluit(await res.json());
      return;
    } else {
      beginRef.current = huidig;
      setOpgeslagen(true);
      setTimeout(() => setOpgeslagen(false), 2000);
    }
    setOpslaan(false);
  }

  async function verwijderVraag() {
    if (!bestaandeVraag) return;
    const res = await fetch(`/api/admin/routes/${routeId}/punten/${punt.id}/vraag`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toonMelding(await foutUitleg(res, "Vraag verwijderen"), "fout"); return; }
    terug(null);
  }

  async function toggleQr(inschakelen: boolean) {
    const nieuweSecret = inschakelen
      ? (qrSecret || crypto.randomUUID().replace(/-/g, "").slice(0, 12))
      : "";
    setQrOpslaan(true);
    const res = await fetch(`/api/admin/routes/${routeId}/punten/${punt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_unlock_enabled: inschakelen, qr_secret: nieuweSecret }),
    }).catch(() => null);
    setQrOpslaan(false);
    if (!res?.ok) { toonMelding(res ? await foutUitleg(res, "QR-code aanpassen") : uitlegBijStatus(0, "QR-code aanpassen"), "fout"); return; }
    setQrEnabled(inschakelen);
    setQrSecret(nieuweSecret);
  }

  function printQr() {
    const el = document.getElementById("qr-print-zone");
    if (!el) return;
    const naam = document.createElement("div").appendChild(document.createTextNode(punt.name)).parentElement!.innerHTML;
    const html = `<!DOCTYPE html><html><head><title>QR</title><style>
      body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
      h2 { margin-bottom:16px; }
    </style></head><body>
      <h2>${naam}</h2>
      <p style="margin-top:16px; font-size:14px; color:#555">Scan deze code om dit punt te ontgrendelen</p>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      w.addEventListener("load", () => {
        const container = w.document.body.querySelector("h2")?.parentElement;
        if (container) {
          const qr = el.cloneNode(true) as HTMLElement;
          container.insertBefore(qr, container.querySelector("p"));
        }
        w.print();
        URL.revokeObjectURL(url);
      });
    }
  }

  // Stemvraag: keuzes zoals bij meerkeuze, maar zonder goed antwoord
  const stem = type === "stemvraag";
  const meerkeuze = type === "meerkeuze_tekst" || type === "meerkeuze_afbeelding";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: onSluit ? "100%" : "100vh" }}>
      {/* Topbar: terug en bladeren links, vragenbank en verwijderen rechts */}
      <div className="admin-topbar" style={{ gap: 12 }}>
        <button type="button" onClick={() => verlaat(() => terug())} className="rl-knop" style={{ height: 32, flexShrink: 0 }}>
          ← Terug
        </button>
        {navigatie && (
          <button type="button" className="rl-knop" style={{ height: 32, flexShrink: 0 }} disabled={!navigatie.onVorige}
            onClick={() => navigatie.onVorige && verlaat(navigatie.onVorige)} title="Vorig punt">← Vorige</button>
        )}
        <h1 style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "1.05rem" }}>Vraag — {naam.trim() || punt.name}</h1>
        {navigatie && (
          <>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", flexShrink: 0 }}>{navigatie.positie}</span>
            <button type="button" className="rl-knop" style={{ height: 32, flexShrink: 0 }} disabled={!navigatie.onVolgende}
              onClick={() => navigatie.onVolgende && verlaat(navigatie.onVolgende)} title="Volgend punt, zonder deze vraag op te slaan">Overslaan →</button>
          </>
        )}
        <span style={{ flex: 1 }} />
        <Vragenbank puntId={punt.id} onKies={neemOver} />
      </div>

      {/* Formulier links (opslaan altijd in beeld), rechts de spelersweergave met het kaartje eronder */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>

        {/* ── Formulier ── */}
        <div className="vraag-form-kolom">
          <form id={`vraag-${punt.id}`} onSubmit={(e) => { volgendeRef.current = false; slaOp(e); }} className="vraag-form">

            <div className="form-group">
              <label className="form-label">Soort vraag</label>
              <div className="vraag-soorten">
                {/* 🔤 🔀 🗺️ Anagram, volgorde en kaartvraag komen erbij zodra de spelersapp ze kan tonen (in de maak) */}
                {(["meerkeuze_tekst", "meerkeuze_afbeelding", "open", "foto_opdracht", "stemvraag", ...(NIEUWE_SOORTEN_AAN ? ["anagram", "volgorde", "kaartvraag"] : [])] as VraagType[]).map((t) => (
                  <button key={t} type="button"
                    className={`rl-knop${type === t ? " rl-knop--cyan" : ""}`}
                    aria-pressed={type === t} title={TYPE_LABEL[t]}
                    onClick={() => setType(t)}>
                    {TYPE_KORT[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className="form-label" style={{ flex: 1, margin: 0 }}>Vraag</label>
                <button type="button" className={`rl-knop${ideeenStatus === "open" ? " rl-knop--cyan" : ""}`} style={{ height: 28, fontSize: "0.76rem" }}
                  onClick={haalIdeeen} disabled={ideeenStatus === "laden"} title="Vraagideeën uit wat er rond dit punt op de kaart staat (kerk, molen, café…)">
                  {ideeenStatus === "laden" ? <><Icoon naam="laden" />{" Zoeken…"}</> : <><Icoon naam="tip" />{" Ideeën"}</>}
                </button>
              </div>
              {ideeenStatus === "open" && ideeen && (
                <div className="vraag-ideeen">
                  {ideeen.length === 0
                    ? <span className="vraag-ideeen-leeg">Niets bijzonders gevonden binnen 150 m van dit punt.</span>
                    : ideeen.map((idee) => (
                      <button key={idee.tekst} type="button" className="vraag-idee"
                        onClick={() => { setTekst(idee.tekst); if (idee.type === "foto_opdracht") setType("foto_opdracht"); else if (type === "foto_opdracht") setType("open"); setIdeeenStatus("dicht"); }}>
                        {idee.type === "foto_opdracht" ? <><Icoon naam="camera" />{" "}</> : ""}{idee.tekst}
                      </button>
                    ))}
                  {ideeen.length > 0 && <span className="vraag-ideeen-leeg">Het antwoord zoek je zelf op, het liefst ter plekke.</span>}
                </div>
              )}
              <textarea className="form-textarea" spellCheck lang="nl" value={tekst} onChange={(e) => setTekst(e.target.value)}
                placeholder={type === "foto_opdracht" ? "Bijv. Maak een groepsfoto bij de molen" : "Typ hier de vraag…"} rows={2} style={{ minHeight: 54 }} />
              {/* Eén regel onder de vraag: afbeelding, geluid, tijdslimiet en QR-test (tik = openen), rechts de punten.
                  Zo blijven alle vier de antwoorden in beeld */}
              <div className="vraag-chips">
                <span className="vraag-chip-afbeelding" title="Afbeelding bij de vraag (optioneel)">
                  <AfbeeldingUpload huidigPad={vraagAfbeelding} bucket="vraag-afbeeldingen" onUpload={(pad) => setVraagAfbeelding(pad)} onVerwijder={() => setVraagAfbeelding(null)} compact />
                </span>
                <button type="button" className={`vraag-chip${instelling === "geluid" ? " aan" : ""}${geluidPad ? " gezet" : ""}`} onClick={() => wisselInstelling("geluid")} aria-expanded={instelling === "geluid"}>
                  🔊 {geluidPad ? "Geluid" : "Geen geluid"}
                </button>
                {type !== "foto_opdracht" && (
                  <button type="button" className={`vraag-chip${instelling === "tijd" ? " aan" : ""}${tijdslimiet ? " gezet" : ""}`} onClick={() => wisselInstelling("tijd")} aria-expanded={instelling === "tijd"}>
                    ⏱️ {tijdslimiet ? `${tijdslimiet} s` : "Geen tijdslimiet"}
                  </button>
                )}
                <button type="button" className={`vraag-chip${instelling === "qr" ? " aan" : ""}${qrEnabled ? " gezet" : ""}`} onClick={() => wisselInstelling("qr")} aria-expanded={instelling === "qr"}>
                  🧪 {qrEnabled ? "QR-test aan" : "QR-test"}
                </button>
                <span style={{ flex: 1 }} />
                <span className="vraag-punten-rij" title="Zoveel punten krijgt een team voor het goede antwoord">
                  <span className="vraag-punten-label">Punten</span>
                  {PUNTEN_SNEL.map((p) => (
                    <button key={p} type="button" className={`rl-knop${punten === p ? " rl-knop--cyan" : ""}`} onClick={() => setPunten(p)} aria-pressed={punten === p}>{p}</button>
                  ))}
                  <input className="form-input" type="number" min={0} value={punten} aria-label="Eigen aantal punten" onChange={(e) => setPunten(Number(e.target.value))} />
                </span>
              </div>
              {instelling && (
                <div className="vraag-chip-paneel">
                  {instelling === "geluid" && (
                    <>
                      {geluidPad ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <audio controls src={`${SUPABASE_URL}/storage/v1/object/public/vraag-geluid/${geluidPad}`} style={{ height: 34, maxWidth: "100%" }} />
                          <button type="button" className="rl-knop" onClick={() => setGeluidPad(null)} title="Geluid weghalen"><Icoon naam="wissen" /></button>
                        </div>
                      ) : (
                        <label className="rl-knop" style={{ alignSelf: "flex-start", cursor: "pointer", height: 32, fontSize: "0.8rem" }}>
                          {geluidBezig ? "⏳ Uploaden…" : "🎵 Geluid kiezen (mp3, m4a, wav)"}
                          <input type="file" accept="audio/*" onChange={kiesGeluid} style={{ display: "none" }} disabled={geluidBezig} />
                        </label>
                      )}
                      <span className="vraag-hint">Bijvoorbeeld bij <em>welk lied is dit?</em> De spelers spelen het af bij de vraag. Maximaal 3 MB.</span>
                    </>
                  )}
                  {instelling === "tijd" && (
                    <>
                      <div className="segment" role="radiogroup" aria-label="Tijdslimiet">
                        {([[null, "Uit"], [30, "30 s"], [60, "1 min"], [90, "1½ min"], [120, "2 min"]] as const).map(([sec, label]) => (
                          <button key={label} type="button" role="radio" aria-checked={tijdslimiet === sec} className={tijdslimiet === sec ? "aan" : ""} onClick={() => setTijdslimiet(sec)}>{label}</button>
                        ))}
                      </div>
                      <span className="vraag-hint">De spelers zien een aftelklok; is de tijd om, dan telt de vraag als fout.</span>
                    </>
                  )}
                  {instelling === "qr" && (
                    <>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <button type="button" className={`rl-knop schakel${qrEnabled ? " schakel--aan" : ""}`} role="switch" aria-checked={qrEnabled}
                          style={{ height: 32, fontSize: "0.8rem" }} disabled={qrOpslaan} onClick={() => toggleQr(!qrEnabled)}>
                          <Icoon naam="testen" /> Openen met QR-code<span className="schakel-bol" aria-hidden />
                        </button>
                        {qrEnabled && qrUrl && <button type="button" className="rl-knop" style={{ height: 32, fontSize: "0.8rem" }} onClick={printQr}><Icoon naam="printen" /> QR-code printen</button>}
                      </div>
                      <span className="vraag-hint">Scan met je telefoon: je krijgt deze vraag als proef, precies zoals de speler (er wordt niets opgeslagen). Wordt meteen opgeslagen.</span>
                      {qrEnabled && qrUrl && (
                        <div id="qr-print-zone" style={{ marginTop: 4, padding: 12, background: "#fff", borderRadius: 10, alignSelf: "flex-start" }}>
                          <QRCodeSVG value={qrUrl} size={140} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {puzzel && <PuzzelLetterKeuze puzzel={puzzel} puntId={punt.id} />}

            {/* 🔤 Anagram: het woord */}
            {type === "anagram" && (
              <div className="form-group">
                <label className="form-label">Het woord <span className="vraag-hint">· de spelers zien de letters door elkaar</span></label>
                <input className="form-input" value={openAntwoorden.split("\n")[0] ?? ""} maxLength={30} placeholder="vuurtoren"
                  onChange={(e) => setOpenAntwoorden(e.target.value)} />
                {(openAntwoorden.split("\n")[0] ?? "").trim().length >= 3 && (
                  <div className="anagram-letters anagram-letters--klein" aria-hidden>
                    {(openAntwoorden.split("\n")[0] ?? "").replace(/\s+/g, "").toUpperCase().split("").sort().map((l, i) => <span key={i}>{l}</span>)}
                  </div>
                )}
              </div>
            )}

            {/* 🔀 Volgorde: de items in de goede volgorde */}
            {type === "volgorde" && (
              <div className="form-group">
                <label className="form-label">Items in de goede volgorde <span className="vraag-hint">· van boven (1) naar beneden; 3 of 4</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {antwoorden.map((ant, i) => (
                    <div key={ant.color} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="volgorde-nummer">{i + 1}</span>
                      <input ref={(el) => { antwoordRefs.current[i] = el; }} className="form-input" style={{ flex: 1, margin: 0 }} maxLength={80}
                        value={ant.text} placeholder={i === 3 ? "Item 4 (mag leeg)" : `Item ${i + 1}`}
                        onChange={(e) => setAntwoorden((a) => a.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                    </div>
                  ))}
                </div>
                <span className="vraag-hint">Spelers krijgen punten naar het aantal items op de goede plek.</span>
              </div>
            )}

            {/* 🗺️ Kaartvraag: tik de goede plek aan */}
            {type === "kaartvraag" && (
              <div className="form-group">
                <label className="form-label">Goede plek <span className="vraag-hint">· tik op de kaart</span></label>
                <KaartPrikker centrum={kaartPlek ?? { lat: punt.latitude, lng: punt.longitude }} speld={null}
                  doel={kaartPlek ? { ...kaartPlek, straal: kaartStraal } : null} onKies={(lat, lng) => setKaartPlek({ lat, lng })} hoogte={240} />
                <label className="form-label" style={{ marginTop: 8 }}>Helemaal goed binnen</label>
                <div className="punten-snel">
                  {KAART_STRALEN.map((m) => <button key={m} type="button" className={`rl-knop${kaartStraal === m ? " rl-knop--cyan" : ""}`} onClick={() => setKaartStraal(m)}>{m} m</button>)}
                </div>
                <span className="vraag-hint">Verder weg: steeds minder punten, tot 0 op vijf keer die afstand.</span>
              </div>
            )}

            {stem && (
              <div className="form-group">
                <label className="form-label">Keuzes <span style={{ fontWeight: 400, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>· 2 tot 4; lege keuzes vallen weg</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {antwoorden.map((ant, i) => (
                    <div key={ant.color} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 10px", borderRadius: "var(--radius-md)", border: "2px solid var(--line)" }}>
                      <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, background: LABEL_KLEUR[ant.color] }} />
                      <input ref={(el) => { antwoordRefs.current[i] = el; }} className="form-input" spellCheck lang="nl" style={{ flex: 1, fontSize: "0.88rem" }}
                        value={ant.text} onChange={(e) => setAntwoorden((a) => a.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                        placeholder={i < 2 ? `Keuze ${i + 1}` : `Keuze ${i + 1} (mag leeg)`} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: 6, lineHeight: 1.45 }}>
                  🗳️ Elk team stemt. De teams die de meest gekozen keuze kozen, krijgen de punten zodra de stemming sluit: bij <strong>🏆 Uitslag vrijgeven</strong> of <strong>🏁 Spel afronden</strong>, of eerder met <strong>🗳️ Stemming sluiten</strong> bij Antwoorden → 📊 Per vraag.
                </div>
              </div>
            )}

            {meerkeuze && (
              <div className="form-group">
                <label className="form-label" style={{ margin: 0 }}>Antwoorden</label>
                <span className="vraag-hint" style={{ marginTop: -2 }}>Tik op <em>✗ fout</em> om een antwoord goed te maken; meer dan één goed mag.</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {antwoorden.map((ant, i) => (
                    <div key={ant.color} className="antw-rij" style={{
                      // Eerst de hele rand, dan links de kleur van het antwoord (andersom wist React de linkerkleur)
                      borderColor: ant.is_correct ? LABEL_KLEUR[ant.color] : "var(--line)",
                      borderLeftColor: LABEL_KLEUR[ant.color],
                      background: ant.is_correct ? `${LABEL_KLEUR[ant.color]}1f` : undefined,
                    }}>
                      {type === "meerkeuze_tekst" ? (
                        <input ref={(el) => { antwoordRefs.current[i] = el; }} className="form-input" spellCheck lang="nl" style={{ flex: 1, fontSize: "0.88rem" }}
                          value={ant.text}
                          onChange={(e) => setAntwoorden((a) => a.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                          placeholder={`Antwoord ${ant.color}`} />
                      ) : (
                        <AfbeeldingUpload
                          huidigPad={ant.image_path}
                          bucket="vraag-afbeeldingen"
                          onUpload={(pad) => setAntwoorden((a) => a.map((x, j) => j === i ? { ...x, image_path: pad } : x))}
                          onVerwijder={() => setAntwoorden((a) => a.map((x, j) => j === i ? { ...x, image_path: null } : x))}
                          compact
                        />
                      )}
                      {/* Goed of fout: één knop (tik = wisselen) */}
                      <button type="button" className={`antw-oordeel${ant.is_correct ? " antw-oordeel--goed" : ""}`} onClick={() => setCorrect(i)}
                        aria-pressed={ant.is_correct} aria-label={`Antwoord ${ant.color}: ${ant.is_correct ? "goed" : "fout"} (tik om te wisselen)`}>
                        {ant.is_correct ? "✓ goed" : "✗ fout"}
                      </button>
                      {perAntwoord && (
                        <>
                          <input className="form-input" type="number" step={1}
                            title="Punten voor dit antwoord (leeg = standaard, mag negatief)"
                            aria-label={`Punten voor antwoord ${ant.color}`}
                            value={ant.punten}
                            placeholder={ant.is_correct ? String(punten) : "0"}
                            onChange={(e) => setAntwoorden((a) => a.map((x, j) => j === i ? { ...x, punten: e.target.value } : x))}
                            style={{ width: 76, flexShrink: 0, fontSize: "0.88rem", textAlign: "right" }} />
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>pt</span>
                        </>
                      )}
                      {/* 💬 Uitleg op een eigen regel onder het antwoord */}
                      {perUitleg && (
                        <input className="form-input antw-uitleg" maxLength={200} value={ant.uitleg}
                          aria-label={`Uitleg bij antwoord ${ant.color}`}
                          placeholder={ant.is_correct ? "💬 Uitleg (mag leeg), bijv. waarom dit goed is" : "💬 Waarom is dit niet goed? (mag leeg)"}
                          onChange={(e) => setAntwoorden((a) => a.map((x, j) => j === i ? { ...x, uitleg: e.target.value } : x))} />
                      )}
                    </div>
                  ))}
                </div>
                {perAntwoord && <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>Vul per antwoord de punten in; leeg = standaard ({punten} voor goed, 0 voor fout). Negatief mag: dat gaat eraf.</span>}
                {/* Extra's per antwoord: klein, onder de antwoorden */}
                <div className="vraag-antw-opties">
                  <button type="button" className={`rl-knop schakel${perAntwoord ? " schakel--aan" : ""}`} role="switch" aria-checked={perAntwoord}
                    onClick={wisselPerAntwoord} title={`Uit: goed krijgt ${punten} punten, fout 0. Aan: elk antwoord eigen punten (ook negatief).`}>
                    ± Punten per antwoord<span className="schakel-bol" aria-hidden />
                  </button>
                  <button type="button" className={`rl-knop schakel${perUitleg ? " schakel--aan" : ""}`} role="switch" aria-checked={perUitleg}
                    onClick={() => setPerUitleg((u) => !u)} title="Per antwoord een korte uitleg, bijv. waarom het niet goed is. De speler ziet die na het antwoorden.">
                    💬 Uitleg per antwoord<span className="schakel-bol" aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {type === "open" && (
              <div className="form-group">
                <label className="form-label">Goed antwoord</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button type="button" className={`rl-knop${!isNumeriek ? " rl-knop--cyan" : ""}`} style={{ height: 32, fontSize: "0.8rem" }}
                    aria-pressed={!isNumeriek} onClick={() => setIsNumeriek(false)}><Icoon naam="tekst" /> Tekst</button>
                  <button type="button" className={`rl-knop${isNumeriek ? " rl-knop--cyan" : ""}`} style={{ height: 32, fontSize: "0.8rem" }}
                    aria-pressed={isNumeriek} onClick={() => setIsNumeriek(true)}><Icoon naam="getal" /> Getal</button>
                </div>
                {!isNumeriek ? (
                  <>
                    <textarea className="form-textarea" spellCheck lang="nl" value={openAntwoorden}
                      onChange={(e) => setOpenAntwoorden(e.target.value)}
                      placeholder={"Amsterdam\nMokum"} rows={Math.max(3, openAntwoorden.split("\n").length + 1)} style={{ minHeight: 70, resize: "vertical" }} />
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Eén goed antwoord per regel. Hoofdletters maken niet uit.</span>
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                      <input className="form-input" value={numeriekeWaarde} aria-label="Goed antwoord (getal)"
                        onChange={(e) => setNumeriekeWaarde(e.target.value)}
                        placeholder="bijv. 1980 of 1,5" />
                    </div>
                    <div className="form-group" style={{ width: 150 }}>
                      <input className="form-input" value={tolerantie} aria-label="Marge"
                        onChange={(e) => setTolerantie(e.target.value)}
                        placeholder="Marge (±)" title="Marge (±): hoeveel het antwoord ernaast mag zitten" />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Marge ±{tolerantie || 0}{Number(tolerantie) === 1 ? ": 1979 t/m 1981 is goed" : ""}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </form>

          {/* Opslaan: altijd in beeld, met de foutmelding erboven */}
          <div className="vraag-opslaanbalk">
            {fout && <div className="melding melding-fout" role="alert" style={{ margin: 0 }}><span>⚠️</span> {fout}</div>}
            {opgeslagen && <div className="melding melding-ok" style={{ margin: 0 }}>✅ Vraag opgeslagen</div>}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {/* 🗑️ Verwijderen: klein en onderaan, zodat je hem niet per ongeluk aantikt */}
              {bestaandeVraag && (
                <BevestigKnop venster icoon="🗑️" titel="Vraag verwijderen?" vraag="" knopTekst="Ja, verwijderen"
                  uitleg="De vraag en de antwoorden gaan weg; het punt zelf blijft op de kaart staan."
                  className="vraag-verwijder" onBevestig={verwijderVraag}>
                  <Icoon naam="wissen" /> Verwijderen
                </BevestigKnop>
              )}
              {gewijzigd && !opslaan && <span style={{ fontSize: "0.74rem", color: "var(--gold)" }}>● Niet opgeslagen</span>}
              <span style={{ flex: 1 }} />
              {onOpslaanVolgende && (
                <button type="button" className="rl-knop" disabled={opslaan} onClick={() => { volgendeRef.current = true; slaOp(); }}
                  style={{ height: 42, padding: "0 16px", fontWeight: 700 }} title={volgendeNaam ? `Daarna: ${volgendeNaam}` : undefined}>
                  Opslaan en volgende ›
                </button>
              )}
              <button type="submit" form={`vraag-${punt.id}`} className="rl-knop hoofdknop" disabled={opslaan}
                style={{ height: 42, padding: "0 22px", fontWeight: 800, fontSize: "0.9rem" }}>
                {opslaan ? "Opslaan…" : <><Icoon naam="opslaan" />{` ${opslaanLabel ?? (bestaandeVraag ? "Vraag opslaan" : "Vraag toevoegen")}`}</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Rechts: spelersweergave en kaartje ── */}
        <div className="vraag-preview-kolom" style={{
          width: 360, flexShrink: 0,
          borderLeft: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex", flexDirection: "column", minHeight: 0,
        }}>
          <div className="vraag-kolom-kop vraag-voorbeeld-kop" title="Bij benadering. De echte weergave op de telefoon zie je met 🧪 Testen of de 🧪 QR-test">
            <span>📱 Zo ziet de speler het</span>
            {(meerkeuze || type === "open") && (
              <button type="button" className={`vraag-toon-antwoord${toonAntwoord ? " aan" : ""}`} onClick={() => setToonAntwoord((t) => !t)} aria-pressed={toonAntwoord}>
                {toonAntwoord ? "✓ Antwoord" : "Toon antwoord"}
              </button>
            )}
          </div>

          {/* Punten en tijd staan niet op de telefoon, wel handig hier */}
          <div className="voorbeeld-info">{punten} punten{tijdslimiet && type !== "foto_opdracht" ? ` · ⏱️ ${tijdslimiet} s` : ""}</div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 14px 12px", display: "flex", justifyContent: "center" }}>
            {/* 📱 Zelfde opbouw en stijl als de vraag op de telefoon (VraagPopup), op ware grootte en verkleind */}
            <div className="voorbeeld-telefoon">
              <div className="voorbeeld-scherm">
                <div className="voorbeeld-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/spellogo/breed.png" alt="" />
                </div>
                <div className="voorbeeld-inhoud">
                  <span className="voorbeeld-badge">❓ VRAAG</span>
                  {tijdslimiet && type !== "foto_opdracht" && (
                    <div className="vraag-klok">⏱️ {Math.floor(tijdslimiet / 60)}:{String(tijdslimiet % 60).padStart(2, "0")}</div>
                  )}
                  <h2 className="voorbeeld-vraag">{tekst || <span style={{ opacity: 0.5, fontStyle: "italic" }}>De vraag verschijnt hier…</span>}</h2>
                  {geluidPad && <audio controls src={`${SUPABASE_URL}/storage/v1/object/public/vraag-geluid/${geluidPad}`} style={{ width: "100%" }} />}
                  {vraagAfbeelding && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="voorbeeld-afbeelding" src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${vraagAfbeelding}`} alt="" />
                  )}

                  {type === "meerkeuze_afbeelding" && (
                    <div className="voorbeeld-plaatjes">
                      {antwoorden.map((ant, n) => {
                        const goed = toonAntwoord && ant.is_correct;
                        return (
                          <div key={ant.color} className="voorbeeld-plaatje" style={{
                            borderColor: goed ? "#ffffff" : KLEUR_RAND[ant.color], background: KLEUR_RAND[ant.color],
                            opacity: toonAntwoord && !ant.is_correct ? 0.4 : 1, boxShadow: goed ? "0 0 0 3px #22C55E" : "none",
                          }}>
                            <span className={`voorbeeld-letter voorbeeld-letter--hoek${goed ? " voorbeeld-letter--goed" : ""}`}>{goed ? "✓" : String.fromCharCode(65 + n)}</span>
                            {ant.image_path
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${ant.image_path}`} alt="" />
                              : <div className="voorbeeld-plaatje-leeg" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {stem && <div className="voorbeeld-stemtip">🗳️ Stem! Kies je voor wat de meeste teams kiezen, dan krijg je de punten.</div>}
                  {(type === "meerkeuze_tekst" || stem) && (
                    <div className="voorbeeld-opties">
                      {antwoorden.filter((x) => !stem || x.text.trim()).map((ant, n) => {
                        const goed = toonAntwoord && !stem && ant.is_correct;
                        return (
                          <div key={ant.color} style={{ display: "flex", flexDirection: "column", gap: 4, opacity: toonAntwoord && !stem && !ant.is_correct ? 0.4 : 1 }}>
                            <div className="voorbeeld-optie" style={{
                              background: KLEUR_RAND[ant.color], borderColor: goed ? "#ffffff" : "transparent",
                              boxShadow: goed ? "0 0 0 3px #22C55E" : "0 3px 0 rgba(0,0,0,0.25)",
                            }}>
                              <span className={`voorbeeld-letter${goed ? " voorbeeld-letter--goed" : ""}`}>{goed ? "✓" : String.fromCharCode(65 + n)}</span>
                              <span style={{ color: KLEUR_TEKST[ant.color] ?? "#fff" }}>{ant.text || <em style={{ opacity: 0.6 }}>Antwoord {String.fromCharCode(65 + n)}</em>}</span>
                            </div>
                            {toonAntwoord && perUitleg && ant.uitleg.trim() && <span className="voorbeeld-uitleg">💬 {ant.uitleg}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {type === "open" && <div className="voorbeeld-invoer">Typ hier je antwoord…</div>}
                  {type === "open" && toonAntwoord && (
                    <div className="voorbeeld-goed">
                      ✓ Goed: {isNumeriek ? `${numeriekeWaarde || "?"}${Number(tolerantie) ? ` (± ${tolerantie})` : ""}` : (openAntwoorden.split("\n").map((r) => r.trim()).filter(Boolean).join(" / ") || "?")}
                    </div>
                  )}
                  {type === "foto_opdracht" && (
                    <div className="voorbeeld-foto"><span style={{ fontSize: "2.4rem" }}>📷</span><span>Tik om een foto te maken</span></div>
                  )}
                </div>
                {(type === "open" || type === "foto_opdracht") && (
                  <div className="voorbeeld-onder">
                    <div className="btn btn-primary voorbeeld-knop">{type === "foto_opdracht" ? "📤 Foto insturen" : "Bevestig antwoord"}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 📍 Waar ligt dit punt: klein onder het voorbeeld, met ⤢ groter */}
          <div className="vraag-preview-kaart">
            <div className="vraag-kolom-kop vraag-voorbeeld-kop">
              <span>📍 Op de kaart</span>
              <button type="button" className="vraag-toon-antwoord" onClick={() => setKaartGroot((g) => !g)} aria-pressed={kaartGroot}>{kaartGroot ? "⤡ Kleiner" : "⤢ Groter"}</button>
            </div>
            <div style={{ height: kaartGroot ? 380 : 190, padding: "0 12px 12px" }}>
              <PuntMiniKaart
                punt={{ id: punt.id, lat: punt.latitude, lng: punt.longitude, label: kaartPunten?.find((p) => p.id === punt.id)?.label ?? "📍" }}
                radius={punt.radius_meters ?? 10}
                andere={kaartPunten} />
            </div>
          </div>
        </div>
      </div>

      {naamVenster && (
        <NaamVenster naam={naam} onNaam={setNaam} woorden={woorden} bezig={opslaan}
          onSluit={() => setNaamVenster(false)} onOpslaan={() => slaOp(undefined, true)} />
      )}
      {verlaatNa && <NietOpgeslagenVenster onSluit={() => setVerlaatNa(null)} onWeg={() => { const doe = verlaatNa; setVerlaatNa(null); doe(); }} />}
    </div>
  );
}
