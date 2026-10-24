"use client";

import { useEffect, useState } from "react";
import type { RoutePunt, SpeciaalItem } from "@/types/database";
import { haversine } from "@/lib/geo";
import { itemNaam } from "@/components/speler/SpeciaalItemLegende";
import { VensterKop } from "@/components/shared/Venster";

// "🧪 Testronde": de route punt voor punt doorlopen zonder naar buiten te gaan. De kaart vliegt
// naar elk punt; je ziet de vraag zoals de speler hem krijgt (met het goede antwoord gemarkeerd),
// de afstand vanaf het vorige punt en de items in de buurt.
type Optie = { id: string; color: string; answer_type: string; text: string | null; is_correct: boolean; punten: number | null };
type Vraag = { type: string; question_text: string; points: number; correct_text_answers: string[] | null; numeric_answer: number | null; answer_options: Optie[] };

const KLEUR: Record<string, string> = { geel: "#F59E0B", blauw: "#1E40AF", rood: "#EF4444", groen: "#16A34A" };
const SOORT: Record<string, string> = { meerkeuze_tekst: "Meerkeuze", meerkeuze_afbeelding: "Meerkeuze met plaatjes", open: "Open vraag", foto_opdracht: "Foto-opdracht", stemvraag: "Stemvraag" };

export default function TestRonde({ routeId, punten, items, verspreid, onGaNaar, onSluit, onLopen }: {
  routeId: string;
  punten: RoutePunt[];
  items: SpeciaalItem[];
  verspreid: boolean;
  onGaNaar: (lat: number, lng: number) => void;
  onSluit: () => void;
  // Terug naar testen door over de kaart te lopen
  onLopen?: () => void;
}) {
  const [stap, setStap] = useState(0);
  const [vraag, setVraag] = useState<Vraag | null | undefined>(undefined);
  const punt = punten[stap];

  useEffect(() => {
    if (!punt) return;
    onGaNaar(punt.latitude, punt.longitude);
    setVraag(undefined);
    let actief = true;
    fetch(`/api/admin/routes/${routeId}/punten/${punt.id}/vraag`)
      .then((r) => (r.ok ? r.json() : null)).then((v) => { if (actief) setVraag(v); }).catch(() => { if (actief) setVraag(null); });
    return () => { actief = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stap, punt?.id]);

  if (!punt) return null;
  const vorige = punten[stap - 1];
  const afstand = vorige ? Math.round(haversine(vorige.latitude, vorige.longitude, punt.latitude, punt.longitude)) : null;
  const dichtbij = items
    .filter((i) => !i.is_startitem)
    .map((i) => ({ i, m: Math.round(haversine(punt.latitude, punt.longitude, i.latitude, i.longitude)) }))
    .filter((x) => x.m <= 150)
    .sort((a, b) => a.m - b.m);
  const label = punt.type === "eindpunt" ? "🏁 Finish" : verspreid && stap === 0 ? "🏠 Start" : `Punt ${verspreid ? stap : stap + 1}`;

  return (
    <div className="testronde pr-gem-panel">
      <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 14px 12px" }}>
        <VensterKop label={<>🧪 Testen · 📋 punt voor punt · {stap + 1} van {punten.length}</>} titel={<>{label} · {punt.name || "naamloos"}</>} onSluit={onSluit} sluitLabel="Testen sluiten">
          {onLopen && <button type="button" className="es-link" onClick={onLopen} title="Over de kaart lopen als testspeler">🚶 Lopen</button>}
        </VensterKop>

        <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
          {afstand !== null ? `↔ ${afstand} m vanaf het vorige punt (hemelsbreed)` : verspreid ? "Hier verzamelen alle teams; elk team begint daarna ergens anders in het rondje." : "Eerste punt van de route."}
          {" · "}bereikt binnen {punt.radius_meters} m
        </div>

        {/* De vraag zoals de speler hem ziet, met het goede antwoord gemarkeerd */}
        <div className="testronde-vraag">
          {vraag === undefined ? <span style={{ color: "var(--muted)" }}>Vraag laden…</span>
            : !vraag ? <span style={{ color: punt.type === "vraagpunt" ? "#FCA5A5" : "var(--muted)" }}>{punt.type === "vraagpunt" ? "⚠️ Nog geen vraag bij dit punt" : "Geen vraag: het punt telt als bereikt."}</span>
            : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#C9B6FF", fontWeight: 700, textTransform: "uppercase" }}>
                  <span>{SOORT[vraag.type] ?? vraag.type}</span><span style={{ color: "#FFE680" }}>{vraag.points} pt</span>
                </div>
                <div style={{ fontWeight: 700, color: "#fff", margin: "4px 0 8px" }}>{vraag.question_text}</div>
                {vraag.answer_options?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {vraag.answer_options.map((o) => (
                      <div key={o.id} className="testronde-optie" style={{ borderLeftColor: KLEUR[o.color] ?? "#888", opacity: o.is_correct ? 1 : 0.7 }}>
                        <span style={{ flex: 1 }}>{o.answer_type === "afbeelding" ? "🖼️ (afbeelding)" : o.text}</span>
                        {o.is_correct && <strong style={{ color: "#4ADE80" }}>✓ goed</strong>}
                        {o.punten != null && <span style={{ color: "var(--muted)" }}>{o.punten} pt</span>}
                      </div>
                    ))}
                  </div>
                )}
                {vraag.type === "open" && (
                  <div style={{ fontSize: "0.8rem", color: "#4ADE80" }}>✓ Goed: {[...(vraag.correct_text_answers ?? []), vraag.numeric_answer != null ? String(vraag.numeric_answer) : ""].filter(Boolean).join(" · ") || "—"}</div>
                )}
                {vraag.type === "foto_opdracht" && <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>📸 Het team stuurt een foto in; jij keurt hem.</div>}
              </>
            )}
        </div>

        {dichtbij.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: "0.76rem", color: "var(--text)" }}>
            <span style={{ color: "var(--muted)" }}>In de buurt:</span>
            {dichtbij.slice(0, 8).map(({ i, m }) => (
              <span key={i.id} className="testronde-item" title={`${itemNaam(i.type)} op ${m} m`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/items/${i.type}.webp`} alt="" style={{ width: 18, height: 18 }} /> {m} m
              </span>
            ))}
          </div>
        )}

        <div className="melding-knoppen">
          <button type="button" className="rl-knop" style={{ height: 40 }} disabled={stap === 0} onClick={() => setStap((s) => s - 1)}>◀ Vorige</button>
          <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 40, fontWeight: 800 }} disabled={stap >= punten.length - 1} onClick={() => setStap((s) => s + 1)}>Volgende ▶</button>
        </div>
      </div>
    </div>
  );
}
