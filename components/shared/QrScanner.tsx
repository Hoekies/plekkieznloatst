"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inlogUitTekst, gaInloggen } from "@/lib/qr-inlog";

// Waarom de camera niet start, in gewone taal, met wat je eraan doet. Android (Chrome) vraagt maar één keer om
// toestemming: is die ooit geweigerd of weggetikt, dan vraagt hij het niet opnieuw en moet het via de instellingen.
async function cameraFout(e: unknown): Promise<string> {
  const naam = (e as { name?: string })?.name ?? "";
  const android = /Android/i.test(navigator.userAgent);
  const app = window.matchMedia?.("(display-mode: standalone)").matches;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return "Deze browser kan de camera hier niet gebruiken. Log in met je loginnaam en wachtwoord.";
  if (naam === "NotFoundError" || naam === "OverconstrainedError") return "Er is geen camera gevonden. Log in met je loginnaam en wachtwoord.";
  if (naam === "NotReadableError" || naam === "AbortError") return "De camera is bezet door een andere app. Sluit die app en tik op Opnieuw proberen.";
  let geweigerd = naam === "NotAllowedError" || naam === "SecurityError";
  try { geweigerd = geweigerd || (await navigator.permissions?.query({ name: "camera" as PermissionName }))?.state === "denied"; } catch { /* niet elke browser kent dit */ }
  if (!geweigerd) return "De camera startte niet. Tik op Opnieuw proberen, of log in met je loginnaam en wachtwoord.";
  if (android) {
    // De geïnstalleerde app op Android draait in Chrome: de camera-toestemming hoort bij Chrome en de site,
    // niet bij de app (onder Apps → PointRush staat daarom geen camera)
    return app
      ? "De camera staat uit voor PointRush. Open Chrome → ⋮ → Instellingen → Site-instellingen → Camera → kies plekkieznloatst.vercel.app → Toestaan. Staat Chrome zelf de camera niet toe: Instellingen van je telefoon → Apps → Chrome → Rechten → Camera → Toestaan. Tik daarna op Opnieuw proberen. Lukt het niet: scan de QR-code met de camera-app van je telefoon, dan ben je ook ingelogd."
      : "De camera staat uit voor deze site. Tik bovenin naast het adres op het slotje (of ⓘ) → Rechten → Camera → Toestaan. Staat Chrome zelf de camera niet toe: Instellingen van je telefoon → Apps → Chrome → Rechten → Camera. Tik daarna op Opnieuw proberen.";
  }
  return "De camera mag niet worden gebruikt. Geef toestemming voor de camera in de instellingen (iPhone: Instellingen → Safari → Camera → Vraag of Sta toe), en tik op Opnieuw proberen.";
}

// 📷 Klein venster met de camera: de QR-code van het inlogkaartje scannen. Werkt in de browser én in de
// geïnstalleerde app (iPhone en Android). Gevonden: meteen inloggen met wat er op het kaartje staat.
export default function QrScanner({ onSluit }: { onSluit: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [gevonden, setGevonden] = useState(false);
  // Opnieuw proberen (na het geven van toestemming): de camera opnieuw opvragen
  const [poging, setPoging] = useState(0);
  const [cameraUit, setCameraUit] = useState(false);

  useEffect(() => {
    let stroom: MediaStream | null = null;
    let weg = false;
    let frame = 0;
    const doek = document.createElement("canvas");
    const ctx = doek.getContext("2d", { willReadFrequently: true });

    (async () => {
      setFout(null); setCameraUit(false);
      // Eerst met de gewenste beeldgrootte; weigert een (Android-)camera die, dan eenvoudiger
      const wensen: MediaStreamConstraints[] = [
        { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false },
        { video: { facingMode: "environment" }, audio: false },
        { video: true, audio: false },
      ];
      let laatsteFout: unknown = null;
      for (const w of wensen) {
        try { stroom = await navigator.mediaDevices.getUserMedia(w); break; }
        catch (e) {
          laatsteFout = e;
          // Geweigerd: niet nog eens proberen met andere instellingen
          if ((e as { name?: string })?.name === "NotAllowedError") break;
        }
      }
      if (!stroom) {
        const tekst = await cameraFout(laatsteFout);
        if (!weg) { setFout(tekst); setCameraUit(true); }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poging]);

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
        {cameraUit && <button type="button" className="qr-scan-opnieuw" onClick={() => setPoging((n) => n + 1)}>🔄 Opnieuw proberen</button>}
      </div>
    </div>,
    document.body,
  );
}
