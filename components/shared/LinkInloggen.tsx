"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Camera pas laden als je op Scannen tikt
const QrScanner = dynamic(() => import("@/components/shared/QrScanner"), { ssr: false });

// 📷 Inloggen met de QR-code: van het inlogkaartje of de grote QR van de spelleider. Een link uit WhatsApp
// plakken kan niet meer (overbodig: scannen neemt het team meteen over, ook in de geïnstalleerde app).
export default function LinkInloggen() {
  const [scan, setScan] = useState(false);
  // Scannen is de snelste weg: een grote knop met een flinke camera
  return (
    <>
      <div className="link-inloggen-rij">
        <button type="button" className="link-inloggen-knop link-inloggen-scan" onClick={() => setScan(true)}>
          <span className="link-inloggen-camera" aria-hidden>📷</span>
          <span>Scan je kaartje</span>
        </button>
      </div>
      {scan && <QrScanner onSluit={() => setScan(false)} />}
    </>
  );
}
