"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Camera pas laden als je op Scannen tikt
const QrScanner = dynamic(() => import("@/components/shared/QrScanner"), { ssr: false });

// 📷 Inloggen met de QR-code: van het inlogkaartje of de grote QR van de spelleider. Een link uit WhatsApp
// plakken kan niet meer (overbodig: scannen neemt het team meteen over, ook in de geïnstalleerde app).
export default function LinkInloggen() {
  const [scan, setScan] = useState(false);
  // Eén brede knop: links een echte camera, rechts de tekst
  return (
    <>
      <button type="button" className="qr-knop" onClick={() => setScan(true)}>
        <span className="qr-knop-camera" aria-hidden>📷</span>
        <span className="qr-knop-tekst">
          <strong>QR-code scannen</strong>
          <span>van je kaartje of van de spelleider</span>
        </span>
      </button>
      {scan && <QrScanner onSluit={() => setScan(false)} />}
    </>
  );
}
