"use client";

import { useEffect, useState } from "react";
import type { SpelerOverzicht } from "@/lib/admin-live";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import EindtijdKnop, { resterend } from "@/components/admin/EindtijdKnop";
import GoudenKnop from "@/components/admin/GoudenKnop";
import TussenstandKnop from "@/components/admin/TussenstandKnop";
import SpelAfronden from "@/components/admin/SpelAfronden";
import BonusKnop from "@/components/admin/BonusKnop";
import { openFotoKeuren } from "@/components/admin/FotoKeuren";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import { duurKort } from "@/lib/tijd";
import UitklapPijl from "@/components/shared/UitklapPijl";
import Icoon from "@/components/admin/Icoon";

// Na zoveel minuten zonder locatie-update vragen we aandacht voor een speler
const NIET_GEZIEN_MIN = 5;
// Zo lang niets meer van een team gezien: een vergeten (test)spel, met een knop om het af te sluiten
const VERGETEN_MIN = 180;

export function minutenNietGezien(s: SpelerOverzicht, nu = Date.now()): number | null {
  if (s.sessie_status !== "actief") return null;
  const sinds = s.laatste_gezien ?? s.started_at;
  if (!sinds) return null;
  const min = Math.floor((nu - new Date(sinds).getTime()) / 60000);
  return min >= NIET_GEZIEN_MIN ? min : null;
}

// ⏸️ Pauze aan of uit (Spelleider en spelstrook): geeft het nieuwe "gepauzeerd sinds" terug, of undefined bij een fout
export async function stuurPauze(aan: boolean): Promise<string | null | undefined> {
  const res = await fetch("/api/admin/pauze", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pauze: aan }),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Pauzeren", data.fout), "fout"); return undefined; }
  toonMelding(aan ? "Spel gepauzeerd: alle teams zien het pauzescherm" : "Het spel gaat verder", "ok");
  return data.pauze ?? null;
}

