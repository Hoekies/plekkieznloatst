"use client";

import { useEffect } from "react";

// Houdt het scherm aan tijdens het spel, zodat de telefoon niet op slot gaat en GPS,
// meldingen en geluid blijven werken. De browser laat het slot los zodra de app naar
// de achtergrond gaat; bij terugkomen vragen we het opnieuw aan.
export default function SchermAanHouden() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let slot: WakeLockSentinel | null = null;
    let gestopt = false;

    async function aanvragen() {
      if (gestopt || document.visibilityState !== "visible" || (slot && !slot.released)) return;
      try {
        slot = await navigator.wakeLock.request("screen");
      } catch { /* geweigerd, bv. batterijbesparing of nog geen tik op het scherm */ }
    }

    aanvragen();
    // Sommige browsers (Safari) staan het pas toe na een tik: probeer het dan opnieuw
    document.addEventListener("visibilitychange", aanvragen);
    document.addEventListener("pointerdown", aanvragen);

    return () => {
      gestopt = true;
      document.removeEventListener("visibilitychange", aanvragen);
      document.removeEventListener("pointerdown", aanvragen);
      slot?.release().catch(() => {});
    };
  }, []);

  return null;
}
