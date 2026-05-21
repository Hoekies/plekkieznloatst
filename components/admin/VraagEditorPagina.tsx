"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoutePunt, Vraag, AntwoordOptie, VraagType } from "@/types/database";
import AfbeeldingUpload from "./AfbeeldingUpload";

type VraagMetAntwoorden = Vraag & { answer_options: AntwoordOptie[] };

const KLEUREN = ["geel", "blauw", "rood"] as const;
const KLEUR_STIJL: Record<string, string> = {
  geel: "#F59E0B", blauw: "#1E40AF", rood: "#EF4444",
};

interface Props {
  routeId: string;
  punt: RoutePunt;
  bestaandeVraag: VraagMetAntwoorden | null;
}

export default function VraagEditorPagina({ routeId, punt, bestaandeVraag }: Props) {
  const router = useRouter();
  const [type, setType] = useState<VraagType>(bestaandeVraag?.type ?? "meerkeuze_tekst");
  const [tekst, setTekst] = useState(bestaandeVraag?.question_text ?? "");
  const [vraagAfbeelding, setVraagAfbeelding] = useState<string | null>(bestaandeVraag?.question_image_path ?? null);
  const [punten, setPunten] = useState(bestaandeVraag?.points ?? punt.points);

  // Meerkeuze state
  const [antwoorden, setAntwoorden] = useState<{
    color: typeof KLEUREN[number];
    text: string;
    image_path: string | null;
    is_correct: boolean;
  }[]>(
    bestaandeVraag?.answer_options.length === 3
      ? bestaandeVraag.answer_options.map((a) => ({
          color: a.color as typeof KLEUREN[number],
          text: a.text ?? "",
          image_path: a.image_path,
          is_correct: a.is_correct,
        }))
      : KLEUREN.map((c) => ({ color: c, text: "", image_path: null, is_correct: c === "geel" }))
  );

  // Open vraag state
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

  const [opslaan, setOpslaan] = useState(false);
  const [fout, setFout] = useState("");
  const [opgeslagen, setOpgeslagen] = useState(false);

  function setCorrect(index: number) {
    setAntwoorden((a) => a.map((ant, i) => ({ ...ant, is_correct: i === index })));
  }

  async function slaOp(e: React.FormEvent) {
    e.preventDefault();
    setFout(""); setOpslaan(true);

    const body: Record<string, unknown> = {
      type,
      question_text: tekst.trim(),
      question_image_path: vraagAfbeelding,
      points: punten,
    };

    if (type === "open") {
      if (isNumeriek) {
        const num = parseFloat(numeriekeWaarde.replace(",", "."));
        if (isNaN(num)) { setFout("Vul een geldig numeriek antwoord in"); setOpslaan(false); return; }
        body.numeric_answer = num;
        body.numeric_tolerance = parseFloat(tolerantie.replace(",", ".")) || 0;
      } else {
        const regels = openAntwoorden.split("\n").map((r) => r.trim()).filter(Boolean);
        if (!regels.length) { setFout("Vul minimaal één correct antwoord in"); setOpslaan(false); return; }
        body.correct_text_answers = regels;
      }
    } else {
      const antwoordType = type === "meerkeuze_afbeelding" ? "afbeelding" : "tekst";
      if (antwoordType === "tekst" && antwoorden.some((a) => !a.text.trim())) {
        setFout("Vul alle antwoorden in"); setOpslaan(false); return;
      }
      if (antwoordType === "afbeelding" && antwoorden.some((a) => !a.image_path)) {
        setFout("Upload een afbeelding voor elk antwoord"); setOpslaan(false); return;
      }
      body.antwoorden = antwoorden.map((a) => ({
        color: a.color,
        answer_type: antwoordType,
        text: antwoordType === "tekst" ? a.text.trim() : null,
        image_path: antwoordType === "afbeelding" ? a.image_path : null,
        is_correct: a.is_correct,
      }));
    }

    const res = await fetch(`/api/admin/routes/${routeId}/punten/${punt.id}/vraag`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const { fout: f } = await res.json();
      setFout(f ?? "Opslaan mislukt");
    } else {
      setOpgeslagen(true);
      setTimeout(() => setOpgeslagen(false), 2000);
    }
    setOpslaan(false);
  }

  async function verwijderVraag() {
    if (!bestaandeVraag) return;
    if (!confirm("Vraag verwijderen?")) return;
    await fetch(`/api/admin/routes/${routeId}/punten/${punt.id}/vraag`, { method: "DELETE" });
    router.push(`/admin/routes/${routeId}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Topbar */}
      <div className="admin-topbar" style={{ gap: 12 }}>
        <a href={`/admin/routes/${routeId}`} style={{ color: "var(--muted)", fontSize: "0.85rem", textDecoration: "none", flexShrink: 0 }}>
          ← Route
        </a>
        <h1 style={{ flex: 1 }}>Vraag — {punt.name}</h1>
        {bestaandeVraag && (
          <button className="btn btn-danger" style={{ fontSize: "0.82rem" }} onClick={verwijderVraag}>
            Vraag verwijderen
          </button>
        )}
      </div>

      {/* Formulier */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px", maxWidth: 720 }}>
        <form onSubmit={slaOp} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Type */}
          <div className="form-group">
            <label className="form-label">Vraagtype</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["meerkeuze_tekst", "meerkeuze_afbeelding", "open"] as VraagType[]).map((t) => (
                <button key={t} type="button"
                  className={`btn ${type === t ? "btn-primary" : "btn-outline"}`}
                  style={{ fontSize: "0.82rem" }}
                  onClick={() => setType(t)}>
                  {t === "meerkeuze_tekst" ? "Meerkeuze tekst" : t === "meerkeuze_afbeelding" ? "Meerkeuze afbeelding" : "Open vraag"}
                </button>
              ))}
            </div>
          </div>

          {/* Vraagstelling */}
          <div className="form-group">
            <label className="form-label">Vraagstelling</label>
            <textarea className="form-textarea" value={tekst} onChange={(e) => setTekst(e.target.value)}
              placeholder="Typ hier de vraag…" required style={{ minHeight: 80 }} />
          </div>

          {/* Vraag-afbeelding */}
          <div className="form-group">
            <label className="form-label">Vraag-afbeelding (optioneel)</label>
            <AfbeeldingUpload
              huidigPad={vraagAfbeelding}
              bucket="vraag-afbeeldingen"
              onUpload={(pad) => setVraagAfbeelding(pad)}
              onVerwijder={() => setVraagAfbeelding(null)}
            />
          </div>

          {/* Punten */}
          <div className="form-group" style={{ maxWidth: 160 }}>
            <label className="form-label">Punten voor dit punt</label>
            <input className="form-input" type="number" min={0} value={punten}
              onChange={(e) => setPunten(Number(e.target.value))} />
          </div>

          {/* ── Meerkeuze ── */}
          {(type === "meerkeuze_tekst" || type === "meerkeuze_afbeelding") && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Antwoorden</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 16 }}>
                Klik op het rondje om het juiste antwoord te markeren.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {antwoorden.map((ant, i) => (
                  <div key={ant.color} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: "var(--radius-md)",
                    border: `2px solid ${ant.is_correct ? KLEUR_STIJL[ant.color] : "var(--line)"}`,
                    background: ant.is_correct ? `${KLEUR_STIJL[ant.color]}12` : "transparent",
                  }}>
                    {/* Correct radio */}
                    <button type="button" onClick={() => setCorrect(i)}
                      style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${KLEUR_STIJL[ant.color]}`,
                        background: ant.is_correct ? KLEUR_STIJL[ant.color] : "transparent",
                        cursor: "pointer",
                      }} />
                    {/* Kleur label */}
                    <span style={{
                      width: 54, fontSize: "0.75rem", fontWeight: 700,
                      color: KLEUR_STIJL[ant.color], flexShrink: 0, textTransform: "capitalize",
                    }}>{ant.color}</span>
                    {/* Input */}
                    {type === "meerkeuze_tekst" ? (
                      <input className="form-input" style={{ flex: 1, fontSize: "0.88rem" }}
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Open vraag ── */}
          {type === "open" && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Correct antwoord</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button type="button" className={`btn ${!isNumeriek ? "btn-primary" : "btn-outline"}`}
                  style={{ fontSize: "0.82rem" }} onClick={() => setIsNumeriek(false)}>Tekst</button>
                <button type="button" className={`btn ${isNumeriek ? "btn-primary" : "btn-outline"}`}
                  style={{ fontSize: "0.82rem" }} onClick={() => setIsNumeriek(true)}>Numeriek</button>
              </div>

              {!isNumeriek ? (
                <div className="form-group">
                  <label className="form-label">Correcte antwoorden (één per regel, hoofdletterongevoelig)</label>
                  <textarea className="form-textarea" value={openAntwoorden}
                    onChange={(e) => setOpenAntwoorden(e.target.value)}
                    placeholder={"Amsterdam\namsterdam\nAmsterDAM"} style={{ minHeight: 90 }} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Correct antwoord</label>
                    <input className="form-input" value={numeriekeWaarde}
                      onChange={(e) => setNumeriekeWaarde(e.target.value)}
                      placeholder="bijv. 1980 of 1,5" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tolerantie (± waarde)</label>
                    <input className="form-input" value={tolerantie}
                      onChange={(e) => setTolerantie(e.target.value)}
                      placeholder="0" />
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      Tolerantie 1 → 1979, 1980 en 1981 zijn correct
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {fout && <div className="melding melding-fout"><span>⚠️</span> {fout}</div>}
          {opgeslagen && <div className="melding melding-ok">✅ Vraag opgeslagen</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <a href={`/admin/routes/${routeId}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }}>
              ← Terug
            </a>
            <button type="submit" className="btn btn-primary" disabled={opslaan} style={{ flex: 2 }}>
              {opslaan ? "Opslaan…" : bestaandeVraag ? "Vraag bijwerken" : "Vraag opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
