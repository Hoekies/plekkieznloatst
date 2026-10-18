"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";

// "± Punten": bonus of aftrek voor één team, met een reden (komt in de tijdlijn en het rapport)
export default function PuntenAanpassen({ sessieId, naam, onKlaar }: { sessieId: string; naam: string; onKlaar: () => void }) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState(10);
  const [reden, setReden] = useState("");
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    if (!open) return;
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [open]);

  async function toepassen(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const res = await fetch(`/api/admin/sessies/${sessieId}/punten`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta, reden }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) { toonMelding(data.fout ?? "Aanpassen mislukt", "fout"); return; }
    toonMelding(`${naam}: ${data.delta > 0 ? "+" : ""}${data.delta} punten`, "ok");
    setOpen(false); setReden(""); setDelta(10);
    onKlaar();
  }

  return (
    <>
      <button type="button" className="rl-knop" onClick={() => setOpen(true)} title="Bonus of aftrek, met een reden">± Punten</button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 400 }}>
            <form onSubmit={toepassen} className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="pr-gem-label">± Punten aanpassen</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>{naam}</div>
                </div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
              </div>
              {/* Snelkeuze, of zelf een getal (negatief = aftrek) */}
              <div className="punten-snel">
                {[-20, -10, 10, 20, 50].map((n) => (
                  <button key={n} type="button" className={`rl-knop${delta === n ? (n > 0 ? " rl-knop--groen" : " rl-knop--rood") : ""}`} onClick={() => setDelta(n)}>
                    {n > 0 ? `+${n}` : n}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="form-group" style={{ margin: 0, width: 100 }}>
                  <label className="form-label">Punten</label>
                  <input className="form-input" type="number" value={delta} onChange={(e) => setDelta(Math.round(Number(e.target.value)))} style={{ textAlign: "center", fontWeight: 800 }} />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label className="form-label">Reden</label>
                  <input className="form-input" value={reden} onChange={(e) => setReden(e.target.value)} maxLength={120} placeholder="bijv. mooiste foto" />
                </div>
              </div>
              <button type="submit" className={`rl-knop ${delta < 0 ? "rl-knop--rood" : "rl-knop--groen"}`} style={{ height: 44, fontWeight: 800 }} disabled={bezig || !delta}>
                {bezig ? "Bezig…" : delta < 0 ? `${delta} punten aftrekken` : `+${delta} punten geven`}
              </button>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
