"use client";

import { useState } from "react";
import BroadcastKnop from "@/components/admin/BroadcastKnop";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import { waLink, toonTelefoon } from "@/lib/telefoon";
import Venster from "@/components/shared/Venster";

// 💬 Contact met één team: bericht in de app, bellen of WhatsApp, samen achter één knop.
// Bellen en WhatsApp alleen als bij Spelers een telefoonnummer is ingevuld.
export default function ContactKnop({ team }: { team: { id: string; naam: string; telefoon?: string | null } }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="rl-knop" onClick={() => setOpen(true)} title={`Contact met ${team.naam}`}>
        <span className="knop-icoon" aria-hidden>💬</span> Contact
      </button>
      {open && (
        <Venster onSluit={() => setOpen(false)} breedte={340} rand={20} relatief>
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
        </Venster>
      )}
    </>
  );
}
