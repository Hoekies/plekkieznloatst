"use client";

import { useEffect, useState } from "react";

// Safari gebruikt (deels) nog webkit-varianten van de Fullscreen-API
type FsDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

// Wisselt tussen volledig scherm en venster. iPhones ondersteunen dit niet vanuit een
// website — daar blijft de knop verborgen (op het beginscherm is de app daar al zonder balken).
export default function VolledigSchermKnop() {
  const [ondersteund, setOndersteund] = useState(false);
  const [volledig, setVolledig] = useState(false);

  useEffect(() => {
    const doc = document as FsDocument;
    setOndersteund(!!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled));
    const bijwerken = () => setVolledig(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    bijwerken();
    document.addEventListener("fullscreenchange", bijwerken);
    document.addEventListener("webkitfullscreenchange", bijwerken);
    return () => {
      document.removeEventListener("fullscreenchange", bijwerken);
      document.removeEventListener("webkitfullscreenchange", bijwerken);
    };
  }, []);

  if (!ondersteund) return null;

  async function wissel() {
    const doc = document as FsDocument;
    const el = document.documentElement as FsElement;
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      } else {
        await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      }
    } catch { /* geweigerd door de browser */ }
  }

  return (
    <button
      type="button"
      onClick={wissel}
      className="speler-uitlog-btn"
      title={volledig ? "Venster" : "Volledig scherm"}
      aria-label={volledig ? "Volledig scherm verlaten" : "Volledig scherm"}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {volledig ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  );
}
