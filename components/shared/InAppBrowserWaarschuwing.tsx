"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function detecteerInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  // WhatsApp in-app browser (iOS + Android)
  if (/WhatsApp/i.test(ua)) return true;
  // Facebook in-app browser
  if (/FBAN|FBAV/i.test(ua)) return true;
  // Instagram in-app browser
  if (/Instagram/i.test(ua)) return true;
  // iOS WebView (geen "Safari" in UA maar wel AppleWebKit)
  if (/iPhone|iPad|iPod/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua)) return true;
  return false;
}

export default function InAppBrowserWaarschuwing() {
  const [toon, setToon] = useState(false);
  const [huidigUrl, setHuidigUrl] = useState("");

  useEffect(() => {
    if (detecteerInAppBrowser()) {
      setHuidigUrl(window.location.href);
      setToon(true);
    }
  }, []);

  if (!toon) return null;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(6,14,26,0.97)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", gap: 20,
      fontFamily: "var(--font, system-ui)",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="PointRush" style={{ width: 140, objectFit: "contain", marginBottom: 4 }} />

      <h2 style={{ color: "#00d9ff", fontWeight: 700, fontSize: "1.2rem", margin: 0, textAlign: "center" }}>
        Open in Safari
      </h2>

      <p style={{ color: "#b8cce0", fontSize: "0.9rem", textAlign: "center", lineHeight: 1.65, margin: 0, maxWidth: 300 }}>
        PointRush werkt alleen goed als de pagina is geopend in <strong style={{ color: "#fff" }}>Safari</strong>.
        Tik op de knop hieronder om door te gaan.
      </p>

      <a
        href={huidigUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          background: "linear-gradient(135deg, #0099bb 0%, #00d9ff 100%)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "1rem",
          padding: "14px 32px",
          borderRadius: 12,
          textDecoration: "none",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,217,255,0.3)",
        }}
      >
        🧭 Open in Safari
      </a>

      <button
        onClick={() => setToon(false)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#6b84a8", fontSize: "0.82rem", padding: "4px 8px",
        }}
      >
        Toch hier verder gaan
      </button>
    </div>,
    document.body
  );
}
