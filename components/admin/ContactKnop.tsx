"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BroadcastKnop from "@/components/admin/BroadcastKnop";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import { waLink, toonTelefoon } from "@/lib/telefoon";

// 💬 Contact met één team: bericht in de app, bellen of WhatsApp, samen achter één knop.
// Bellen en WhatsApp alleen als bij Spelers een telefoonnummer is ingevuld.
export default function ContactKnop({ team }: { team: { id: string; naam: string; telefoon?: string | null } }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [open]);

  return (
    <>
      <button type="button" className="rl-knop" onClick={() => setOpen(true)} title={`Contact met ${team.naam}`}>
        <span className="knop-icoon" aria-hidden>💬</span> Contact
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 340, position: "relative" }}>
            <button type="button" className="editor-paneel-sluit venster-sluit" onClick={() => setOpen(false)} title="Sluiten" aria-label="Sluiten">✕</button>
            <div className="pr-gem-panel-inner contact-venster">
              <div style={{ fontSize: "2rem", lineHeight: 1, textAlign: "center" }}>💬</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "#fff", textAlign: "center" }}>Contact met {team.naam}</div>
              <BroadcastKnop team={{ id: team.id, naam: team.naam }} groot />
              {team.telefoon ? (
                <>
                  <a className="rl-knop" href={`tel:${team.telefoon}`}>📞 Bellen <span style={{ color: "var(--muted)", fontWeight: 600 }}>{toonTelefoon(team.telefoon)}</span></a>
                  <a className="wa-knop" href={waLink("", team.telefoon)} target="_blank" rel="noopener noreferrer"><WhatsAppLogo /> WhatsApp</a>
                </>
              ) : (
                <div style={{ fontSize: "0.76rem", color: "var(--muted)", textAlign: "center" }}>
                  Bellen en WhatsApp kan zodra er een telefoonnummer is: voeg het toe bij Spelers (📞).
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
