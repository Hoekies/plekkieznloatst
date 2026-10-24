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
import UitklapPijl from "@/components/shared/UitklapPijl";

const PuntMiniKaart = dynamic(() => import("./PuntMiniKaart"), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export type VraagMetAntwoorden = Vraag & { answer_options: AntwoordOptie[] };

const KLEUREN = ["geel", "blauw", "rood", "groen"] as const;
const KLEUR_STIJL: Record<string, string> = {
  geel: "#F59E0B", blauw: "#1E40AF", rood: "#EF4444", groen: "#16A34A",
};
// Lichtere varianten voor tekst en rondjes op de donkere admin-achtergrond (#1E40AF was onleesbaar)
const LABEL_KLEUR: Record<string, string> = {
  geel: "#F59E0B", blauw: "#60A5FA", rood: "#F87171", groen: "#22C55E",
};
const KLEUR_ZACHT: Record<string, string> = {
  geel: "#FEF9C3", blauw: "#DBEAFE", rood: "#FEE2E2", groen: "#DCFCE7",
};
const KLEUR_NAAM = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

const TYPE_LABEL: Record<VraagType, string> = {
  meerkeuze_tekst: "📝 Meerkeuze",
  meerkeuze_afbeelding: "🖼️ Meerkeuze met plaatjes",
  open: "✍️ Open vraag",
  foto_opdracht: "📷 Foto-opdracht",
  stemvraag: "🗳️ Stemvraag",
};

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
            {bezig ? "Opslaan…" : "💾 Opslaan"}
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
}

