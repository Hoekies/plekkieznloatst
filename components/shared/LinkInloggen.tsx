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
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Scanhoeken met een camera erin */}
            <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
            <path d="M7.5 10.2c0-.66.54-1.2 1.2-1.2h1.1l.8-1.2h2.8l.8 1.2h1.1c.66 0 1.2.54 1.2 1.2v4.6c0 .66-.54 1.2-1.2 1.2H8.7c-.66 0-1.2-.54-1.2-1.2z" />
            <circle cx="12" cy="12.5" r="1.9" />
          </svg>
        </span>
        <span className="qr-knop-tekst">QR-code scannen</span>
      </button>
      {scan && <QrScanner onSluit={() => setScan(false)} />}
    </>
  );
}
