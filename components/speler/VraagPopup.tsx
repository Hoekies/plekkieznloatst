"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePunt, SpelerPuntVoortgang } from "@/types/database";
import { speelGoedAntwoord, speelFoutAntwoord } from "@/lib/sounds";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const KLEUR_RAND: Record<string, string> = {
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
  type: "meerkeuze_tekst" | "meerkeuze_afbeelding" | "open" | "foto_opdracht";
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

type PopupFase = "laden" | "informatie" | "vraag" | "wachten" | "feedback";

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
  const [fotoBestand, setFotoBestand] = useState<File | null>(null);
  const [fotoFeedback, setFotoFeedback] = useState<{ goedgekeurd: boolean; punten: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const voortgangRef = useRef<SpelerPuntVoortgang | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (data.is_correct) speelGoedAntwoord(); else speelFoutAntwoord();
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

  async function uploadFoto() {
    if (!fotoBestand) { setFout("Kies eerst een foto"); return; }
    setBezig(true); setFout("");
    try {
      // Comprimeer via canvas (max 1200px)
      const bmp = await createImageBitmap(fotoBestand);
      const maxW = 1200;
      const scale = bmp.width > maxW ? maxW / bmp.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("canvas leeg")), "image/jpeg", 0.85)
      );

      const formData = new FormData();
      formData.append("foto", new File([blob], "foto.jpg", { type: "image/jpeg" }));
      formData.append("route_point_id", punt.id);

      const res = await fetch("/api/speler/foto", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setFout(data.fout ?? "Upload mislukt");
        return;
      }
      setPopupFase("wachten");
      // Poll elke 4 seconden
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/speler/foto-status/${punt.id}`);
          if (!statusRes.ok) return;
          const { status, punten_toegekend } = await statusRes.json();
          if (status === "goedgekeurd" || status === "afgekeurd") {
            if (pollRef.current) clearInterval(pollRef.current);
            setFotoFeedback({ goedgekeurd: status === "goedgekeurd", punten: punten_toegekend ?? 0 });
            // Maak synthetische voortgang voor onVerwerkt
            voortgangRef.current = {
              id: "",
              session_id: "",
              route_point_id: punt.id,
              reached_at: new Date().toISOString(),
              answered_at: new Date().toISOString(),
              selected_answer_id: null,
              open_answer_text: null,
              is_correct: status === "goedgekeurd",
              points_awarded: punten_toegekend ?? 0,
            };
            setPopupFase("feedback");
          }
        } catch { /* verbindingsfout, volgende keer opnieuw */ }
      }, 4000);
    } finally {
      setBezig(false);
    }
  }

  // Opruimen poll bij unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Volledig scherm shell ─────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#ffffff",
      color: "#0A1B36",
      display: "flex", flexDirection: "column",
    }}>
      {/* Scrollbaar inhoudsgebied */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px", display: "flex", flexDirection: "column", gap: 16 }}>

        <TypeBadge type={punt.type} />

        {/* Laden */}
        {popupFase === "laden" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0" }}>
            <div className="loading-spinner" />
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Vraag ophalen…</span>
          </div>
        )}

        {/* Informatie / eindpunt */}
        {popupFase === "informatie" && (
          <InfoInhoud punt={punt} />
        )}

        {/* Vraag beantwoorden */}
        {popupFase === "vraag" && vraag && (
          <>
            <h2 style={{ margin: 0, fontSize: "1.25rem", lineHeight: 1.4, fontWeight: 700 }}>
              {vraag.question_text}
            </h2>

            {vraag.question_image_path && (
              <img
                src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${vraag.question_image_path}`}
                alt=""
                style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }}
              />
            )}

            {vraag.type === "meerkeuze_afbeelding" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {vraag.answer_options.map((optie) => {
                  const isGekozen = gekozenId === optie.id;
                  return (
                    <button
                      key={optie.id}
                      type="button"
                      onClick={() => setGekozenId(optie.id)}
                      style={{
                        border: `3px solid ${isGekozen ? KLEUR_RAND[optie.color] : "var(--line)"}`,
                        borderRadius: 16, overflow: "hidden",
                        cursor: "pointer",
                        background: isGekozen ? KLEUR_ZACHT[optie.color] : "var(--bg)",
                        padding: 0,
                        display: "flex", flexDirection: "column",
                        transition: "border-color 0.12s, background 0.12s",
                      }}>
                      {optie.image_path ? (
                        <img
                          src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${optie.image_path}`}
                          alt=""
                          style={{ width: "100%", aspectRatio: "4/3", objectFit: "contain", background: "#f3f4f6" }}
                        />
                      ) : (
                        <div style={{ aspectRatio: "4/3", background: KLEUR_ZACHT[optie.color] ?? "#f3f4f6" }} />
                      )}
                      {optie.text && (
                        <div style={{
                          padding: "8px 10px", fontSize: "0.88rem", fontWeight: 600,
                          textAlign: "center", color: "var(--ink)",
                        }}>
                          {optie.text}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {vraag.type === "meerkeuze_tekst" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vraag.answer_options.map((optie) => {
                  const isGekozen = gekozenId === optie.id;
                  return (
                    <button
                      key={optie.id}
                      type="button"
                      onClick={() => setGekozenId(optie.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                        border: `2.5px solid ${isGekozen ? KLEUR_RAND[optie.color] : "var(--line)"}`,
                        background: isGekozen ? KLEUR_ZACHT[optie.color] : "transparent",
                        textAlign: "left",
                        transition: "border-color 0.12s, background 0.12s",
                      }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: isGekozen ? KLEUR_RAND[optie.color] : "transparent",
                        border: `2.5px solid ${KLEUR_RAND[optie.color]}`,
                      }} />
                      <span style={{ fontSize: "1rem", fontWeight: 600 }}>{optie.text}</span>
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
                style={{ fontSize: "1rem", padding: "14px 16px" }}
                autoFocus
              />
            )}

            {vraag.type === "foto_opdracht" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fotoInputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fotoInputRef.current?.click()}
                  style={{
                    border: `2.5px dashed ${fotoBestand ? "var(--blue)" : "var(--line)"}`,
                    borderRadius: 16, padding: "28px 16px",
                    textAlign: "center", cursor: "pointer",
                    background: fotoBestand ? "var(--blue-soft)" : "var(--bg)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  }}>
                  {fotoBestand ? (
                    <>
                      <span style={{ fontSize: "2rem" }}>✅</span>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{fotoBestand.name}</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Tik om een andere foto te kiezen</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "2.5rem" }}>📷</span>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Tik om een foto te maken of te kiezen</span>
                    </>
                  )}
                </div>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFotoBestand(f); }}
                />
              </div>
            )}

            {fout && <p style={{ color: "var(--red)", fontSize: "0.85rem", margin: 0 }}>{fout}</p>}
          </>
        )}

        {/* Wachten op beoordeling admin */}
        {popupFase === "wachten" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
            <div className="loading-spinner" style={{ borderTopColor: "#06B6D4", width: 40, height: 40, borderWidth: 4 }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: "1rem", margin: "0 0 6px" }}>Foto ingediend!</p>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
                De spelleider beoordeelt hem…<br />
                Je hoeft niks te doen, dit scherm wordt automatisch bijgewerkt.
              </p>
            </div>
          </div>
        )}

        {/* Feedback reguliere vraag */}
        {popupFase === "feedback" && feedback && vraag && vraag.type !== "foto_opdracht" && (
          <FeedbackWeergave
            feedback={feedback}
            vraag={vraag}
            gekozenId={gekozenId}
          />
        )}

        {/* Feedback foto-opdracht */}
        {popupFase === "feedback" && fotoFeedback && (
          <div style={{
            background: fotoFeedback.goedgekeurd ? "#DCFCE7" : "#FEE2E2",
            border: `1px solid ${fotoFeedback.goedgekeurd ? "#86EFAC" : "#FECACA"}`,
            borderRadius: 14, padding: "20px 18px",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontWeight: 800, fontSize: "1.15rem", color: fotoFeedback.goedgekeurd ? "#15803D" : "#B91C1C" }}>
              {fotoFeedback.goedgekeurd ? "✅ Foto goedgekeurd!" : "❌ Foto afgekeurd"}
            </div>
            {fotoFeedback.goedgekeurd && fotoFeedback.punten > 0 && (
              <div style={{ fontSize: "0.9rem", color: "#15803D" }}>
                +{fotoFeedback.punten} punt{fotoFeedback.punten !== 1 ? "en" : ""} verdiend
              </div>
            )}
            {!fotoFeedback.goedgekeurd && (
              <div style={{ fontSize: "0.85rem", color: "#B91C1C" }}>Je krijgt geen punten voor dit punt.</div>
            )}
          </div>
        )}
      </div>

      {/* Vaste knop onderaan */}
      <div style={{ padding: "12px 16px 28px", borderTop: "1px solid #e5e7eb", background: "#ffffff" }}>
        {popupFase === "informatie" && (
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "16px 0", fontSize: "1.05rem", borderRadius: 14 }}
            disabled={bezig}
            onClick={verwerkDirect}>
            {bezig ? "Even geduld…" : punt.type === "eindpunt" ? "🏁 Naar de finish!" : "Doorgaan →"}
          </button>
        )}
        {popupFase === "vraag" && vraag?.type !== "foto_opdracht" && (
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "16px 0", fontSize: "1.05rem", borderRadius: 14 }}
            disabled={bezig}
            onClick={beantwoord}>
            {bezig ? "Controleren…" : "Bevestig antwoord"}
          </button>
        )}
        {popupFase === "vraag" && vraag?.type === "foto_opdracht" && (
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "16px 0", fontSize: "1.05rem", borderRadius: 14 }}
            disabled={bezig || !fotoBestand}
            onClick={uploadFoto}>
            {bezig ? "Uploaden…" : "📤 Foto insturen"}
          </button>
        )}
        {popupFase === "feedback" && (
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "16px 0", fontSize: "1.05rem", borderRadius: 14 }}
            onClick={doorgaan}>
            Doorgaan →
          </button>
        )}
      </div>
    </div>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: RoutePunt["type"] }) {
  const cfg = {
    vraagpunt:      { label: "❓ VRAAG",      bg: "var(--blue-soft)", kleur: "var(--blue)" },
    informatiepunt: { label: "ℹ️ INFORMATIE", bg: "var(--cyan-soft)", kleur: "var(--cyan)" },
    eindpunt:       { label: "🏁 EINDPUNT",   bg: "#FEF9C3",          kleur: "#A16207"     },
  }[type];
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
      background: cfg.bg, color: cfg.kleur,
      padding: "4px 12px", borderRadius: 99, alignSelf: "flex-start",
    }}>{cfg.label}</span>
  );
}

// ── InfoInhoud ────────────────────────────────────────────────────────────────
function InfoInhoud({ punt }: { punt: RoutePunt }) {
  return (
    <>
      <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>{punt.name}</h2>
      {punt.image_path && (
        <img
          src={`${SUPABASE_URL}/storage/v1/object/public/punt-afbeeldingen/${punt.image_path}`}
          alt=""
          style={{ width: "100%", borderRadius: 12, maxHeight: 240, objectFit: "cover" }}
        />
      )}
      {punt.description && (
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: "1rem", color: "var(--ink)" }}>{punt.description}</p>
      )}
    </>
  );
}

// ── FeedbackWeergave ──────────────────────────────────────────────────────────
function FeedbackWeergave({ feedback, vraag, gekozenId }: {
  feedback: Feedback;
  vraag: VraagData;
  gekozenId: string | null;
}) {
  return (
    <>
      <div style={{
        background: feedback.is_correct ? "#DCFCE7" : "#FEE2E2",
        border: `1px solid ${feedback.is_correct ? "#86EFAC" : "#FECACA"}`,
        borderRadius: 14, padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ fontWeight: 800, fontSize: "1.15rem", color: feedback.is_correct ? "#15803D" : "#B91C1C" }}>
          {feedback.is_correct ? "✓ Goed gedaan!" : "✗ Helaas, dat klopt niet."}
        </div>
        {feedback.points_awarded > 0 && (
          <div style={{ fontSize: "0.9rem", color: "#15803D" }}>
            +{feedback.points_awarded} punt{feedback.points_awarded !== 1 ? "en" : ""} verdiend
          </div>
        )}
      </div>

      {!feedback.is_correct && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
            Het juiste antwoord:
          </p>

          {vraag.type === "meerkeuze_afbeelding" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {vraag.answer_options.map((optie) => {
                const isJuist = optie.id === feedback.correct_answer_id;
                const wasGekozen = optie.id === gekozenId;
                if (!isJuist && !wasGekozen) return null;
                return (
                  <div key={optie.id} style={{
                    border: `3px solid ${isJuist ? "#86EFAC" : "#FECACA"}`,
                    borderRadius: 14, overflow: "hidden",
                    background: isJuist ? "#F0FDF4" : "#FFF5F5",
                  }}>
                    {optie.image_path && (
                      <img
                        src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${optie.image_path}`}
                        alt=""
                        style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }}
                      />
                    )}
                    {optie.text && (
                      <div style={{ padding: "6px 8px", fontSize: "0.85rem", fontWeight: 600, textAlign: "center" }}>
                        {isJuist ? "✓ " : "✗ "}{optie.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {vraag.type === "meerkeuze_tekst" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vraag.answer_options.map((optie) => {
                const isJuist = optie.id === feedback.correct_answer_id;
                const wasGekozen = optie.id === gekozenId;
                return (
                  <div key={optie.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12,
                    border: `2px solid ${isJuist ? "#86EFAC" : wasGekozen ? "#FECACA" : "var(--line)"}`,
                    background: isJuist ? "#F0FDF4" : wasGekozen ? "#FFF5F5" : "transparent",
                    opacity: isJuist || wasGekozen ? 1 : 0.4,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: KLEUR_RAND[optie.color],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", color: "#fff", fontWeight: 700,
                    }}>
                      {isJuist ? "✓" : wasGekozen ? "✗" : ""}
                    </div>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{optie.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {vraag.type === "open" && feedback.numeric_answer !== null && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #86EFAC",
              borderRadius: 12, padding: "12px 16px", fontSize: "1rem", fontWeight: 600,
            }}>
              {feedback.numeric_tolerance && feedback.numeric_tolerance > 0
                ? `${feedback.numeric_answer} (± ${feedback.numeric_tolerance})`
                : String(feedback.numeric_answer)}
            </div>
          )}

          {vraag.type === "open" && feedback.correct_text_answers?.length && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #86EFAC",
              borderRadius: 12, padding: "12px 16px", fontSize: "1rem", fontWeight: 600,
            }}>
              {feedback.correct_text_answers[0]}
            </div>
          )}
        </div>
      )}
    </>
  );
}
