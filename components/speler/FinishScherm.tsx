"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formateerTijd, afstandTekst } from "@/lib/geo";
import type { LeaderboardEntry, SpelerLocatie } from "@/lib/types";
import type { SpeciaalItem } from "@/types/database";
import type { RouteWaarden } from "./SpeciaalItemLegende";
import SpeciaalItemPopup from "./SpeciaalItemPopup";
import StandRij from "./StandRij";
import Oorkonde from "./Oorkonde";
import PuzzelWoord from "./PuzzelWoord";
import { strooiConfetti } from "@/lib/confetti";
import Podium from "./Podium";
import KoFiKnop from "@/components/shared/KoFiKnop";
import UitslagDelen from "@/components/shared/UitslagDelen";

interface Props {
  groepNaam: string;
  // Voor de oorkonde
  teamIcoon: string | null;
  // 📸 Goedgekeurde groepsfoto bij de finish (anders het icoon)
  teamFoto?: string | null;
  routeNaam: string | null;
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
  // Eigen logo van de organisatie (huisstijl): op de oorkonde en de uitslag
  huisLogo?: string | null;
}

const POLL_INTERVAL_MS = 10000;

export default function FinishScherm({ groepNaam, teamIcoon, teamFoto = null, routeNaam, score: initScore, tijdSeconden, distanceMeters, initLeaderboard, uitslagVrij, wachtendeFotos, itemsNaFinish, waarden, huisLogo = null }: Props) {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initLeaderboard);
  const [vrij, setVrij] = useState(uitslagVrij);
  const [score, setScore] = useState(initScore);
  const telOp = useTelOp(score);
  // Items die na de finish nog ingezet mogen worden (tot de uitslag vrij is)
  const [items, setItems] = useState<SpeciaalItem[]>([]);
  const [tegenstanders, setTegenstanders] = useState<{ session_id: string; teamnaam: string; gefinisht: boolean }[]>([]);
  const [doelNaFinish, setDoelNaFinish] = useState<string[]>([]);
  const [actiefItem, setActiefItem] = useState<SpeciaalItem | null>(null);
  const [itemMelding, setItemMelding] = useState<string | null>(null);

  async function haalItemsOp() {
    try {
      const [inv, loc] = await Promise.all([fetch("/api/speler/speciaal/inventaris"), fetch("/api/speler/locaties")]);
      if (inv.ok) setItems(await inv.json());
      if (loc.ok) {
        const { locaties, doelNaFinish: dnf } = await loc.json() as { locaties: SpelerLocatie[]; doelNaFinish?: string[] };
        setTegenstanders((locaties ?? []).map((l) => ({ session_id: l.session_id, teamnaam: l.teamnaam, gefinisht: l.gefinisht })));
        setDoelNaFinish(dnf ?? []);
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 🎉 Confetti bij binnenkomst: een knal en daarna een regen
    strooiConfetti({ aantal: 140, duurMs: 2600, knal: true });
    const timer = setTimeout(() => strooiConfetti({ aantal: 120, duurMs: 3500 }), 900);

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

  // flexShrink 0: met overflow hidden krimpt dit vak anders tot de schermhoogte en is de rest niet te zien
  // (dan kun je niet scrollen)
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", flexShrink: 0, position: "relative", overflow: "hidden", alignItems: "center" }}>

      {/* Inhoud */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "18px 16px 48px", width: "100%", maxWidth: 600 }}>

        {/* 🎉 Feestelijke kop: draaiende stralen, geblokte finishrand, teamfoto of icoon in een gouden ring */}
        <div className="finish-held">
          <div className="finish-stralen" aria-hidden />
          <span className="finish-vlag finish-vlag--links" aria-hidden>🏁</span>
          <span className="finish-vlag finish-vlag--rechts" aria-hidden>🏁</span>
          <div className="finish-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {teamFoto ? <img src={teamFoto} alt="" /> : <span>{teamIcoon ?? "🏆"}</span>}
          </div>
          <h1 className="finish-titel">Finish!</h1>
          <div className="finish-team">{groepNaam}</div>
          <div className="finish-sub">Goed gedaan, jullie zijn binnen! 🎉</div>
        </div>

        {/* Score + tijd + afstand */}
        <div className="finish-stats">
          <StatKaart icoon="⭐" waarde={String(telOp)} label={vrij ? "punten" : "punten (voorlopig)"} kleur="#FFD23F" />
          <StatKaart icoon="⏱️" waarde={formateerTijd(tijdSeconden)} label="speeltijd" kleur="#67E8F9" tabular />
          <StatKaart icoon="🚶" waarde={distanceMeters ? afstandTekst(distanceMeters) : "—"} label="afstand" kleur="#4ADE80" />
        </div>

        {/* 🧩 Puzzelwoord raden voor bonuspunten (als de route er een heeft) */}
        <PuzzelWoord raden />

        {/* Oorkonde om te delen (met plaats zodra de uitslag vrij is) */}
        <Oorkonde teamNaam={groepNaam} icoon={teamIcoon} foto={teamFoto} routeNaam={routeNaam} punten={score} seconden={tijdSeconden} meters={distanceMeters}
          plaats={vrij ? leaderboard.find((e) => e.is_eigen_team)?.rank ?? null : null} aantalTeams={leaderboard.length} huisLogo={huisLogo} />

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
              {!tegenstanders.some((t) => !t.gefinisht) && " Op dit moment is er niemand meer onderweg."}
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
                  <img src={`/items/${it.type}.webp`} alt="" style={{ width: 30, height: 30 }} />
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
            andereSessies={tegenstanders.filter((t) => !t.gefinisht || doelNaFinish.includes(actiefItem.type))}
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
              <Podium stand={leaderboard} />
              <UitslagDelen routeNaam={routeNaam} huisLogo={huisLogo} knopStijl={{ width: "100%", fontSize: "0.95rem", padding: "13px 6px", borderRadius: 14, fontWeight: 800 }}
                stand={leaderboard.map((e) => ({ naam: e.display_name, icon: e.icon, foto: e.foto ?? null, score: e.score, plaats: e.rank, eigen: e.is_eigen_team }))} />
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
        <KoFiKnop />
      </div>
    </div>
  );
}

// ── StatKaart ──────────────────────────────────────────────────────────────────
function StatKaart({ icoon, waarde, label, kleur, tabular }: { icoon: string; waarde: string; label: string; kleur: string; tabular?: boolean }) {
  return (
    <div className="finish-stat" style={{ "--stat-kleur": kleur } as React.CSSProperties}>
      <div className="finish-stat-icoon" aria-hidden>{icoon}</div>
      <div className="finish-stat-waarde" style={{ fontVariantNumeric: tabular ? "tabular-nums" : undefined }}>{waarde}</div>
      <div className="finish-stat-label">{label}</div>
    </div>
  );
}

// Score die bij binnenkomst van 0 omhoog telt; latere wijzigingen (foto goedgekeurd) gaan meteen
function useTelOp(doel: number, ms = 1200): number {
  const [waarde, setWaarde] = useState(0);
  const eerste = useRef(true);
  useEffect(() => {
    if (!eerste.current || doel <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setWaarde(doel); return; }
    eerste.current = false;
    const start = performance.now();
    let frame = 0;
    const stap = (nu: number) => {
      const t = Math.min(1, (nu - start) / ms);
      setWaarde(Math.round(doel * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(stap);
    };
    frame = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(frame);
  }, [doel, ms]);
  return waarde;
}
