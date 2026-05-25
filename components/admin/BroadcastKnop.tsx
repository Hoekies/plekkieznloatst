"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function BroadcastKnop() {
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
      <button
        className="admin-nav-link"
        style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
        onClick={() => setOpen(true)}
      >
        📢 Bericht sturen
      </button>

      {open && createPortal(
        <div className="broadcast-overlay" onClick={() => setOpen(false)}>
          <div className="broadcast-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>📢 Bericht versturen</span>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 12 }}>
              Verschijnt als melding op het scherm van alle actieve spelers.
            </p>
            <textarea
              className="form-textarea"
              placeholder="Bijv. Over 5 minuten pauze bij de vijver!"
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
              maxLength={150}
              disabled={fase !== "idle"}
              style={{ width: "100%", fontSize: "0.875rem", marginBottom: 12, minHeight: 80 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setOpen(false)} disabled={fase === "bezig"}>
                Annuleer
              </button>
              <button
                className="btn btn-primary"
                disabled={!tekst.trim() || fase !== "idle"}
                onClick={verstuur}
              >
                {fase === "bezig" ? "Versturen…" : fase === "verzonden" ? "✓ Verzonden!" : "Verstuur"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
