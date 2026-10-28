"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Camera pas laden als je op Scannen tikt
const QrScanner = dynamic(() => import("@/components/shared/QrScanner"), { ssr: false });

// 📷 Inloggen met de QR-code: van het inlogkaartje of de grote QR van de spelleider. Een link uit WhatsApp
// plakken kan niet meer (overbodig: scannen neemt het team meteen over, ook in de geïnstalleerde app).
export default function LinkInloggen() {
  const [scan, setScan] = useState(false);
  // Rustig: een ronde knop met een strak scan-icoon en kleine tekst eronder
  return (
    <>
      <button type="button" className="qr-knop" onClick={() => setScan(true)} aria-label="QR-code scannen">
        <span className="qr-knop-rond" aria-hidden>
          {/* Een duidelijke camera (body, zoeker en lens) */}
          <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.3-2h6.4l1.3 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" fill="rgba(255,255,255,0.12)" />
            <circle cx="12" cy="13" r="4" />
            <circle cx="12" cy="13" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="17.6" cy="9.2" r="0.7" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="qr-knop-tekst">QR-code scannen</span>
      </button>
      {scan && <QrScanner onSluit={() => setScan(false)} />}
    </>
  );
}