export default function VraagEditorPagina({ routeId, punt, bestaandeVraag, onSluit, opslaanLabel, kaartPunten, onNaamGewijzigd, navigatie, onGewijzigd }: Props) {
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
  const [punten, setPunten] = useState(bestaandeVraag?.points ?? 65);
  // Per vraag aan of uit: antwoorden husselen, een geluidsfragment, een tijdslimiet (migratie 014)
  const [husselen, setHusselen] = useState(!!bestaandeVraag?.antwoorden_husselen);
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
  }[]>(
    bestaandeVraag?.answer_options.length === 4
      ? bestaandeVraag.answer_options.map((a) => ({
          color: a.color as typeof KLEUREN[number],
          text: a.text ?? "",
          image_path: a.image_path,
          is_correct: a.is_correct,
          punten: a.punten === null || a.punten === undefined ? "" : String(a.punten),
        }))
      // Stemvraag met 2 of 3 keuzes: op hun kleur terugzetten, de rest leeg
      : bestaandeVraag?.type === "stemvraag"
        ? KLEUREN.map((c) => {
            const a = bestaandeVraag.answer_options.find((o) => o.color === c);
            return { color: c, text: a?.text ?? "", image_path: null, is_correct: false, punten: "" };
          })
        : KLEUREN.map((c) => ({ color: c, text: "", image_path: null, is_correct: c === "geel", punten: "" }))
  );
  // Punten per antwoord: een uitzondering, dus pas zichtbaar als je hem aanzet (of als hij al gebruikt wordt)
  const [perAntwoord, setPerAntwoord] = useState(() => antwoorden.some((a) => a.punten !== ""));
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
  const huidig = JSON.stringify({ type, tekst, vraagAfbeelding, punten, antwoorden, openAntwoorden, numeriekeWaarde, tolerantie, isNumeriek, naam: naam.trim() });
  const beginRef = useRef<string | null>(null);
  if (beginRef.current === null) beginRef.current = huidig;
  const gewijzigd = huidig !== beginRef.current;
  useEffect(() => { onGewijzigd?.(gewijzigd); }, [gewijzigd, onGewijzigd]);
  // Weggaan met wijzigingen: eerst vragen
  const [verlaatNa, setVerlaatNa] = useState<(() => void) | null>(null);
  const verlaat = (doe: () => void) => { if (gewijzigd) setVerlaatNa(() => doe); else doe(); };

  // Meer instellingen (naam van het punt, QR-code): dicht tot je ze nodig hebt
  const [meerOpen, setMeerOpen] = useState(false);

  // QR-unlock
  const [qrEnabled, setQrEnabled] = useState(punt.qr_unlock_enabled ?? false);
  const [qrSecret, setQrSecret] = useState(punt.qr_secret ?? "");
  const [qrOpslaan, setQrOpslaan] = useState(false);
  const qrUrl = qrSecret ? `${SITE_URL}/speler/qr?p=${punt.id}&s=${qrSecret}` : "";

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
      }));
      setAntwoorden(nieuw);
      if (nieuw.some((a) => a.punten !== "")) setPerAntwoord(true);
    } else if (v.type === "stemvraag") {
      setAntwoorden(KLEUREN.map((c) => ({ color: c, text: v.answer_options.find((o) => o.color === c)?.text ?? "", image_path: null, is_correct: false, punten: "" })));
    } else {
      setAntwoorden(KLEUREN.map((c) => ({ color: c, text: "", image_path: null, is_correct: c === "geel", punten: "" })));
    }
    setOpenAntwoorden((v.correct_text_answers ?? []).join("\n"));
    const numeriek = v.numeric_answer !== null && v.numeric_answer !== undefined;
    setIsNumeriek(numeriek);
    setNumeriekeWaarde(numeriek ? String(v.numeric_answer) : "");
    setTolerantie(String(v.numeric_tolerance ?? 0));
    setHusselen(v.antwoorden_husselen);
    setGeluidPad(v.geluid_pad);
    setTijdslimiet(v.tijdslimiet_seconden);
    toonMelding("Vraag overgenomen: pas aan en sla op", "ok");
  }

  function setCorrect(index: number) {
    setAntwoorden((a) => a.map((ant, i) => ({ ...ant, is_correct: i === index })));
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
      antwoorden_husselen: husselen,
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
      }));
    }

    if (!naamGekozen) { setOpslaan(false); setNaamVenster(true); return; }
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
        {bestaandeVraag && (
          <BevestigKnop venster icoon="🗑️" titel="Vraag verwijderen?" vraag="" knopTekst="Ja, verwijderen"
            uitleg="De vraag en de antwoorden gaan weg; het punt zelf blijft op de kaart staan."
            className="rl-knop rl-knop--rood" style={{ height: 32, flexShrink: 0 }} onBevestig={verwijderVraag}>
            🗑️<span className="alleen-pc"> Vraag verwijderen</span>
          </BevestigKnop>
        )}
      </div>

      {/* Formulier links (opslaan altijd in beeld), rechts de spelersweergave met het kaartje eronder */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>

        {/* ── Formulier ── */}
        <div className="vraag-form-kolom">
          <form id={`vraag-${punt.id}`} onSubmit={slaOp} className="vraag-form">

            <div className="form-group">
              <label className="form-label">Soort vraag</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["meerkeuze_tekst", "meerkeuze_afbeelding", "open", "foto_opdracht", "stemvraag"] as VraagType[]).map((t) => (
                  <button key={t} type="button"
                    className={`rl-knop${type === t ? " rl-knop--cyan" : ""}`}
                    style={{ height: 34, fontSize: "0.8rem" }}
                    aria-pressed={type === t}
                    onClick={() => setType(t)}>
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className="form-label" style={{ flex: 1, margin: 0 }}>Vraag</label>
                <button type="button" className={`rl-knop${ideeenStatus === "open" ? " rl-knop--cyan" : ""}`} style={{ height: 28, fontSize: "0.76rem" }}
                  onClick={haalIdeeen} disabled={ideeenStatus === "laden"} title="Vraagideeën uit wat er rond dit punt op de kaart staat (kerk, molen, café…)">
                  {ideeenStatus === "laden" ? "⏳ Zoeken…" : "💡 Ideeën"}
                </button>
              </div>
              {ideeenStatus === "open" && ideeen && (
                <div className="vraag-ideeen">
                  {ideeen.length === 0
                    ? <span className="vraag-ideeen-leeg">Niets bijzonders gevonden binnen 150 m van dit punt.</span>
                    : ideeen.map((idee) => (
                      <button key={idee.tekst} type="button" className="vraag-idee"
                        onClick={() => { setTekst(idee.tekst); if (idee.type === "foto_opdracht") setType("foto_opdracht"); else if (type === "foto_opdracht") setType("open"); setIdeeenStatus("dicht"); }}>
                        {idee.type === "foto_opdracht" ? "📸 " : ""}{idee.tekst}
                      </button>
                    ))}
                  {ideeen.length > 0 && <span className="vraag-ideeen-leeg">Het antwoord zoek je zelf op, het liefst ter plekke.</span>}
                </div>
              )}
              <textarea className="form-textarea" spellCheck lang="nl" value={tekst} onChange={(e) => setTekst(e.target.value)}
                placeholder={type === "foto_opdracht" ? "Bijv. Maak een groepsfoto bij de molen" : "Typ hier de vraag…"} style={{ minHeight: 70 }} />
            </div>

            {/* Afbeelding en punten naast elkaar */}
            <div className="vraag-rij">
              <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                <label className="form-label">Afbeelding bij de vraag (optioneel)</label>
                <AfbeeldingUpload
                  huidigPad={vraagAfbeelding}
                  bucket="vraag-afbeeldingen"
                  onUpload={(pad) => setVraagAfbeelding(pad)}
                  onVerwijder={() => setVraagAfbeelding(null)}
                  compact
                />
              </div>
              <div className="form-group" style={{ width: 110, flexShrink: 0 }}>
                <label className="form-label">Punten</label>
                <input className="form-input" type="number" min={0} value={punten}
                  onChange={(e) => setPunten(Number(e.target.value))} title="Zoveel punten krijgt een team voor het goede antwoord" />
              </div>
            </div>

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
                {/* Kop: uitleg links, rechts de schakelaar voor eigen punten per antwoord */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0, flex: 1, minWidth: 0 }}>Antwoorden <span style={{ fontWeight: 400, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>· klik op het rondje bij het goede antwoord</span></label>
                  <button type="button" className={`rl-knop schakel${perAntwoord ? " schakel--aan" : ""}`} role="switch" aria-checked={perAntwoord}
                    style={{ height: 30, fontSize: "0.78rem" }} onClick={wisselPerAntwoord}
                    title={`Uit: goed krijgt ${punten} punten, fout 0. Aan: elk antwoord eigen punten (ook negatief).`}>
                    ± Punten per antwoord<span className="schakel-bol" aria-hidden />
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {antwoorden.map((ant, i) => (
                    <div key={ant.color} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "6px 10px", borderRadius: "var(--radius-md)",
                      border: `2px solid ${ant.is_correct ? LABEL_KLEUR[ant.color] : "var(--line)"}`,
                      background: ant.is_correct ? `${LABEL_KLEUR[ant.color]}1f` : "transparent",
                    }}>
                      <button type="button" onClick={() => setCorrect(i)}
                        title={ant.is_correct ? "Dit is het goede antwoord" : "Maak dit het goede antwoord"}
                        aria-label={`Antwoord ${ant.color} is het goede antwoord`} aria-pressed={ant.is_correct}
                        style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${LABEL_KLEUR[ant.color]}`,
                          background: ant.is_correct ? LABEL_KLEUR[ant.color] : "transparent",
                          cursor: "pointer",
                        }} />
                      <span style={{
                        width: 46, fontSize: "0.75rem", fontWeight: 700,
                        color: LABEL_KLEUR[ant.color], flexShrink: 0, textTransform: "capitalize",
                      }}>{ant.color}</span>
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
                      {ant.is_correct && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: LABEL_KLEUR[ant.color], flexShrink: 0 }}>✓ goed</span>}
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
                    </div>
                  ))}
                </div>
                {perAntwoord && <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>Vul per antwoord de punten in; leeg = standaard ({punten} voor goed, 0 voor fout). Negatief mag: dat gaat eraf.</span>}
              </div>
            )}

            {type === "open" && (
              <div className="form-group">
                <label className="form-label">Goed antwoord</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button type="button" className={`rl-knop${!isNumeriek ? " rl-knop--cyan" : ""}`} style={{ height: 32, fontSize: "0.8rem" }}
                    aria-pressed={!isNumeriek} onClick={() => setIsNumeriek(false)}>🔤 Tekst</button>
                  <button type="button" className={`rl-knop${isNumeriek ? " rl-knop--cyan" : ""}`} style={{ height: 32, fontSize: "0.8rem" }}
                    aria-pressed={isNumeriek} onClick={() => setIsNumeriek(true)}>🔢 Getal</button>
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

            {/* Meer instellingen: dicht tot je ze nodig hebt */}
            <div className="vraag-meer">
              <button type="button" className="vraag-meer-kop" onClick={() => setMeerOpen((v) => !v)} aria-expanded={meerOpen}>
                <UitklapPijl open={meerOpen} />
                <span>⚙️ Meer instellingen</span>
                <span className="vraag-meer-samenvatting">
                  {[husselen && meerkeuze ? "🔀 husselen" : "", geluidPad ? "🔊 geluid" : "", tijdslimiet && type !== "foto_opdracht" ? `⏱️ ${tijdslimiet} s` : "", qrEnabled ? "QR-test aan" : ""].filter(Boolean).join(" · ") || "husselen, geluid, tijdslimiet, QR-code om te testen"}
                </span>
              </button>
              {meerOpen && (
                <div className="vraag-meer-inhoud">
                  {/* 🔀 Antwoorden husselen: elk team ziet de antwoorden in een andere volgorde (tegen afkijken) */}
                  {meerkeuze && (
                    <div className="form-group">
                      <label className="form-label">Volgorde van de antwoorden</label>
                      <button type="button" className={`rl-knop schakel${husselen ? " schakel--aan" : ""}`} role="switch" aria-checked={husselen}
                        style={{ height: 32, alignSelf: "flex-start", fontSize: "0.8rem" }} onClick={() => setHusselen((v) => !v)}>
                        🔀 Antwoorden husselen<span className="schakel-bol" aria-hidden />
                      </button>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Aan: elk team ziet de antwoorden in een andere volgorde, zodat afkijken niet helpt.</span>
                    </div>
                  )}

                  {/* 🔊 Geluidsfragment bij de vraag, bijvoorbeeld "welk lied is dit?" */}
                  <div className="form-group">
                    <label className="form-label">🔊 Geluidsfragment</label>
                    {geluidPad ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <audio controls src={`${SUPABASE_URL}/storage/v1/object/public/vraag-geluid/${geluidPad}`} style={{ height: 34, maxWidth: "100%" }} />
                        <button type="button" className="rl-knop" onClick={() => setGeluidPad(null)} title="Geluid weghalen">🗑️</button>
                      </div>
                    ) : (
                      <label className="rl-knop" style={{ alignSelf: "flex-start", cursor: "pointer", height: 32, fontSize: "0.8rem" }}>
                        {geluidBezig ? "⏳ Uploaden…" : "🎵 Geluid kiezen (mp3, m4a, wav)"}
                        <input type="file" accept="audio/*" onChange={kiesGeluid} style={{ display: "none" }} disabled={geluidBezig} />
                      </label>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>De spelers kunnen het afspelen bij de vraag. Maximaal 3 MB, kort fragment is genoeg.</span>
                  </div>

                  {/* ⏱️ Tijdslimiet: daarna telt de vraag als fout */}
                  {type !== "foto_opdracht" && (
                    <div className="form-group">
                      <label className="form-label">⏱️ Tijdslimiet</label>
                      <div className="segment" role="radiogroup" aria-label="Tijdslimiet">
                        {([[null, "Uit"], [30, "30 s"], [60, "1 min"], [90, "1½ min"], [120, "2 min"]] as const).map(([s, label]) => (
                          <button key={label} type="button" role="radio" aria-checked={tijdslimiet === s} className={tijdslimiet === s ? "aan" : ""} onClick={() => setTijdslimiet(s)}>{label}</button>
                        ))}
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Aan: de spelers zien een aftelklok; is de tijd om, dan telt de vraag als fout.</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Testen</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button type="button" className={`rl-knop schakel${qrEnabled ? " schakel--aan" : ""}`} role="switch" aria-checked={qrEnabled}
                        style={{ height: 32, fontSize: "0.8rem" }} disabled={qrOpslaan} onClick={() => toggleQr(!qrEnabled)}>
                        🧪 Openen met QR-code<span className="schakel-bol" aria-hidden />
                      </button>
                      {qrEnabled && qrUrl && <button type="button" className="rl-knop" style={{ height: 32, fontSize: "0.8rem" }} onClick={printQr}>🖨️ QR-code printen</button>}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Alleen om te testen: open dit punt door de QR-code te scannen, zonder ernaartoe te lopen. Wordt meteen opgeslagen.</span>
                    {qrEnabled && qrUrl && (
                      <div id="qr-print-zone" style={{ marginTop: 8, padding: 12, background: "#fff", borderRadius: 10, alignSelf: "flex-start" }}>
                        <QRCodeSVG value={qrUrl} size={140} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Opslaan: altijd in beeld, met de foutmelding erboven */}
          <div className="vraag-opslaanbalk">
            {fout && <div className="melding melding-fout" role="alert" style={{ margin: 0 }}><span>⚠️</span> {fout}</div>}
            {opgeslagen && <div className="melding melding-ok" style={{ margin: 0 }}>✅ Vraag opgeslagen</div>}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {gewijzigd && !opslaan && <span style={{ fontSize: "0.74rem", color: "var(--gold)" }}>● Niet opgeslagen wijzigingen</span>}
              <span style={{ flex: 1 }} />
              <button type="submit" form={`vraag-${punt.id}`} className="rl-knop hoofdknop" disabled={opslaan}
                style={{ height: 42, padding: "0 22px", fontWeight: 800, fontSize: "0.9rem" }}>
                {opslaan ? "Opslaan…" : `💾 ${opslaanLabel ?? (bestaandeVraag ? "Vraag opslaan" : "Vraag toevoegen")}`}
              </button>
            </div>
          </div>
        </div>

        {/* ── Rechts: spelersweergave en kaartje ── */}
        <div className="vraag-preview-kolom" style={{
          width: 320, flexShrink: 0,
          borderLeft: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex", flexDirection: "column", minHeight: 0,
        }}>
          <div className="vraag-kolom-kop">👁 Zo ziet de speler het</div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 14px", display: "flex", justifyContent: "center" }}>
            <div style={{
              width: "100%", maxWidth: 290, alignSelf: "flex-start",
              border: "2px solid #333", borderRadius: 18,
              overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              background: "#fff", display: "flex", flexDirection: "column",
            }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em",
                  background: "#DBEAFE", color: "#1E40AF",
                  padding: "3px 8px", borderRadius: 99, alignSelf: "flex-start",
                }}>❓ VRAAG</span>

                <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.4, color: "#111", whiteSpace: "pre-wrap" }}>
                  {tekst || <span style={{ color: "#aaa", fontStyle: "italic" }}>De vraag verschijnt hier…</span>}
                </p>

                {vraagAfbeelding && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${vraagAfbeelding}`}
                    alt=""
                    style={{ width: "100%", borderRadius: 8, aspectRatio: "1/1", objectFit: "cover" }}
                  />
                )}

                {type === "meerkeuze_afbeelding" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {antwoorden.map((ant) => (
                      <div key={ant.color} style={{
                        border: `2px solid ${ant.is_correct ? KLEUR_STIJL[ant.color] : "#e5e7eb"}`,
                        borderRadius: 10, overflow: "hidden",
                        background: ant.is_correct ? KLEUR_ZACHT[ant.color] : "#f9fafb",
                      }}>
                        {ant.image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${ant.image_path}`}
                            alt=""
                            style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{
                            aspectRatio: "4/3", background: KLEUR_ZACHT[ant.color],
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", color: KLEUR_STIJL[ant.color], fontWeight: 700,
                          }}>
                            {ant.color}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(type === "meerkeuze_tekst" || stem) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {antwoorden.filter((a) => !stem || a.text.trim()).map((ant) => (
                      <div key={ant.color} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "9px 10px", borderRadius: 10,
                        border: `2px solid ${ant.is_correct ? "#ffffff" : "transparent"}`,
                        background: KLEUR_STIJL[ant.color],
                        boxShadow: ant.is_correct ? "0 0 0 2px rgba(0,0,0,0.25)" : "none",
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                          border: "2px solid rgba(255,255,255,0.7)",
                          background: ant.is_correct ? "#ffffff" : "transparent",
                        }} />
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#ffffff" }}>
                          {ant.text || <span style={{ color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>{ant.color}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {type === "open" && (
                  <div style={{
                    border: "1.5px solid #e5e7eb", borderRadius: 8,
                    padding: "8px 10px", fontSize: "0.72rem", color: "#aaa",
                    background: "#f9fafb",
                  }}>
                    Typ hier je antwoord…
                  </div>
                )}

                {type === "foto_opdracht" && (
                  <div style={{
                    border: "2px dashed #e5e7eb", borderRadius: 10,
                    padding: "16px 12px", textAlign: "center",
                    background: "#f9fafb",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: "1.6rem" }}>📷</span>
                    <span style={{ fontSize: "0.65rem", color: "#6B7280" }}>Maak een foto en upload hem</span>
                  </div>
                )}
              </div>

              {(type === "open" || type === "foto_opdracht") && (
                <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{
                    background: "#1E40AF", color: "#fff",
                    borderRadius: 10, padding: "9px 0",
                    textAlign: "center", fontSize: "0.72rem", fontWeight: 700,
                  }}>
                    {type === "foto_opdracht" ? "📤 Foto insturen" : "Bevestig antwoord"}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Waar ligt dit punt? (breed scherm) ── */}
        <div className="vraag-kaart-rechts">
          <div className="vraag-kolom-kop">📍 Op de kaart</div>
          <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
            <PuntMiniKaart
              punt={{ id: punt.id, lat: punt.latitude, lng: punt.longitude, label: kaartPunten?.find((p) => p.id === punt.id)?.label ?? "📍" }}
              radius={punt.radius_meters ?? 10}
              andere={kaartPunten} />
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
