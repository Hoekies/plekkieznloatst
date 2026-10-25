"use client";

import { useState } from "react";
import type { Route } from "@/types/database";
import { toonMelding } from "@/components/admin/Melding";
import { normaliseerPuzzel, lettersVoor } from "@/lib/puzzel";
import Icoon from "@/components/admin/Icoon";
import UitklapPijl from "@/components/shared/UitklapPijl";

// 🎲 Letters automatisch verdelen: elke vraag 1 letter; is het woord langer, dan geven willekeurige vragen er 2,
// is het korter, dan geven willekeurige vragen er geen. Zo klopt het meteen (tenzij het woord meer dan twee keer
// zo lang is als het aantal vragen).
export function verdeelLetters(vraagIds: string[], letters: number): Record<string, number> {
  const verschil = letters - vraagIds.length;
  if (!verschil || !vraagIds.length) return {};
  const geschud = [...vraagIds].sort(() => Math.random() - 0.5);
  return Object.fromEntries(geschud.slice(0, Math.min(Math.abs(verschil), vraagIds.length)).map((id) => [id, verschil > 0 ? 2 : 0]));
}

type Velden = { puzzel_aan?: boolean; puzzelwoord?: string; puzzel_bonus?: number; puzzel_omschrijving?: string; puzzel_verdeling?: Record<string, number>;
  puzzel_volgorde?: "willekeurig" | "op_volgorde";
  puzzel_letter_punten?: number; puzzel_raad_bonus?: number };

