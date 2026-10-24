"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import { toonTelefoon, waLink } from "@/lib/telefoon";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import Venster, { VensterKop } from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";

// 📞 Telefoonnummer van een team: opslaan, bellen of meteen een WhatsApp-chat openen.
// Met een nummer opent WhatsApp bij het versturen van inloggegevens direct de juiste chat.
export default function TelefoonVenster({ spelerId, naam, icoon, telefoon, onSluit, onOpgeslagen }: {
  spelerId: string; naam: string; icoon: string | null; telefoon: string | null;
  onSluit: () => void; onOpgeslagen: (telefoon: string | null) => void;
}) {
  const [waarde, setWaarde] = useState(telefoon ? toonTelefoon(telefoon) : "");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");


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

  return (
    <Venster onSluit={onSluit} breedte={400}>
        <form onSubmit={opslaan} className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
          <VensterKop icoon={icoon ?? "👤"} label="📞 Telefoonnummer" titel={naam} onSluit={onSluit} />
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            Met een nummer opent WhatsApp meteen de juiste chat, en kun je het team bellen vanaf het dashboard.
          </div>
          <input className="form-input" type="tel" inputMode="tel" value={waarde} onChange={(e) => setWaarde(e.target.value)}
            placeholder="06 12 34 56 78" autoFocus style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.03em" }} />
          {fout && <div className="melding melding-fout" style={{ margin: 0 }}><span>⚠️</span> {fout}</div>}
          <button type="submit" className="rl-knop hoofdknop" style={{ height: 44 }} disabled={bezig}>
            {bezig ? "Bezig…" : waarde.trim() ? "Opslaan" : "Nummer weghalen"}
          </button>
          {telefoon && (
            <div className="melding-knoppen">
              <a className="rl-knop" href={`tel:${telefoon}`} style={{ height: 40, textDecoration: "none" }}><Icoon naam="bellen" /> Bellen</a>
              <a className="wa-knop" href={waLink("", telefoon)} target="_blank" rel="noopener noreferrer"><WhatsAppLogo /> WhatsApp</a>
            </div>
          )}
        </form>
    </Venster>
  );
}
