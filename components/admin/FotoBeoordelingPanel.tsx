"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type Inzending = {
  id: string;
  foto_pad: string;
  teamnaam: string;
  punt_naam: string;
  max_punten: number;
  session_id: string;
  created_at: string;
};

function fotoUrl(pad: string) {
  // Storage bucket is niet publiek; gebruik signed URL via admin API
  return `${SUPABASE_URL}/storage/v1/object/sign/foto-inzendingen/${pad}`;
}

interface Props {
  initAantal?: number;
}

export default function FotoBeoordelingPanel({ initAantal = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [inzendingen, setInzendingen] = useState<Inzending[]>([]);
  const [laden, setLaden] = useState(false);
  const [aantal, setAantal] = useState(initAantal);
  const [bezig, setBezig] = useState<string | null>(null);
  const [puntenMap, setPuntenMap] = useState<Record<string, number>>({});

  async function haalOp() {
    setLaden(true);
    try {
      const res = await fetch("/api/admin/foto");
      if (res.ok) {
        const data = await res.json();
        setInzendingen(data.inzendingen ?? []);
        setAantal(data.inzendingen?.length ?? 0);
      }
    } catch { /* verbindingsfout */ } finally {
      setLaden(false);
    }
  }

  useEffect(() => {
    // Geopend vanuit de pushmelding "Nieuwe foto": meteen het keurvenster tonen
    if (new URLSearchParams(window.location.search).get("keuren") === "1") {
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Poll elke 15s voor nieuwe foto's
    haalOp();
    const t = setInterval(haalOp, 15000);
    return () => clearInterval(t);
  }, []);

  async function beoordeel(id: string, status: "goedgekeurd" | "afgekeurd") {
    setBezig(id);
    try {
      await fetch(`/api/admin/foto/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, punten: puntenMap[id] ?? inzendingen.find((i) => i.id === id)?.max_punten ?? 0 }),
      });
      setInzendingen((prev) => prev.filter((i) => i.id !== id));
      setAantal((n) => Math.max(0, n - 1));
    } catch { /* verbindingsfout */ } finally {
      setBezig(null);
    }
  }

  return (
    <>
      {/* Badge knop */}
      <button
        className="btn btn-outline header-knop"
        style={{ position: "relative" }}
        onClick={() => { setOpen(true); haalOp(); }}>
        <span className="header-knop-icoon" aria-hidden>📷</span> Foto&apos;s<span className="alleen-pc"> beoordelen</span>
        {aantal > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -6,
            background: "#EF4444", color: "#fff",
            borderRadius: "50%", width: 20, height: 20,
            fontSize: "0.65rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{aantal}</span>
        )}
      </button>

      {/* Keurvenster: één foto tegelijk, groot in beeld; na een keuze komt vanzelf de volgende */}
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 560, maxHeight: "96vh" }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(96vh - 6px)", overflowY: "auto", padding: "16px 16px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="pr-gem-label">📸 Foto&apos;s keuren{inzendingen.length > 0 ? ` · nog ${inzendingen.length}` : ""}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>
                    {inzendingen[0] ? inzendingen[0].teamnaam : "Alles gekeurd"}
                  </div>
                </div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
              </div>

              {laden && inzendingen.length === 0 ? (
                <p style={{ color: "var(--muted)", textAlign: "center", margin: 0 }}>Laden…</p>
              ) : inzendingen.length === 0 ? (
                <p style={{ color: "var(--text)", textAlign: "center", margin: "12px 0" }}>Geen foto&apos;s die op keuring wachten. 🎉</p>
              ) : (() => {
                const inz = inzendingen[0];
                const punten = puntenMap[inz.id] ?? inz.max_punten;
                return (
                  <>
                    <div style={{ fontSize: "0.84rem", color: "var(--text)" }}>
                      📍 {inz.punt_naam} · {new Date(inz.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <FotoViewer key={inz.id} pad={inz.foto_pad} />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                      <span style={{ fontSize: "0.86rem", color: "var(--text)" }}>Punten</span>
                      <input type="number" min={0} max={inz.max_punten} className="form-input" style={{ width: 90, textAlign: "center", fontWeight: 800 }}
                        value={punten} onChange={(e) => setPuntenMap((m) => ({ ...m, [inz.id]: Number(e.target.value) }))} />
                      <span style={{ fontSize: "0.86rem", color: "var(--muted)" }}>/ {inz.max_punten}</span>
                    </div>
                    <div className="keur-knoppen">
                      <button type="button" className="rl-knop rl-knop--rood" disabled={bezig === inz.id} onClick={() => beoordeel(inz.id, "afgekeurd")}>✗ Afkeuren</button>
                      <button type="button" className="rl-knop rl-knop--groen" disabled={bezig === inz.id} onClick={() => beoordeel(inz.id, "goedgekeurd")}>
                        {bezig === inz.id ? "Opslaan…" : `✓ Goed (+${punten})`}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Laadt de foto via een signed URL
function FotoViewer({ pad }: { pad: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/foto/sign?pad=${encodeURIComponent(pad)}`)
      .then((r) => r.json())
      .then((d) => setSrc(d.url))
      .catch(() => { /* geen preview */ });
  }, [pad]);

  return (
    <div style={{ background: "#f3f4f6", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Ingediende foto" style={{ width: "100%", maxHeight: "55vh", objectFit: "contain", display: "block" }} />
      ) : (
        <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>📷 Foto laden…</span>
      )}
    </div>
  );
}
