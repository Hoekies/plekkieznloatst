"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { RoutePunt, SpelerPuntVoortgang } from "@/types/database";
import { speelGoedAntwoord, speelFoutAntwoord } from "@/lib/sounds";
import { strooiConfetti } from "@/lib/confetti";
import { tril, TRIL } from "@/lib/tril";
import { stuur } from "@/lib/wachtrij";
import { haalVraag, wisVraagCache } from "@/lib/vraag-cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Kleuren van de antwoorden, met tekst die goed leesbaar is (contrast minstens 4,5:1): donkere tekst op geel,
// witte tekst op iets donkerder rood en groen
const KLEUR_RAND: Record<string, string> = {
  geel: "#F59E0B",
  blauw: "#1E40AF",
  rood: "#DC2626",
  groen: "#15803D",
};
const KLEUR_TEKST: Record<string, string> = { geel: "#2A1600", blauw: "#ffffff", rood: "#ffffff", groen: "#ffffff" };
// Vaste knop onderaan de popup — compact gehouden, was op mobiel onnodig log
const KNOP_ONDERAAN_STIJL: CSSProperties = { width: "100%", padding: "13px 0", fontSize: "0.92rem", borderRadius: 13 };

type AntwoordOptie = {
  id: string;
  color: string;
  answer_type: string;
  text: string | null;
  image_path: string | null;
  order_index: number;
};

export type VraagData = {
  id: string;
  type: "meerkeuze_tekst" | "meerkeuze_afbeelding" | "open" | "foto_opdracht" | "stemvraag";
  question_text: string;
  question_image_path: string | null;
  points: number;
  answer_options: AntwoordOptie[];
  // Per vraag aan of uit
  antwoorden_husselen?: boolean;
  geluid_pad?: string | null;
  tijdslimiet_seconden?: number | null;
};

// Antwoorden in een willekeurige volgorde (elk team anders)
function hussel<T>(lijst: T[]): T[] {
  const uit = [...lijst];
  for (let i = uit.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [uit[i], uit[j]] = [uit[j], uit[i]]; }
  return uit;
}

export type Feedback = {
  is_correct: boolean | null;
  // 🗳️ Stemvraag: is_correct blijft leeg tot de stemming sluit
  stem?: boolean;
  points_awarded: number;
  correct_answer_id: string | null;
  // Alle goede antwoorden (er kunnen er meer zijn); ontbreekt bij een oud antwoord: dan alleen correct_answer_id
  correct_answer_ids?: string[];
  // 💬 Uitleg per antwoord (alleen bij het gekozen en de goede antwoorden), op antwoord-id
  uitleg?: Record<string, string>;
  correct_text_answers: string[] | null;
  numeric_answer: number | null;
  numeric_tolerance: number | null;
};

// geen_bereik: de vraag kon niet geladen worden; bewaard: antwoord bewaard, gaat mee zodra er bereik is
type PopupFase = "laden" | "start" | "informatie" | "vraag" | "foto_ingestuurd" | "feedback" | "geen_bereik" | "bewaard";

// Punt afgerond zonder bereik: alvast zo in de app, de server krijgt het later uit de wachtrij
function lokaalAfgerond(puntId: string): SpelerPuntVoortgang {
  const nu = new Date().toISOString();
  return { id: `lokaal-${puntId}`, session_id: "", route_point_id: puntId, reached_at: nu, answered_at: nu,
    selected_answer_id: null, open_answer_text: null, is_correct: null, points_awarded: 0 };
}

