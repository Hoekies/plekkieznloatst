"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { VensterMetKop } from "@/components/shared/Venster";

// 🤝 Onder ℹ️ op de spelerskaart: de meespeellink van dit spel delen, met een QR-code om te laten scannen
export default function MeespeelKnop() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);

  async function openen() {
    setOpen(true);
    if (url) return;
    setFout(null);
    const res = await fetch("/api/speler/meespelen", { cache: "no-store" }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !d.url) { setFout(d.fout ?? "Dat lukte niet: controleer je internet en probeer het opnieuw"); return; }
    setUrl(d.url);
  }
  async function deel() {
    if (!url) return;
    try { await navigator.share({ title: "Speel mee met PointRush", url }); } catch { /* geannuleerd */ }
  }
  function kopieer() {
    if (!url) return;
    const mislukt = () => setFout("Kopiëren lukte niet: laat de QR-code scannen of gebruik Delen");
    if (!navigator.clipboard) { mislukt(); return; }
    navigator.clipboard.writeText(url).then(() => { setFout(null); setGekopieerd(true); }).catch(mislukt);
  }

  return (
    <>
      <button type="button" className="meespeel-deelknop" onClick={openen}>🤝 Medespelers laten meekijken</button>
      {open && (
        <VensterMetKop icoon="🤝" label="Meespeellink" titel="Medespelers" onSluit={() => setOpen(false)} breedte={360} maxHoogte={96}>
          <span className="inst-uitleg">Zij zien de items op het speelveld, jullie letters, de balk en de score. Niet het volgende punt.</span>
          {fout && <span className="inst-uitleg" role="alert" style={{ color: "#FCA5A5" }}>⚠️ {fout}</span>}
          {url && (
            <>
              <div className="meespeel-qr"><QRCodeCanvas value={url} size={200} marginSize={2} /></div>
              <div className="meespeel-deel">
                {typeof navigator !== "undefined" && "share" in navigator && <button type="button" className="rl-knop rl-knop--cyan" onClick={deel}>📤 Delen</button>}
                <button type="button" className="rl-knop" onClick={kopieer}>{gekopieerd ? "✓ Gekopieerd" : "📋 Kopieer link"}</button>
              </div>
            </>
          )}
        </VensterMetKop>
      )}
    </>
  );
}
