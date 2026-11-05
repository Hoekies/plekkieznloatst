"use client";

import type { Route, RoutePunt, SpeciaalItem } from "@/types/database";
import type { RouteMetPunten } from "@/components/admin/RouteEditorShell";
import type { Dispatch, SetStateAction } from "react";
import type { ProefStand } from "../proeflopen";
import { vensterHoogte } from "@/components/shared/Venster";
import HuisstijlInstellingen from "../HuisstijlInstellingen";
import Icoon from "@/components/admin/Icoon";
import BevestigKnop from "@/components/admin/BevestigKnop";

// ⚙️ Instellingen van de route (venster over de editor)
// Alles komt binnen als prop: de stand blijft in RouteEditorShell.tsx.
type Props = {
  api: (url: string, init?: RequestInit) => Promise<Response>;
  centrumPunt: { lat: number; lng: number; } | null;
  finishPunt: { lat: number; lng: number; } | null;
  finishZelfde: boolean;
  gebieden: { naam: string; punten: [number, number][]; }[];
  instellingenTab: "punten" | "uiterlijk";
  maakRouteLeeg: () => Promise<void>;
  pasAllePuntenAan: (update: { radius_meters?: number; points?: number; }) => Promise<void>;
  punten: RoutePunt[];
  puntPunten: number;
  puntRadius: number;
  route: RouteMetPunten;
  setGeselecteerd: Dispatch<SetStateAction<RoutePunt | null>>;
  setInstellingenOpen: Dispatch<SetStateAction<boolean>>;
  setInstellingenTab: Dispatch<SetStateAction<"punten" | "uiterlijk">>;
  setProef: Dispatch<SetStateAction<ProefStand | null>>;
  setPuntPunten: Dispatch<SetStateAction<number>>;
  setPuntRadius: Dispatch<SetStateAction<number>>;
  setRoute: Dispatch<SetStateAction<RouteMetPunten>>;
  setStartMeter: Dispatch<SetStateAction<number>>;
  setTekenGebied: Dispatch<SetStateAction<[number, number][] | null>>;
  slaGebiedenOp: (nieuw: { naam: string; punten: [number, number][]; }[]) => Promise<boolean>;
  slaPuzzelOp: (velden: Partial<Route>) => Promise<void>;
  specialeItems: SpeciaalItem[];
  startMeter: number;
};

