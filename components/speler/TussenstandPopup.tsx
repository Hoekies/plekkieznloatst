"use client";

import { useEffect } from "react";
import { formateerTijd } from "@/lib/geo";
import type { LeaderboardEntry } from "@/lib/types";

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

function formateerAfstand(meters: number): string {
  if (meters === 0) return "—";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

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
        padding: "24px",
        maxWidth: "420px",
        width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#00d9ff" }}>🏆 Tussenstand</h2>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tussenstand.map((entry) => {
              const isEigen = entry.is_eigen_team;
              return (
                <div key={entry.rank} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  background: isEigen ? "rgba(0,217,255,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${isEigen ? "#00d9ff" : "rgba(255,255,255,0.08)"}`,
                }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0, width: 28, textAlign: "center" }}>
                    {RANK_EMOJI[entry.rank - 1] ?? `${entry.rank}.`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: "0.9rem",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      color: isEigen ? "#00d9ff" : "#e8f0ff",
                    }}>
                      {entry.display_name}{isEigen && " (jij)"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#6b84a8", marginTop: 1, display: "flex", gap: 8 }}>
                      <span>{formateerTijd(entry.tijd_seconden)}</span>
                      {entry.distance_meters > 0 && <span>{formateerAfstand(entry.distance_meters)}</span>}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 800, fontSize: "1.05rem",
                    color: isEigen ? "#00d9ff" : "#e8f0ff", flexShrink: 0,
                  }}>
                    {entry.score} <span style={{ fontWeight: 400, fontSize: "0.72rem", color: "#6b84a8" }}>pt</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
