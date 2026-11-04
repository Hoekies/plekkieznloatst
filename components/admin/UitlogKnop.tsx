"use client";

import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";

// Uitloggen (eerst bevestigen): compact = knop met tekst rechtsboven (groot scherm), anders alleen het icoon (bovenbalk telefoon)
export default function UitlogKnop({ compact = false }: { compact?: boolean }) {
  // Geeft false als het niet lukte: dan blijft het venster open, met een melding, en kun je het opnieuw proberen
  async function uitloggen() {
    const res = await fetch("/api/auth/uitloggen", { method: "POST", headers: { Accept: "application/json" } }).catch(() => null);
    if (!res?.ok) {
      const d = res ? await res.json().catch(() => ({})) : {};
      toonMelding(d.fout ?? "Uitloggen lukte niet: controleer je internet en probeer het opnieuw", "fout");
      return false;
    }
    // Telefoon: de app meteen sluiten. Lukt dat niet (iPhone staat dat niet toe), dan naar het inlogscherm.
    if (!compact) {
      window.close();
      await new Promise((r) => setTimeout(r, 300));
    }
    // Volledig laden: er blijft niets van het beheer in het geheugen staan
    window.location.replace("/login");
  }

  const venster = { venster: true, gevaarlijk: false, icoon: "🚪", titel: "Uitloggen?", vraag: "", uitleg: "Alleen op dit toestel. Het spel loopt gewoon door.", onBevestig: uitloggen };
  if (compact) {
    return (
      <BevestigKnop {...venster} className="btn btn-outline header-knop" title="Uitloggen">
        <span className="header-knop-icoon" aria-hidden><UitlogIcoon /></span> Uitloggen
      </BevestigKnop>
    );
  }
  return (
    <BevestigKnop {...venster} className="btn btn-outline header-knop info-knop" tip="Uitloggen" tipOnder>
      <UitlogIcoon />
    </BevestigKnop>
  );
}

// Deur met een pijl naar buiten: het bekende uitlog-icoon
function UitlogIcoon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
