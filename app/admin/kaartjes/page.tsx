"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { KAARTJES_KEY, type Inlog } from "@/components/admin/InlogUitdelen";

// Inlogkaartjes om af te drukken en uit te knippen (8 per A4). De gegevens komen uit het venster
// "Inloggegevens uitdelen" en worden na het inlezen meteen uit de browser gewist.
const SITE = "https://plekkieznloatst.vercel.app";

export default function KaartjesPagina() {
  const [inlogs, setInlogs] = useState<Inlog[] | null>(null);

  useEffect(() => {
    try {
      const ruw = localStorage.getItem(KAARTJES_KEY);
      localStorage.removeItem(KAARTJES_KEY);
      setInlogs(ruw ? JSON.parse(ruw) : []);
    } catch { setInlogs([]); }
  }, []);

  if (inlogs === null) return null;
  return (
    <div className="kaartjes-wrap">
      <style>{`
        .kaartjes-wrap { padding: 20px; }
        .kaartjes-knoppen { display: flex; gap: 10px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
        .kaartjes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-width: 760px; margin: 0 auto; }
        .kaartje { border: 2px dashed rgba(255,255,255,0.35); border-radius: 12px; padding: 12px 14px; display: flex; gap: 12px; align-items: center;
          background: linear-gradient(160deg, #3a1a73, #1c0c45); color: #fff; break-inside: avoid; page-break-inside: avoid; }
        .kaartje-qr { background: #fff; padding: 4px; border-radius: 6px; line-height: 0; flex-shrink: 0; }
        .kaartje small { display: block; font-size: 10px; color: #C9B6FF; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
        .kaartje b { display: block; font-family: var(--font-display); font-size: 17px; margin-bottom: 4px; }
        @media print {
          @page { size: A4; margin: 10mm; }
          .admin-sidebar, .admin-mobile-topbar, .admin-uitlog-hoek, .kaartjes-knoppen { display: none !important; }
          html, body, .admin-shell, .admin-main { background: #fff !important; height: auto !important; overflow: visible !important; }
          .kaartjes-wrap { padding: 0; }
          .kaartjes { max-width: none; gap: 6mm; }
          .kaartje { -webkit-print-color-adjust: exact; print-color-adjust: exact; height: 58mm; }
        }
      `}</style>
      <div className="kaartjes-knoppen">
        <button type="button" className="rl-knop rl-knop--cyan actie-knop" onClick={() => window.print()} disabled={!inlogs.length}>🖨️ Afdrukken</button>
      </div>
      {!inlogs.length ? (
        <p style={{ textAlign: "center", color: "var(--muted)" }}>Geen inloggegevens. Open de kaartjes via Spelers → 🔑 Inloggegevens uitdelen.</p>
      ) : (
        <div className="kaartjes">
          {inlogs.map((i) => (
            <div key={i.login} className="kaartje">
              <div className="kaartje-qr"><QRCodeSVG value={SITE} size={84} /></div>
              <div style={{ minWidth: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-breed-strak.webp" alt="PointRush" style={{ height: 30, width: "auto", display: "block", marginBottom: 6 }} />
                <small>Loginnaam</small><b>{i.login}</b>
                <small>Wachtwoord</small><b>{i.wachtwoord}</b>
                <div style={{ fontSize: 10, color: "#D9D0F5" }}>{SITE.replace("https://", "")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
