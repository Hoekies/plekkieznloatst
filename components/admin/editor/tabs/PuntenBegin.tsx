"use client";

import type { RoutePunt } from "@/types/database";
import type { RouteMetPunten } from "@/components/admin/RouteEditorShell";
import type { Dispatch, SetStateAction } from "react";
import Icoon from "@/components/admin/Icoon";
import BevestigKnop from "@/components/admin/BevestigKnop";

type Plek = { lat: number; lng: number };

// 📍 Tabblad Punten: het begin (rondje maken of de eerste punten)
// Alles komt binnen als prop: de stand blijft in RouteEditorShell.tsx.
type Props = {
  aantalPunten: number;
  centrumModus: boolean;
  centrumPunt: { lat: number; lng: number; } | null;
  doelAfstandKm: number;
  genereerPuntenInCirkel: () => Promise<boolean>;
  geselecteerd: RoutePunt | null;
  punten: RoutePunt[];
  puntPlekken: { lat: number; lng: number; }[];
  rondjeOpen: boolean;
  route: RouteMetPunten;
  setAantalPunten: Dispatch<SetStateAction<number>>;
  setCentrumModus: Dispatch<SetStateAction<boolean>>;
  setDoelAfstandKm: Dispatch<SetStateAction<number>>;
  slaVerspreideInstellingenOp: (teams: number, afstand: number) => Promise<void>;
  verwachtTeams: number;
  wegen: { afstand: (a: Plek, b: Plek) => number; lijn: (a: Plek, b: Plek) => Plek[]; totaal: (route: Plek[]) => number; compleet: boolean; aan: boolean; herbereken: () => void; bezig: boolean; };
};

export default function PuntenBegin({ aantalPunten, centrumModus, centrumPunt, doelAfstandKm, genereerPuntenInCirkel, geselecteerd, puntPlekken, punten, rondjeOpen, route, setAantalPunten, setCentrumModus, setDoelAfstandKm, slaVerspreideInstellingenOp, verwachtTeams, wegen }: Props) {
  return (
    <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
            {route.modus === "verspreid" && (() => {
              const totaalM = punten.length >= 2 ? wegen.totaal(puntPlekken) : 0;
              const stapM = doelAfstandKm > 0 && punten.length > 0 ? doelAfstandKm * 1000 / punten.length : null;
              const teWeinigPunten = punten.length < verwachtTeams * 2;

              return (
                <>
                  {(rondjeOpen || punten.length === 0) && (
                    <>
                  {/* Doelafstand + Aantal punten op één regel */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0 }}>Afstand:</span>
                    <input
                      type="number" min={0} step={0.1} value={doelAfstandKm}
                      onChange={(e) => setDoelAfstandKm(Math.max(0, Number(e.target.value)))}
                      onBlur={() => slaVerspreideInstellingenOp(verwachtTeams, doelAfstandKm)}
                      style={{
                        width: 52, padding: "3px 7px", fontSize: "0.78rem", fontWeight: 700,
                        background: "rgba(0,217,255,0.07)", border: "1px solid rgba(0,217,255,0.25)",
                        borderRadius: 6, color: "var(--cyan)", outline: "none", flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0 }}>km</span>
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0, marginLeft: 4 }}>Punten:</span>
                    <input
                      type="number" min={3} max={30} value={aantalPunten}
                      onChange={(e) => setAantalPunten(Math.max(3, Math.min(30, Number(e.target.value))))}
                      style={{
                        width: 48, padding: "3px 7px", fontSize: "0.78rem", fontWeight: 700,
                        background: "rgba(0,217,255,0.07)", border: "1px solid rgba(0,217,255,0.25)",
                        borderRadius: 6, color: "var(--cyan)", outline: "none", flexShrink: 0,
                      }}
                    />
                  </div>

                  {/* Middelpunt kiezen */}
                  <button
                    className={`btn ${centrumModus ? "btn-cyan" : centrumPunt ? "btn-ghost" : "btn-primary"}`}
                    style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                    onClick={() => { setCentrumModus((v) => !v); }}>
                    {centrumModus ? <><Icoon naam="aanwijzen" />{" Klik op de kaart voor het middelpunt…"}</> : centrumPunt ? <><Icoon naam="doel" />{" Middelpunt verplaatsen"}</> : <><Icoon naam="doel" />{" Kies het middelpunt op de kaart"}</>}
                  </button>
                  {doelAfstandKm <= 0 && (
                    <div style={{ fontSize: "0.68rem", color: "var(--gold)" }}>
                      Vul een afstand in om het voorstel met {aantalPunten} punten op de kaart te zien.
                    </div>
                  )}

                  {/* Genereer knop */}
                  {centrumPunt && doelAfstandKm > 0 && (
                    <>
                      {punten.length > 0 ? (
                        <BevestigKnop venster icoon="🎲" titel={`De ${punten.length} punten vervangen door nieuwe?`} className="btn btn-cyan" style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                          vraag="" ja="Ja, vervang" onBevestig={async () => { await genereerPuntenInCirkel(); }}>
                          <Icoon naam="dobbelsteen" /> Punten maken in de cirkel
                        </BevestigKnop>
                      ) : (
                        <button className="btn btn-cyan" style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }} onClick={genereerPuntenInCirkel}>
                          <Icoon naam="dobbelsteen" /> Punten maken in de cirkel
                        </button>
                      )}
                    </>
                  )}

                  {/* Live preview */}
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {totaalM > 0 && <div>Gemeten: {(totaalM / 1000).toFixed(2)} km {wegen.compleet ? "🚶 langs wegen en voetpaden" : wegen.aan ? "📏 hemelsbreed (wegen laden…)" : "📏 hemelsbreed"}</div>}
                    {doelAfstandKm > 0 && <div style={{ color: "var(--cyan)" }}>Teams ≈ {(doelAfstandKm / verwachtTeams).toFixed(2)} km uit elkaar</div>}
                    {stapM !== null && punten.length > 0 && <div>Aanbevolen puntafstand: ≈ {Math.round(stapM)} m</div>}
                    {geselecteerd && doelAfstandKm > 0 && punten.length > 0 && (
                      <div style={{ color: "rgba(0,217,255,0.7)" }}>⬤ Cirkel op kaart = aanbevolen afstand</div>
                    )}
                  </div>

                    </>
                  )}

                  {/* Waarschuwing */}
                  {teWeinigPunten && (
                    <div style={{ fontSize: "0.68rem", color: "var(--gold)", background: "var(--gold-soft)", padding: "5px 8px", borderRadius: 6 }}>
                      ⚠ Minimaal {verwachtTeams * 2} punten aanbevolen voor {verwachtTeams} teams
                    </div>
                  )}
                </>
              );
            })()}

            {/* Gemeten afstand voor sequentieel */}
            {route.modus === "sequentieel" && punten.length >= 2 && (() => {
              const totaalM = wegen.totaal(puntPlekken);
              return <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Totale afstand: {(totaalM / 1000).toFixed(1)} km {wegen.compleet ? "🚶 langs wegen en voetpaden" : wegen.aan ? "📏 hemelsbreed (wegen laden…)" : "📏 hemelsbreed"}</span>;
            })()}

          </div>
  );
}
