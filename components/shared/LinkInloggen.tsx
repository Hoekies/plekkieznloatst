"use client";

import { useState } from "react";

// Inloglinks openen vanuit WhatsApp in de browser, niet in de geïnstalleerde app (die heeft een
// eigen, aparte inlog). Daarom kan de app de link ook zelf gebruiken: kopieer de link in WhatsApp,
// en tik hier op "Inloggen met link". De app leest het klembord, of je plakt hem zelf.
function codeUit(tekst: string): string | null {
  const m = /\/l\/([A-Za-z0-9_-]{20,80})/.exec(tekst) ?? /^\s*([A-Za-z0-9_-]{20,80})\s*$/.exec(tekst);
  return m ? m[1] : null;
}

export default function LinkInloggen() {
  const [open, setOpen] = useState(false);
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState("");

  function ga(code: string) {
    window.location.assign(`/l/${code}`);
  }

  async function start() {
    setFout("");
    // Eerst het klembord proberen (de telefoon vraagt misschien om toestemming)
    try {
      const klembord = await navigator.clipboard?.readText();
      const code = klembord ? codeUit(klembord) : null;
      if (code) { ga(code); return; }
    } catch { /* geen toegang tot het klembord: dan plakken */ }
    setOpen(true);
  }

  if (!open) {
    return (
      <button type="button" className="link-inloggen-knop" onClick={start}>
        🔗 Inloggen met link
      </button>
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
        const code = codeUit(tekst);
        if (code) ga(code); else setFout("Dit is geen inloglink. Kopieer de hele link uit WhatsApp.");
      }}>INLOGGEN MET LINK →</button>
    </div>
  );
}
