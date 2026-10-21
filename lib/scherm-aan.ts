"use client";

import { useEffect, useState } from "react";

// Scherm aan laten tijdens het spel: standaard aan, zodat de telefoon niet op slot gaat en GPS, geluid en
// trillen blijven werken. Wie batterij wil sparen zet het uit in ℹ️ (onthouden op dit toestel).
// De browser laat het slot los zodra de app naar de achtergrond gaat; bij terugkomen vragen we het opnieuw.
// Werkt in browsers met de Wake Lock API (Chrome/Android, Safari vanaf iOS 16.4).
const SLEUTEL = "pr_scherm_aan";

export function useSchermAan(): { aan: boolean; kan: boolean; wissel: () => void } {
  const [aan, setAan] = useState(true);
  const [kan, setKan] = useState(false);

  useEffect(() => {
    setKan(typeof navigator !== "undefined" && "wakeLock" in navigator);
    try { setAan(localStorage.getItem(SLEUTEL) !== "0"); } catch { /* geen opslag */ }
  }, []);

  useEffect(() => {
    if (!aan || !("wakeLock" in navigator)) return;
    let slot: WakeLockSentinel | null = null;
    let weg = false;
    const vraag = async () => {
      if (weg || document.visibilityState !== "visible" || (slot && !slot.released)) return;
      try {
        const s = await navigator.wakeLock.request("screen");
        if (weg) { s.release().catch(() => {}); return; }
        slot = s;
      } catch { /* geweigerd, bijvoorbeeld bij batterijbesparing of nog geen tik op het scherm */ }
    };
    vraag();
    // Na terugkomen in de app opnieuw; Safari staat het soms pas toe na een tik
    document.addEventListener("visibilitychange", vraag);
    document.addEventListener("pointerdown", vraag);
    return () => {
      weg = true;
      document.removeEventListener("visibilitychange", vraag);
      document.removeEventListener("pointerdown", vraag);
      slot?.release().catch(() => {});
    };
  }, [aan]);

  function wissel() {
    setAan((a) => {
      try { localStorage.setItem(SLEUTEL, a ? "0" : "1"); } catch { /* geen opslag */ }
      return !a;
    });
  }
  return { aan, kan, wissel };
}
