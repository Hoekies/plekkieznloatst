"use client";

import type { Dispatch, SetStateAction } from "react";
import type { DrukPlek, SimLoper } from "@/components/admin/editor/TeamSimulatie";
import type { RoutePunt } from "@/types/database";
import TeamSimulatie from "@/components/admin/editor/TeamSimulatie";

type Plek = { lat: number; lng: number };

// 👫 Tabblad Teams: per team het startpunt en de looprichting
// Alles komt binnen als prop: de stand blijft in RouteEditorShell.tsx.
type Props = {
  doelAfstandKm: number;
  kiesInstapVoor: number | null;
  omgekeerdeTeams: number[];
  setDrukPlekken: Dispatch<SetStateAction<DrukPlek[]>>;
  setKiesInstapVoor: Dispatch<SetStateAction<number | null>>;
  setSimLopers: Dispatch<SetStateAction<SimLoper[]>>;
  setUitgelichtTeam: Dispatch<SetStateAction<number | null>>;
  setVerwachtTeams: Dispatch<SetStateAction<number>>;
  slaVerspreideInstellingenOp: (teams: number, afstand: number) => Promise<void>;
  teamRoutes: { teamIndex: number; kleur: string; nummers: number[]; coords: { lat: number; lng: number; }[]; punten: RoutePunt[]; handmatig: boolean; }[];
  teamRoutesKaart: { stukken: Plek[][]; teamIndex: number; kleur: string; nummers: number[]; coords: { lat: number; lng: number; }[]; punten: RoutePunt[]; handmatig: boolean; }[];
  uitgelichtTeam: number | null;
  verwachtTeams: number;
  vraagPuntIds: Set<string>;
  wisselAndersom: (team: number) => Promise<void>;
  zetInstappunt: (team: number, puntId: string | null) => Promise<void>;
};

export default function TeamsTab({ doelAfstandKm, kiesInstapVoor, omgekeerdeTeams, setDrukPlekken, setKiesInstapVoor, setSimLopers, setUitgelichtTeam, setVerwachtTeams, slaVerspreideInstellingenOp, teamRoutes, teamRoutesKaart, uitgelichtTeam, verwachtTeams, vraagPuntIds, wisselAndersom, zetInstappunt }: Props) {
  return (
    <div className="zijpaneel-inst">
                  {/* Teams input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0 }}>Aantal teams:</span>
                    <input
                      type="number" min={2} max={20} value={verwachtTeams}
                      onChange={(e) => setVerwachtTeams(Math.max(2, Number(e.target.value)))}
                      onBlur={() => slaVerspreideInstellingenOp(verwachtTeams, doelAfstandKm)}
                      style={{
                        width: 56, padding: "3px 7px", fontSize: "0.78rem", fontWeight: 700,
                        background: "rgba(0,217,255,0.07)", border: "1px solid rgba(0,217,255,0.25)",
                        borderRadius: 6, color: "var(--cyan)", outline: "none",
                      }}
                    />
                  </div>

                {teamRoutes.length === 0 ? (
                  <p className="zp-leeg">Zet eerst de punten met <em>Punten</em>. Daarna zie je hier per team waar het begint.</p>
                ) : (
                  <>
                    <span className="inst-uitleg">Tik op een team, of op zijn vlag op de kaart. Elk team begint ergens anders in het rondje.</span>
                    {teamRoutes.map((t) => {
                      const open = uitgelichtTeam === t.teamIndex;
                      const andersom = omgekeerdeTeams.includes(t.teamIndex);
                      return (
                        <div key={t.teamIndex} className={`zp-team${open ? " zp-team--open" : ""}`} style={{ borderColor: open ? t.kleur : undefined }}>
                          <button type="button" className="zp-team-kop" onClick={() => setUitgelichtTeam(open ? null : t.teamIndex)}>
                            <span className="zp-team-vlag" style={{ background: t.kleur }} aria-hidden>T{t.teamIndex}</span>
                            <strong style={{ color: t.kleur }}>Team {t.teamIndex}</strong>
                            <span className="zp-team-info">start {t.nummers[0]} · {andersom ? "↻ andersom" : "→ rechtsom"}</span>
                          </button>
                          <div className="zp-team-knoppen">
                            <button type="button" className={`rl-knop${kiesInstapVoor === t.teamIndex ? " rl-knop--cyan" : ""}`}
                              onClick={() => { setUitgelichtTeam(t.teamIndex); setKiesInstapVoor(kiesInstapVoor === t.teamIndex ? null : t.teamIndex); }}
                              title="Tik daarna op de kaart op het punt waar dit team begint">📍 Ander startpunt</button>
                            <button type="button" className={`rl-knop${andersom ? " rl-knop--cyan" : ""}`} onClick={() => wisselAndersom(t.teamIndex)}
                              title="Dit team loopt het rondje in de andere richting">↻ Andersom lopen</button>
                          </div>
                          {/* 📌 Zelf gekozen startpunt: klein terug naar het berekende */}
                          {t.handmatig && (
                            <button type="button" className="zp-team-auto" onClick={() => zetInstappunt(t.teamIndex, null)} title="Terug naar het berekende startpunt">
                              📌 Zelf gekozen startpunt · <u>Automatisch</u>
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {/* ▶️ Simulatie met alle teams tegelijk, en 🔴 waar ze elkaar tegenkomen */}
                    <TeamSimulatie teams={teamRoutesKaart} vraagIds={vraagPuntIds} onLopers={setSimLopers} onDrukte={setDrukPlekken} />
                  </>
                )}
              </div>
  );
}
