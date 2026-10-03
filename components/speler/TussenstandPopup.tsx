"use client";

import { useEffect } from "react";
import type { LeaderboardEntry } from "@/lib/types";
import StandRij from "./StandRij";

interface Props {
  tussenstand: LeaderboardEntry[];
  resterendeSeconden: number;
  onSluit: () => void;
}

export default function TussenstandPopup({ tussenstand, resterendeSeconden, onSluit }: Props) {
  useEffect(() => {
    const timer = setTimeout(onSluit, resterendeSeconden * 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "#0f1c2e",
        color: "#e8f0ff",
        borderRadius: "18px",
        padding: "20px 16px",
        maxWidth: "440px",
        width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, color: "#00d9ff" }}>
            <span style={{ fontSize: "2.2rem", lineHeight: 1 }}>🏆</span> Tussenstand
          </h2>
          <button
            onClick={onSluit}
            style={{
              border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)",
              borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
              fontSize: "16px", color: "#e8f0ff", fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {tussenstand.length === 0 ? (
          <p style={{ color: "#6b84a8", fontSize: "0.85rem" }}>Nog geen scores beschikbaar.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...tussenstand].sort((a, b) => b.score - a.score).map((entry) => (
              <StandRij key={entry.rank} entry={entry} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
