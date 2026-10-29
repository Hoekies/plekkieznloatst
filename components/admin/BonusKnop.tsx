"use client";

import { useCallback, useEffect, useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import Icoon from "@/components/admin/Icoon";
import Vragenbank, { type BankVraag } from "@/components/admin/editor/Vragenbank";
import { BONUS_DUUR_KEUZES, bonusPunten, type BonusAntwoord, type BonusVraag } from "@/lib/bonus";

// ⚡ Bonusvraag (migratie 004): de spelleider zet een extra vraag klaar (meerkeuze of een foto-opdracht) die na
// X minuten speeltijd (of met ▶ Nu sturen) bij alle teams tegelijk in beeld komt. Eén poging per team; de eerste
// goede krijgt alle punten, de volgende steeds minder. Foto's tellen pas na goedkeuring, op volgorde van insturen.

type Antwoord = BonusAntwoord & { team: { naam: string; icon: string | null }; foto_url: string | null };
type Rij = BonusVraag & { open: boolean; rest: number; start_om: number | null; antwoorden: Antwoord[] };
type Concept = { id: string | null; vraag: string; soort: "meerkeuze" | "foto"; keuzes: string[]; goed_index: number; punten: number; na_minuten: number | null; duur_seconden: number };

const LEEG: Concept = { id: null, vraag: "", soort: "meerkeuze", keuzes: ["", "", "", ""], goed_index: 0, punten: 100, na_minuten: 30, duur_seconden: 120 };
const uurMin = (t: number) => new Date(t).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// De knop op het dashboard (actieve route): laat zien of er een vraag loopt of foto's wachten, en opent de lijst
export default function BonusKnop({ beperkt = false }: { beperkt?: boolean }) {
  const [open, setOpen] = useState(false);
  const [vragen, setVragen] = useState<Rij[] | null>(null);
  const laad = useCallback(async () => {
    const res = await fetch("/api/admin/bonus").catch(() => null);
    const d = res?.ok ? await res.json().catch(() => ({})) : {};
    setVragen(d.vragen ?? []);
  }, []);
  // Ook dicht af en toe laden: de knop laat zien of er een vraag loopt of foto's wachten
  useEffect(() => { laad(); const t = setInterval(laad, open ? 4000 : 15000); return () => clearInterval(t); }, [laad, open]);
  // Geopend vanuit een pushmelding (?bonus=1)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("bonus")) { setOpen(true); window.history.replaceState(null, "", window.location.pathname); }
  }, []);

  const loopt = vragen?.find((v) => v.open);
  const wachtFotos = (vragen ?? []).reduce((n, v) => n + v.antwoorden.filter((a) => a.foto_status === "wacht").length, 0);
  const gepland = (vragen ?? []).filter((v) => !v.gestart_op).length;

  return (
    <>
      <button type="button" className={`rl-knop actie-knop${loopt ? " rl-knop--goud" : wachtFotos ? " rl-knop--groen" : ""}`} onClick={() => setOpen(true)}
        title="Bonusvraag: een extra vraag die bij alle teams tegelijk in beeld komt">
        <Icoon naam="bezig" /> {loopt ? `Bonus · ${mmss(loopt.rest)}` : "Bonusvraag"}
        {wachtFotos > 0 ? <span className="antw-tab-teller">{wachtFotos}</span> : gepland > 0 && !loopt ? <span className="antw-tab-teller antw-tab-teller--rustig">{gepland}</span> : null}
      </button>
      {open && (
        <VensterMetKop icoon="⚡" label="Bonusvraag" titel="Bij alle teams tegelijk" onSluit={() => { setOpen(false); laad(); }} breedte={560} maxHoogte={92}>
          <BonusLijst beperkt={beperkt} />
        </VensterMetKop>
      )}
    </>
  );
}

