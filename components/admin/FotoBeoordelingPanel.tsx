"use client";

import { useEffect, useState } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type Inzending = {
  id: string;
  foto_pad: string;
  group_name: string;
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
        body: JSON.stringify({ status, punten: puntenMap[id] ?? 0 }),
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
        className="btn btn-outline"
        style={{ fontSize: "0.82rem", position: "relative" }}
        onClick={() => { setOpen(true); haalOp(); }}>
        📷 Foto&apos;s beoordelen
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

      {/* Modal */}
      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "40px 16px", overflowY: "auto",
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{
            background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560,
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--line)",
            }}>
              <h2 style={{ margin: 0, fontSize: "1rem" }}>📷 Foto-inzendingen beoordelen</h2>
              <button className="btn btn-ghost" style={{ fontSize: "0.82rem" }} onClick={() => setOpen(false)}>✕ Sluiten</button>
            </div>

            {/* Inhoud */}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {laden && inzendingen.length === 0 ? (
                <p style={{ color: "var(--muted)", textAlign: "center" }}>Laden…</p>
              ) : inzendingen.length === 0 ? (
                <p style={{ color: "var(--muted)", textAlign: "center" }}>Geen foto&apos;s wachten op beoordeling. 🎉</p>
              ) : (
                inzendingen.map((inz) => (
                  <div key={inz.id} style={{
                    border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden",
                  }}>
                    {/* Foto */}
                    <FotoViewer pad={inz.foto_pad} />

                    {/* Info + knoppen */}
                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{inz.group_name}</span>
                          <span style={{ color: "var(--muted)", fontSize: "0.78rem", marginLeft: 8 }}>@ {inz.punt_naam}</span>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                          {new Date(inz.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--muted)", flexShrink: 0 }}>Punten:</label>
                        <input
                          type="number" min={0} max={inz.max_punten}
                          className="form-input"
                          style={{ width: 80, fontSize: "0.85rem" }}
                          value={puntenMap[inz.id] ?? inz.max_punten}
                          onChange={(e) => setPuntenMap((m) => ({ ...m, [inz.id]: Number(e.target.value) }))}
                        />
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>/ {inz.max_punten}</span>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          className="btn btn-danger"
                          style={{ flex: 1, fontSize: "0.82rem" }}
                          disabled={bezig === inz.id}
                          onClick={() => beoordeel(inz.id, "afgekeurd")}>
                          ❌ Afkeuren
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ flex: 2, fontSize: "0.82rem" }}
                          disabled={bezig === inz.id}
                          onClick={() => beoordeel(inz.id, "goedgekeurd")}>
                          {bezig === inz.id ? "Opslaan…" : "✅ Goedkeuren"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
        <img src={src} alt="Ingediende foto" style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />
      ) : (
        <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>📷 Foto laden…</span>
      )}
    </div>
  );
}
