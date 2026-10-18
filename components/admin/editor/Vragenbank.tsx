"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type BankVraag = {
  id: string; type: string; question_text: string; question_image_path: string | null; points: number;
  correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
  answer_options: { color: string; text: string | null; image_path: string | null; is_correct: boolean; punten: number | null }[];
  punt_naam: string; route_naam: string;
};

const TYPE_ICOON: Record<string, string> = { meerkeuze_tekst: "🔤", meerkeuze_afbeelding: "🖼️", open: "✏️", foto_opdracht: "📸" };

// "📚 Vragenbank": een vraag uit een andere route overnemen. Vult alleen het formulier;
// pas na Opslaan staat de vraag op dit punt.
export default function Vragenbank({ puntId, onKies }: { puntId: string; onKies: (v: BankVraag) => void }) {
  const [open, setOpen] = useState(false);
  const [vragen, setVragen] = useState<BankVraag[] | null>(null);
  const [zoek, setZoek] = useState("");

  useEffect(() => {
    if (!open) return;
    if (vragen === null) {
      fetch(`/api/admin/vragenbank?zonder=${puntId}`).then((r) => r.ok ? r.json() : { vragen: [] }).then((d) => setVragen(d.vragen ?? []));
    }
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [open, vragen, puntId]);

  const z = zoek.trim().toLowerCase();
  const gevonden = (vragen ?? []).filter((v) => !z
    || v.question_text.toLowerCase().includes(z) || v.route_naam.toLowerCase().includes(z) || v.punt_naam.toLowerCase().includes(z)
    || v.answer_options.some((o) => o.text?.toLowerCase().includes(z)));

  return (
    <>
      <button type="button" className="btn btn-outline" style={{ fontSize: "0.82rem", flexShrink: 0 }} onClick={() => setOpen(true)}
        title="Een vraag uit een andere route overnemen">📚 <span className="alleen-pc">Vragenbank</span></button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2600, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex" }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 12px", minHeight: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>📚 Vragenbank</div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
              </div>
              <input className="form-input" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op vraag, antwoord, route of punt" autoFocus />
              <div style={{ overflowY: "auto", minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {vragen === null ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Laden…</p>
                  : gevonden.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{vragen.length ? "Niets gevonden." : "Nog geen vragen in andere routes."}</p>
                  : gevonden.map((v) => {
                    const goed = v.type === "open"
                      ? (v.numeric_answer != null ? String(v.numeric_answer) : (v.correct_text_answers ?? []).join(" / "))
                      : v.answer_options.find((o) => o.is_correct)?.text ?? "";
                    return (
                      <button key={v.id} type="button" className="vragenbank-regel" onClick={() => { onKies(v); setOpen(false); }}>
                        <span aria-hidden style={{ fontSize: "1.2rem" }}>{TYPE_ICOON[v.type] ?? "❓"}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 700, color: "#fff" }}>{v.question_text || "(vraag met afbeelding)"}</span>
                          <span style={{ display: "block", fontSize: "0.74rem", color: "var(--muted)" }}>
                            {v.route_naam} · {v.punt_naam}{goed ? ` · goed: ${goed}` : ""} · {v.points} pt
                          </span>
                        </span>
                        <span aria-hidden style={{ color: "var(--muted)" }}>›</span>
                      </button>
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