// ⚡ De lijst met bonusvragen en het formulier: op het dashboard (actieve route, met ▶ Nu sturen en foto's keuren)
// en in de route-editor (routeId: klaarzetten voor deze route, ook als hij nog niet actief is)
export function BonusLijst({ routeId, inEditor = false, beperkt = false }: { routeId?: string; inEditor?: boolean; beperkt?: boolean }) {
  const [vragen, setVragen] = useState<Rij[] | null>(null);
  const [teamsNu, setTeamsNu] = useState(0);
  const [fout, setFout] = useState("");
  const [concept, setConcept] = useState<Concept | null>(null);
  const [bezig, setBezig] = useState(false);
  const adres = routeId ? `/api/admin/bonus?route_id=${routeId}` : "/api/admin/bonus";

  const laad = useCallback(async () => {
    const res = await fetch(adres).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setFout(d.fout ?? "Laden lukte niet"); setVragen([]); return; }
    setFout(""); setVragen(d.vragen ?? []); setTeamsNu(d.teams_nu ?? 0);
  }, [adres]);
  // In de editor hoeft het niet live; op het dashboard wel (antwoorden en foto's komen binnen)
  useEffect(() => { laad(); if (inEditor) return; const t = setInterval(laad, 4000); return () => clearInterval(t); }, [laad, inEditor]);

  async function stuur(method: string, body: object, gelukt: string) {
    setBezig(true);
    const res = await fetch("/api/admin/bonus", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Bonusvraag", d.fout), "fout"); return false; }
    toonMelding(gelukt, "ok");
    await laad();
    return true;
  }

  async function bewaar() {
    if (!concept) return;
    const body = { ...concept, keuzes: concept.keuzes.filter((k) => k.trim()), ...(routeId ? { route_id: routeId } : {}) };
    const ok = concept.id ? await stuur("PATCH", body, "Bonusvraag aangepast") : await stuur("POST", body, "Bonusvraag klaargezet");
    if (ok) setConcept(null);
  }

  // 🕒 Op volgorde van het spel: eerst wat vanzelf komt (na X min), dan wat met de knop gaat
  const lijst = [...(vragen ?? [])].sort((a, b) => (a.na_minuten ?? 9999) - (b.na_minuten ?? 9999));

  if (concept) return <BonusFormulier concept={concept} teams={teamsNu} bezig={bezig} onWijzig={setConcept} onBewaar={bewaar} onTerug={() => setConcept(null)} />;
  return (
    <div className="bonus-lijst">
      {fout && <div className="inst-uitleg" style={{ color: "#FCA5A5" }}>⚠️ {fout}</div>}
      <p className="inst-uitleg">Komt na de ingestelde speeltijd (of met <strong>▶ Nu sturen</strong> op het dashboard) bij alle teams tegelijk in beeld, met een eigen geluid. Eén poging per team: de eerste goede krijgt alle punten, de volgende steeds minder.</p>
      {lijst.length === 0 && !fout && <div className="bonus-leeg">Nog geen bonusvraag klaargezet.</div>}
      {lijst.map((v) => (
        <BonusRij key={v.id} v={v} beperkt={beperkt} inEditor={inEditor} bezig={bezig}
          onStart={() => stuur("PATCH", { id: v.id, actie: "start" }, "Bonusvraag verstuurd naar alle teams")}
          onBewerk={() => setConcept({ id: v.id, vraag: v.vraag, soort: v.soort, keuzes: [...(v.keuzes ?? []), "", "", "", ""].slice(0, 4), goed_index: v.goed_index ?? 0, punten: v.punten, na_minuten: v.na_minuten, duur_seconden: v.duur_seconden })}
          onWeg={() => stuur("DELETE", { id: v.id }, "Bonusvraag weggehaald")}
          onKeur={(antwoordId, goed) => stuur("PATCH", { id: v.id, actie: "keur", antwoord_id: antwoordId, goed }, goed ? "Foto goedgekeurd: punten toegekend" : "Foto afgekeurd")} />
      ))}
      {!beperkt && (
        <button type="button" className="rl-knop rl-knop--cyan bonus-nieuw" onClick={() => setConcept({ ...LEEG })}>
          <Icoon naam="plus" /> Nieuwe bonusvraag
        </button>
      )}
    </div>
  );
}

