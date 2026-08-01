"use client";

import { useEffect } from "react";
import { speelFinish } from "@/lib/sounds";

export interface BadgeMelding {
  code: string;
  plaats: string;
  emoji: string;
  titel: string;
  uitleg: string;
}

const ZICHTBAAR_MS = 4000;

export default function MistBadgePopup({ badge, onSluit }: { badge: BadgeMelding; onSluit: () => void }) {
  useEffect(() => {
    speelFinish();
    const timer = setTimeout(onSluit, ZICHTBAAR_MS);
    return () => clearTimeout(timer);
    // Opnieuw starten zodra er een andere badge getoond wordt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badge.code, badge.plaats]);

  return (
    <div
      onClick={onSluit}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        cursor: "pointer",
      }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(165deg, #2f1769 0%, #1c0c45 70%, #150a36 100%)",
        border: "2px solid rgba(255,217,59,0.55)",
        borderRadius: 22, padding: "28px 30px", maxWidth: 340, width: "100%",
        textAlign: "center", color: "#fff",
        boxShadow: "0 12px 50px rgba(0,0,0,0.6), 0 0 40px rgba(255,217,59,0.25)",
        animation: "pr-badge-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: "#FFD93B", marginBottom: 10 }}>
          nieuwe badge
        </div>
        <div style={{ fontSize: "3.4rem", lineHeight: 1, marginBottom: 12, filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" }}>
          {badge.emoji}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", marginBottom: 6 }}>
          {badge.titel}
        </div>
        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
          {badge.uitleg}
        </div>
        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: 16 }}>
          tik om te sluiten
        </div>
      </div>

      <style>{`
        @keyframes pr-badge-in {
          0%   { transform: scale(0.7) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
