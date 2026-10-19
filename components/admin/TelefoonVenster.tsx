"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import { toonTelefoon, waLink } from "@/lib/telefoon";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// 📞 Telefoonnummer van een team: opslaan, bellen of meteen een WhatsApp-chat openen.
// Met een nummer opent WhatsApp bij het versturen van inloggegevens direct de juiste chat.
export default function TelefoonVenster({ spelerId, naam, icoon, telefoon, onSluit, onOpgeslagen }: {
  spelerId: string; naam: string; icoon: string | null; telefoon: string | null;
  onSluit: () => void; onOpgeslagen: (telefoon: string | null) => void;
}) {
  const [waarde, setWaarde] = useState(telefoon ? toonTelefoon(telefoon) : "");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  useEffect(() => {
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit]);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true); setFout("");
    const res = await fetch(`/api/admin/groepen/${spelerId}/telefoon`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefoon: waarde }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) { setFout(uitlegBijStatus(res.status, "Opslaan", data.fout)); return; }
    onOpgeslagen(data.telefoon ?? null);
    toonMelding(data.telefoon ? "Telefoonnummer opgeslagen" : "Telefoonnummer weggehaald", "ok");
    onSluit();
  }

  return createPortal(
    <div onClick={onSluit} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 400 }}>
        <form onSubmit={opslaan} className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pr-gem-avatar" style={{ width: 44, height: 44, fontSize: "1.6rem" }}>{icoon ?? "👤"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pr-gem-label">📞 Telefoonnummer</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{naam}</div>
            </div>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten">✕</button>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            Met een nummer opent WhatsApp meteen de juiste chat, en kun je het team bellen vanaf het dashboard.
          </div>
          <input className="form-input" type="tel" inputMode="tel" value={waarde} onChange={(e) => setWaarde(e.target.value)}
            placeholder="06 12 34 56 78" autoFocus style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.03em" }} />
          {fout && <div className="melding melding-fout" style={{ margin: 0 }}><span>⚠️</span> {fout}</div>}
          <button type="submit" className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800 }} disabled={bezig}>
            {bezig ? "Bezig…" : waarde.trim() ? "Opslaan" : "Nummer weghalen"}
          </button>
          {telefoon && (
            <div className="melding-knoppen">
              <a className="rl-knop" href={`tel:${telefoon}`} style={{ height: 40, textDecoration: "none" }}>📞 Bellen</a>
              <a className="wa-knop" href={waLink("", telefoon)} target="_blank" rel="noopener noreferrer"><WhatsAppLogo /> WhatsApp</a>
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}
