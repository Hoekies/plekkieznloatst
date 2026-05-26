"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { RoutePunt, Vraag, AntwoordOptie, VraagType } from "@/types/database";
import AfbeeldingUpload from "./AfbeeldingUpload";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type VraagMetAntwoorden = Vraag & { answer_options: AntwoordOptie[] };

const KLEUREN = ["geel", "blauw", "rood"] as const;
const KLEUR_STIJL: Record<string, string> = {
  geel: "#F59E0B", blauw: "#1E40AF", rood: "#EF4444",
};
const KLEUR_ZACHT: Record<string, string> = {
  geel: "#FEF9C3", blauw: "#DBEAFE", rood: "#FEE2E2",
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
  const [punten, setPunten] = useState(bestaandeVraag?.points ?? 50);

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

  // QR-unlock
  const [qrEnabled, setQrEnabled] = useState(punt.qr_unlock_enabled ?? false);
  const [qrSecret, setQrSecret] = useState(punt.qr_secret ?? "");
  const [qrOpslaan, setQrOpslaan] = useState(false);
  const qrUrl = qrSecret ? `${SITE_URL}/speler/qr?p=${punt.id}&s=${qrSecret}` : "";

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

    if (type === "foto_opdracht") {
      // Foto-opdracht: alleen tekst en punten, geen antwoordopties
    } else if (type === "open") {
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

  async function toggleQr(inschakelen: boolean) {
    const nieuweSecret = inschakelen
      ? (qrSecret || crypto.randomUUID().replace(/-/g, "").slice(0, 12))
      : "";
    setQrOpslaan(true);
    await fetch(`/api/admin/routes/${routeId}/punten/${punt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_unlock_enabled: inschakelen, qr_secret: nieuweSecret }),
    });
    setQrEnabled(inschakelen);
    setQrSecret(nieuweSecret);
    setQrOpslaan(false);
  }

  function printQr() {
    const el = document.getElementById("qr-print-zone");
    if (!el) return;
    const html = `<!DOCTYPE html><html><head><title>QR — ${punt.name}</title><style>
      body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
      h2 { margin-bottom:16px; }
    </style></head><body>
      <h2>${punt.name}</h2>
      ${el.innerHTML}
      <p style="margin-top:16px; font-size:14px; color:#555">Scan deze code om dit punt te ontgrendelen</p>
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
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

      {/* Twee-koloms layout: formulier + preview */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", gap: 0 }}>

        {/* ── Formulier (links) ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px", maxWidth: 600, minWidth: 0 }}>
          <form onSubmit={slaOp} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="form-group">
              <label className="form-label">Vraagtype</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["meerkeuze_tekst", "meerkeuze_afbeelding", "open", "foto_opdracht"] as VraagType[]).map((t) => (
                  <button key={t} type="button"
                    className={`btn ${type === t ? "btn-primary" : "btn-outline"}`}
                    style={{ fontSize: "0.82rem" }}
                    onClick={() => setType(t)}>
                    {t === "meerkeuze_tekst" ? "Meerkeuze tekst"
                      : t === "meerkeuze_afbeelding" ? "Meerkeuze afbeelding"
                      : t === "open" ? "Open vraag"
                      : "📷 Foto-opdracht"}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Vraagstelling</label>
              <textarea className="form-textarea" value={tekst} onChange={(e) => setTekst(e.target.value)}
                placeholder="Typ hier de vraag…" required style={{ minHeight: 80 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Vraag-afbeelding (optioneel)</label>
              <AfbeeldingUpload
                huidigPad={vraagAfbeelding}
                bucket="vraag-afbeeldingen"
                onUpload={(pad) => setVraagAfbeelding(pad)}
                onVerwijder={() => setVraagAfbeelding(null)}
              />
            </div>

            <div className="form-group" style={{ maxWidth: 160 }}>
              <label className="form-label">Punten voor dit punt</label>
              <input className="form-input" type="number" min={0} value={punten}
                onChange={(e) => setPunten(Number(e.target.value))} />
            </div>

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
                      <button type="button" onClick={() => setCorrect(i)}
                        style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${KLEUR_STIJL[ant.color]}`,
                          background: ant.is_correct ? KLEUR_STIJL[ant.color] : "transparent",
                          cursor: "pointer",
                        }} />
                      <span style={{
                        width: 54, fontSize: "0.75rem", fontWeight: 700,
                        color: KLEUR_STIJL[ant.color], flexShrink: 0, textTransform: "capitalize",
                      }}>{ant.color}</span>
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

          {/* QR-unlock sectie (buiten formulier) */}
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 2 }}>📱 QR-code ontgrendeling</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  Spelers kunnen dit punt ontgrendelen door een QR-code te scannen in plaats van GPS.
                </div>
              </div>
              <button
                type="button"
                className={`btn ${qrEnabled ? "btn-danger" : "btn-outline"}`}
                style={{ fontSize: "0.82rem", flexShrink: 0 }}
                disabled={qrOpslaan}
                onClick={() => toggleQr(!qrEnabled)}>
                {qrOpslaan ? "…" : qrEnabled ? "Uitschakelen" : "Inschakelen"}
              </button>
            </div>

            {qrEnabled && qrUrl && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div id="qr-print-zone" style={{ padding: 12, background: "#fff", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <QRCodeSVG value={qrUrl} size={180} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", wordBreak: "break-all", maxWidth: 280 }}>
                  {qrUrl}
                </div>
                <button type="button" className="btn btn-outline" style={{ fontSize: "0.82rem" }} onClick={printQr}>
                  🖨️ Print QR-code
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Preview (rechts) ── */}
        <div style={{
          width: 340, flexShrink: 0,
          borderLeft: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            fontSize: "0.72rem", fontWeight: 700,
            color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            👁 Spelersweergave
          </div>

          {/* Telefoon-mockup */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", justifyContent: "center" }}>
            <div style={{
              width: "100%", maxWidth: 300,
              border: "2px solid #333", borderRadius: 28,
              overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              background: "#fff", display: "flex", flexDirection: "column",
              minHeight: 520,
            }}>
              {/* Nep statusbalk */}
              <div style={{ background: "#0A1B36", padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.6rem" }}>16:36</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.6rem" }}>▲ ▲ ▲</span>
              </div>
              {/* Nep header */}
              <div style={{ background: "#0A1B36", padding: "6px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" style={{ height: 22, objectFit: "contain" }} />
              </div>

              {/* Popup inhoud */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff" }}>
                {/* Scrollbaar deel */}
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 8px", display: "flex", flexDirection: "column", gap: 10 }}>

                  {/* Type badge */}
                  <span style={{
                    fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em",
                    background: "#DBEAFE", color: "#1E40AF",
                    padding: "3px 8px", borderRadius: 99, alignSelf: "flex-start",
                  }}>❓ VRAAG</span>

                  {/* Vraagstelling */}
                  <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.4, color: "#111" }}>
                    {tekst || <span style={{ color: "#aaa", fontStyle: "italic" }}>Vraagstelling verschijnt hier…</span>}
                  </p>

                  {/* Vraag-afbeelding */}
                  {vraagAfbeelding && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${vraagAfbeelding}`}
                      alt=""
                      style={{ width: "100%", borderRadius: 8, aspectRatio: "1/1", objectFit: "cover" }}
                    />
                  )}

                  {/* Meerkeuze afbeelding: 2-koloms grid */}
                  {type === "meerkeuze_afbeelding" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {antwoorden.map((ant) => (
                        <div key={ant.color} style={{
                          border: `2px solid ${ant.is_correct ? KLEUR_STIJL[ant.color] : "#e5e7eb"}`,
                          borderRadius: 10, overflow: "hidden",
                          background: ant.is_correct ? KLEUR_ZACHT[ant.color] : "#f9fafb",
                        }}>
                          {ant.image_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`${SUPABASE_URL}/storage/v1/object/public/vraag-afbeeldingen/${ant.image_path}`}
                              alt=""
                              style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <div style={{
                              aspectRatio: "4/3", background: KLEUR_ZACHT[ant.color],
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.6rem", color: KLEUR_STIJL[ant.color], fontWeight: 700,
                            }}>
                              {ant.color}
                            </div>
                          )}
                          {ant.text && (
                            <div style={{ padding: "4px 6px", fontSize: "0.62rem", fontWeight: 600, textAlign: "center", color: "#111" }}>
                              {ant.text}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meerkeuze tekst: lijst knoppen */}
                  {type === "meerkeuze_tekst" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {antwoorden.map((ant) => (
                        <div key={ant.color} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "10px 10px", borderRadius: 10,
                          border: `2px solid ${ant.is_correct ? KLEUR_STIJL[ant.color] : "#e5e7eb"}`,
                          background: ant.is_correct ? KLEUR_ZACHT[ant.color] : "transparent",
                        }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                            border: `2px solid ${KLEUR_STIJL[ant.color]}`,
                            background: ant.is_correct ? KLEUR_STIJL[ant.color] : "transparent",
                          }} />
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#111" }}>
                            {ant.text || <span style={{ color: "#aaa", fontStyle: "italic" }}>{ant.color}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Open vraag */}
                  {type === "open" && (
                    <div style={{
                      border: "1.5px solid #e5e7eb", borderRadius: 8,
                      padding: "8px 10px", fontSize: "0.72rem", color: "#aaa",
                      background: "#f9fafb",
                    }}>
                      Typ hier je antwoord…
                    </div>
                  )}

                  {/* Foto-opdracht */}
                  {type === "foto_opdracht" && (
                    <div style={{
                      border: "2px dashed #e5e7eb", borderRadius: 10,
                      padding: "20px 12px", textAlign: "center",
                      background: "#f9fafb",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: "2rem" }}>📷</span>
                      <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Maak een foto en upload hem</span>
                    </div>
                  )}
                </div>

                {/* Vaste knop */}
                <div style={{ padding: "8px 12px 16px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{
                    background: "#1E40AF", color: "#fff",
                    borderRadius: 10, padding: "10px 0",
                    textAlign: "center", fontSize: "0.72rem", fontWeight: 700,
                  }}>
                    Bevestig antwoord
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
