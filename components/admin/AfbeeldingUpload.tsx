"use client";

import { useRef, useState } from "react";
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
const CROP_H = 270;

function afbeeldingUrl(bucket: string, pad: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${pad}`;
}

function klemOffset(
  offset: { x: number; y: number },
  imgW: number,
  imgH: number,
  zoom: number,
) {
  const baseScale = Math.max(CROP_W / imgW, CROP_H / imgH);
  const totalScale = baseScale * zoom;
  const scaledW = imgW * totalScale;
  const scaledH = imgH * totalScale;
  return {
    x: Math.min(0, Math.max(CROP_W - scaledW, offset.x)),
    y: Math.min(0, Math.max(CROP_H - scaledH, offset.y)),
  };
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
    return Math.max(CROP_W / w, CROP_H / h);
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
      const canvas = document.createElement("canvas");
      canvas.width = CROP_W;
      canvas.height = CROP_H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        -offset.x / totalScale, -offset.y / totalScale,
        CROP_W / totalScale, CROP_H / totalScale,
        0, 0, CROP_W, CROP_H,
      );
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

  const cropModal = cropBestand ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 24,
        display: "flex", flexDirection: "column", gap: 16,
        maxWidth: 420, width: "100%", maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
      }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
          Afbeelding bijsnijden
        </div>

        {/* Crop viewport */}
        <div
          style={{
            width: CROP_W, height: CROP_H, overflow: "hidden",
            borderRadius: 10, border: "2px solid #e2e8f0",
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

        {/* Zoomschuif */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.78rem", color: "#64748b", minWidth: 20 }}>1×</span>
          <input
            type="range" min={1} max={3} step={0.05}
            value={zoom}
            onChange={(e) => onZoomWijzig(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: "0.78rem", color: "#64748b", minWidth: 20 }}>3×</span>
        </div>

        <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
          Sleep om te verschuiven · schuif om in/uit te zoomen
        </p>

        {fout && (
          <div style={{ fontSize: "0.8rem", color: "#ef4444" }}>⚠️ {fout}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }}
            onClick={annuleren} disabled={laden}>
            Annuleren
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 2 }}
            onClick={toepassen} disabled={laden}>
            {laden ? "Uploaden…" : "Toepassen & uploaden"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

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
              <button type="button" className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                onClick={onVerwijder}>
                Verwijder
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "3px 10px" }}
                disabled={laden} onClick={() => inputRef.current?.click()}>
                {laden ? "Uploaden…" : "Afbeelding kiezen"}
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
