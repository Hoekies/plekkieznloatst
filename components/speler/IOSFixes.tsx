"use client";

import { useEffect } from "react";

// Voorkomt iOS "Shake to Undo" dialog en de swipe-terug-naar-login.
export default function IOSFixes() {
  useEffect(() => {
    // --- Shake to Undo onderdrukken ---
    const onMotion = (e: DeviceMotionEvent) => { e.preventDefault(); };
    window.addEventListener("devicemotion", onMotion, { passive: false });

    // --- Swipe-terug (linker schermrand) blokkeren ---
    // Safari intercepteert de back-gesture vóór touchmove; preventDefault op
    // touchstart voor aanrakingen die starten binnen 20px van de linker rand
    // voorkomt dat Safari de swipe overneemt.
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 20) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: false });

    return () => {
      window.removeEventListener("devicemotion", onMotion);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return null;
}
