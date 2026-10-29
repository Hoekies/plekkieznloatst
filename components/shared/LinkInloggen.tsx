"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Camera pas laden als je op Scannen tikt
const QrScanner = dynamic(() => import("@/components/shared/QrScanner"), { ssr: false });

// 📷 Inloggen met de QR-code: van het inlogkaartje of de grote QR van de spelleider. Een link uit WhatsApp
// plakken kan niet meer (overbodig: scannen neemt het team meteen over, ook in de geïnstalleerde app).
export default function LinkInloggen() {
  const [scan, setScan] = useState(false);
  // Eén strakke knop: de camera links, de tekst ernaast, samen in het midden
  return (
    <>
      <button type="button" className="qr-knop" onClick={() => setScan(true)}>
        <span className="qr-knop-camera" aria-hidden>📷</span>
        <span className="qr-knop-tekst">QR-code scannen</span>
      </button>
      {scan && <QrScanner onSluit={() => setScan(false)} />}
    </>
  );
}
