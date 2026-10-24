"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { inlogUitTekst, gaInloggen } from "@/lib/qr-inlog";

// Camera pas laden als je op Scannen tikt
const QrScanner = dynamic(() => import("@/components/shared/QrScanner"), { ssr: false });

// Inloglinks openen vanuit WhatsApp in de browser, niet in de geïnstalleerde app (die heeft een
// eigen, aparte inlog). Daarom kan de app de link ook zelf gebruiken: kopieer de link in WhatsApp,
// en tik hier op "Inloggen met link". De app leest het klembord, of je plakt hem zelf.

export default function LinkInloggen() {
  const [open, setOpen] = useState(false);
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState("");
  // 📷 De QR-code op het inlogkaartje scannen
  const [scan, setScan] = useState(false);

  async function start() {
    setFout("");
    // Eerst het klembord proberen (de telefoon vraagt misschien om toestemming)
    try {
      const klembord = await navigator.clipboard?.readText();
      const inlog = klembord ? inlogUitTekst(klembord) : null;
      if (inlog) { gaInloggen(inlog); return; }
    } catch { /* geen toegang tot het klembord: dan plakken */ }
    setOpen(true);
  }

  if (!open) {
    // Twee kleine knoppen naast elkaar: scannen (kaartje) of een link uit WhatsApp plakken
    return (
      <>
        <div className="link-inloggen-rij">
          <button type="button" className="link-inloggen-knop" onClick={() => setScan(true)}>📷 Scan je kaartje</button>
          <button type="button" className="link-inloggen-knop" onClick={start}>🔗 Link plakken</button>
        </div>
        {scan && <QrScanner onSluit={() => setScan(false)} />}
      </>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
        Houd de link in WhatsApp ingedrukt, kies <strong>Kopiëren</strong> en plak hem hier:
      </div>
      <input className="pr-field-input2" value={tekst} onChange={(e) => { setTekst(e.target.value); setFout(""); }}
        placeholder="https://…/l/…" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus style={{ marginBottom: 0 }} />
      {fout && <div style={{ fontSize: "0.8rem", color: "#FCA5A5", textAlign: "center" }}>⚠️ {fout}</div>}
      <button type="button" className="btn-premium--compact" onClick={() => {
        const inlog = inlogUitTekst(tekst);
        if (inlog) gaInloggen(inlog); else setFout("Dit is geen inloglink. Kopieer de hele link uit WhatsApp.");
      }}>INLOGGEN MET LINK →</button>
    </div>
  );
}