function BonusRij({ v, beperkt, inEditor, bezig, onStart, onBewerk, onWeg, onKeur }: {
  v: Rij; beperkt: boolean; inEditor: boolean; bezig: boolean; onStart: () => void; onBewerk: () => void; onWeg: () => void; onKeur: (antwoordId: string, goed: boolean) => void;
}) {
  const status = v.open ? <span className="bonus-status bonus-status--loopt">● Loopt nog {mmss(v.rest)}</span>
    : v.gestart_op ? <span className="bonus-status">✓ Afgelopen</span>
    : v.start_om ? <span className="bonus-status bonus-status--gepland">⏰ Om {uurMin(v.start_om)}</span>
    : v.na_minuten != null ? <span className="bonus-status bonus-status--gepland">⏰ Na {v.na_minuten} min speeltijd</span>
    : <span className="bonus-status bonus-status--gepland">Met de knop</span>;
  return (
    <div className={`bonus-rij${v.open ? " bonus-rij--loopt" : ""}`}>
      <div className="bonus-rij-kop">
        <span className="bonus-rij-soort" aria-hidden>{v.soort === "foto" ? "📸" : "🔘"}</span>
        <div className="bonus-rij-tekst">
          <strong>{v.vraag}</strong>
          <span>{v.punten} punten · {Math.round(v.duur_seconden / 60 * 10) / 10} min open{v.soort === "meerkeuze" && v.keuzes ? ` · goed: ${v.keuzes[v.goed_index ?? 0]}` : ""}</span>
        </div>
        {status}
      </div>
      {!beperkt && !v.gestart_op && (
        <div className="bonus-rij-knoppen">
          {!inEditor && <BevestigKnop venster gevaarlijk={false} icoon="⚡" titel="Bonusvraag nu sturen?" ja="Ja, nu sturen" onBevestig={onStart}
            vraag={`Alle teams krijgen hem nu tegelijk, ${Math.round(v.duur_seconden / 60 * 10) / 10} minuten lang.`} className="rl-knop rl-knop--goud" disabled={bezig}>
            <Icoon naam="verder" /> Nu sturen
          </BevestigKnop>}
          <button type="button" className="rl-knop" onClick={onBewerk} disabled={bezig}><Icoon naam="bewerken" /> Aanpassen</button>
          <BevestigKnop venster icoon="🗑️" titel="Bonusvraag weghalen?" vraag="" ja="Ja, weghalen" onBevestig={onWeg} className="rl-knop rl-knop--rood" disabled={bezig}>
            <Icoon naam="wissen" />
          </BevestigKnop>
        </div>
      )}
      {v.gestart_op && (
        <div className="bonus-antwoorden">
          {v.antwoorden.length === 0 && <span className="bonus-leeg">Nog geen antwoorden{v.open ? "…" : ""}</span>}
          {v.antwoorden.map((a) => (
            <div key={a.id} className="bonus-antwoord">
              <span>{a.team.icon ?? "👫"} {a.team.naam}</span>
              {a.foto_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={a.foto_url} target="_blank" rel="noopener noreferrer"><img src={a.foto_url} alt="" className="bonus-antwoord-foto" /></a>
              )}
              <span className="bonus-antwoord-uitslag">
                {a.foto_status === "wacht" ? (
                  <>
                    <button type="button" className="rl-knop rl-knop--groen" disabled={bezig} onClick={() => onKeur(a.id, true)}><Icoon naam="goed" /> Goed</button>
                    <button type="button" className="rl-knop rl-knop--rood" disabled={bezig} onClick={() => onKeur(a.id, false)}><Icoon naam="fout" /> Af</button>
                  </>
                ) : a.is_correct ? <strong className="bonus-punten">+{a.punten}</strong> : <span className="bonus-mis">✗ fout</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BonusFormulier({ concept: c, teams, bezig, onWijzig, onBewaar, onTerug }: {
  concept: Concept; teams: number; bezig: boolean; onWijzig: (c: Concept) => void; onBewaar: () => void; onTerug: () => void;
}) {
  const zet = (deel: Partial<Concept>) => onWijzig({ ...c, ...deel });
  const n = Math.max(2, teams || 3);
  // Voorbeeld van de verdeling, bijv. 100 · 67 · 33
  const verdeling = Array.from({ length: Math.min(n, 5) }, (_, i) => bonusPunten(c.punten, n, i + 1)).join(" · ");
  // 📚 Een vraag uit een route overnemen: meerkeuze (de teksten van de keuzes) of een foto-opdracht
  function uitBank(v: BankVraag) {
    if (v.type === "foto_opdracht") { zet({ soort: "foto", vraag: v.question_text.slice(0, 300) }); return; }
    const keuzes = v.answer_options.map((o) => (o.text ?? "").slice(0, 80));
    zet({ soort: "meerkeuze", vraag: v.question_text.slice(0, 300), keuzes: [...keuzes, "", "", "", ""].slice(0, 4), goed_index: Math.max(0, v.answer_options.findIndex((o) => o.is_correct)) });
  }
  return (
    <div className="bonus-form">
      <div className="bonus-form-bank">
        <span className="bonus-hint">Of neem een vraag over uit een route:</span>
        <Vragenbank soorten={["meerkeuze_tekst", "foto_opdracht"]} onKies={uitBank} metTekst />
      </div>
      <div className="segment" role="radiogroup" aria-label="Soort">
        <button type="button" role="radio" aria-checked={c.soort === "meerkeuze"} className={c.soort === "meerkeuze" ? "aan" : ""} onClick={() => zet({ soort: "meerkeuze" })}>🔘 Meerkeuze</button>
        <button type="button" role="radio" aria-checked={c.soort === "foto"} className={c.soort === "foto" ? "aan" : ""} onClick={() => zet({ soort: "foto" })}>📸 Foto-opdracht</button>
      </div>
      <label className="form-label">{c.soort === "foto" ? "Opdracht" : "Vraag"}</label>
      <textarea className="form-input" rows={2} maxLength={300} value={c.vraag} onChange={(e) => zet({ vraag: e.target.value })}
        placeholder={c.soort === "foto" ? "Maak een foto van het hele team met een hond erop" : "Hoe hoog is de kerktoren?"} />
      {c.soort === "meerkeuze" && (
        <>
          <label className="form-label">Keuzes <span className="bonus-hint">(tik ✓ bij het goede antwoord)</span></label>
          {c.keuzes.map((k, i) => (
            <div key={i} className="bonus-keuze-rij">
              <button type="button" className={`bonus-goed${c.goed_index === i ? " bonus-goed--aan" : ""}`} onClick={() => zet({ goed_index: i })} aria-pressed={c.goed_index === i} aria-label={`Keuze ${i + 1} is goed`}>✓</button>
              <input className="form-input" value={k} maxLength={80} placeholder={`Keuze ${i + 1}${i >= 2 ? " (mag leeg)" : ""}`}
                onChange={(e) => zet({ keuzes: c.keuzes.map((x, j) => (j === i ? e.target.value : x)) })} />
            </div>
          ))}
        </>
      )}
      <label className="form-label">Punten voor de eerste <span className="bonus-hint">({n} teams: {verdeling})</span></label>
      <div className="punten-snel">
        {[50, 100, 150, 200].map((p) => <button key={p} type="button" className={`rl-knop${c.punten === p ? " rl-knop--cyan" : ""}`} onClick={() => zet({ punten: p })}>{p}</button>)}
      </div>
      <label className="form-label">Wanneer</label>
      <div className="punten-snel">
        <button type="button" className={`rl-knop${c.na_minuten === null ? " rl-knop--cyan" : ""}`} onClick={() => zet({ na_minuten: null })}>Met de knop</button>
        {[15, 30, 45, 60].map((m) => <button key={m} type="button" className={`rl-knop${c.na_minuten === m ? " rl-knop--cyan" : ""}`} onClick={() => zet({ na_minuten: m })}>na {m} min</button>)}
      </div>
      <label className="form-label">Hoe lang open</label>
      <div className="punten-snel">
        {BONUS_DUUR_KEUZES.map((s) => <button key={s} type="button" className={`rl-knop${c.duur_seconden === s ? " rl-knop--cyan" : ""}`} onClick={() => zet({ duur_seconden: s })}>{s / 60} min</button>)}
      </div>
      <div className="bonus-form-knoppen">
        <button type="button" className="rl-knop" onClick={onTerug}><Icoon naam="terug" /> Terug</button>
        <button type="button" className="rl-knop rl-knop--cyan" disabled={bezig} onClick={onBewaar}><Icoon naam="opslaan" /> {c.id ? "Opslaan" : "Klaarzetten"}</button>
      </div>
    </div>
  );
}
