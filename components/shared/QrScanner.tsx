"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inlogUitTekst, gaInloggen } from "@/lib/qr-inlog";

// 📷 Klein venster met de camera: de QR-code van het inlogkaartje scannen. Werkt in de browser én in de
// geïnstalleerde app (iPhone en Android). Gevonden: meteen inloggen met wat er op het kaartje staat.
export default function QrScanner({ onSluit }: { onSluit: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [gevonden, setGevonden] = useState(false);

  useEffect(() => {
    let stroom: MediaStream | null = null;
    let weg = false;
    let frame = 0;
    const doek = document.createElement("canvas");
    const ctx = doek.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        stroom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      } catch {
        setFout("De camera mag niet worden gebruikt. Geef PointRush toestemming voor de camera in de instellingen van je telefoon, of log in met je loginnaam en wachtwoord.");
        return;
      }
      if (weg || !videoRef.current) { stroom.getTracks().forEach((t) => t.stop()); return; }
      const video = videoRef.current;
      video.srcObject = stroom;
      await video.play().catch(() => {});
      const { default: jsQR } = await import("jsqr");
      // Ingebouwde lezer als de telefoon die heeft (Android); anders jsQR (iPhone)
      const Detector = (window as unknown as { BarcodeDetector?: new (o: object) => { detect: (b: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

      const kijk = async () => {
        if (weg) return;
        if (video.readyState >= 2 && ctx) {
          let tekst: string | null = null;
          try {
            if (detector) tekst = (await detector.detect(video))[0]?.rawValue ?? null;
          } catch { /* dan jsQR */ }
          if (!tekst) {
            // Midden van het beeld, verkleind: snel genoeg op elke telefoon
            const zijde = Math.min(video.videoWidth, video.videoHeight);
            const maat = Math.min(640, zijde);
            doek.width = maat; doek.height = maat;
            ctx.drawImage(video, (video.videoWidth - zijde) / 2, (video.videoHeight - zijde) / 2, zijde, zijde, 0, 0, maat, maat);
            const beeld = ctx.getImageData(0, 0, maat, maat);
            tekst = jsQR(beeld.data, maat, maat, { inversionAttempts: "dontInvert" })?.data ?? null;
          }
          if (tekst) {
            const inlog = inlogUitTekst(tekst);
            if (inlog) {
              setGevonden(true);
              navigator.vibrate?.(80);
              onSluit();
              gaInloggen(inlog);
              return;
            }
            setFout("Dit is geen inlogcode van PointRush. Scan de QR-code op je inlogkaartje.");
          }
        }
        frame = window.setTimeout(() => requestAnimationFrame(kijk), 150);
      };
      kijk();
    })();

    return () => {
      weg = true;
      clearTimeout(frame);
      stroom?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return createPortal(
    <div className="qr-scan-achter" onClick={onSluit}>
      <div className="qr-scan" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="QR-code scannen">
        <div className="qr-scan-kop">
          <span>📷 Scan je inlogkaartje</span>
          <button type="button" className="qr-scan-sluit" onClick={onSluit} aria-label="Sluiten">✕</button>
        </div>
        <div className="qr-scan-beeld">
          <video ref={videoRef} playsInline muted />
          {/* Richtkader: houd de QR-code hierin */}
          <span className="qr-scan-kader" aria-hidden />
          {gevonden && <span className="qr-scan-gevonden">✓ Inloggen…</span>}
        </div>
        <div className={fout ? "qr-scan-fout" : "qr-scan-tip"}>{fout ?? "Houd de QR-code van je kaartje in het vak."}</div>
      </div>
    </div>,
    document.body,
  );
}
