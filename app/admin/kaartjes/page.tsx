"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { KAARTJES_KEY, waTekst, type Inlog } from "@/components/admin/InlogUitdelen";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import { toonMelding } from "@/components/admin/Melding";

// Inlogkaartjes: afdrukken en uitknippen (8 per A4), of per kaartje als afbeelding via WhatsApp.
// De gegevens komen uit "Inloggegevens uitdelen" (of na aanmaken / nieuw wachtwoord) en staan
// daarna alleen in dit tabblad (sessionStorage), zodat ze bij sluiten weer weg zijn.
const SITE = "https://plekkieznloatst.vercel.app";

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
  // Per kaartje alvast een afbeelding (het deelmenu mag alleen direct na een klik openen)
  const [beelden, setBeelden] = useState<Record<string, File>>({});
  const kaartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { setInlogs(leesInlogs()); }, []);

  useEffect(() => {
    if (!inlogs?.length) return;
    let gestopt = false;
    (async () => {
      const { default: html2canvas } = await import("html2canvas-pro");
      await document.fonts?.ready;
      // Wachten tot het logo geladen is
      await Promise.all([...document.querySelectorAll<HTMLImageElement>(".kaartje img")].map((img) => img.decode().catch(() => undefined)));
      for (const i of inlogs) {
        const el = kaartRefs.current[i.login];
        if (!el || gestopt) continue;
        const canvas = await html2canvas(el, { scale: 3, backgroundColor: null, logging: false });
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
        if (blob && !gestopt) setBeelden((b) => ({ ...b, [i.login]: new File([blob], `inlog-${i.login}.png`, { type: "image/png" }) }));
      }
    })();
    return () => { gestopt = true; };
  }, [inlogs]);

  async function versturen(i: Inlog) {
    const beeld = beelden[i.login];
    // De link staat altijd in de tekst: een afbeelding is in WhatsApp niet aan te klikken
    const tekst = waTekst(i);
    if (beeld && navigator.canShare?.({ files: [beeld] })) {
      try { await navigator.share({ files: [beeld], text: tekst }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    // Geen deelmenu met bestanden: kaartje downloaden en WhatsApp openen met de tekst
    if (beeld) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(beeld);
      a.download = beeld.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toonMelding("Kaartje gedownload: voeg het in WhatsApp toe als afbeelding", "info");
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(tekst)}`, "_blank");
  }

  if (inlogs === null) return null;
  return (
    <>
      <style>{`
        .kaartjes { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 18px; max-width: 760px; margin: 0 auto; }
        .kaartje-blok { display: flex; flex-direction: column; gap: 8px; }
        .kaartje { position: relative; border-radius: 18px; padding: 14px 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;
          background: radial-gradient(circle at 50% 0%, rgba(255,217,59,0.18), transparent 60%), linear-gradient(165deg, #43207f 0%, #241056 55%, #140637 100%);
          border: 2px solid rgba(255,217,59,0.6); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
          color: #fff; break-inside: avoid; page-break-inside: avoid; }
        .kaartje-logo { height: 62px; width: auto; display: block; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45)); }
        .kaartje-midden { display: flex; gap: 14px; align-items: center; width: 100%; }
        .kaartje-qr { background: #fff; padding: 6px; border-radius: 10px; line-height: 0; flex-shrink: 0; }
        .kaartje-velden { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        .kaartje-veld { background: rgba(0,0,0,0.28); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 5px 10px 6px; }
        .kaartje-veld small { display: block; font-size: 9.5px; color: #C9B6FF; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; }
        .kaartje-veld b { display: block; font-family: var(--font-display); font-size: 19px; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .kaartje-veld--ww b { color: #FFE680; letter-spacing: 0.02em; }
        .kaartje-voet { font-size: 10.5px; color: #D9D0F5; text-align: center; }
        .kaartje-voet strong { color: #fff; }
        .kaartje-acties { display: flex; gap: 8px; justify-content: center; }
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
          <p style={{ textAlign: "center", color: "var(--muted)" }}>Geen inloggegevens. Open een kaartje bij Spelers via 📲 Versturen → 🎫 Kaartje.</p>
        ) : (
          <div className="kaartjes">
            {inlogs.map((i) => (
              <div key={i.login} className="kaartje-blok">
                <div className="kaartje" ref={(el) => { kaartRefs.current[i.login] = el; }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-breed.png" alt="PointRush" className="kaartje-logo" />
                  <div className="kaartje-midden">
                    <div className="kaartje-qr"><QRCodeCanvas value={SITE} size={96} /></div>
                    <div className="kaartje-velden">
                      <div className="kaartje-veld"><small>{i.helper ? "Naam" : "Loginnaam"}</small><b>{i.login}</b></div>
                      <div className="kaartje-veld kaartje-veld--ww"><small>Wachtwoord</small><b>{i.wachtwoord}</b></div>
                    </div>
                  </div>
                  <div className="kaartje-voet">Scan de code of ga naar <strong>{SITE.replace("https://", "")}</strong></div>
                </div>
                <div className="kaartje-acties">
                  <button type="button" className="wa-knop wa-knop--klein" onClick={() => versturen(i)} disabled={!beelden[i.login]}
                    title="Het kaartje als afbeelding versturen, met de link erbij">
                    <WhatsAppLogo maat={18} /> {beelden[i.login] ? "WhatsApp" : "Even geduld…"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
