"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formateerTijd } from "@/lib/geo";
import type { LeaderboardEntry, SpelerLocatie } from "@/lib/types";
import type { SpeciaalItem } from "@/types/database";
import type { RouteWaarden } from "./SpeciaalItemLegende";
import SpeciaalItemPopup from "./SpeciaalItemPopup";
import StandRij from "./StandRij";

interface Props {
  groepNaam: string;
  score: number;
  tijdSeconden: number;
  distanceMeters: number;
  initLeaderboard: LeaderboardEntry[];
  // De eindstand is pas te zien als de beheerder de uitslag vrijgeeft (na het keuren van foto's)
  uitslagVrij: boolean;
  wachtendeFotos: number;
  // Route staat "items na de finish" toe en de uitslag is nog niet vrij
  itemsNaFinish: boolean;
  waarden: RouteWaarden;
}

const CONFETTI_KLEUREN = ["#F59E0B", "#1E40AF", "#EF4444", "#10B981", "#8B5CF6", "#F97316", "#06B6D4"];
const CONFETTI_AANTAL = 70;
const POLL_INTERVAL_MS = 10000;

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

function formateerAfstand(meters: number): string {
  if (meters === 0) return "—";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function FinishScherm({ groepNaam, score: initScore, tijdSeconden, distanceMeters, initLeaderboard, uitslagVrij, wachtendeFotos, itemsNaFinish, waarden }: Props) {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initLeaderboard);
  const [vrij, setVrij] = useState(uitslagVrij);
  const [score, setScore] = useState(initScore);
  // Items die na de finish nog ingezet mogen worden (tot de uitslag vrij is)
  const [items, setItems] = useState<SpeciaalItem[]>([]);
  const [tegenstanders, setTegenstanders] = useState<{ session_id: string; teamnaam: string }[]>([]);
  const [actiefItem, setActiefItem] = useState<SpeciaalItem | null>(null);
  const [itemMelding, setItemMelding] = useState<string | null>(null);

  async function haalItemsOp() {
    try {
      const [inv, loc] = await Promise.all([fetch("/api/speler/speciaal/inventaris"), fetch("/api/speler/locaties")]);
      if (inv.ok) setItems(await inv.json());
      if (loc.ok) {
        const { locaties } = await loc.json() as { locaties: SpelerLocatie[] };
        setTegenstanders((locaties ?? []).filter((l) => !l.gefinisht).map((l) => ({ session_id: l.session_id, teamnaam: l.teamnaam })));
      }
    } catch { /* verbindingsfout */ }
  }
  useEffect(() => {
    if (!itemsNaFinish) return;
    haalItemsOp();
    const t = setInterval(haalItemsOp, 10000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsNaFinish]);
  const [confetti] = useState<ConfettiStuk[]>(maakConfetti);
  const [confettiZichtbaar, setConfettiZichtbaar] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setConfettiZichtbaar(false), 4000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/speler/leaderboard");
        if (res.ok) {
          const data = await res.json();
          if (typeof data.score === "number") setScore(data.score);
          if (typeof data.vrijgegeven === "boolean") setVrij(data.vrijgegeven);
          // Houd de laatste bekende staat als de server leeg teruggeeft (bijv. na reset)
          if (data.leaderboard?.length) setLeaderboard(data.leaderboard);
        }
      } catch { /* verbindingsfout */ }
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", position: "relative", overflow: "hidden", alignItems: "center" }}>

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: "32px 20px 48px", width: "100%", maxWidth: 600 }}>

        {/* Titel */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🏁</div>
          <h1 style={{ margin: "12px 0 4px", fontSize: "1.6rem" }}>Finish!</h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>{groepNaam}</p>
        </div>

        {/* Score + tijd + afstand */}
        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <StatKaart waarde={String(score)} label={vrij ? "punten" : "punten (voorlopig)"} kleur="var(--blue)" />
          <StatKaart waarde={formateerTijd(tijdSeconden)} label="speeltijd" kleur="var(--ink)" tabular />
          <StatKaart waarde={formateerAfstand(distanceMeters)} label="afstand" kleur="var(--green, #16A34A)" />
        </div>

        {/* Direct onder de eindscore: antwoorden & items, en de gelopen route */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/speler/terugkijk")}
            style={{ flex: 1, fontSize: "0.9rem", padding: "12px 6px", borderRadius: 14 }}>
            📖 Antwoorden &amp; items
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/speler/terugkijk/route")}
            style={{ flex: 1, fontSize: "0.9rem", padding: "12px 6px", borderRadius: 14 }}>
            🗺️ Gelopen route
          </button>
        </div>

        {/* Items na de finish: nog inzetten op teams die onderweg zijn, tot de uitslag vrij is */}
        {itemsNaFinish && !vrij && items.length > 0 && (
          <div style={{
            width: "100%", borderRadius: 16, padding: "14px 16px",
            background: "rgba(0,217,255,0.08)", border: "1px solid rgba(0,217,255,0.4)",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#67E8F9" }}>
              🎁 Je hebt nog items!
            </div>
            <p style={{ margin: "4px 0 10px", fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.45 }}>
              Zet ze in op teams die nog onderweg zijn, zolang de uitslag nog niet bekend is.
              {tegenstanders.length === 0 && " Op dit moment is er niemand meer onderweg."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map((it) => (
                <button key={it.id} onClick={() => setActiefItem(it)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px 6px 6px", borderRadius: 99,
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
                    fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                  }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/items/${it.type}.png`} alt="" style={{ width: 30, height: 30 }} />
                  {it.name && it.name !== "Speciaal item" ? it.name : it.type.charAt(0).toUpperCase() + it.type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
        {itemMelding && (
          <div onClick={() => setItemMelding(null)} style={{
            width: "100%", borderRadius: 14, padding: "12px 14px", cursor: "pointer",
            background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.5)", color: "#BBF7D0", fontSize: "0.9rem",
          }}>
            {itemMelding} <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>(tik om te sluiten)</span>
          </div>
        )}
        {actiefItem && (
          <SpeciaalItemPopup
            item={actiefItem}
            waarden={waarden}
            andereSessies={tegenstanders}
            onVerwerkt={(itemId, notificatie) => {
              setActiefItem(null);
              setItems((prev) => prev.filter((i) => i.id !== itemId));
              setItemMelding(notificatie ?? "✅ Item ingezet!");
              haalItemsOp();
            }}
            onSluit={() => setActiefItem(null)}
          />
        )}

        {/* Leaderboard */}
        <div style={{ width: "100%" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 14, color: "#00d9ff" }}>
            <span style={{ fontSize: "2.2rem", lineHeight: 1 }}>🏆</span> Eindstand
          </h2>
          {!vrij ? (
            <div style={{
              borderRadius: 16, padding: "18px 16px", textAlign: "center",
              background: "rgba(255,217,59,0.1)", border: "1px solid rgba(255,217,59,0.45)",
            }}>
              <div style={{ fontSize: "2rem", lineHeight: 1 }}>⏳</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#FFE680", marginTop: 8 }}>
                Even geduld…
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.5 }}>
                Zodra alle teams binnen zijn en de organisatie de foto&apos;s heeft gekeurd, verschijnt hier de eindstand.
                {wachtendeFotos > 0 && <><br />Jullie hebben nog {wachtendeFotos} foto{wachtendeFotos !== 1 ? "'s" : ""} in de keuring; de punten komen er dan bij.</>}
              </p>
            </div>
          ) : leaderboard.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nog geen scores beschikbaar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {leaderboard.map((entry) => (
                <StandRij key={entry.rank} entry={entry} />
              ))}
            </div>
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
          {vrij ? "Eindstand wordt live bijgewerkt" : "Deze pagina ververst vanzelf"}
          <style>{`
            @keyframes puls-dot {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.3; }
            }
          `}</style>
        </div>

        {/* Ko-fi */}
        <a
          href="https://ko-fi.com/hoekies"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", width: "50%", margin: "0 auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ko-fi.png" alt="Ko-fi — Steun het project" style={{ width: "100%", height: "auto", display: "block" }} />
        </a>
      </div>
    </div>
  );
}

// ── StatKaart ──────────────────────────────────────────────────────────────────
function StatKaart({ waarde, label, kleur, tabular }: { waarde: string; label: string; kleur: string; tabular?: boolean }) {
  return (
    <div style={{
      flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 16,
      padding: "16px 12px", textAlign: "center",
      border: "1px solid var(--line)",
    }}>
      <div style={{
        fontSize: "1.7rem", fontWeight: 800, color: kleur,
        fontVariantNumeric: tabular ? "tabular-nums" : undefined,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{waarde}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
