"use client";

import { useEffect } from "react";
import { ontgrendelAudio } from "@/lib/sounds";

export default function AudioUnlock() {
  useEffect(() => {
    const handler = () => { ontgrendelAudio(); };
    document.addEventListener("touchstart", handler, { once: true, passive: true });
    document.addEventListener("click", handler, { once: true });
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("click", handler);
    };
  }, []);
  return null;
}
