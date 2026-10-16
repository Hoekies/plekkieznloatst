"use client";

import { useRouter } from "next/navigation";

// Uitloggen: compact = knop met tekst rechtsboven (groot scherm), anders alleen het icoon (bovenbalk telefoon)
export default function UitlogKnop({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/auth/uitloggen", { method: "POST" });
    router.replace("/login");
  }

  if (compact) {
    return (
      <button onClick={uitloggen} className="btn btn-outline header-knop" title="Uitloggen">
        <span className="header-knop-icoon" aria-hidden><UitlogIcoon /></span> Uitloggen
      </button>
    );
  }
  return (
    <button onClick={uitloggen} className="btn btn-outline header-knop info-knop" title="Uitloggen" aria-label="Uitloggen">
      <UitlogIcoon />
    </button>
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
