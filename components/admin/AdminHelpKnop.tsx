"use client";

import { useState } from "react";

const ITEMS = [
  { naam: "Dashboard",        bestand: "dashboard.png" },
  { naam: "Routes",           bestand: "routes.png" },
  { naam: "Groepen",          bestand: "groepen.png" },
  { naam: "Leaderboard",      bestand: "leaderboard.png" },
  { naam: "Live kaart",       bestand: "live kaart.png" },
  { naam: "Berichten sturen", bestand: "berichten sturen.png" },
  { naam: "Stop route",       bestand: "stop route.png" },
  { naam: "Reset spel",       bestand: "reset spel.png" },
  { naam: "Uitloggen",        bestand: "uitloggen.png" },
];

export default function AdminHelpKnop() {
  const [open, setOpen] = useState(false);
  const [actief, setActief] = useState(0);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%", padding: "8px 14px", background: "none",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
          color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,217,255,0.4)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
      >
        ❓ Help
      </button>
    );
  }

  const item = ITEMS[actief];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: "rgba(8,28,48,0.98)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1rem", color: "#00d9ff" }}>❓ Help — {item.naam}</span>
        <button
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "1.4rem", lineHeight: 1 }}
        >✕</button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Zijbalk met items */}
        <div style={{
          width: 180, flexShrink: 0, overflowY: "auto",
          background: "rgba(8,28,48,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "8px 0",
        }}>
          {ITEMS.map((it, i) => (
            <button
              key={it.bestand}
              onClick={() => setActief(i)}
              style={{
                width: "100%", padding: "10px 16px", background: "none",
                border: "none", cursor: "pointer", textAlign: "left",
                fontSize: "0.82rem", fontWeight: i === actief ? 700 : 400,
                color: i === actief ? "#00d9ff" : "rgba(255,255,255,0.55)",
                borderLeft: i === actief ? "3px solid #00d9ff" : "3px solid transparent",
              }}
            >
              {it.naam}
            </button>
          ))}
        </div>

        {/* Afbeelding */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/help/${item.bestand}`}
            alt={item.naam}
            style={{ maxWidth: "100%", borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.6)" }}
          />
        </div>
      </div>
    </div>
  );
}
