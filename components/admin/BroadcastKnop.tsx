"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

// alsIcoon = 📢-knop in de bovenbalk; anders als regel in het menu
export default function BroadcastKnop({ alsIcoon = false }: { alsIcoon?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tekst, setTekst] = useState("");
  const [fase, setFase] = useState<"idle" | "bezig" | "verzonden">("idle");

  async function verstuur() {
    if (!tekst.trim()) return;
    setFase("bezig");
    try {
      await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bericht: tekst }),
      });
      setTekst("");
      setFase("verzonden");
      setTimeout(() => { setFase("idle"); setOpen(false); }, 2000);
    } catch {
      setFase("idle");
    }
  }

  return (
    <>
      {alsIcoon ? (
        <button className="btn btn-outline header-knop info-knop" onClick={() => setOpen(true)}
          data-tip="Bericht sturen aan alle spelers" data-tip-pos="onder" aria-label="Bericht sturen">
          <span className="header-knop-icoon" aria-hidden>📢</span>
        </button>
      ) : (
        <button className="admin-nav-link" onClick={() => setOpen(true)}>
          <span aria-hidden>📢</span> Bericht sturen
        </button>
      )}

      {open && createPortal(
        // Zelfde venster-stijl als de andere vensters (WhatsApp, bevestigen)
        <div onClick={() => fase !== "bezig" && setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 460 }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="pr-gem-label">Aan alle spelers</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>📢 Bericht sturen</div>
                </div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} title="Sluiten">✕</button>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Het bericht verschijnt meteen bij alle spelers in beeld.</div>
              <textarea
                className="form-textarea"
                spellCheck
                lang="nl"
                placeholder="Bijv. Over 5 minuten pauze bij de vijver!"
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                maxLength={150}
                disabled={fase !== "idle"}
                rows={3}
                style={{ width: "100%", minHeight: 90 }}
                autoFocus
              />
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "right", marginTop: -6 }}>{tekst.length}/150</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, padding: "0 20px", fontWeight: 800 }}
                  disabled={!tekst.trim() || fase !== "idle"} onClick={verstuur}>
                  {fase === "bezig" ? "Versturen…" : fase === "verzonden" ? "✓ Verzonden!" : "Versturen"}
                </button>
                <button type="button" className="rl-knop" style={{ height: 44, padding: "0 18px" }} onClick={() => setOpen(false)} disabled={fase === "bezig"}>
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
