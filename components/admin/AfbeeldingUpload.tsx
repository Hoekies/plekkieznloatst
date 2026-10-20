"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadAfbeelding, valideerAfbeelding } from "@/lib/upload";

interface Props {
  huidigPad: string | null;
  bucket: string;
  onUpload: (pad: string) => void;
  onVerwijder: () => void;
  compact?: boolean;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const CROP_W = 360;
const CROP_H = 360;
// De geüploade afbeelding is scherper dan het voorbeeld: 1080 × 1080
const UIT = 1080;

function afbeeldingUrl(bucket: string, pad: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${pad}`;
}

// Zoom 1 = de hele foto past in het vierkant (geen stukje kwijt). Is een kant kleiner dan het
// vierkant, dan staat die kant in het midden; anders mag je schuiven tot de rand.
function klemOffset(
  offset: { x: number; y: number },
  imgW: number,
  imgH: number,
  zoom: number,
) {
  const totalScale = Math.min(CROP_W / imgW, CROP_H / imgH) * zoom;
  const scaledW = imgW * totalScale;
  const scaledH = imgH * totalScale;
  return {
    x: scaledW <= CROP_W ? (CROP_W - scaledW) / 2 : Math.min(0, Math.max(CROP_W - scaledW, offset.x)),
    y: scaledH <= CROP_H ? (CROP_H - scaledH) / 2 : Math.min(0, Math.max(CROP_H - scaledH, offset.y)),
  };
}
// Zoom waarbij het vierkant precies vol is
function vulZoom(w: number, h: number) {
  return Math.max(CROP_W / w, CROP_H / h) / Math.min(CROP_W / w, CROP_H / h);
}

export default function AfbeeldingUpload({ huidigPad, bucket, onUpload, onVerwijder, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // Crop modal
  const [cropBestand, setCropBestand] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState("");
  const [imgGrootte, setImgGrootte] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const sleepRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  function berekenBaseScale(w: number, h: number) {
    return Math.min(CROP_W / w, CROP_H / h);
  }

  function onImgLaden(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setImgGrootte({ w, h });
    const baseScale = berekenBaseScale(w, h);
    const scaledW = w * baseScale;
    const scaledH = h * baseScale;
    setOffset({ x: (CROP_W - scaledW) / 2, y: (CROP_H - scaledH) / 2 });
    setZoom(1);
  }

  function onZoomWijzig(nieuw: number) {
    const baseScale = berekenBaseScale(imgGrootte.w, imgGrootte.h);
    const oldTotal = baseScale * zoom;
    const newTotal = baseScale * nieuw;
    const cx = CROP_W / 2;
    const cy = CROP_H / 2;
    const imgX = (cx - offset.x) / oldTotal;
    const imgY = (cy - offset.y) / oldTotal;
    nieuw = Math.max(1, Math.min(maxZoom, nieuw));
    setZoom(nieuw);
    setOffset(klemOffset(
      { x: cx - imgX * newTotal, y: cy - imgY * newTotal },
      imgGrootte.w, imgGrootte.h, nieuw,
    ));
  }

  function startSlepen(cx: number, cy: number) {
    sleepRef.current = { sx: cx, sy: cy, ox: offset.x, oy: offset.y };
  }

  function bijSlepen(cx: number, cy: number) {
    if (!sleepRef.current) return;
    const { sx, sy, ox, oy } = sleepRef.current;
    setOffset(klemOffset({ x: ox + cx - sx, y: oy + cy - sy }, imgGrootte.w, imgGrootte.h, zoom));
  }

  async function bestandGekozen(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";
    if (!bestand) return;
    const validatieFout = valideerAfbeelding(bestand);
    if (validatieFout) { setFout(validatieFout); return; }
    setFout(null);
    setCropBestand(bestand);
    setCropSrc(URL.createObjectURL(bestand));
  }

  async function toepassen() {
    if (!cropSrc) return;
    setLaden(true);
    setFout(null);
    try {
      const img = new Image();
      img.src = cropSrc;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
      const baseScale = berekenBaseScale(img.naturalWidth, img.naturalHeight);
      const totalScale = baseScale * zoom;
      const f = UIT / CROP_W;
      const canvas = document.createElement("canvas");
      canvas.width = UIT;
      canvas.height = UIT;
      const ctx = canvas.getContext("2d")!;
      const sw = img.naturalWidth * totalScale, sh = img.naturalHeight * totalScale;
      if (sw < CROP_W - 0.5 || sh < CROP_H - 0.5) {
        // Lege randen: dezelfde foto groot en vervaagd erachter, wat donkerder
        const vul = Math.max(UIT / img.naturalWidth, UIT / img.naturalHeight);
        ctx.fillStyle = "#2a1566";
        ctx.fillRect(0, 0, UIT, UIT);
        ctx.save();
        ctx.filter = "blur(24px)";
        ctx.drawImage(img, (UIT - img.naturalWidth * vul) / 2, (UIT - img.naturalHeight * vul) / 2, img.naturalWidth * vul, img.naturalHeight * vul);
        ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, UIT, UIT);
      }
      ctx.drawImage(img, offset.x * f, offset.y * f, sw * f, sh * f);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("Canvas leeg")), "image/jpeg", 0.92),
      );
      const pad = await uploadAfbeelding(new File([blob], "bijgesneden.jpg", { type: "image/jpeg" }), bucket);
      URL.revokeObjectURL(cropSrc);
      setCropBestand(null);
      setCropSrc("");
      onUpload(pad);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Upload mislukt");
    } finally {
      setLaden(false);
    }
  }

  function annuleren() {
    URL.revokeObjectURL(cropSrc);
    setCropBestand(null);
    setCropSrc("");
    setFout(null);
  }

  const totalScale = berekenBaseScale(imgGrootte.w, imgGrootte.h) * zoom;
  const vul = vulZoom(imgGrootte.w, imgGrootte.h);
  const maxZoom = Math.max(3, vul * 3);

  const cropModalInhoud = cropBestand ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(12,3,34,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div className="pr-gem-panel" style={{ flex: "none", maxWidth: 420, width: "100%", position: "relative" }}>
      <button type="button" className="editor-paneel-sluit venster-sluit" onClick={annuleren} disabled={laden} title="Annuleren" aria-label="Annuleren">✕</button>
      <div className="pr-gem-panel-inner" style={{
        display: "flex", flexDirection: "column", gap: 14, padding: "18px 18px 16px",
        maxHeight: "90vh", overflow: "auto",
      }}>
        <div>
          <div className="pr-gem-label">🖼️ Afbeelding</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>Bijsnijden</div>
        </div>

        {/* Crop viewport */}
        <div
          style={{
            width: CROP_W, height: CROP_H, overflow: "hidden",
            borderRadius: 10, border: "2px solid var(--line)",
            position: "relative", cursor: "grab",
            userSelect: "none", touchAction: "none", alignSelf: "center",
          }}
          onMouseDown={(e) => { e.preventDefault(); startSlepen(e.clientX, e.clientY); }}
          onMouseMove={(e) => bijSlepen(e.clientX, e.clientY)}
          onMouseUp={() => { sleepRef.current = null; }}
          onMouseLeave={() => { sleepRef.current = null; }}
          onTouchStart={(e) => { e.preventDefault(); startSlepen(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchMove={(e) => { e.preventDefault(); bijSlepen(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchEnd={() => { sleepRef.current = null; }}
        >
          {/* Achtergrond waar de foto het vierkant niet vult (zo wordt hij ook opgeslagen) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cropSrc} alt="" aria-hidden draggable={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(8px) brightness(0.65)", transform: "scale(1.1)", pointerEvents: "none" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cropSrc}
            alt=""
            onLoad={onImgLaden}
            draggable={false}
            style={{
              position: "absolute",
              width: imgGrootte.w * totalScale,
              height: imgGrootte.h * totalScale,
              left: offset.x, top: offset.y,
              pointerEvents: "none", userSelect: "none",
            }}
          />
          {/* Derde-regel rasteroverlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: `${CROP_W / 3}px ${CROP_H / 3}px`,
          }} />
        </div>

        {/* Zoomschuif: links de hele foto, rechts ingezoomd */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text)", whiteSpace: "nowrap" }}>Hele foto</span>
          <input
            type="range" min={1} max={maxZoom} step={0.01}
            value={zoom}
            onChange={(e) => onZoomWijzig(parseFloat(e.target.value))}
            style={{ flex: 1 }} aria-label="Zoom"
          />
          <span style={{ fontSize: "0.74rem", color: "var(--text)" }}>🔍</span>
        </div>
        {vul > 1.01 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button type="button" className={`rl-knop${zoom <= 1.001 ? " rl-knop--cyan" : ""}`} onClick={() => onZoomWijzig(1)}>🖼️ Hele foto</button>
            <button type="button" className={`rl-knop${Math.abs(zoom - vul) < 0.01 ? " rl-knop--cyan" : ""}`} onClick={() => onZoomWijzig(vul)}>⬛ Vierkant vullen</button>
          </div>
        )}

        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)", textAlign: "center" }}>
          {vul > 1.01 ? "Je ziet eerst de hele foto. Zoom in en sleep om te kiezen wat er in beeld komt." : "Sleep om te verschuiven · schuif om in te zoomen"}
        </p>

        {fout && (
          <div style={{ fontSize: "0.8rem", color: "#ef4444" }}>⚠️ {fout}</div>
        )}

        <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800, justifyContent: "center", display: "inline-flex", alignItems: "center" }}
          onClick={toepassen} disabled={laden}>
          {laden ? "⏳ Uploaden…" : "✓ Gebruiken"}
        </button>
      </div>
      </div>
    </div>
  ) : null;

  const cropModal = (typeof document !== "undefined" && cropModalInhoud)
    ? createPortal(cropModalInhoud, document.body)
    : null;

  if (compact) {
    return (
      <>
        {cropModal}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {huidigPad ? (
            <>
              <img
                src={afbeeldingUrl(bucket, huidigPad)}
                alt=""
                style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
              />
              <button type="button" className="rl-knop rl-knop--rood" style={{ height: 32, display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={onVerwijder} title="Afbeelding weghalen">
                🗑️ Weghalen
              </button>
            </>
          ) : (
            <>
              <button type="button" className="rl-knop" style={{ height: 32, display: "inline-flex", alignItems: "center", gap: 6 }}
                disabled={laden} onClick={() => inputRef.current?.click()}>
                {laden ? "⏳ Uploaden…" : "🖼️ Afbeelding kiezen"}
              </button>
              {fout && <span style={{ fontSize: "0.72rem", color: "var(--red)" }}>{fout}</span>}
            </>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }} onChange={bestandGekozen} />
        </div>
      </>
    );
  }

  return (
    <>
      {cropModal}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {huidigPad ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={afbeeldingUrl(bucket, huidigPad)}
              alt=""
              style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, display: "block", border: "1px solid var(--line)" }}
            />
            <button type="button" className="btn btn-danger"
              style={{ position: "absolute", top: 8, right: 8, fontSize: "0.75rem", padding: "3px 10px" }}
              onClick={onVerwijder}>
              Verwijder
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => !laden && inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && !laden && inputRef.current?.click()}
            style={{
              border: "2px dashed var(--line)", borderRadius: 8, padding: "24px 16px",
              textAlign: "center", cursor: laden ? "default" : "pointer",
              color: "var(--muted)", fontSize: "0.85rem",
              background: laden ? "var(--bg)" : "transparent",
            }}>
            {laden ? "Uploaden…" : "Klik om een afbeelding te kiezen (jpg, png of webp, max 10 MB)"}
          </div>
        )}
        {fout && <div className="melding melding-fout" style={{ fontSize: "0.8rem" }}><span>⚠️</span> {fout}</div>}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }} onChange={bestandGekozen} />
      </div>
    </>
  );
}
