"use client";

import { useEffect } from "react";

type FsDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null };
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

// Op een telefoon (Android) meteen volledig scherm, zonder adresbalk en zonder de knoppenbalk onderin.
// Een browser staat dat alleen toe direct na een tik; daarom gebeurt het bij de eerste tik op het scherm.
// Gaat de speler zelf uit volledig scherm, dan dringen we niet opnieuw aan (de knop ⛶ blijft werken).
// Als geïnstalleerde app opent hij al volledig scherm (manifest), dan doet dit niets.
export default function AutoVolledigScherm() {
  useEffect(() => {
    const doc = document as FsDocument;
    const kan = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
    const telefoon = window.matchMedia("(pointer: coarse)").matches;
    const alsApp = window.matchMedia("(display-mode: fullscreen)").matches;
    if (!kan || !telefoon || alsApp) return;

    function eersteTik(e: MouseEvent) {
      // Niet bij het installeren van de app: die vraag mag niet door het volledig scherm verdrongen worden
      if ((e.target as Element | null)?.closest?.("[data-geen-volledig]")) return;
      if (doc.fullscreenElement || doc.webkitFullscreenElement) return opruimen();
      const el = document.documentElement as FsElement;
      const verzoek = el.requestFullscreen
        ? el.requestFullscreen({ navigationUI: "hide" })
        : el.webkitRequestFullscreen?.();
      Promise.resolve(verzoek).then(opruimen).catch(() => { /* geweigerd: bij de volgende tik nog eens */ });
    }
    function opruimen() {
      document.removeEventListener("click", eersteTik, true);
    }
    document.addEventListener("click", eersteTik, true);
    return opruimen;
  }, []);

  return null;
}
