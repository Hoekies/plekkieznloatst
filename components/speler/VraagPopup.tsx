"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpelerPuntVoortgang } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KLEUR_STIJL: Record<string, string> = {
  geel: "#F59E0B",
  blauw: "#1E40AF",
  rood: "#EF4444",
};
const KLEUR_ZACHT: Record<string, string> = {
  geel: "#FEF9C3",
  blauw: "#DBEAFE",
  rood: "#FEE2E2",
};

type AntwoordOptie = {
  id: string;
  color: string;
  answer_type: string;
  text: string | null;
  image_path: string | null;
  order_index: number;
};

type VraagData = {
  id: string;
  type: "meerkeuze_tekst" | "meerkeuze_afbeelding" | "open";
  question_text: string;
  question_image_path: string | null;
  points: number;
  answer_options: AntwoordOptie[];
};

type Feedback = {
  is_correct: boolean;
  points_awarded: number;
  correct_answer_id: string | null;
  correct_text_answers: string[] | null;
  numeric_answer: number | null;
  numeric_tolerance: number | null;
};

type PopupFase = "laden" | "informatie" | "vraag" | "feedback";

interface Props {
  punt: RoutePunt;
  onVerwerkt: (voortgang: SpelerPuntVoortgang) => void;
}

export default function VraagPopup({ punt, onVerwerkt }: Props) {
  const [popupFase, setPopupFase] = useState<PopupFase>(
    punt.type === "vraagpunt" ? "laden" : "informatie"
  );
  const [vraag, setVraag] = useState<VraagData | null>(null);
  const [gekozenId, setGekozenId] = useState<string | null>(null);
  const [openAntwoord, setOpenAntwoord] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Bewaar voortgang die van de server terugkomt, zodat onDoorgaan het kan doorgeven
  const voortgangRef = useRef<SpelerPuntVoortgang | null>(null);

  // Vraag ophalen voor vraagpunten
  useEffect(() => {
    if (punt.type !== "vraagpunt") return;
    fetch(`/api/speler/vraag/${punt.id}`)
      .then((r) => r.json())
      .then((data: VraagData | null) => {
        if (data) { setVraag(data); setPopupFase("vraag"); }
        else setPopupFase("informatie");
      })
      .catch(() => setPopupFase("informatie"));
  }, [punt]);

  // ── Info / eindpunt: direct verwerken ────────────────────────────────────
  async function verwerkDirect() {
    setBezig(true);
    try {
      const res = await fetch("/api/speler/voortgang/verwerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_point_id: punt.id }),
      });
      if (res.ok) {
        const data = await res.json();
        onVerwerkt(data.voortgang ?? data);
      }
    } finally {
      setBezig(false);
    }
  }

  // ── Vraagpunt: antwoord indienen ─────────────────────────────────────────
  async function beantwoord() {
    if (!vraag) return;
    setFout("");

    if (vraag.type === "meerkeuze_tekst" || vraag.type === "meerkeuze_afbeelding") {
      if (!gekozenId) { setFout("Kies een antwoord"); return; }
    } else {
      if (!openAntwoord.trim()) { setFout("Vul een antwoord in"); return; }
    }

    setBezig(true);
    try {
      const res = await fetch("/api/speler/voortgang/verwerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_point_id: punt.id,
          selected_answer_id: gekozenId ?? undefined,
          open_answer_text: vraag.type === "open" ? openAntwoord : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFout(data.fout ?? "Indienen mislukt");
        return;
      }

      const data = await res.json();
      voortgangRef.current = data.voortgang;
      setFeedback({
        is_correct: data.is_correct,
        points_awarded: data.points_awarded,
        correct_answer_id: data.correct_answer_id ?? null,
        correct_text_answers: data.correct_text_answers ?? null,
        numeric_answer: data.numeric_answer ?? null,
        numeric_tolerance: data.numeric_tolerance ?? null,
      });
      setPopupFase("feedback");
    } finally {
      setBezig(false);
    }
  }

  function doorgaan() {
    if (voortgangRef.current) onVerwerkt(voortgangRef.current);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 500,
      background: "rgba(10,27,54,0.55)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: "var(--paper)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 36px",
        width: "100%", maxHeight: "82vh",
        overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 16,
      }}>

        <TypeBadge type={punt.type} />

        {/* Laden */}
        {popupFase === "laden" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" }}>
            <div className="loading-spinner" />
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Vraag ophalen…</span>
          </div>
        )}

        {/* Informatie / eindpunt */}
        {popupFase === "informatie" && (
          <InfoInhoud punt={punt} bezig={bezig} onDoorgaan={verwerkDirect} />
        )}

        {/* Vraag beantwoorden */}
        {popupFase === "vraag" && vraag && (
          <>
            <h2 style={{ margin: 0, fontSize: "1.1rem", lineHeight: 1.4 }}>{vraag.question_text}</h2>

            {vraag.question_image_path && (
              <img
                src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${vraag.question_image_path}`}
                alt=""
                style={{ width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" }}
              />
            )}

            {(vraag.type === "meerkeuze_tekst" || vraag.type === "meerkeuze_afbeelding") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vraag.answer_options.map((optie) => {
                  const isGekozen = gekozenId === optie.id;
                  return (
                    <button
                      key={optie.id}
                      type="button"
                      onClick={() => setGekozenId(optie.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                        border: `2px solid ${isGekozen ? KLEUR_STIJL[optie.color] : "var(--line)"}`,
                        background: isGekozen ? KLEUR_ZACHT[optie.color] : "transparent",
                        textAlign: "left",
                      }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: isGekozen ? KLEUR_STIJL[optie.color] : "transparent",
                        border: `2.5px solid ${KLEUR_STIJL[optie.color]}`,
                      }} />
                      {optie.answer_type === "afbeelding" && optie.image_path ? (
                        <img
                          src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${optie.image_path}`}
                          alt=""
                          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>{optie.text}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {vraag.type === "open" && (
              <input
                ref={inputRef}
                className="form-input"
                value={openAntwoord}
                onChange={(e) => setOpenAntwoord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && beantwoord()}
                placeholder="Typ hier je antwoord…"
                style={{ fontSize: "1rem", padding: "12px 14px" }}
                autoFocus
              />
            )}

            {fout && <p style={{ color: "var(--red)", fontSize: "0.85rem", margin: 0 }}>{fout}</p>}

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px 0", fontSize: "1rem" }}
              disabled={bezig}
              onClick={beantwoord}>
              {bezig ? "Controleren…" : "Bevestig antwoord"}
            </button>
          </>
        )}

        {/* Feedback */}
        {popupFase === "feedback" && feedback && vraag && (
          <FeedbackWeergave
            feedback={feedback}
            vraag={vraag}
            gekozenId={gekozenId}
            onDoorgaan={doorgaan}
          />
        )}
      </div>
    </div>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: RoutePunt["type"] }) {
  const cfg = {
    vraagpunt:     { label: "❓ VRAAG",      bg: "var(--blue-soft)", kleur: "var(--blue)" },
    informatiepunt:{ label: "ℹ️ INFORMATIE", bg: "var(--cyan-soft)", kleur: "var(--cyan)" },
    eindpunt:      { label: "🏁 EINDPUNT",   bg: "#FEF9C3",          kleur: "#A16207"     },
  }[type];
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
      background: cfg.bg, color: cfg.kleur,
      padding: "3px 10px", borderRadius: 99, alignSelf: "flex-start",
    }}>{cfg.label}</span>
  );
}

