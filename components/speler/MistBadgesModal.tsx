"use client";

import { useEffect, useState } from "react";

interface TierStand {
  code: string;
  emoji: string;
  titel: string;
  ha: number;
  behaald: boolean;
}

interface PlaatsStand {
  plaats: string;
  ha: number;
  tiers: TierStand[];
  volgende: { titel: string; ha: number; nogHa: number } | null;
}

interface AlgemeenStand {
  code: string;
  emoji: string;
  titel: string;
  uitleg: string;
  behaald: boolean;
  voortgang: string | null;
}

function BadgeRij({ emoji, titel, uitleg, behaald }: { emoji: string; titel: string; uitleg: string; behaald: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12,
      background: behaald ? "rgba(255,217,59,0.12)" : "rgba(255,255,255,0.04)",
      border: `1.5px solid ${behaald ? "rgba(255,217,59,0.45)" : "rgba(255,255,255,0.07)"}`,
    }}>
      <div style={{
        fontSize: "1.7rem", lineHeight: 1, flexShrink: 0,
        filter: behaald ? "none" : "grayscale(1)",
        opacity: behaald ? 1 : 0.35,
      }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: "0.88rem",
          color: behaald ? "#FFD93B" : "rgba(255,255,255,0.45)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{titel}</div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>{uitleg}</div>
      </div>
      {behaald && <span style={{ color: "#4ADE80", fontWeight: 800, flexShrink: 0 }}>✓</span>}
    </div>
  );
}

export default function MistBadgesModal({ onSluit }: { onSluit: () => void }) {
  const [laden, setLaden] = useState(true);
  const [plaatsen, setPlaatsen] = useState<PlaatsStand[]>([]);
  const [algemeen, setAlgemeen] = useState<AlgemeenStand[]>([]);

  useEffect(() => {
    fetch("/api/speler/mist/badges")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) { setPlaatsen(d.plaatsen ?? []); setAlgemeen(d.algemeen ?? []); }
      })
      .catch(() => { /* verbindingsfout */ })
      .finally(() => setLaden(false));
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onSluit}>
      <div style={{
        background: "#0f1c2e", color: "#e8f0ff", borderRadius: 18, padding: 24,
        maxWidth: 420, width: "100%", maxHeight: "90vh", overflowY: "auto", overflowX: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#FFD93B" }}>🎖️ Badges</h2>
          <button onClick={onSluit} style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#e8f0ff", fontWeight: 700 }}>✕</button>
        </div>

        {laden ? (
          <p style={{ color: "#6b84a8", fontSize: "0.85rem" }}>Laden…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {plaatsen.length === 0 ? (
              <p style={{ color: "#6b84a8", fontSize: "0.85rem", margin: 0 }}>
                Loop rond om mist weg te spelen — zodra we weten in welke plaats je bent, verschijnen hier je badges.
              </p>
            ) : plaatsen.map((p) => (
              <div key={p.plaats}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>{p.plaats}</span>
                  <span style={{ fontSize: "0.78rem", color: "#6b84a8" }}>{p.ha.toFixed(1)} ha vrijgespeeld</span>
                </div>
                {p.volgende && (
                  <div style={{ fontSize: "0.72rem", color: "#6b84a8", marginBottom: 8 }}>
                    nog {p.volgende.nogHa.toFixed(1)} ha tot &ldquo;{p.volgende.titel}&rdquo;
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {p.tiers.map((t) => (
                    <BadgeRij key={t.code} emoji={t.emoji} titel={t.titel} uitleg={`${t.ha} hectare vrijgespeeld`} behaald={t.behaald} />
                  ))}
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", marginBottom: 8 }}>Algemeen</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {algemeen.map((b) => (
                  <BadgeRij key={b.code} emoji={b.emoji} titel={b.titel}
                    uitleg={b.behaald ? b.uitleg : (b.voortgang ?? b.uitleg)} behaald={b.behaald} />
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
