"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Route, RoutePunt, SpeciaalItem, SpelerPuntVoortgang } from "@/types/database";
import type { VraagData, Feedback } from "@/components/speler/VraagPopup";
import VraagPopup from "@/components/speler/VraagPopup";
import { normaliseerPuzzel, puzzelVolgorde, lettersVoor } from "@/lib/puzzel";
import { normaliserenNumeriek, tekstKlopt } from "@/lib/geo";
import { itemNaam } from "@/components/speler/SpeciaalItemLegende";
import type { ProefStand } from "./proeflopen";

const SpelerLeaflet = dynamic(() => import("@/components/speler/SpelerLeaflet"), { ssr: false });

type AdminVraag = Omit<VraagData, "answer_options"> & { correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
  answer_options: (VraagData["answer_options"][number] & { is_correct: boolean; punten: number | null; uitleg?: string | null })[] };

// Antwoord beoordelen zoals de server dat doet (zelfde regels), maar hier in de browser: er wordt niets opgeslagen
function beoordeel(v: VraagData, antwoordId: string | null, openTekst?: string, teLaat?: boolean): Feedback {
  const a = v as unknown as AdminVraag;
  const juiste = a.answer_options?.find((o) => o.is_correct) ?? null;
  const basis = { correct_answer_id: juiste?.id ?? null, correct_answer_ids: (a.answer_options ?? []).filter((o) => o.is_correct).map((o) => o.id),
    uitleg: Object.fromEntries((a.answer_options ?? []).filter((o) => o.uitleg && (o.is_correct || o.id === antwoordId)).map((o) => [o.id, o.uitleg as string])),
    correct_text_answers: null, numeric_answer: null, numeric_tolerance: null };
  if (a.type === "stemvraag") return { ...basis, correct_answer_id: null, is_correct: null, stem: true, points_awarded: 0 };
  if (teLaat) return { ...basis, is_correct: false, points_awarded: 0 };
  if (a.type === "open") {
    if (a.numeric_answer != null) {
      const getal = normaliserenNumeriek(openTekst ?? "");
      const goed = getal !== null && Math.abs(getal - a.numeric_answer) <= (a.numeric_tolerance ?? 0);
      return { ...basis, is_correct: goed, points_awarded: goed ? a.points : 0, numeric_answer: a.numeric_answer, numeric_tolerance: a.numeric_tolerance ?? 0 };
    }
    const goed = (a.correct_text_answers ?? []).some((g) => tekstKlopt(openTekst ?? "", g));
    return { ...basis, is_correct: goed, points_awarded: goed ? a.points : 0, correct_text_answers: a.correct_text_answers ?? [] };
  }
  const gekozen = a.answer_options?.find((o) => o.id === antwoordId);
  const goed = !!gekozen?.is_correct;
  return { ...basis, is_correct: goed, points_awarded: typeof gekozen?.punten === "number" ? gekozen.punten : goed ? a.points : 0 };
}