// ── InfoInhoud ────────────────────────────────────────────────────────────────
function InfoInhoud({ punt, bezig, onDoorgaan }: {
  punt: RoutePunt; bezig: boolean; onDoorgaan: () => void;
}) {
  return (
    <>
      <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{punt.name}</h2>
      {punt.image_path && (
        <img
          src={`${SUPABASE_URL}/storage/v1/object/public/punt-afbeeldingen/${punt.image_path}`}
          alt=""
          style={{ width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" }}
        />
      )}
      {punt.description && (
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.95rem" }}>{punt.description}</p>
      )}
      <button
        className="btn btn-primary"
        style={{ width: "100%", padding: "14px 0", fontSize: "1rem" }}
        disabled={bezig}
        onClick={onDoorgaan}>
        {bezig ? "Even geduld…" : punt.type === "eindpunt" ? "🏁 Naar de finish!" : "Doorgaan →"}
      </button>
    </>
  );
}

// ── FeedbackWeergave ──────────────────────────────────────────────────────────
function FeedbackWeergave({ feedback, vraag, gekozenId, onDoorgaan }: {
  feedback: Feedback;
  vraag: VraagData;
  gekozenId: string | null;
  onDoorgaan: () => void;
}) {
  return (
    <>
      {/* Resultaatbanner */}
      <div style={{
        background: feedback.is_correct ? "#DCFCE7" : "#FEE2E2",
        border: `1px solid ${feedback.is_correct ? "#86EFAC" : "#FECACA"}`,
        borderRadius: 12, padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: feedback.is_correct ? "#15803D" : "#B91C1C" }}>
          {feedback.is_correct ? "✓ Goed gedaan!" : "✗ Helaas, dat klopt niet."}
        </div>
        {feedback.points_awarded > 0 && (
          <div style={{ fontSize: "0.85rem", color: "#15803D" }}>
            +{feedback.points_awarded} punt{feedback.points_awarded !== 1 ? "en" : ""} verdiend
          </div>
        )}
      </div>

      {/* Juiste antwoord bij fout */}
      {!feedback.is_correct && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
            Het juiste antwoord:
          </p>

          {(vraag.type === "meerkeuze_tekst" || vraag.type === "meerkeuze_afbeelding") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {vraag.answer_options.map((optie) => {
                const isJuist = optie.id === feedback.correct_answer_id;
                const wasGekozen = optie.id === gekozenId;
                return (
                  <div key={optie.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    border: `2px solid ${isJuist ? "#86EFAC" : wasGekozen ? "#FECACA" : "var(--line)"}`,
                    background: isJuist ? "#F0FDF4" : wasGekozen ? "#FFF5F5" : "transparent",
                    opacity: isJuist || wasGekozen ? 1 : 0.45,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: KLEUR_STIJL[optie.color],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", color: "#fff", fontWeight: 700,
                    }}>
                      {isJuist ? "✓" : wasGekozen ? "✗" : ""}
                    </div>
                    {optie.answer_type === "afbeelding" && optie.image_path ? (
                      <img
                        src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${optie.image_path}`}
                        alt=""
                        style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6 }}
                      />
                    ) : (
                      <span style={{ fontSize: "0.9rem" }}>{optie.text}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {vraag.type === "open" && feedback.numeric_answer !== null && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #86EFAC",
              borderRadius: 10, padding: "10px 14px", fontSize: "0.95rem", fontWeight: 600,
            }}>
              {feedback.numeric_tolerance && feedback.numeric_tolerance > 0
                ? `${feedback.numeric_answer} (± ${feedback.numeric_tolerance})`
                : String(feedback.numeric_answer)}
            </div>
          )}

          {vraag.type === "open" && feedback.correct_text_answers?.length && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #86EFAC",
              borderRadius: 10, padding: "10px 14px", fontSize: "0.95rem", fontWeight: 600,
            }}>
              {feedback.correct_text_answers[0]}
            </div>
          )}
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ width: "100%", padding: "14px 0", fontSize: "1rem" }}
        onClick={onDoorgaan}>
        Doorgaan →
      </button>
    </>
  );
}
