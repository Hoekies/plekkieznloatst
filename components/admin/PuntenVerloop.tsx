"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import UitklapPijl from "@/components/shared/UitklapPijl";

type Team = { player_id: string; naam: string; icon: string | null; punten: [number, number][] };

const HOOGTE = 220;
const MARGE = { links: 40, rechts: 64, boven: 12, onder: 26 };

function klok(ms: number) {
  return new Date(ms).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}
// Stand van een team op tijdstip t (traplijn: de stand blijft gelijk tot de volgende verandering)
function standOp(punten: [number, number][], t: number): number | null {
  if (!punten.length || t < punten[0][0]) return null;
  let s = 0;
  for (const [pt, v] of punten) { if (pt > t) break; s = v; }
  return s;
}
// Mooie stappen voor de y-as (0, 50, 100, … of 0, 200, 400, …)
function asStappen(max: number): number[] {
  // Minstens 0–50, zodat de as bij (bijna) geen punten niet in kwartjes gaat
  const ruw = Math.max(50, max) / 4;
  const macht = 10 ** Math.floor(Math.log10(ruw));
  const stap = [1, 2, 2.5, 5, 10].map((f) => f * macht).find((s) => s >= ruw) ?? ruw;
  return Array.from({ length: Math.floor(max / stap) + 2 }, (_, i) => i * stap);
}

// 📈 Puntenverloop: per team een traplijn van de stand door het spel heen, in de vaste teamkleur.
// Wijs aan voor de stand van alle teams op dat moment. Ververst elke halve minuut.
export default function PuntenVerloop({ kleuren }: { kleuren: Map<string, string> }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(() => { try { return localStorage.getItem("pr_puntenverloop") !== "dicht"; } catch { return true; } });
  const [breedte, setBreedte] = useState(600);
  const [wijs, setWijs] = useState<number | null>(null);
  const vakRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const laad = () => fetch("/api/admin/puntenverloop").then((r) => (r.ok ? r.json() : null)).then((d) => d && setTeams(d.teams ?? [])).catch(() => {});
    laad();
    const t = setInterval(laad, 30000);
    return () => clearInterval(t);
  }, [open]);
  useEffect(() => {
    const el = vakRef.current;
    if (!el) return;
    const w = new ResizeObserver(() => setBreedte(el.clientWidth));
    w.observe(el);
    return () => w.disconnect();
  // Het vak bestaat pas als er teams zijn
  }, [open, teams.length > 0]);
  function wissel() {
    setOpen((o) => { try { localStorage.setItem("pr_puntenverloop", o ? "dicht" : "open"); } catch { /* geen opslag */ } return !o; });
  }

  const schaal = useMemo(() => {
    const alle = teams.flatMap((t) => t.punten);
    if (!alle.length) return null;
    const t0 = Math.min(...alle.map((p) => p[0])), t1 = Math.max(...alle.map((p) => p[0]), t0 + 60000);
    const stappen = asStappen(Math.max(...alle.map((p) => p[1])));
    const yMax = stappen[stappen.length - 1];
    const b = breedte - MARGE.links - MARGE.rechts, h = HOOGTE - MARGE.boven - MARGE.onder;
    return {
      t0, t1, stappen, b, h,
      x: (t: number) => MARGE.links + ((t - t0) / (t1 - t0)) * b,
      y: (v: number) => MARGE.boven + h - (v / yMax) * h,
      t: (x: number) => t0 + ((x - MARGE.links) / b) * (t1 - t0),
    };
  }, [teams, breedte]);

  const kop = (
    <button type="button" className="verloop-kop" onClick={wissel} aria-expanded={open}>
      <span>📈 Puntenverloop</span><UitklapPijl open={open} />
    </button>
  );
  if (!open) return <div className="verloop">{kop}</div>;
  if (!schaal || teams.length === 0) return <div className="verloop">{kop}<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Nog geen punten gescoord.</div></div>;

  const kleur = (id: string) => kleuren.get(id) ?? "#A78BFA";
  const lijn = (p: [number, number][]) => p.map(([t, v], i) => {
    const x = schaal.x(t).toFixed(1), y = schaal.y(v).toFixed(1);
    return i === 0 ? `M${x},${y}` : `H${x}V${y}`;
  }).join("");
  // Direct labels aan het eind van de lijn bij hooguit 4 teams; anders alleen de legenda
  const labels = teams.length <= 4;
  const tijdstippen = Array.from({ length: 5 }, (_, i) => schaal.t0 + ((schaal.t1 - schaal.t0) * i) / 4);
  const wijsStand = wijs !== null
    ? teams.map((t) => ({ t, v: standOp(t.punten, wijs) })).filter((r) => r.v !== null).sort((a, b) => b.v! - a.v!)
    : [];

  return (
    <div className="verloop">
      {kop}
      {/* Legenda: altijd (kleur alleen is nooit genoeg) */}
      <div className="verloop-legenda">
        {teams.map((t) => (
          <span key={t.player_id}><i style={{ background: kleur(t.player_id) }} />{t.icon ?? ""} {t.naam}</span>
        ))}
      </div>
      <div ref={vakRef} className="verloop-vak"
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = e.clientX - r.left; setWijs(x >= MARGE.links && x <= breedte - MARGE.rechts ? schaal.t(x) : null); }}
        onPointerLeave={() => setWijs(null)}>
        <svg width={breedte} height={HOOGTE} role="img" aria-label="Puntenverloop per team">
          {/* Rasterlijnen en y-as: rustig op de achtergrond */}
          {schaal.stappen.map((v) => (
            <g key={v}>
              <line x1={MARGE.links} x2={breedte - MARGE.rechts} y1={schaal.y(v)} y2={schaal.y(v)} className="verloop-raster" />
              <text x={MARGE.links - 6} y={schaal.y(v) + 4} textAnchor="end" className="verloop-as">{v}</text>
            </g>
          ))}
          {tijdstippen.map((t, i) => (
            <text key={i} x={schaal.x(t)} y={HOOGTE - 6} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} className="verloop-as">{klok(t)}</text>
          ))}
          {teams.map((t) => (
            <path key={t.player_id} d={lijn(t.punten)} fill="none" stroke={kleur(t.player_id)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* Eindpunt van elke lijn, met (bij weinig teams) icoon en stand erachter */}
          {teams.map((t) => {
            const [lt, lv] = t.punten[t.punten.length - 1];
            return (
              <g key={t.player_id}>
                <circle cx={schaal.x(lt)} cy={schaal.y(lv)} r={4} fill={kleur(t.player_id)} className="verloop-punt" />
                {labels && <text x={schaal.x(lt) + 8} y={schaal.y(lv) + 4} className="verloop-label">{t.icon ?? ""} {lv}</text>}
              </g>
            );
          })}
          {/* Aanwijzen: verticale lijn */}
          {wijs !== null && <line x1={schaal.x(wijs)} x2={schaal.x(wijs)} y1={MARGE.boven} y2={HOOGTE - MARGE.onder} className="verloop-wijs" />}
        </svg>
        {wijs !== null && wijsStand.length > 0 && (
          <div className="verloop-tip" style={{ left: Math.min(schaal.x(wijs) + 10, breedte - 170) }}>
            <strong>{klok(wijs)}</strong>
            {wijsStand.map(({ t, v }) => (
              <span key={t.player_id}><i style={{ background: kleur(t.player_id) }} />{t.icon ?? ""} {t.naam}<b>{v}</b></span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