// "Spelleider": hoe lang het spel loopt, wat nu je aandacht vraagt, en het spel afronden
export default function SpelLeider({ spelend, wachtendeFotos, kleuren, uitslagVrij, onKies, routeId, eindtijd, pauze = null, beperkt = false, onGewijzigd, gouden = null, goudenAan = false }: {
  spelend: SpelerOverzicht[];
  wachtendeFotos: number;
  kleuren: Map<string, string>;
  uitslagVrij?: boolean;
  onKies: (s: SpelerOverzicht) => void;
  routeId?: string;
  eindtijd?: string | null;
  // Gepauzeerd sinds (null = het spel loopt)
  pauze?: string | null;
  // Hulp (helper): geen eindtijd en niet afronden
  beperkt?: boolean;
  onGewijzigd: () => void;
  // ⏰ Gouden kwartier loopt tot (migratie 007), en of het bij deze route aan staat (route-editor, 🎉 Spelplezier)
  gouden?: string | null;
  goudenAan?: boolean;
}) {
  // Elke halve minuut opnieuw tekenen, zodat "speelt sinds" en "niet gezien" meelopen
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNu(Date.now()), 30000); return () => clearInterval(t); }, []);

  const start = spelend.map((s) => s.started_at).filter((t): t is string => !!t).sort()[0];
  const onderweg = spelend.filter((s) => s.sessie_status === "actief").length;

  const aandacht: { id: string; kleur: string | null; tekst: string; speler?: SpelerOverzicht; klik?: () => void; actie?: React.ReactNode }[] = [];
  for (const s of spelend) {
    if (s.hulp) aandacht.push({ id: `hulp-${s.player_id}`, kleur: "#FF8A00", tekst: `⚠️ ${s.display_name} kan ${s.hulp.punt_naam ? `"${s.hulp.punt_naam}"` : "het volgende punt"} niet bereiken`, speler: s });
  }
  for (const s of spelend) {
    if (s.wacht && new Date(s.wacht.tot).getTime() > nu) {
      const min = Math.ceil((new Date(s.wacht.tot).getTime() - nu) / 60000);
      aandacht.push({ id: `wacht-${s.player_id}`, kleur: "#A78BFA", tekst: `${s.wacht.soort === "spook" ? "👻" : "⛔"} ${s.display_name} moet wachten (${s.wacht.soort === "spook" ? "spook" : "plek zooi"}, nog ± ${min} min)`, speler: s });
    }
  }
  // Iedereen binnen en de uitslag nog dicht: de foto's staan dan al in de regel "Iedereen is binnen" (hieronder)
  if (wachtendeFotos > 0 && !(onderweg === 0 && spelend.length > 0 && !uitslagVrij && !beperkt)) aandacht.push({ id: "fotos", kleur: "#FBBF24", tekst: `📸 ${wachtendeFotos} foto${wachtendeFotos !== 1 ? "'s" : ""} te keuren`, klik: openFotoKeuren });
  // 🧹 Vergeten spellen (uren niets): eigen melding met afsluiten, niet ook nog bij "niet gezien"
  const vergeten = spelend.filter((s) => (minutenNietGezien(s, nu) ?? 0) >= VERGETEN_MIN);
  if (vergeten.length && !beperkt) {
    aandacht.push({
      id: "vergeten", kleur: "#9CA3AF",
      tekst: `🧹 ${vergeten.length === 1 ? "Vergeten spel" : `${vergeten.length} vergeten spellen`}: ${vergeten.map((s) => s.display_name).join(", ")} (al uren niets)`,
      actie: (
        <BevestigKnop venster icoon="🧹" titel={vergeten.length === 1 ? "Vergeten spel afsluiten?" : `${vergeten.length} vergeten spellen afsluiten?`}
          vraag={`Van ${vergeten.map((s) => s.display_name).join(", ")} is al uren niets gezien. Het spel stopt; de spelers blijven bestaan en kunnen later opnieuw beginnen.`}
          ja="Ja, afsluiten" onBevestig={() => sluitVergeten(vergeten)} className="rl-knop">
          <Icoon naam="opruimen" /> Afsluiten
        </BevestigKnop>
      ),
    });
  }
  const stil = spelend.filter((s) => minutenNietGezien(s, nu) !== null && !vergeten.includes(s));
  if (stil.length === 1) {
    const s = stil[0];
    aandacht.push({ id: "stil", kleur: "#9CA3AF", tekst: `📵 ${s.display_name} ${duurKort(minutenNietGezien(s, nu)!)} niet gezien${s.ingelogd ? "" : " (uitgelogd)"}`, speler: s });
  } else if (stil.length > 1) {
    aandacht.push({ id: "stil", kleur: "#9CA3AF", tekst: `📵 ${stil.length} teams een tijd niet gezien: ${stil.map((s) => s.display_name).join(", ")}` });
  }

  // 🏁 Iedereen is binnen: wat de spelleider nu moet doen, bovenaan en met de knop erbij. Eerst de foto's keuren
  // (die tellen mee), dan de uitslag vrijgeven (pas dan zien de teams de eindstand, hun oorkonde, de antwoorden en
  // de gelopen route), daarna het rapport bewaren en opruimen.
  const iedereenBinnen = spelend.length > 0 && onderweg === 0;
  if (iedereenBinnen && !beperkt) {
    if (!uitslagVrij) {
      aandacht.unshift({
        id: "uitslag", kleur: "#00D9FF",
        tekst: wachtendeFotos > 0
          ? `🏁 Iedereen is binnen. Stap 1: keur de ${wachtendeFotos} foto${wachtendeFotos !== 1 ? "'s" : ""}. Stap 2: geef de uitslag vrij.`
          : "🏁 Iedereen is binnen: geef de uitslag vrij. Tot dan wachten de teams op hun eindstand, oorkonde, antwoorden en gelopen route.",
        actie: (
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {wachtendeFotos > 0 && <button type="button" className="rl-knop rl-knop--groen" onClick={openFotoKeuren}><Icoon naam="camera" /> Foto&apos;s keuren</button>}
            <BevestigKnop venster gevaarlijk={false} icoon="🏆" titel="Uitslag vrijgeven?" ja="Ja, vrijgeven" onBevestig={geefUitslagVrij}
              vraag={`Alle teams zien dan de eindstand, hun oorkonde, de antwoorden en de gelopen route.${wachtendeFotos > 0 ? ` ⚠️ Er ${wachtendeFotos === 1 ? "is nog 1 foto" : `zijn nog ${wachtendeFotos} foto's`} niet gekeurd.` : ""}`}
              className={`rl-knop${wachtendeFotos > 0 ? "" : " rl-knop--cyan"}`}>
              <Icoon naam="uitslag" /> Uitslag vrijgeven
            </BevestigKnop>
          </span>
        ),
      });
    } else {
      aandacht.unshift({
        id: "afgerond", kleur: "#4ADE80",
        tekst: "✅ Uitslag vrijgegeven. Bewaar nu het rapport; daarna ruim je op met 🧹 Opruimen.",
        actie: <a className="rl-knop" href="/admin/rapport" target="_blank" rel="noopener noreferrer"><Icoon naam="rapport" /> Rapport</a>,
      });
    }
  }
  async function geefUitslagVrij() {
    const res = await fetch("/api/admin/uitslag", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vrij: true }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    toonMelding(res?.ok ? "Uitslag vrijgegeven: iedereen ziet de eindstand" : uitlegBijStatus(res?.status ?? 0, "Uitslag vrijgeven", data.fout), res?.ok ? "ok" : "fout");
    if (res?.ok) onGewijzigd();
  }

  async function sluitVergeten(lijst: SpelerOverzicht[]) {
    const uit = await Promise.all(lijst.map((s) => fetch(`/api/admin/groepen/${s.player_id}/spel-stoppen`, { method: "POST" }).then((r) => r.ok).catch(() => false)));
    const goed = uit.filter(Boolean).length;
    toonMelding(goed === lijst.length ? `🧹 ${goed} ${goed === 1 ? "spel" : "spellen"} afgesloten` : "Afsluiten lukte niet bij elk spel", goed === lijst.length ? "ok" : "fout");
  }

  // ⏸️ Pauze: alle teams staan stil; ▶️ Verder: de eindtijd schuift mee
  const [pauzeLokaal, setPauzeLokaal] = useState<string | null | undefined>(undefined);
  useEffect(() => { setPauzeLokaal(undefined); }, [pauze]);
  const gepauzeerd = pauzeLokaal !== undefined ? pauzeLokaal : pauze;
  async function wisselPauze(aan: boolean) {
    const p = await stuurPauze(aan);
    if (p !== undefined) setPauzeLokaal(p);
  }

  // Niets aan de hand (geen aandachtspunten, geen pauze): standaard ingeklapt tot één regel.
  // Vraagt iets je aandacht, dan staat het blok open; ook dan kun je het inklappen. Komt er een
  // nieuwe melding bij, dan klapt het vanzelf weer open.
  const rustig = aandacht.length === 0 && !gepauzeerd;
  const [keuze, setKeuze] = useState<boolean | null>(null);  // null = vanzelf (open als er iets is)
  // Vraagt iets aandacht (hulp, foto's, pauze), dan blijft het blok altijd open: zo zit een hulpvraag nooit verstopt
  const open = !rustig || (keuze ?? false);
  const [vorigAantal, setVorigAantal] = useState(aandacht.length);
  useEffect(() => {
    if (aandacht.length > vorigAantal) setKeuze(null);
    setVorigAantal(aandacht.length);
  }, [aandacht.length, vorigAantal]);
  const status = (
    <>
      {start ? `Speelt sinds ${duurKort(Math.floor((nu - new Date(start).getTime()) / 60000))}` : "Spel loopt"} · {iedereenBinnen ? "🏁 iedereen is binnen" : `${onderweg} onderweg`}
      {eindtijd && new Date(eindtijd).getTime() > nu && <span style={{ color: "#FFE680" }}> · nog {resterend(eindtijd, nu)}</span>}
    </>
  );

  if (!open) return (
    <button type="button" className="pr-gem-panel spelleider spelleider--dicht" onClick={() => setKeuze(true)} aria-expanded={false}
      title="Spelleider openen: pauze, eindtijd en afronden">
      <span className="pr-gem-panel-inner spelleider-dicht-inner">
        <UitklapPijl open={false} />
        <span aria-hidden><Icoon naam="doel" /></span>
        <span className="spelleider-dicht-tekst">{status}</span>
        {rustig
          ? <span className="spelleider-dicht-ok"><Icoon naam="goed" /> Alles loopt</span>
          : <span className="spelleider-dicht-let">{gepauzeerd ? <><Icoon naam="pauze" />{" Gepauzeerd"}</> : <><Icoon naam="waarschuwing" />{` ${aandacht.length} ${aandacht.length === 1 ? "melding" : "meldingen"}`}</>}</span>}
      </span>
    </button>
  );

  return (
    <div className="pr-gem-panel spelleider">
      <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Status links, knoppen rechts; op de telefoon de knoppen op een eigen regel eronder */}
        <div className="spelleider-kop">
          {/* Tik op de status (of de pijl) om in te klappen */}
          <div className="spelleider-status spelleider-status--klik"
            onClick={() => { if (rustig) setKeuze(false); }} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" && rustig) setKeuze(false); }}
            title={rustig ? "Inklappen" : "Blijft open zolang er iets aandacht vraagt"}>
            <div className="pr-gem-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <UitklapPijl open />
              🎯 Spelleider
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: "1rem" }}>
              {status}
            </div>
          </div>
          {!beperkt && (
            <div className="spelleider-knoppen">
              {gepauzeerd ? (
                <button type="button" className="rl-knop rl-knop--groen actie-knop" onClick={() => wisselPauze(false)} data-sneltoets="p" title="Verder (sneltoets P)"><Icoon naam="verder" /> Verder</button>
              ) : (
                <BevestigKnop venster gevaarlijk={false} icoon="⏸️" titel="Spel pauzeren?"
                  vraag="Alle teams zien een pauzescherm en kunnen even niets doen. De eindtijd loopt niet door." ja="Ja, pauzeren"
                  onBevestig={() => wisselPauze(true)} className="rl-knop actie-knop" sneltoets="p" title="Pauze (sneltoets P)"><Icoon naam="pauze" /> Pauze</BevestigKnop>
              )}
              {!gepauzeerd && <TussenstandKnop />}
              {routeId && <EindtijdKnop routeId={routeId} eindtijd={eindtijd} />}
              {/* ⏰ Gouden kwartier: 15 minuten dubbele punten */}
              {goudenAan && !gepauzeerd && !uitslagVrij && <GoudenKnop gouden={gouden} onGewijzigd={onGewijzigd} />}
              {/* ⚡ Bonusvraag: klaarzetten, nu sturen en foto's keuren */}
              <BonusKnop />
              {/* 🏁 Afronden (stoppen, uitslag, rapport) en 🧹 Opruimen (nieuw spel, volgende groep) */}
              <SpelAfronden spelend={spelend} uitslagVrij={!!uitslagVrij} onGewijzigd={onGewijzigd} />
            </div>
          )}
          {/* Helper: alleen de bonusvraag bekijken en de bonusfoto's keuren */}
          {beperkt && <div className="spelleider-knoppen"><BonusKnop beperkt /></div>}
        </div>

        {gepauzeerd && (
          <div className="spelleider-regel spelleider-pauze">
            ⏸️ <strong>Gepauzeerd</strong> sinds {new Date(gepauzeerd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} · {duurKort((nu - new Date(gepauzeerd).getTime()) / 60000)}
          </div>
        )}
        {aandacht.length === 0 ? (
          <div className="spelleider-regel" style={{ borderLeftColor: "#4ADE80", color: "#BBF7D0" }}>✅ Alles loopt, niets vraagt je aandacht</div>
        ) : aandacht.map((a) => {
          const inhoud = <><span style={{ flex: 1, minWidth: 0 }}>{a.tekst}</span><span aria-hidden style={{ color: "var(--muted)" }}>›</span></>;
          const stijl = { borderLeftColor: (a.speler && kleuren.get(a.speler.player_id)) || a.kleur || undefined };
          if (a.actie) return <div key={a.id} className="spelleider-regel" style={{ ...stijl, display: "flex", alignItems: "center", gap: 12 }}><span style={{ flex: 1, minWidth: 0 }}>{a.tekst}</span>{a.actie}</div>;
          return <button key={a.id} type="button" className="spelleider-regel spelleider-regel--knop" style={stijl} onClick={() => a.klik ? a.klik() : a.speler && onKies(a.speler)}>{inhoud}</button>;
        })}
      </div>
    </div>
  );
}