export default function InstellingenVenster({ api, centrumPunt, finishPunt, finishZelfde, gebieden, instellingenTab, maakRouteLeeg, pasAllePuntenAan, puntPunten, puntRadius, punten, route, setGeselecteerd, setInstellingenOpen, setInstellingenTab, setProef, setPuntPunten, setPuntRadius, setRoute, setStartMeter, setTekenGebied, slaGebiedenOp, slaPuzzelOp, specialeItems, startMeter }: Props) {
  return (
    <div style={{
            position: "fixed", inset: 0, zIndex: 800,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }} onClick={() => setInstellingenOpen(false)}>
            <div style={{
              background: "rgb(var(--o3))", color: "#e8f0ff",
              borderRadius: 18, padding: "16px 18px 20px",
              maxWidth: 560, width: "100%", boxSizing: "border-box", maxHeight: vensterHoogte(90), overflowY: "auto", overflowX: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>⚙️ Instellingen</h2>
                <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => setInstellingenOpen(false)} title="Sluiten" aria-label="Sluiten">✕</button>
              </div>

              {/* inst-inhoud: elke instelling als één regel (naam en korte uitleg links, de keuze rechts) */}
              <div className="inst-inhoud" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Onderwerpen als knoppen */}
                <div className="segment" role="tablist" aria-label="Onderwerp">
                  {([["punten", "📍 Punten"], ["uiterlijk", "🎨 Uiterlijk"]] as [typeof instellingenTab, string][]).map(([t, label]) => (
                    <button key={t} type="button" role="tab" aria-selected={instellingenTab === t} className={instellingenTab === t ? "aan" : ""} onClick={() => setInstellingenTab(t)}>{label}</button>
                  ))}
                </div>
                {/* 9. Eén zin: wat stel je hier in? */}
                <span className="inst-uitleg inst-tab-uitleg">{{
                  punten: "Wat de spelers van de route zien en hoe dichtbij ze bij een punt moeten komen.",
                  uiterlijk: "Hoe de spelersapp eruitziet en klinkt: kleur, logo, welkomstfoto en geluiden.",
                }[instellingenTab]} Spel, items, vragen en teams stel je in met de knoppen in de zijbalk.</span>

                {/* 🎉 Spel, 🎁 Items, ❓ Vragen en 👫 Teams staan in de zijbalk (hoofdknoppen); hier alleen wat zelden verandert */}

                {/* 🎨 Huisstijl en 🔔 geluiden voor de spelers */}
                {instellingenTab === "uiterlijk" && (
                  <HuisstijlInstellingen route={route} onOpslaan={async (velden) => {
                    const res = await api(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(velden) });
                    if (res.ok) setRoute((r) => ({ ...r, ...velden }));
                    return res.ok;
                  }} />
                )}

                {instellingenTab === "punten" && (
                  <>
                    {/* ⛔ Verboden gebieden: overzicht, verwijderen */}
                    <div className="form-group inst-geavanceerd">
                      <label className="form-label">⛔ Verboden gebieden</label>
                      {gebieden.map((g, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                          <span style={{ flex: 1 }}>{g.naam} <span style={{ color: "var(--muted)" }}>· {g.punten.length} hoeken</span></span>
                          <button type="button" className="rl-knop" title="Verwijderen" onClick={() => slaGebiedenOp(gebieden.filter((_, j) => j !== i))}><Icoon naam="wissen" /></button>
                        </div>
                      ))}
                      <button type="button" className="rl-knop" style={{ alignSelf: "flex-start" }}
                        onClick={() => { setInstellingenOpen(false); setTekenGebied([]); setProef(null); setGeselecteerd(null); }}><Icoon naam="plus" /> Gebied tekenen</button>
                      <span className="inst-uitleg">Bijv. een drukke weg of privéterrein. Teams zien het rood op hun kaart en krijgen een waarschuwing als ze erin lopen.</span>
                    </div>
                {/* 🤝 Medespelers mogen meekijken via een link van het team */}
                <div className="form-group">
                  <label className="form-label">🤝 Meespeellink</label>
                  <div className="segment" role="radiogroup" aria-label="Meespeellink">
                    {([[true, "Aan"], [false, "Uit"]] as const).map(([waarde, tekst]) => (
                      <button key={tekst} type="button" role="radio" aria-checked={(route.meespeellink !== false) === waarde}
                        className={(route.meespeellink !== false) === waarde ? "aan" : ""}
                        onClick={async () => {
                          if ((route.meespeellink !== false) === waarde) return;
                          const res = await api(`/api/admin/routes/${route.id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ meespeellink: waarde }),
                          });
                          if (res.ok) setRoute((r) => ({ ...r, meespeellink: waarde }));
                        }}>{tekst}</button>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                    {route.meespeellink !== false ? "Teams kunnen een link delen: medespelers zien de items op het speelveld, de letters, de balk, de score, de voortgang en de resterende tijd, maar niet het volgende punt." : "Teams kunnen geen link delen, en bestaande links tonen niets meer."}
                  </span>
                </div>
                {/* Op volgorde: wat zien de spelers op de kaart */}
                {route.modus === "sequentieel" && (
                  <div className="form-group">
                    <label className="form-label">🗺️ Wat zien de spelers?</label>
                    <div className="segment" role="radiogroup" aria-label="Wat zien de spelers">
                      {([[false, "📍 Alleen volgend punt"], [true, "🗺️ Hele route"]] as const).map(([waarde, tekst]) => (
                        <button key={tekst} type="button" role="radio" aria-checked={!!route.alle_punten_zichtbaar === waarde}
                          className={!!route.alle_punten_zichtbaar === waarde ? "aan" : ""}
                          onClick={async () => {
                            if (!!route.alle_punten_zichtbaar === waarde) return;
                            const res = await api(`/api/admin/routes/${route.id}`, {
                              method: "PATCH", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ alle_punten_zichtbaar: waarde }),
                            });
                            if (res.ok) setRoute((r) => ({ ...r, alle_punten_zichtbaar: waarde }));
                          }}>{tekst}</button>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {route.alle_punten_zichtbaar ? "Alle punten en de lijn ertussen staan meteen op de kaart; het volgende punt knippert." : "Pas na elk punt verschijnt het volgende."} Per punt kies je ❓ Vraag, ℹ️ Info of 🚶 Door (geen scherm).
                    </span>
                  </div>
                )}

                    {route.modus === "verspreid" && (
                      <div className="form-group inst-geavanceerd">
                        <label className="form-label">🚶 Eerste vraag na</label>
                        <span className="inst-uitleg">Meters lopen vanaf de start (0 = meteen).</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input className="form-input" type="number" min={0} max={500} value={startMeter}
                            onChange={(e) => setStartMeter(Math.max(0, Math.min(500, Number(e.target.value))))}
                            onBlur={() => slaPuzzelOp({ startvraag_meter: startMeter })} style={{ width: 100 }} />
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>meter</span>
                        </div>
                      </div>
                    )}
                    <div className="form-group inst-geavanceerd">
                      <label className="form-label">📏 Radius van de punten (m)</label>
                      <input className="form-input" type="number" min={3} value={puntRadius}
                        onChange={(e) => setPuntRadius(Math.max(3, Number(e.target.value)))}
                        onBlur={() => pasAllePuntenAan({ radius_meters: puntRadius })} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Hoe dichtbij een team moet komen. Geldt voor alle punten.</span>
                    </div>
                    {/* Het venster ís al de plek voor zeldzame instellingen: geen extra uitklapknop */}
                    <div className="form-group">
                      <label className="form-label">🏅 Punten voor een punt zonder vraag</label>
                      <input className="form-input" type="number" min={0} value={puntPunten}
                        onChange={(e) => setPuntPunten(Math.max(0, Number(e.target.value)))}
                        onBlur={() => pasAllePuntenAan({ points: puntPunten })} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Voor punten zonder vraag. Vraagpunten: punten bij de vraag zelf.</span>
                    </div>
                    {/* ⚠️ Gevaarlijk: niet in de werkbalk, zodat je het niet per ongeluk aantikt */}
                    {!route.is_active && (
                      <div className="inst-gevaarlijk">
                        <div className="huisstijl-naam"><strong>Route leegmaken</strong><span>Alle punten, vragen en items weg; naam en instellingen blijven</span></div>
                        <BevestigKnop venster icoon="🗑️" titel="Route leegmaken?"
                          vraag="" uitleg={punten.length || specialeItems.length
                            ? `Alle ${punten.length} punten (met hun vragen), ${specialeItems.length} items en de gekozen start en finish gaan weg; naam en instellingen blijven. Dit kan niet ongedaan worden gemaakt.`
                            : "Het gekozen startpunt, de finish en de cirkel gaan weg. Daarna begin je weer bij de eerste stap."}
                          ja="Ja, alles weg" onBevestig={() => { setInstellingenOpen(false); return maakRouteLeeg(); }} disabled={!punten.length && !specialeItems.length && !centrumPunt && !finishPunt && !finishZelfde}
                          className="rl-knop rl-knop--rood">
                          <Icoon naam="wissen" /> Leegmaken
                        </BevestigKnop>
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
  );
}
