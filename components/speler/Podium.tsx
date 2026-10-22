"use client";

import { useEffect } from "react";
import type { LeaderboardEntry } from "@/lib/types";
import { strooiConfetti } from "@/lib/confetti";

// 🏆 Podium bij de uitslag: de nummers 3, 2 en 1 komen één voor één omhoog; bij de winnaar confetti.
// Gelijke stand op een plek kan: dan staan beide namen op dat blok.
export default function Podium({ stand }: { stand: LeaderboardEntry[] }) {
  const opPlek = (p: number) => stand.filter((e) => e.rank === p);
  const plekken = [2, 1, 3].map((p) => ({ plek: p, teams: opPlek(p) })).filter((p) => p.teams.length);
  useEffect(() => {
    if (!stand.length) return;
    const t = setTimeout(() => strooiConfetti({ aantal: 150, duurMs: 3000, knal: true }), 1700);
    return () => clearTimeout(t);
  }, [stand.length]);
  if (!plekken.length) return null;
  return (
    <div className="podium" aria-label="Podium">
      {plekken.map(({ plek, teams }) => (
        <div key={plek} className={`podium-plek podium-plek--${plek}`}>
          <div className="podium-teams">
            {teams.map((t) => (
              <div key={t.display_name} className={`podium-team${t.is_eigen_team ? " podium-team--eigen" : ""}`}>
                <span className="podium-icoon">{t.icon ?? "👫"}</span>
                <span className="podium-naam">{t.display_name}</span>
                <span className="podium-score">{t.score} pt</span>
              </div>
            ))}
          </div>
          <div className="podium-blok"><span>{plek === 1 ? "🥇" : plek === 2 ? "🥈" : "🥉"}</span>{plek}</div>
        </div>
      ))}
    </div>
  );
}
