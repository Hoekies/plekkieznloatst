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

function afbeeldingUrl(bucket: string, pad: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${pad}`;
}

export default function AfbeeldingUpload({ huidigPad, bucket, onUpload, onVerwijder, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function bestandGekozen(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";
    if (!bestand) return;

    const validatieFout = valideerAfbeelding(bestand);
    if (validatieFout) { setFout(validatieFout); return; }

    setFout(null);
    setLaden(true);
    try {
      const pad = await uploadAfbeelding(bestand, bucket);
      onUpload(pad);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Upload mislukt");
    } finally {
      setLaden(false);
    }
  }

  if (compact) {
    return (
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
    );
  }

  return (
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
  );
}