// 🧩 Puzzelwoord: aan of uit. Elke goed beantwoorde vraag geeft een letter, dus het woord heeft evenveel
// letters als er vragen zijn. Ander aantal? Dan kies je per vraag "geen letter" of "2 letters".
export default function PuzzelInstellingen({ route, vraagpunten, onOpslaan }: {
  route: Route; vraagpunten: { id: string; name: string }[]; onOpslaan: (velden: Velden) => Promise<unknown>;
}) {
  const [aan, setAan] = useState(route.puzzel_aan ?? !!route.puzzelwoord);
  const [woord, setWoord] = useState(route.puzzelwoord ?? "");
  // Punten bij de finish: per gevonden letter, alle letters gevonden, en het woord zelf afmaken
  const [bonus, setBonus] = useState(route.puzzel_bonus ?? 100);
  const [letterPunten, setLetterPunten] = useState(route.puzzel_letter_punten ?? 10);
  const [raadBonus, setRaadBonus] = useState(route.puzzel_raad_bonus ?? 50);
  // Letters willekeurig (per team anders, moeilijker) of van links naar rechts (makkelijker)
  const [volgorde, setVolgorde] = useState<"willekeurig" | "op_volgorde">(route.puzzel_volgorde ?? "willekeurig");
  const [omschrijving, setOmschrijving] = useState(route.puzzel_omschrijving ?? "");
  const [verdeling, setVerdeling] = useState<Record<string, number>>(route.puzzel_verdeling ?? {});
  const [voorstellen, setVoorstellen] = useState<{ woord: string; omschrijving: string }[] | null>(null);
  const [zoekt, setZoekt] = useState(false);

  const letters = normaliseerPuzzel(woord).length;
  // Zoveel letters kunnen de vragen samen opleveren
  const teVerdienen = vraagpunten.reduce((n, p) => n + lettersVoor(verdeling, p.id), 0);
  const verschil = letters - teVerdienen;

  async function zetAan(nieuw: boolean) {
    setAan(nieuw);
    await onOpslaan({ puzzel_aan: nieuw });
  }
  async function bedenk() {
    setZoekt(true); setVoorstellen(null);
    // Het aantal letters volgt uit het aantal vragen; staat het er niet bij, dan zet de app het erachter
    const vraag = /\d+\s*letter/i.test(omschrijving) ? omschrijving : `${omschrijving.trim()}, ${teVerdienen} letters`;
    const res = await fetch(`/api/admin/puzzel-ideeen?vraag=${encodeURIComponent(vraag)}`).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setZoekt(false);
    if (!res?.ok) { toonMelding(data.fout ?? "Bedenken lukte niet", "fout"); return; }
    setVoorstellen(data.woorden);
  }
  async function kies(v: { woord: string; omschrijving: string }) {
    setWoord(v.woord); setOmschrijving(v.omschrijving); setVoorstellen(null);
    await bewaarWoord(v.woord, { puzzel_omschrijving: v.omschrijving });
  }
  // Nieuw woord: de letters vanzelf over de vragen verdelen als het aantal niet klopt
  async function bewaarWoord(nieuw: string, extra: Velden = {}) {
    const n = normaliseerPuzzel(nieuw).length;
    const klopt = n === vraagpunten.reduce((t, p) => t + lettersVoor(verdeling, p.id), 0);
    if (!n || klopt) { await onOpslaan({ puzzelwoord: nieuw, ...extra }); return; }
    const nieuweVerdeling = verdeelLetters(vraagpunten.map((p) => p.id), n);
    setVerdeling(nieuweVerdeling);
    await onOpslaan({ puzzelwoord: nieuw, puzzel_verdeling: nieuweVerdeling, ...extra });
  }
  async function verdeelOpnieuw() {
    const nieuw = verdeelLetters(vraagpunten.map((p) => p.id), letters);
    setVerdeling(nieuw);
    await onOpslaan({ puzzel_verdeling: nieuw });
    toonMelding("Letters opnieuw verdeeld over de vragen", "ok");
  }
  const [lijstOpen, setLijstOpen] = useState(false);
  const aangepast = Object.keys(verdeling).filter((id) => vraagpunten.some((p) => p.id === id)).length;

  async function zetLetters(puntId: string, n: number) {
    const nieuw = { ...verdeling };
    if (n === 1) delete nieuw[puntId]; else nieuw[puntId] = n;
    setVerdeling(nieuw);
    await onOpslaan({ puzzel_verdeling: nieuw });
  }

  return (
    <div className="form-group puzzel-inst">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label className="form-label" style={{ margin: 0, flex: 1 }}>🧩 Puzzelwoord</label>
        <div className="segment" role="radiogroup" aria-label="Puzzelwoord gebruiken" style={{ width: 150 }}>
          <button type="button" role="radio" aria-checked={!aan} className={!aan ? "aan" : ""} onClick={() => zetAan(false)}>Uit</button>
          <button type="button" role="radio" aria-checked={aan} className={aan ? "aan" : ""} onClick={() => zetAan(true)}>Aan</button>
        </div>
      </div>
      <span className="inst-uitleg">
        Elke goed beantwoorde vraag geeft het team een letter van een geheim woord. Bij de finish raden ze het woord voor bonuspunten.
      </span>
      {aan && (
        <>
          {/* Stap 1: omschrijving en woord (laten bedenken of zelf typen) */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="form-input" value={omschrijving} maxLength={120} placeholder="Hint, bijv. Plaats in Nederland, Een dier, Ander woord voor slot"
              onChange={(e) => setOmschrijving(e.target.value)} onBlur={() => onOpslaan({ puzzel_omschrijving: omschrijving })} style={{ flex: "1 1 220px" }} />
            <button type="button" className="rl-knop" disabled={!omschrijving.trim() || zoekt} onClick={bedenk}
              title={`De app bedenkt woorden van ${teVerdienen} letters die bij de hint passen`}>{zoekt ? <><Icoon naam="laden" />{" Bedenken…"}</> : <><Icoon naam="nieuw" />{` Bedenk een woord (${teVerdienen})`}</>}</button>
          </div>
          {voorstellen && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {voorstellen.map((v) => (
                <button key={v.woord} type="button" className="rl-knop" onClick={() => kies(v)} title={v.omschrijving}
                  style={{ letterSpacing: "0.08em", fontWeight: 800 }}>{v.woord} <span style={{ fontWeight: 400, color: "var(--muted)", letterSpacing: 0 }}>({v.woord.length})</span></button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="form-input" value={woord} maxLength={30} placeholder="Of typ zelf een woord, bijv. KASTEEL"
              onChange={(e) => setWoord(e.target.value.toUpperCase())} onBlur={() => { if (woord !== (route.puzzelwoord ?? "")) bewaarWoord(woord); }} style={{ flex: "1 1 160px", letterSpacing: "0.12em", fontWeight: 700 }} />
            {letters > 0 && <span className="puzzel-aantal" title="Letters in het woord (spaties en leestekens tellen niet)">{letters} letters</span>}
          </div>
          {/* Meteen tijdens het typen: klopt het woord met de vragen, en zo niet, hoeveel vragen te veel of te kort? */}
          {letters > 0 && (
            <div className={`puzzel-telling${verschil === 0 ? " puzzel-telling--goed" : ""}`}>
              {verschil === 0
                ? <>✅ Klopt: {letters} letters, en de vragen geven samen {teVerdienen} letters.{aangepast > 0 && <> {aangepast} {aangepast === 1 ? "vraag geeft" : "vragen geven"} geen of 2 letters.</>}</>
                : verschil > 0
                  ? <>⚠️ <strong>{verschil} {verschil === 1 ? "vraag" : "vragen"} te kort</strong>: het woord heeft {letters} letters, de vragen geven er {teVerdienen}. Maak {verschil === 1 ? "een vraag" : `${verschil} vragen`} extra, laat hieronder {verschil === 1 ? "een vraag" : `${verschil} vragen`} <strong>2 letters</strong> geven, of maak het woord korter.</>
                  : <>⚠️ <strong>{-verschil} {verschil === -1 ? "vraag" : "vragen"} te veel</strong>: het woord heeft {letters} letters, de vragen geven er {teVerdienen}. Zet hieronder {-verschil === 1 ? "een vraag" : `${-verschil} vragen`} op <strong>Geen</strong>, of maak het woord langer.</>}
              {vraagpunten.length > 0 && (
                <button type="button" className="rl-knop puzzel-verdeel" onClick={verdeelOpnieuw}
                  title="Willekeurige vragen geven geen of 2 letters, zodat het aantal klopt">
                  <Icoon naam="dobbelsteen" /> {verschil === 0 ? "Opnieuw verdelen" : "Laat het kloppen"}
                </button>
              )}
            </div>
          )}
          {/* Volgorde van de letters */}
          <div className="inst-rij">
            <span className="inst-rij-label">Letters</span>
            <div className="segment" role="radiogroup" aria-label="Volgorde van de letters">
              {([["willekeurig", "🔀 Willekeurige plek"], ["op_volgorde", "➡️ Van links naar rechts"]] as const).map(([w, label]) => (
                <button key={w} type="button" role="radio" aria-checked={volgorde === w} className={volgorde === w ? "aan" : ""}
                  onClick={() => { setVolgorde(w); onOpslaan({ puzzel_volgorde: w }); }}>{label}</button>
              ))}
            </div>
          </div>
          <span className="inst-uitleg">{volgorde === "willekeurig"
            ? "Elke goede vraag geeft een letter op een willekeurige plek, per team anders: moeilijker te raden, en afkijken helpt niet."
            : "De letters komen van links naar rechts: het woord is makkelijker te raden."}</span>
          {/* Punten, uitbetaald bij de finish */}
          <div className="puzzel-bedragen">
            <label>
              <span>Per gevonden letter</span>
              <input className="form-input" type="number" min={0} value={letterPunten}
                onChange={(e) => setLetterPunten(Math.max(0, Number(e.target.value)))} onBlur={() => onOpslaan({ puzzel_letter_punten: letterPunten })} />
            </label>
            <label>
              <span>Alle letters gevonden</span>
              <input className="form-input" type="number" min={0} value={bonus}
                onChange={(e) => setBonus(Math.max(0, Number(e.target.value)))} onBlur={() => onOpslaan({ puzzel_bonus: bonus })} />
            </label>
            <label>
              <span>Woord zelf afmaken</span>
              <input className="form-input" type="number" min={0} value={raadBonus}
                onChange={(e) => setRaadBonus(Math.max(0, Number(e.target.value)))} onBlur={() => onOpslaan({ puzzel_raad_bonus: raadBonus })} />
            </label>
          </div>
          <span className="inst-uitleg">
            Bij de finish krijgt het team punten voor elke gevonden letter. Alle letters gevonden: de bonus erbij. Niet alles gevonden? Dan mag het team het woord zelf afmaken voor de punten bij <em>Woord zelf afmaken</em>.
          </span>

          {/* Per vraag: geen, 1 of 2 letters. Gaat meestal vanzelf; zelf aanpassen kan hier (ingeklapt) of in de
              vraag-editor bij de vraag zelf */}
          {letters > 0 && vraagpunten.length > 0 && (
            <button type="button" className="puzzel-lijst-kop" onClick={() => setLijstOpen((o) => !o)} aria-expanded={lijstOpen}>
              <UitklapPijl open={lijstOpen} /> Zelf per vraag aanpassen
            </button>
          )}
          {letters > 0 && vraagpunten.length > 0 && lijstOpen && (
            <div className="puzzel-verdeling">
              {vraagpunten.map((p, i) => {
                const n = lettersVoor(verdeling, p.id);
                return (
                  <div key={p.id} className="puzzel-verdeling-rij">
                    <span className="puzzel-verdeling-naam">{i + 1}. {p.name}</span>
                    <div className="segment" role="radiogroup" aria-label={`Letters voor ${p.name}`}>
                      {[0, 1, 2].map((k) => (
                        <button key={k} type="button" role="radio" aria-checked={n === k} className={n === k ? "aan" : ""} onClick={() => zetLetters(p.id, k)}>
                          {k === 0 ? "Geen" : k === 1 ? "1" : "2"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <span className="inst-uitleg">
            De spelers zien de hint boven de tegeltjes; elke letter komt op een willekeurige plek (per team anders). Het woord zelf staat nooit op hun telefoon.
          </span>
        </>
      )}
    </div>
  );
}
