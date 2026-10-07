"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { RoutePunt, SpelerPuntVoortgang } from "@/types/database";
import { speelGoedAntwoord, speelFoutAntwoord } from "@/lib/sounds";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const KLEUR_RAND: Record<string, string> = {
  geel: "#F59E0B",
  blauw: "#1E40AF",
  rood: "#EF4444",
  groen: "#16A34A",
};
// Vaste knop onderaan de popup — compact gehouden, was op mobiel onnodig log
const KNOP_ONDERAAN_STIJL: CSSProperties = { width: "100%", padding: "13px 0", fontSize: "0.92rem", borderRadius: 13 };

const KLEUR_ZACHT: Record<string, string> = {
  geel: "#FEF9C3",
  blauw: "#DBEAFE",
  rood: "#FEE2E2",
  groen: "#DCFCE7",
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

type PopupFase = "laden" | "start" | "informatie" | "vraag" | "foto_ingestuurd" | "feedback";

interface Props {
  punt: RoutePunt;
  onVerwerkt: (voortgang: SpelerPuntVoortgang) => void;
  // Startpunt: eerst een welkomstscherm met speluitleg ("uitleg"); heeft het startpunt een
  // vraag, dan komt die pas later na een stukje lopen ("vraag").
  start?: "uitleg" | "vraag";
  startUitleg?: { regels: string[]; afsluiting: string; ondertekening: string };
  onStartVraagLater?: () => void;
}

export default function VraagPopup({ punt, onVerwerkt, start, startUitleg, onStartVraagLater }: Props) {
  const [popupFase, setPopupFase] = useState<PopupFase>(
    punt.type !== "eindpunt" || start ? "laden" : "informatie"
  );
  const [vraag, setVraag] = useState<VraagData | null>(null);
  const [gekozenId, setGekozenId] = useState<string | null>(null);
  const [openAntwoord, setOpenAntwoord] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [fotoBestand, setFotoBestand] = useState<File | null>(null);
  // Voorbeeld van de gekozen foto, zodat het team ziet wat het instuurt
  const [fotoVoorbeeld, setFotoVoorbeeld] = useState<string | null>(null);
  useEffect(() => {
    if (!fotoBestand) { setFotoVoorbeeld(null); return; }
    const url = URL.createObjectURL(fotoBestand);
    setFotoVoorbeeld(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoBestand]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const voortgangRef = useRef<SpelerPuntVoortgang | null>(null);

  useEffect(() => {
    // Ook een informatiepunt kan een vraag hebben; die moet dan beantwoord worden
    if (punt.type === "eindpunt" && !start) return;
    fetch(`/api/speler/vraag/${punt.id}`)
      .then((r) => r.json())
      .then((data: VraagData | null) => {
        if (data) setVraag(data);
        if (start === "uitleg") setPopupFase("start");
        else setPopupFase(data ? "vraag" : "informatie");
      })
      .catch(() => setPopupFase(start === "uitleg" ? "start" : "informatie"));
  }, [punt, start]);

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

  async function beantwoordMet(answerId: string | null, openTekst?: string) {
    if (!vraag) return;
    setFout("");
    setBezig(true);
    try {
      const res = await fetch("/api/speler/voortgang/verwerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_point_id: punt.id,
          selected_answer_id: answerId ?? undefined,
          open_answer_text: openTekst,
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

  function beantwoord() {
    if (!openAntwoord.trim()) { setFout("Vul een antwoord in"); return; }
    beantwoordMet(null, openAntwoord);
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
      // Niet wachten op de keuring: het punt is afgerond, de punten komen na de keuring
      const data = await res.json();
      voortgangRef.current = data.voortgang ?? null;
      setPopupFase("foto_ingestuurd");
    } finally {
      setBezig(false);
    }
  }

  // ── Volledig scherm shell ─────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#ffffff",
      color: "#0A1B36",
      display: "flex", flexDirection: "column",
    }}>
      {/* Logo header */}
      <div style={{ padding: "max(10px, calc(env(safe-area-inset-top) + 8px)) 16px 8px", borderBottom: "1px solid #e5e7eb", background: "#ffffff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-breed.png" alt="PointRush" style={{ height: 96, width: "auto" }} />
      </div>

      {/* Scrollbaar inhoudsgebied */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 16 }}>

        {start ? <StartBadge /> : <TypeBadge type={punt.type} />}

        {/* Laden */}
        {popupFase === "laden" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0" }}>
            <div className="spinner" />
            <span style={{ color: "#6B7280", fontSize: "0.85rem" }}>Vraag ophalen…</span>
          </div>
        )}

        {/* Startpunt: welkom + korte speluitleg */}
        {popupFase === "start" && startUitleg && (
          <>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0A1B36" }}>Welkom bij de start! 🚩</h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: "1rem", lineHeight: 1.55, color: "#0A1B36" }}>
              {startUitleg.regels.map((r) => <li key={r}>{r}</li>)}
              {vraag && <li><strong>Je eerste vraag krijg je na 25 meter lopen.</strong></li>}
            </ul>
            <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 14, padding: "14px 16px", color: "#713F12" }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.5 }}>{startUitleg.afsluiting}</div>
              <div style={{ marginTop: 6, fontStyle: "italic" }}>{startUitleg.ondertekening}</div>
            </div>
          </>
        )}

        {/* Informatie / eindpunt */}
        {popupFase === "informatie" && (
          <InfoInhoud punt={punt} />
        )}

        {/* Vraag beantwoorden */}
        {popupFase === "vraag" && vraag && (
          <>
            <h2 style={{ margin: 0, fontSize: "1.25rem", lineHeight: 1.4, fontWeight: 700, whiteSpace: "pre-wrap", color: "#0A1B36" }}>
              {vraag.question_text}
            </h2>

            {vraag.question_image_path && (
              <img
                src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${vraag.question_image_path}`}
                alt=""
                style={{
                  display: "block",
                  width: "min(100%, 45vh)",
                  aspectRatio: "1/1",
                  objectFit: "cover",
                  borderRadius: 12,
                  alignSelf: "center",
                }}
              />
            )}

            {vraag.type === "meerkeuze_afbeelding" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(vraag.answer_options ?? []).map((optie) => {
                  const isGekozen = gekozenId === optie.id;
                  return (
                    <button
                      key={optie.id}
                      type="button"
                      disabled={bezig}
                      onClick={() => { setGekozenId(optie.id); beantwoordMet(optie.id); }}
                      style={{
                        border: `3px solid ${isGekozen ? "#ffffff" : KLEUR_RAND[optie.color]}`,
                        borderRadius: 16, overflow: "hidden",
                        cursor: "pointer",
                        background: KLEUR_RAND[optie.color],
                        padding: 0,
                        display: "flex", flexDirection: "column",
                        opacity: bezig && !isGekozen ? 0.5 : 1,
                        boxShadow: isGekozen ? "0 0 0 3px rgba(0,0,0,0.3)" : "none",
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
                          textAlign: "center", color: "#ffffff",
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
                {(vraag.answer_options ?? []).length === 0 && (
                  <p style={{ color: "#DC2626", fontSize: "0.85rem", margin: 0 }}>⚠ Geen antwoordopties ingesteld voor deze vraag.</p>
                )}
                {(vraag.answer_options ?? []).map((optie) => {
                  const isGekozen = gekozenId === optie.id;
                  return (
                    <button
                      key={optie.id}
                      type="button"
                      disabled={bezig}
                      onClick={() => { setGekozenId(optie.id); beantwoordMet(optie.id); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                        border: `2.5px solid ${isGekozen ? "#ffffff" : "transparent"}`,
                        background: KLEUR_RAND[optie.color],
                        textAlign: "left",
                        transition: "opacity 0.12s",
                        opacity: bezig && !isGekozen ? 0.5 : 1,
                        boxShadow: isGekozen ? "0 0 0 3px rgba(0,0,0,0.3)" : "none",
                      }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: isGekozen ? "#ffffff" : "transparent",
                        border: `2.5px solid rgba(255,255,255,0.7)`,
                      }} />
                      <span style={{ fontSize: "1rem", fontWeight: 600, color: "#ffffff" }}>{optie.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {vraag.type === "open" && (
              <input
                ref={inputRef}
                value={openAntwoord}
                onChange={(e) => setOpenAntwoord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && beantwoord()}
                placeholder="Typ hier je antwoord…"
                style={{
                  fontSize: "1rem", padding: "14px 16px",
                  background: "#f9fafb", color: "#0A1B36",
                  border: "2px solid #d1d5db", borderRadius: 12,
                  outline: "none", width: "100%", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
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
                    border: `2.5px dashed ${fotoBestand ? "#3B82F6" : "#d1d5db"}`,
                    borderRadius: 16, padding: fotoBestand ? "10px" : "28px 16px",
                    textAlign: "center", cursor: "pointer",
                    background: fotoBestand ? "#EFF6FF" : "#f9fafb",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  }}>
                  {fotoBestand ? (
                    <>
                      {fotoVoorbeeld && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fotoVoorbeeld} alt="Gekozen foto"
                          style={{ width: "100%", maxHeight: "45vh", objectFit: "contain", borderRadius: 12, background: "#f3f4f6" }} />
                      )}
                      <span style={{ fontSize: "0.82rem", color: "#1E40AF", fontWeight: 600 }}>✅ Deze foto stuur je in · tik om een andere te kiezen</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "2.5rem" }}>📷</span>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#374151" }}>Tik om een foto te maken of te kiezen</span>
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

            {fout && <p style={{ color: "#DC2626", fontSize: "0.85rem", margin: 0 }}>{fout}</p>}
          </>
        )}

        {/* Foto ingestuurd: meteen door, keuring volgt na afloop */}
        {popupFase === "foto_ingestuurd" && (
          <div style={{ background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 14, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#15803D" }}>📸 Foto ingestuurd!</div>
            <div style={{ fontSize: "0.92rem", color: "#166534", lineHeight: 1.5 }}>
              Je kunt meteen door. De organisatie keurt de foto&apos;s na afloop; de punten komen er dan bij, vóór de uitslag bekend wordt.
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

      </div>

      {/* Vaste knop onderaan */}
      <div style={{ padding: "12px 16px 28px", borderTop: "1px solid #e5e7eb", background: "#ffffff" }}>
        {popupFase === "start" && (
          <button
            className="btn btn-primary"
            style={KNOP_ONDERAAN_STIJL}
            disabled={bezig}
            onClick={() => (vraag && onStartVraagLater ? onStartVraagLater() : verwerkDirect())}>
            {bezig ? "Even geduld…" : "🚀 Op pad!"}
          </button>
        )}
        {popupFase === "informatie" && (
          <button
            className="btn btn-primary"
            style={KNOP_ONDERAAN_STIJL}
            disabled={bezig}
            onClick={verwerkDirect}>
            {bezig ? "Even geduld…" : punt.type === "eindpunt" ? "🏁 Naar de finish!" : "Doorgaan →"}
          </button>
        )}
        {popupFase === "vraag" && vraag?.type === "open" && (
          <button
            className="btn btn-primary"
            style={KNOP_ONDERAAN_STIJL}
            disabled={bezig || !openAntwoord.trim()}
            onClick={beantwoord}>
            {bezig ? "Controleren…" : "Bevestig antwoord"}
          </button>
        )}
        {popupFase === "vraag" && vraag?.type === "foto_opdracht" && (
          <button
            className="btn btn-primary"
            style={KNOP_ONDERAAN_STIJL}
            disabled={bezig || !fotoBestand}
            onClick={uploadFoto}>
            {bezig ? "Uploaden…" : "📤 Foto insturen"}
          </button>
        )}
        {(popupFase === "feedback" || popupFase === "foto_ingestuurd") && (
          <button
            className="btn btn-primary"
            style={KNOP_ONDERAAN_STIJL}
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
    vraagpunt:      { label: "❓ VRAAG",      bg: "#DBEAFE", kleur: "#1E40AF" },
    informatiepunt: { label: "ℹ️ INFORMATIE", bg: "#CFFAFE", kleur: "#0E7490" },
    eindpunt:       { label: "🏁 EINDPUNT",   bg: "#FEF9C3", kleur: "#A16207" },
  }[type];
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
      background: cfg.bg, color: cfg.kleur,
      padding: "4px 12px", borderRadius: 99, alignSelf: "flex-start",
    }}>{cfg.label}</span>
  );
}

function StartBadge() {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
      background: "#DCFCE7", color: "#15803D",
      padding: "4px 12px", borderRadius: 99, alignSelf: "flex-start",
    }}>🚩 STARTPUNT</span>
  );
}

// ── InfoInhoud ────────────────────────────────────────────────────────────────
function InfoInhoud({ punt }: { punt: RoutePunt }) {
  return (
    <>
      <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#0A1B36" }}>{punt.name}</h2>
      {punt.image_path && (
        <img
          src={`${SUPABASE_URL}/storage/v1/object/public/punt-afbeeldingen/${punt.image_path}`}
          alt=""
          style={{ width: "100%", borderRadius: 12, maxHeight: 240, objectFit: "cover" }}
        />
      )}
      {punt.description && (
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: "1rem", color: "#0A1B36" }}>{punt.description}</p>
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
        {feedback.points_awarded < 0 && (
          <div style={{ fontSize: "0.9rem", color: "#B91C1C", fontWeight: 700 }}>
            {feedback.points_awarded} punt{feedback.points_awarded !== -1 ? "en" : ""} — die gaan van je score af
          </div>
        )}
      </div>

      {!feedback.is_correct && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6B7280", fontWeight: 600 }}>
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
                    border: `2px solid ${isJuist ? "#86EFAC" : wasGekozen ? "#FECACA" : "#e5e7eb"}`,
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
