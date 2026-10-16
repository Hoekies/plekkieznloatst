"use client";

import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";

// 🏆 in de bovenbalk: de tussenstand nu bij alle spelers in beeld laten verschijnen (na bevestiging)
export default function TussenstandKnop() {
  async function toon() {
    const res = await fetch("/api/admin/tussenstand/tonen", { method: "POST" }).catch(() => null);
    toonMelding(res?.ok ? "De tussenstand verschijnt nu bij alle spelers" : "Tussenstand tonen mislukt", res?.ok ? "ok" : "fout");
  }
  return (
    <BevestigKnop venster gevaarlijk={false} icoon="🏆" titel="Tussenstand tonen?"
      vraag="Alle spelers krijgen de tussenstand een paar seconden in beeld, midden in hun spel."
      ja="Ja, toon de stand" onBevestig={toon}
      className="btn btn-outline header-knop info-knop" tip="Tussenstand tonen aan alle spelers" tipOnder>
      <span className="header-knop-icoon" aria-hidden>🏆</span>
    </BevestigKnop>
  );
}
