"use client";

import { useRouter } from "next/navigation";
import BevestigKnop from "@/components/admin/BevestigKnop";

// Uitloggen (eerst bevestigen): compact = knop met tekst rechtsboven (groot scherm), anders alleen het icoon (bovenbalk telefoon)
export default function UitlogKnop({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/auth/uitloggen", { method: "POST" });
    // Telefoon: de app meteen sluiten. Lukt dat niet (iPhone staat dat niet toe), dan naar het inlogscherm.
    if (!compact) {
      window.close();
      await new Promise((r) => setTimeout(r, 300));
    }
    router.replace("/login");
  }

  const venster = { venster: true, icoon: "🚪", titel: "Uitloggen?", vraag: "Je gaat terug naar het inlogscherm. Het spel loopt gewoon door.", ja: "Ja, uitloggen", onBevestig: uitloggen };
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
