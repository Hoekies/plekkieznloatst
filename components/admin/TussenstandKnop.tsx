"use client";

import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";

// 🏆 de tussenstand nu bij alle spelers in beeld laten verschijnen (na bevestiging).
// Standaard als icoon in de bovenbalk; alsMenu = als regel in het (telefoon)menu
export default function TussenstandKnop({ alsMenu = false }: { alsMenu?: boolean }) {
  async function toon() {
    const res = await fetch("/api/admin/tussenstand/tonen", { method: "POST" }).catch(() => null);
    toonMelding(res?.ok ? "De tussenstand verschijnt nu bij alle spelers" : "Tussenstand tonen mislukt", res?.ok ? "ok" : "fout");
  }
  const venster = { venster: true, gevaarlijk: false, icoon: "🏆", titel: "Tussenstand tonen?", vraag: "", ja: "Ja, toon de stand", onBevestig: toon };
  if (alsMenu) {
    return (
      <BevestigKnop {...venster} className="admin-nav-link">
        <span aria-hidden>🏆</span> Tussenstand tonen
      </BevestigKnop>
    );
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