interface Props {
  punt: RoutePunt;
  onVerwerkt: (voortgang: SpelerPuntVoortgang) => void;
  // Startpunt: eerst een welkomstscherm met speluitleg ("uitleg"); heeft het startpunt een
  // vraag, dan komt die pas later na een stukje lopen ("vraag").
  start?: "uitleg" | "vraag";
  startUitleg?: { regels: string[]; afsluiting: string; ondertekening: string; meter?: number };
  onStartVraagLater?: () => void;
  // 🧪 Testen in de editor: de vraag komt uit de editor en het antwoord wordt ter plekke beoordeeld; er gaat niets naar de server
  proef?: {
    haalVraag: () => Promise<VraagData | null>;
    beoordeel: (vraag: VraagData, antwoordId: string | null, openTekst?: string, teLaat?: boolean) => Feedback;
  };
}

export default function VraagPopup({ punt, onVerwerkt, start, startUitleg, onStartVraagLater, proef }: Props) {
  const [popupFase, setPopupFase] = useState<PopupFase>("laden");
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

  const [laadPoging, setLaadPoging] = useState(0);
  useEffect(() => {
    // Ook een informatiepunt of de finish kan een vraag hebben (bijv. een selfie);
    // die moet dan eerst beantwoord worden. Meestal is de vraag al vooruit geladen (ook zonder bereik).
    (proef ? proef.haalVraag() : haalVraag<VraagData>(punt.id))
      .then((data) => {
        if (data) setVraag(data.antwoorden_husselen ? { ...data, answer_options: hussel(data.answer_options ?? []) } : data);
        if (start === "uitleg") setPopupFase("start");
        else setPopupFase(data ? "vraag" : "informatie");
      })
      .catch(() => setPopupFase(start === "uitleg" ? "start" : punt.type === "vraagpunt" ? "geen_bereik" : "informatie"));
  }, [punt, start, laadPoging]);

  async function verwerkDirect() {
    if (proef) { onVerwerkt(lokaalAfgerond(punt.id)); return; }
    setBezig(true);
    try {
      const r = await stuur("/api/speler/voortgang/verwerk", { route_point_id: punt.id });
      if (r.status === "bewaard") { onVerwerkt(lokaalAfgerond(punt.id)); return; }
      if (r.status === "ok") {
        const data = await r.res.json();
        onVerwerkt(data.voortgang ?? data);
      } else {
        // Geweigerd: zeggen waarom (anders bleef de knop gewoon staan zonder uitleg)
        const data = await r.res.json().catch(() => ({}));
        setFout(data.fout ?? "Doorgaan lukte niet, probeer het opnieuw");
      }
    } finally {
      setBezig(false);
    }
  }

  // ⏱️ Tijdslimiet: aftellen zodra de vraag in beeld is; op nul telt de vraag als fout
  const [resterend, setResterend] = useState<number | null>(null);
  const [teLaat, setTeLaat] = useState(false);
  useEffect(() => {
    const limiet = vraag?.tijdslimiet_seconden;
    if (popupFase !== "vraag" || !limiet || vraag?.type === "foto_opdracht") { setResterend(null); return; }
    const eind = Date.now() + limiet * 1000;
    setResterend(limiet);
    const t = setInterval(() => {
      const over = Math.max(0, Math.ceil((eind - Date.now()) / 1000));
      setResterend(over);
      if (over <= 0) { clearInterval(t); setTeLaat(true); beantwoordMet(null, undefined, true); }
    }, 250);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupFase, vraag?.id]);

  async function beantwoordMet(answerId: string | null, openTekst?: string, teLaatNu = false) {
    if (!vraag) return;
    setFout("");
    // Testen: zelf beoordelen, zonder server
    if (proef) {
      const fb = proef.beoordeel(vraag, answerId, openTekst, teLaatNu);
      voortgangRef.current = { ...lokaalAfgerond(punt.id), selected_answer_id: answerId, open_answer_text: openTekst ?? null, is_correct: fb.is_correct, points_awarded: fb.points_awarded };
      if (fb.stem && fb.is_correct === null) tril(TRIL.goed);
      else if (fb.is_correct) { speelGoedAntwoord(); tril(TRIL.goed); strooiConfetti({ aantal: 70, duurMs: 1800, knal: true }); } else { speelFoutAntwoord(); tril(TRIL.fout); }
      setFeedback(fb);
      setPopupFase("feedback");
      return;
    }
    setBezig(true);
    try {
      const r = await stuur("/api/speler/voortgang/verwerk", {
        route_point_id: punt.id,
        selected_answer_id: answerId ?? undefined,
        open_answer_text: openTekst,
        ...(teLaatNu ? { te_laat: true } : {}),
      });
      // Geen bereik: het antwoord is bewaard en telt zodra er weer bereik is
      if (r.status === "bewaard") {
        voortgangRef.current = lokaalAfgerond(punt.id);
        setPopupFase("bewaard");
        return;
      }
      const res = r.res;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // De vraag is intussen door de organisatie aangepast: de nieuwe versie ophalen, dan kan het team opnieuw kiezen
        if (data.fout === "Ongeldig antwoord" || data.fout === "Ongeldige keuze") {
          wisVraagCache(punt.id);
          setFout("De vraag is net aangepast: kies opnieuw");
          setLaadPoging((n) => n + 1);
          return;
        }
        setFout(data.fout ?? "Indienen mislukt, probeer het opnieuw");
        return;
      }

      const data = await res.json();
      voortgangRef.current = data.voortgang;
      if (data.stem && data.is_correct === null) tril(TRIL.goed);
      else if (data.is_correct) { speelGoedAntwoord(); tril(TRIL.goed); strooiConfetti({ aantal: 70, duurMs: 1800, knal: true }); } else { speelFoutAntwoord(); tril(TRIL.fout); }
      setFeedback({
        is_correct: data.is_correct,
        stem: !!data.stem,
        points_awarded: data.points_awarded,
        correct_answer_id: data.correct_answer_id ?? null,
        correct_answer_ids: data.correct_answer_ids ?? undefined,
        uitleg: data.uitleg ?? undefined,
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
    // Testen: niet echt insturen
    if (proef) { voortgangRef.current = lokaalAfgerond(punt.id); setPopupFase("foto_ingestuurd"); return; }
    setBezig(true); setFout("");
    try {
      // Comprimeer via canvas (max 1200px). Kan de telefoon de foto niet lezen, dan zeggen we dat (de foto blijft gekozen)
      const bmp = await createImageBitmap(fotoBestand).catch(() => null);
      if (!bmp) { setFout("Deze foto kan niet worden gelezen. Kies een andere foto of maak een nieuwe."); return; }
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

      const res = await fetch("/api/speler/foto", { method: "POST", body: formData }).catch(() => null);
      if (!res) { setFout("Geen verbinding: de foto is niet verstuurd. Probeer het opnieuw zodra er bereik is."); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFout(data.fout ?? "Upload mislukt, probeer het opnieuw");
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

  // ── Infopunt zonder vraag: een kaartje onderin, de kaart blijft in beeld ──────
  // (vragen, de start en de finish blijven op het volledige scherm)
  const alsKaartje = !start && punt.type === "informatiepunt" && (popupFase === "informatie" || popupFase === "laden");
  if (alsKaartje) {
    return (
      <div className="info-kaartje" role="dialog" aria-label={punt.name}>
        <TypeBadge type={punt.type} />
        {popupFase === "laden" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "18px 0" }}><div className="spinner" /></div>
        ) : (
          <div className="info-kaartje-inhoud"><InfoInhoud punt={punt} /></div>
        )}
        {fout && <div className="info-kaartje-fout" role="alert">{fout}</div>}
        <button className="btn btn-primary" style={KNOP_ONDERAAN_STIJL} disabled={bezig || popupFase === "laden"} onClick={verwerkDirect}>
          {bezig ? "Even geduld…" : "Doorgaan →"}
        </button>
      </div>
    );
  }

  // ── Volledig scherm shell ─────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "var(--game-gradient)",
      color: "#fff",
      display: "flex", flexDirection: "column",
    }}>
      {/* Logo header */}
      <div style={{ padding: "max(10px, calc(env(safe-area-inset-top) + 8px)) 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(42,21,102,0.5)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spellogo/breed.png" alt="PointRush" style={{ height: 96, width: "auto" }} />
      </div>

      {/* Scrollbaar inhoudsgebied */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 16 }}>

        {start ? <StartBadge /> : <TypeBadge type={punt.type} />}

        {/* Laden */}
        {popupFase === "laden" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0" }}>
            <div className="spinner" />
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Vraag ophalen…</span>
          </div>
        )}

        {/* Startpunt: welkom + korte speluitleg */}
        {popupFase === "start" && startUitleg && (
          <>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#fff" }}>Welkom bij de start! 🚩</h2>
            {/* Elke regel als rij: icoon in een rondje, de zin ernaast */}
            <div className="start-uitleg">
              {startUitleg.regels.map((r) => {
                const m = r.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
                return (
                  <div key={r} className="start-uitleg-rij">
                    <span className="start-uitleg-icoon" aria-hidden>{m ? m[1] : "•"}</span>
                    <span>{m ? m[2] : r}</span>
                  </div>
                );
              })}
            </div>
            {vraag && <div className="start-uitleg-eerst">🚶 Je eerste vraag krijg je na <strong>{startUitleg.meter ?? 25} meter</strong> lopen, langs de oranje stippellijn op de kaart.</div>}
            <div style={{ background: "rgba(255,217,59,0.12)", border: "1px solid rgba(255,217,59,0.45)", borderRadius: 14, padding: "14px 16px", color: "#FFE58A" }}>
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
            {/* ⏱️ Aftelklok (als de vraag een tijdslimiet heeft) */}
            {resterend !== null && (
              <div className={`vraag-klok${resterend <= 10 ? " vraag-klok--bijna" : ""}`} role="timer" aria-live="polite">
                ⏱️ {Math.floor(resterend / 60)}:{String(resterend % 60).padStart(2, "0")}
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: "1.25rem", lineHeight: 1.4, fontWeight: 700, whiteSpace: "pre-wrap", color: "#fff" }}>
              {vraag.question_text}
            </h2>

            {/* 🔊 Geluidsfragment bij de vraag */}
            {vraag.geluid_pad && (
              <audio controls preload="auto" src={`${SUPABASE_URL}/storage/v1/object/public/vraag-geluid/${vraag.geluid_pad}`} style={{ width: "100%" }} />
            )}

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
                {/* Elk antwoord met een letter (A, B, C, D); het gekozen antwoord springt eruit, de rest wordt zachter */}
                {(vraag.answer_options ?? []).map((optie, i) => {
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
                        display: "flex", flexDirection: "column", position: "relative",
                        opacity: gekozenId && !isGekozen ? 0.4 : 1,
                        boxShadow: isGekozen ? "0 0 0 3px rgba(0,0,0,0.35), 0 0 22px rgba(255,255,255,0.45)" : "none",
                      }}>
                      <span style={{
                        position: "absolute", top: 6, left: 6, width: 28, height: 28, borderRadius: 9,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "0.9rem",
                        background: isGekozen ? "#ffffff" : "rgba(0,0,0,0.55)", color: isGekozen ? "#1a0b3d" : "#ffffff",
                        border: "2px solid rgba(255,255,255,0.7)",
                      }}>{isGekozen ? "✓" : String.fromCharCode(65 + i)}</span>
                      {optie.image_path ? (
                        <img
                          src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${optie.image_path}`}
                          alt=""
                          style={{ width: "100%", aspectRatio: "4/3", objectFit: "contain", background: "rgba(255,255,255,0.08)" }}
                        />
                      ) : (
                        <div style={{ aspectRatio: "4/3", background: "rgba(0,0,0,0.18)" }} />
                      )}
                      {optie.text && (
                        <div style={{
                          padding: "8px 10px", fontSize: "0.88rem", fontWeight: 600,
                          textAlign: "center", color: KLEUR_TEKST[optie.color] ?? "#ffffff",
                        }}>
                          {optie.text}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {vraag.type === "stemvraag" && (
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#C4B5FD", marginBottom: -2 }}>🗳️ Stem! Kies je voor wat de meeste teams kiezen, dan krijg je de punten.</div>
            )}
            {(vraag.type === "meerkeuze_tekst" || vraag.type === "stemvraag") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(vraag.answer_options ?? []).length === 0 && (
                  <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: 0 }}>⚠ Geen antwoordopties ingesteld voor deze vraag.</p>
                )}
                {/* Elk antwoord met een letter (A, B, C, D); het gekozen antwoord springt eruit, de rest wordt zachter */}
                {(vraag.answer_options ?? []).map((optie, i) => {
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
                        transition: "opacity 0.12s, transform 0.12s",
                        opacity: gekozenId && !isGekozen ? 0.4 : 1,
                        transform: isGekozen ? "scale(1.02)" : "none",
                        boxShadow: isGekozen ? "0 0 0 3px rgba(0,0,0,0.35), 0 0 22px rgba(255,255,255,0.45)" : "0 3px 0 rgba(0,0,0,0.25)",
                      }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1rem",
                        background: isGekozen ? "#ffffff" : "rgba(0,0,0,0.22)",
                        color: isGekozen ? "#1a0b3d" : "#ffffff",
                        border: "2px solid rgba(255,255,255,0.7)",
                      }}>{isGekozen ? "✓" : String.fromCharCode(65 + i)}</span>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: KLEUR_TEKST[optie.color] ?? "#ffffff" }}>{optie.text}</span>
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
                  background: "rgba(255,255,255,0.08)", color: "#fff",
                  border: "2px solid rgba(255,255,255,0.25)", borderRadius: 12,
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
                    border: `2.5px dashed ${fotoBestand ? "#60A5FA" : "rgba(255,255,255,0.3)"}`,
                    borderRadius: 16, padding: fotoBestand ? "10px" : "28px 16px",
                    textAlign: "center", cursor: "pointer",
                    background: fotoBestand ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  }}>
                  {fotoBestand ? (
                    <>
                      {fotoVoorbeeld && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fotoVoorbeeld} alt="Gekozen foto"
                          style={{ width: "100%", maxHeight: "45vh", objectFit: "contain", borderRadius: 12, background: "rgba(255,255,255,0.08)" }} />
                      )}
                      <span style={{ fontSize: "0.82rem", color: "#93C5FD", fontWeight: 600 }}>✅ Deze foto stuur je in · tik om een andere te kiezen</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "2.5rem" }}>📷</span>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#E5E7EB" }}>Tik om een foto te maken of te kiezen</span>
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

            {fout && <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: 0 }}>{fout}</p>}
          </>
        )}

        {/* Foto ingestuurd: meteen door, keuring volgt na afloop */}
        {/* Geen bereik en de vraag was nog niet geladen */}
        {popupFase === "geen_bereik" && (
          <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(252,211,77,0.5)", borderRadius: 14, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#FCD34D" }}>📡 Even geen bereik</div>
            <div style={{ fontSize: "0.92rem", color: "#FDE68A", lineHeight: 1.5 }}>De vraag kon niet geladen worden. Loop een paar stappen en probeer het opnieuw.</div>
          </div>
        )}

        {/* Antwoord gegeven zonder bereik */}
        {popupFase === "bewaard" && (
          <div style={{ background: "rgba(14,165,233,0.15)", border: "1px solid rgba(125,211,252,0.5)", borderRadius: 14, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#7DD3FC" }}>📡 Antwoord bewaard</div>
            <div style={{ fontSize: "0.92rem", color: "#BAE6FD", lineHeight: 1.5 }}>Er is even geen bereik. Je antwoord gaat vanzelf mee zodra er weer bereik is; daarna zie je je punten. Je kunt gewoon door.</div>
          </div>
        )}

        {popupFase === "foto_ingestuurd" && (
          <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(134,239,172,0.5)", borderRadius: 14, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#86EFAC" }}>📸 Foto ingestuurd!</div>
            <div style={{ fontSize: "0.92rem", color: "#BBF7D0", lineHeight: 1.5 }}>
              Je kunt meteen door. De organisatie keurt de foto&apos;s na afloop; de punten komen er dan bij, vóór de uitslag bekend wordt.
            </div>
          </div>
        )}

        {/* Feedback reguliere vraag */}
        {popupFase === "feedback" && teLaat && (
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#FCA5A5", textAlign: "center" }}>⏱️ De tijd is om!</div>
        )}
        {popupFase === "feedback" && feedback && vraag && vraag.type !== "foto_opdracht" && (
          <FeedbackWeergave
            feedback={feedback}
            vraag={vraag}
            gekozenId={gekozenId}
          />
        )}

      </div>

      {/* Vaste knop onderaan */}
      <div style={{ padding: "12px 16px 28px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(42,21,102,0.5)" }}>
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
        {popupFase === "geen_bereik" && (
          <button className="btn btn-primary" style={KNOP_ONDERAAN_STIJL} onClick={() => { setPopupFase("laden"); setLaadPoging((n) => n + 1); }}>
            🔄 Opnieuw proberen
          </button>
        )}
        {(popupFase === "feedback" || popupFase === "foto_ingestuurd" || popupFase === "bewaard") && (
          <button
            className="btn btn-primary"
            style={KNOP_ONDERAAN_STIJL}
            onClick={doorgaan}>
            {punt.type === "eindpunt" ? "🏁 Naar de finish!" : "Doorgaan →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: RoutePunt["type"] }) {
  const cfg = {
    vraagpunt:      { label: "❓ VRAAG",      bg: "rgba(59,130,246,0.22)",  kleur: "#93C5FD" },
    informatiepunt: { label: "ℹ️ INFORMATIE", bg: "rgba(6,182,212,0.22)",   kleur: "#67E8F9" },
    doorlooppunt:   { label: "🚶 DOORLOPEN",  bg: "rgba(148,163,184,0.22)", kleur: "#CBD5E1" },
    eindpunt:       { label: "🏁 EINDPUNT",   bg: "rgba(250,204,21,0.2)",   kleur: "#FDE047" },
  }[type] ?? { label: "📍 PUNT", bg: "rgba(148,163,184,0.22)", kleur: "#CBD5E1" };
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
      background: "rgba(34,197,94,0.22)", color: "#86EFAC",
      padding: "4px 12px", borderRadius: 99, alignSelf: "flex-start",
    }}>🚩 STARTPUNT</span>
  );
}

// ── InfoInhoud ────────────────────────────────────────────────────────────────
function InfoInhoud({ punt }: { punt: RoutePunt }) {
  return (
    <>
      <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#fff" }}>{punt.name}</h2>
      {punt.image_path && (
        <img
          src={`${SUPABASE_URL}/storage/v1/object/public/punt-afbeeldingen/${punt.image_path}`}
          alt=""
          style={{ width: "100%", borderRadius: 12, maxHeight: 240, objectFit: "cover" }}
        />
      )}
      {punt.description && (
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: "1rem", color: "#fff" }}>{punt.description}</p>
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
  const juisteIds = feedback.correct_answer_ids?.length ? feedback.correct_answer_ids : feedback.correct_answer_id ? [feedback.correct_answer_id] : [];
  // 🗳️ Stem uitgebracht: de uitslag komt pas als de stemming sluit
  if (feedback.stem && feedback.is_correct === null) {
    return (
      <div style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(196,181,253,0.5)", borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#C4B5FD" }}>🗳️ Je stem is uitgebracht!</div>
        <div style={{ fontSize: "0.88rem", color: "#DDD6FE", marginTop: 4, lineHeight: 1.45 }}>
          Stemden jullie hetzelfde als de meeste teams? Dan krijgen jullie de punten zodra de stemming sluit (uiterlijk bij de uitslag).
        </div>
      </div>
    );
  }
  return (
    <>
      <div style={{
        background: feedback.is_correct ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
        border: `1px solid ${feedback.is_correct ? "rgba(134,239,172,0.6)" : "rgba(252,165,165,0.6)"}`,
        borderRadius: 14, padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ fontWeight: 800, fontSize: "1.15rem", color: feedback.is_correct ? "#86EFAC" : "#FCA5A5" }}>
          {feedback.is_correct ? "✓ Goed gedaan!" : "✗ Helaas, dat klopt niet."}
        </div>
        {feedback.points_awarded > 0 && (
          <div style={{ fontSize: "0.9rem", color: "#86EFAC" }}>
            +{feedback.points_awarded} punt{feedback.points_awarded !== 1 ? "en" : ""} verdiend
          </div>
        )}
        {feedback.points_awarded < 0 && (
          <div style={{ fontSize: "0.9rem", color: "#FCA5A5", fontWeight: 700 }}>
            {feedback.points_awarded} punt{feedback.points_awarded !== -1 ? "en" : ""} — die gaan van je score af
          </div>
        )}
        {/* 💬 Uitleg bij het gekozen antwoord (bijv. waarom het niet goed is) */}
        {gekozenId && feedback.uitleg?.[gekozenId] && <div className="feedback-uitleg">💬 {feedback.uitleg[gekozenId]}</div>}
      </div>

      {!feedback.is_correct && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
            {juisteIds.length > 1 ? "De juiste antwoorden:" : "Het juiste antwoord:"}
          </p>
          {/* 💬 Uitleg bij de goede antwoorden */}
          {juisteIds.filter((id) => feedback.uitleg?.[id]).map((id) => {
            const optie = vraag.answer_options.find((o) => o.id === id);
            return <div key={id} className="feedback-uitleg feedback-uitleg--goed">💬 {optie?.text ? <strong>{optie.text}: </strong> : null}{feedback.uitleg![id]}</div>;
          })}

          {vraag.type === "meerkeuze_afbeelding" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {vraag.answer_options.map((optie) => {
                const isJuist = juisteIds.includes(optie.id);
                const wasGekozen = optie.id === gekozenId;
                if (!isJuist && !wasGekozen) return null;
                return (
                  <div key={optie.id} style={{
                    border: `3px solid ${isJuist ? "#86EFAC" : "#FECACA"}`,
                    borderRadius: 14, overflow: "hidden",
                    background: isJuist ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
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
                const isJuist = juisteIds.includes(optie.id);
                const wasGekozen = optie.id === gekozenId;
                return (
                  <div key={optie.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12,
                    border: `2px solid ${isJuist ? "#86EFAC" : wasGekozen ? "#FECACA" : "rgba(255,255,255,0.15)"}`,
                    background: isJuist ? "rgba(34,197,94,0.15)" : wasGekozen ? "rgba(239,68,68,0.15)" : "transparent",
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
              background: "rgba(34,197,94,0.15)", border: "1px solid #86EFAC",
              borderRadius: 12, padding: "12px 16px", fontSize: "1rem", fontWeight: 600,
            }}>
              {feedback.numeric_tolerance && feedback.numeric_tolerance > 0
                ? `${feedback.numeric_answer} (± ${feedback.numeric_tolerance})`
                : String(feedback.numeric_answer)}
            </div>
          )}

          {vraag.type === "open" && feedback.correct_text_answers?.length && (
            <div style={{
              background: "rgba(34,197,94,0.15)", border: "1px solid #86EFAC",
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
