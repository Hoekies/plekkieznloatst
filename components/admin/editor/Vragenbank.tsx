"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";
import { foutUitleg } from "@/lib/fout-uitleg";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import { useSluitMetEsc, vensterHoogte } from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";

export type BankVraag = {
  id: string; type: string; question_text: string; question_image_path: string | null; points: number;
  correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
  antwoorden_husselen: boolean; geluid_pad: string | null; tijdslimiet_seconden: number | null;
  answer_options: { color: string; text: string | null; image_path: string | null; is_correct: boolean; uitleg?: string | null; punten: number | null }[];
  punt_naam: string; route_naam: string;
  favoriet: boolean; verborgen: boolean;
};

const TYPE_ICOON: Record<string, string> = { meerkeuze_tekst: "🔤", meerkeuze_afbeelding: "🖼️", open: "✏️", foto_opdracht: "📸", stemvraag: "🗳️" };
// Volgorde en namen van de soorten vragen (filterknoppen en kopjes)
const TYPES: { type: string; naam: string }[] = [
  { type: "meerkeuze_tekst", naam: "Meerkeuze" },
  { type: "stemvraag", naam: "Stem" },
  { type: "meerkeuze_afbeelding", naam: "Met afbeeldingen" },
  { type: "open", naam: "Open" },
  { type: "foto_opdracht", naam: "Foto" },
];
const typeVolgorde = (t: string) => { const i = TYPES.findIndex((x) => x.type === t); return i < 0 ? TYPES.length : i; };

// Filter: alle, favorieten, één soort, of de vragen die uit de bank gehaald zijn
type Filter = { soort: "alle" } | { soort: "favoriet" } | { soort: "verwijderd" } | { soort: "type"; type: string };

