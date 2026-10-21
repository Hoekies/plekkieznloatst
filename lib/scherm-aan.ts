"use client";

import { useEffect, useState } from "react";

// Scherm aan laten tijdens het spel (keuze van de speler, onthouden op dit toestel).
// Zo valt de telefoon niet in slaap en werken geluid en trillen altijd. Kost wat meer batterij.
// Werkt in browsers met de Wake Lock API (Chrome/Android, Safari vanaf iOS 16.4).
const SLEUTEL = "pr_scherm_aan";

export function useSchermAan(): { aan: boolean; kan: boolean; wissel: () => void } {
  const [aan, setAan] = useState(false);
  const [kan, setKan] = useState(false);

  useEffect(() => {
    setKan(typeof navigator !== "undefined" && "wakeLock" in navigator);
    try { setAan(localStorage.getItem(SLEUTEL) === "1"); } catch { /* geen opslag */ }
  }, []);

  useEffect(() => {
    if (!aan || !("wakeLock" in navigator)) return;
    let slot: WakeLockSentinel | null = null;
    let weg = false;
    const vraag = async () => {
      try {
        const s = await navigator.wakeLock.request("screen");
        if (weg) { s.release().catch(() => {}); return; }
        slot = s;
      } catch { /* geweigerd, bijvoorbeeld bij een bijna lege batterij */ }
    };
    // Na terugkomen in de app vervalt het slot: opnieuw vragen
    const zichtbaar = () => { if (document.visibilityState === "visible") vraag(); };
    vraag();
    document.addEventListener("visibilitychange", zichtbaar);
    return () => {
      weg = true;
      document.removeEventListener("visibilitychange", zichtbaar);
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