// 🧪 Testen als speler: het echte spelersscherm in een telefoon, naast de editor. Klik op de grote kaart om
// te lopen; bij een punt opent de vraag in de telefoon. Antwoorden worden hier beoordeeld; niets wordt opgeslagen.
export default function SpelerProef({ route, punten, items, proef, vraagIds, onBezig }: {
  route: Route; punten: RoutePunt[]; items: SpeciaalItem[]; proef: ProefStand; vraagIds: Set<string>;
  // Zolang er een venster open is, loopt de speler niet verder
  onBezig: (bezig: boolean) => void;
}) {
  const [voortgang, setVoortgang] = useState<SpelerPuntVoortgang[]>([]);
  const [score, setScore] = useState(0);
  const [popup, setPopup] = useState<RoutePunt | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);
  const vragenRef = useRef(new Map<string, Promise<VraagData | null>>());
  const verwerkt = useRef(new Set<number>());

  // Opnieuw beginnen: alles terug naar het begin
  useEffect(() => {
    if (proef.pos === null) { setVoortgang([]); setScore(0); setPopup(null); setKlaar(false); setMelding(null); verwerkt.current.clear(); }
  }, [proef.pos]);

  // Na elke stap: bereikte punten verwerken (doorlooppunt stil, anders het venster) en items oppakken
  const vorigeGepakt = useRef<string[]>([]);
  useEffect(() => {
    for (const i of proef.bereikt ?? []) {
      if (verwerkt.current.has(i)) continue;
      verwerkt.current.add(i);
      const p = punten[i];
      if (!p) continue;
      if (p.type === "doorlooppunt") { setVoortgang((v) => [...v, lokaal(p.id, null, 0)]); continue; }
      setPopup(p);
    }
    const nieuw = proef.gepakt.filter((id) => !vorigeGepakt.current.includes(id));
    vorigeGepakt.current = proef.gepakt;
    for (const id of nieuw) {
      const it = items.find((x) => x.id === id);
      if (!it) continue;
      if (it.type === "ster") { const w = route.ster_waarde ?? 50; setScore((s) => s + w); setMelding(`⭐ Ster opgepakt: +${w} punten`); }
      else if (it.type === "plekzooi") setMelding("⛔ In een plek zooi gelopen: even stilstaan");
      else setMelding(`🎁 ${itemNaam(it.type)} opgepakt`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proef]);
  useEffect(() => { onBezig(!!popup); }, [popup, onBezig]);
  useEffect(() => { if (!melding) return; const t = setTimeout(() => setMelding(null), 3500); return () => clearTimeout(t); }, [melding]);

  function haalVraag(p: RoutePunt): Promise<VraagData | null> {
    if (!vraagIds.has(p.id)) return Promise.resolve(null);
    let v = vragenRef.current.get(p.id);
    if (!v) {
      v = fetch(`/api/admin/routes/${route.id}/punten/${p.id}/vraag`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      vragenRef.current.set(p.id, v);
    }
    return v;
  }

  // 🧩 Puzzelwoord: zelfde regels als in het spel (letters per vraag), met een vaste volgorde voor de test
  const puzzel = useMemo(() => {
    const woord = route.puzzel_aan === false ? "" : normaliseerPuzzel(route.puzzelwoord);
    if (!woord) return null;
    const gevonden = Math.min(woord.length, voortgang.filter((v) => v.is_correct && vraagIds.has(v.route_point_id))
      .reduce((n, v) => n + lettersVoor(route.puzzel_verdeling, v.route_point_id), 0));
    const open = new Set(puzzelVolgorde("proef", woord.length, route.puzzel_volgorde === "op_volgorde").slice(0, gevonden));
    return woord.split("").map((l, i) => (open.has(i) ? l : null));
  }, [route.puzzelwoord, route.puzzel_aan, route.puzzel_verdeling, route.puzzel_volgorde, voortgang, vraagIds]);

  const verwerktIds = useMemo(() => new Set(voortgang.map((v) => v.route_point_id)), [voortgang]);
  const actief = punten[proef.volgende] ?? null;
  const positie = proef.pos ? ({ latitude: proef.pos.lat, longitude: proef.pos.lng, accuracy: 5 } as GeolocationCoordinates) : null;

  return (
    <div className="proef-telefoon" aria-label="Testen als speler">
      <div className="proef-telefoon-scherm">
        {/* Puntenbalk zoals bij de speler */}
        <div className="proef-hud">
          <span className="pr-hud-gem pr-hud-gem--purple"><span className="pr-hud-icoon">🗺️</span><span className="pr-hud-getal">{(proef.gelopenM / 1000).toFixed(2)}</span></span>
          <span className={`pr-hud-gem ${score < 0 ? "pr-hud-gem--min" : "pr-hud-gem--orange"}`}><span className="pr-hud-icoon">⭐</span><span className="pr-hud-getal">{score}</span></span>
        </div>
        {puzzel && (
          <div className="puzzel-balk">🧩 <div className="puzzel-tegels">{puzzel.map((l, i) => <span key={i} className={`puzzel-tegel${l ? " puzzel-tegel--open" : ""}`}>{l ?? ""}</span>)}</div></div>
        )}
        <div className="proef-kaart">
          <SpelerLeaflet positie={positie} punten={punten} verwerktIds={verwerktIds} bereiktIds={new Set(popup ? [popup.id] : [])}
            activePuntId={klaar ? null : actief?.id ?? null} stilleIds={new Set(punten.filter((p) => p.type === "doorlooppunt").map((p) => p.id))}
            heleRoute={route.modus !== "verspreid" && !!route.alle_punten_zichtbaar} verbodenGebieden={route.verboden_gebieden ?? []}
            andereSpelers={[]} specialeItems={items.filter((i) => !i.is_startitem && i.type !== "plekzooi" && !proef.gepakt.includes(i.id))}
            ghostedPuntId={null} spelerIcoon="🧪" spelerNaam="Test" stijlOnder={14} />
          {!proef.pos && <div className="proef-tip">👆 Klik op de grote kaart waar je begint, en dan steeds waar je heen loopt.</div>}
          {melding && <div className="proef-melding">{melding}</div>}
        </div>
        {/* Het echte vraagvenster (in testmodus) */}
        {popup && (
          <VraagPopup key={popup.id} punt={popup}
            proef={{ haalVraag: () => haalVraag(popup), beoordeel }}
            onVerwerkt={(v) => {
              setVoortgang((l) => [...l, v]);
              // Minpunten tellen ook hier: de score mag onder 0 (net als in het echte spel)
              setScore((s) => s + (v.points_awarded || (v.is_correct === null && !vraagIds.has(popup.id) ? popup.points : 0)));
              if (popup.type === "eindpunt") setKlaar(true);
              setPopup(null);
            }} />
        )}
        {klaar && !popup && (
          <div className="proef-finish">
            <div style={{ fontSize: "3rem" }}>🏁</div>
            <strong>Finish!</strong>
            <span>{score} punten · {(proef.gelopenM / 1000).toFixed(2).replace(".", ",")} km</span>
            {puzzel && <span>🧩 {puzzel.filter(Boolean).length} van {puzzel.length} letters</span>}
            <span className="proef-finish-noot">Dit was een test: er is niets opgeslagen.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function lokaal(puntId: string, goed: boolean | null, punten: number): SpelerPuntVoortgang {
  const nu = new Date().toISOString();
  return { id: `proef-${puntId}`, session_id: "", route_point_id: puntId, reached_at: nu, answered_at: nu, selected_answer_id: null, open_answer_text: null, is_correct: goed, points_awarded: punten };
}
