"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KAARTJES_KEY, type Inlog } from "@/components/admin/InlogUitdelen";
import KaartjeVersturen from "@/components/admin/InlogKaartje";

// Inlogkaartjes: afdrukken en uitknippen (8 per A4), of per kaartje via WhatsApp (met de link erbij).
// De gegevens staan daarna alleen in dit tabblad (sessionStorage), zodat ze bij sluiten weer weg zijn.
function leesInlogs(): Inlog[] {
  try {
    const nieuw = localStorage.getItem(KAARTJES_KEY);
    if (nieuw) {
      localStorage.removeItem(KAARTJES_KEY);
      sessionStorage.setItem(KAARTJES_KEY, nieuw);
      return JSON.parse(nieuw);
    }
    return JSON.parse(sessionStorage.getItem(KAARTJES_KEY) ?? "[]");
  } catch { return []; }
}

export default function KaartjesPagina() {
  const [inlogs, setInlogs] = useState<Inlog[] | null>(null);
  useEffect(() => { setInlogs(leesInlogs()); }, []);

  if (inlogs === null) return null;
  return (
    <>
      <style>{`
        .kaartjes { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 18px; max-width: 760px; margin: 0 auto; }
        @media print {
          @page { size: A4; margin: 10mm; }
          .admin-sidebar, .admin-mobile-topbar, .admin-uitlog-hoek, .admin-topbar, .kaartje-acties { display: none !important; }
          html, body, .admin-shell, .admin-main { background: #fff !important; height: auto !important; overflow: visible !important; }
          .admin-content { padding: 0 !important; }
          .kaartjes { max-width: none; grid-template-columns: repeat(2, 1fr); gap: 5mm; }
          .kaartje { -webkit-print-color-adjust: exact; print-color-adjust: exact; height: 64mm; box-sizing: border-box; justify-content: center; }
        }
      `}</style>
      <div className="admin-topbar" style={{ gap: 12 }}>
        <Link href="/admin/groepen" className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "6px 12px", flexShrink: 0 }}>← Terug</Link>
        <span className="admin-topbar-titel">Inlogkaartjes</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="rl-knop rl-knop--cyan" onClick={() => window.print()} disabled={!inlogs.length}>🖨️ Afdrukken</button>
      </div>
      <div className="admin-content">
        {!inlogs.length ? (
          <p style={{ textAlign: "center", color: "var(--muted)" }}>Geen inloggegevens. Maak ze bij Spelers via 👥 Meerdere en kies daar 🖨️ Afdrukken.</p>
        ) : (
          <div className="kaartjes">
            {inlogs.map((i) => <KaartjeVersturen key={i.login} inlog={i} />)}
          </div>
        )}
      </div>
    </>
  );
}