// "📚 Vragenbank": een vraag uit een andere route overnemen. Vult alleen het formulier;
// pas na Opslaan staat de vraag op dit punt. Met ☆ markeer je favorieten, met 🗑️ haal je een
// vraag uit de bank (de vraag blijft gewoon in zijn eigen route staan).
export default function Vragenbank({ puntId, onKies }: { puntId: string; onKies: (v: BankVraag) => void }) {
  const [open, setOpen] = useState(false);
  const [vragen, setVragen] = useState<BankVraag[] | null>(null);
  const [zoek, setZoek] = useState("");
  const [filter, setFilter] = useState<Filter>({ soort: "alle" });

  useEffect(() => {
    if (!open) return;
    if (vragen === null) {
      fetch(`/api/admin/vragenbank?zonder=${puntId}`).then((r) => r.ok ? r.json() : { vragen: [] }).then((d) => setVragen(d.vragen ?? []));
    }
  }, [open, vragen, puntId]);
  useSluitMetEsc(() => setOpen(false), open);

  async function markeer(v: BankVraag, wijziging: { favoriet?: boolean; verborgen?: boolean }) {
    // Meteen tonen; lukt het opslaan niet, dan terugzetten
    setVragen((lijst) => lijst?.map((x) => x.id === v.id ? { ...x, ...wijziging } : x) ?? null);
    const res = await fetch("/api/admin/vragenbank", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: v.id, ...wijziging }),
    });
    if (!res.ok) {
      setVragen((lijst) => lijst?.map((x) => x.id === v.id ? v : x) ?? null);
      toonMelding(await foutUitleg(res, "Opslaan"), "fout");
      return;
    }
    if (wijziging.verborgen === true) toonMelding("Uit de vragenbank gehaald (terug te zetten via 🗑️ Verwijderd)", "ok");
    if (wijziging.verborgen === false) toonMelding("Terug in de vragenbank", "ok");
  }

  const alle = vragen ?? [];
  const zichtbaar = alle.filter((v) => !v.verborgen);
  const z = zoek.trim().toLowerCase();
  const gevonden = (filter.soort === "verwijderd" ? alle.filter((v) => v.verborgen) : zichtbaar)
    .filter((v) => filter.soort !== "favoriet" || v.favoriet)
    .filter((v) => filter.soort !== "type" || v.type === filter.type)
    .filter((v) => !z
      || v.question_text.toLowerCase().includes(z) || v.route_naam.toLowerCase().includes(z) || v.punt_naam.toLowerCase().includes(z)
      || v.answer_options.some((o) => o.text?.toLowerCase().includes(z)))
    // Op soort vraag, favorieten bovenaan, daarna zoals de server ze gaf (route en volgorde)
    .map((v, i) => ({ v, i }))
    .sort((a, b) => typeVolgorde(a.v.type) - typeVolgorde(b.v.type) || Number(b.v.favoriet) - Number(a.v.favoriet) || a.i - b.i)
    .map(({ v }) => v);
  const metKopjes = filter.soort !== "type";
  const aantalFav = zichtbaar.filter((v) => v.favoriet).length;
  const aantalWeg = alle.length - zichtbaar.length;
  const actief = (f: Filter) => filter.soort === f.soort && (f.soort !== "type" || (filter.soort === "type" && filter.type === f.type));
  const filterKnop = (f: Filter, inhoud: React.ReactNode, title?: string) => (
    <button type="button" className={`rl-knop${actief(f) ? " rl-knop--cyan" : ""}`} onClick={() => setFilter(f)} title={title}>{inhoud}</button>
  );

  return (
    <>
      <button type="button" className="btn btn-outline" style={{ fontSize: "0.82rem", flexShrink: 0 }} onClick={() => setOpen(true)}
        title="Een vraag uit een andere route overnemen"><Icoon naam="vragenbank" /> <span className="alleen-pc">Vragenbank</span></button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2600, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 580, maxHeight: vensterHoogte(85), display: "flex" }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 16px 12px", minHeight: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>📚 Vragenbank</div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
              </div>
              <input className="form-input" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op vraag, antwoord, route of punt" autoFocus />
              {/* Filter: alle, favorieten, per soort, en wat uit de bank gehaald is */}
              <div className="bank-soorten">
                {filterKnop({ soort: "alle" }, <>Alle {zichtbaar.length}</>)}
                {aantalFav > 0 && filterKnop({ soort: "favoriet" }, <>⭐ <span className="alleen-pc">Favorieten </span>{aantalFav}</>, "Favorieten")}
                {TYPES.filter((t) => zichtbaar.some((v) => v.type === t.type)).map((t) => (
                  <span key={t.type} style={{ display: "contents" }}>
                    {filterKnop({ soort: "type", type: t.type }, <>{TYPE_ICOON[t.type]} <span className="alleen-pc">{t.naam} </span>{zichtbaar.filter((v) => v.type === t.type).length}</>, t.naam)}
                  </span>
                ))}
                {aantalWeg > 0 && filterKnop({ soort: "verwijderd" }, <>🗑️ <span className="alleen-pc">Verwijderd </span>{aantalWeg}</>, "Uit de bank gehaald")}
              </div>
              <div style={{ overflowY: "auto", minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {vragen === null ? <LaadBlokjes aantal={4} hoogte={48} gap={6} />
                  : gevonden.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{alle.length ? "Niets gevonden." : "Nog geen vragen in andere routes."}</p>
                  : gevonden.map((v, i) => {
                    const goed = v.type === "open"
                      ? (v.numeric_answer != null ? String(v.numeric_answer) : (v.correct_text_answers ?? []).join(" / "))
                      : v.answer_options.filter((o) => o.is_correct).map((o) => o.text ?? "").filter(Boolean).join(" / ");
                    // Kopje bij elke nieuwe soort
                    const kop = metKopjes && (i === 0 || gevonden[i - 1].type !== v.type);
                    return (
                      <div key={v.id} style={{ display: "contents" }}>
                        {kop && <div className="bank-kop">{TYPE_ICOON[v.type] ?? "❓"} {TYPES.find((t) => t.type === v.type)?.naam ?? "Overig"}</div>}
                        <div className={`vragenbank-regel${v.favoriet ? " vragenbank-regel--favoriet" : ""}`}>
                          <button type="button" className="vragenbank-kies" disabled={v.verborgen} onClick={() => { onKies(v); setOpen(false); }}
                            title={v.verborgen ? "Zet hem eerst terug" : "Deze vraag overnemen"}>
                            <span aria-hidden style={{ fontSize: "1.2rem" }}>{TYPE_ICOON[v.type] ?? "❓"}</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 700, color: "#fff" }}>{v.question_text || "(vraag met afbeelding)"}</span>
                              <span style={{ display: "block", fontSize: "0.74rem", color: "var(--muted)" }}>
                                {v.route_naam} · {v.punt_naam}{goed ? ` · goed: ${goed}` : ""} · {v.points} pt
                              </span>
                            </span>
                          </button>
                          {v.verborgen ? (
                            <button type="button" className="rl-knop" onClick={() => markeer(v, { verborgen: false })} title="Terug in de vragenbank"><Icoon naam="terug" /> Terug</button>
                          ) : (
                            <>
                              <button type="button" className={`bank-icoon${v.favoriet ? " bank-icoon--aan" : ""}`} onClick={() => markeer(v, { favoriet: !v.favoriet })}
                                title={v.favoriet ? "Geen favoriet meer" : "Favoriet maken"} aria-label={v.favoriet ? "Geen favoriet meer" : "Favoriet maken"}>{v.favoriet ? "⭐" : "☆"}</button>
                              <button type="button" className="bank-icoon bank-icoon--weg" onClick={() => markeer(v, { verborgen: true })}
                                title="Uit de vragenbank halen (de vraag blijft in zijn route)" aria-label="Uit de vragenbank halen"><Icoon naam="wissen" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
