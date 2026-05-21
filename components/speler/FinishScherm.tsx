"use client";

import { useEffect, useRef, useState } from "react";
import { formateerTijd } from "@/lib/geo";
import type { LeaderboardEntry } from "@/app/api/speler/leaderboard/route";

interface Props {
  groepNaam: string;
  score: number;
  tijdSeconden: number;
  initLeaderboard: LeaderboardEntry[];
}

const CONFETTI_KLEUREN = ["#F59E0B", "#1E40AF", "#EF4444", "#10B981", "#8B5CF6", "#F97316", "#06B6D4"];
const CONFETTI_AANTAL = 70;
const POLL_INTERVAL_MS = 10000;

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

function speelFinishGeluid() {
  try { new Audio("/sounds/finish.mp3").play(); } catch { /* geen geluid */ }
}

type ConfettiStuk = {
  id: number;
  x: number;
  kleur: string;
  breedte: number;
  hoogte: number;
  vertraging: number;
  duur: number;
  rotatie: number;
};

function maakConfetti(): ConfettiStuk[] {
  return Array.from({ length: CONFETTI_AANTAL }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    kleur: CONFETTI_KLEUREN[Math.floor(Math.random() * CONFETTI_KLEUREN.length)],
    breedte: 6 + Math.random() * 8,
    hoogte: 8 + Math.random() * 10,
    vertraging: Math.random() * 2.5,
    duur: 2.5 + Math.random() * 2,
    rotatie: Math.random() * 360,
  }));
}

export default function FinishScherm({ groepNaam, score, tijdSeconden, initLeaderboard }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initLeaderboard);
  const [confetti] = useState<ConfettiStuk[]>(maakConfetti);
  const [confettiZichtbaar, setConfettiZichtbaar] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    speelFinishGeluid();

    // Confetti na 4 seconden verbergen
    const timer = setTimeout(() => setConfettiZichtbaar(false), 4000);

    // Leaderboard elke 10 seconden verversen
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/speler/leaderboard");
        if (res.ok) {
          const data = await res.json();
          if (data.top3) setLeaderboard(data.top3);
        }
      } catch { /* verbindingsfout, volgende keer opnieuw */ }
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const eigenInTop3 = leaderboard.some((e) => e.is_eigen_team);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", position: "relative", overflow: "hidden" }}>

      {/* Confetti */}
      {confettiZichtbaar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: "none", overflow: "hidden" }}>
          <style>{`
            @keyframes confetti-val {
              0%   { transform: translateY(-20px) rotate(var(--rot)); opacity: 1; }
              100% { transform: translateY(110vh) rotate(calc(var(--rot) + 540deg)); opacity: 0.3; }
            }
          `}</style>
          {confetti.map((stuk) => (
            <div
              key={stuk.id}
              style={{
                position: "absolute",
                left: `${stuk.x}%`,
                top: 0,
                width: stuk.breedte,
                height: stuk.hoogte,
                background: stuk.kleur,
                borderRadius: 2,
                // @ts-expect-error — CSS custom property
                "--rot": `${stuk.rotatie}deg`,
                animation: `confetti-val ${stuk.duur}s ease-in ${stuk.vertraging}s both`,
              }}
            />
          ))}
        </div>
      )}

      {/* Inhoud */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: "32px 20px 48px" }}>

        {/* Titel */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🏁</div>
          <h1 style={{ margin: "12px 0 4px", fontSize: "1.6rem" }}>Finish!</h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>{groepNaam}</p>
        </div>

        {/* Score + tijd */}
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <div style={{
            flex: 1, background: "var(--paper)", borderRadius: 16,
            padding: "18px 16px", textAlign: "center",
            border: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--blue)" }}>{score}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>punten</div>
          </div>
          <div style={{
            flex: 1, background: "var(--paper)", borderRadius: 16,
            padding: "18px 16px", textAlign: "center",
            border: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {formateerTijd(tijdSeconden)}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>speeltijd</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ width: "100%" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: 12, color: "var(--ink)" }}>Top 3</h2>
          {leaderboard.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nog geen scores beschikbaar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaderboard.map((entry) => (
                <LeaderboardRij key={entry.rank} entry={entry} />
              ))}
            </div>
          )}

          {!eigenInTop3 && (
            <p style={{
              marginTop: 12, fontSize: "0.8rem", color: "var(--muted)",
              textAlign: "center", lineHeight: 1.5,
            }}>
              Jouw score staat nog niet in de top 3. Blijven strijden! 💪
            </p>
          )}
        </div>

        {/* Live-indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: "0.75rem" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--green, #16A34A)",
            display: "inline-block",
            animation: "puls-dot 1.5s ease-in-out infinite",
          }} />
          Leaderboard wordt live bijgewerkt
          <style>{`
            @keyframes puls-dot {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.3; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// ── LeaderboardRij ─────────────────────────────────────────────────────────────
function LeaderboardRij({ entry }: { entry: LeaderboardEntry }) {
  const isEigen = entry.is_eigen_team;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", borderRadius: 12,
      background: isEigen ? "var(--blue-soft)" : "var(--paper)",
      border: `1.5px solid ${isEigen ? "var(--blue)" : "var(--line)"}`,
    }}>
      <span style={{ fontSize: "1.4rem", flexShrink: 0, width: 28, textAlign: "center" }}>
        {RANK_EMOJI[entry.rank - 1] ?? `${entry.rank}.`}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: "0.95rem",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: isEigen ? "var(--blue)" : "var(--ink)",
        }}>
          {entry.group_name}{isEigen && " (jij)"}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 1 }}>
          {formateerTijd(entry.tijd_seconden)}
        </div>
      </div>
      <div style={{
        fontWeight: 800, fontSize: "1.1rem",
        color: isEigen ? "var(--blue)" : "var(--ink)", flexShrink: 0,
      }}>
        {entry.score} <span style={{ fontWeight: 400, fontSize: "0.72rem", color: "var(--muted)" }}>pt</span>
      </div>
    </div>
  );
}
