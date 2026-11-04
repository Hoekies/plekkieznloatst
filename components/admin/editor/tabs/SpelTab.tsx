"use client";

import type { RouteMetPunten } from "@/components/admin/RouteEditorShell";
import type { Dispatch, SetStateAction } from "react";
import type { PlezierInstellingen } from "@/lib/spelplezier";
import type { PlezierVeld } from "@/components/admin/SpelplezierInstellingen";
import HusselInstelling from "@/components/admin/editor/HusselInstelling";
import { VensterMetKop } from "@/components/shared/Venster";
import { DUEL_PUNTEN_KEUZES } from "@/lib/duel-vragen";
import SpelplezierInstellingen from "@/components/admin/SpelplezierInstellingen";
import { MODUS_INFO, ModusTegel } from "../../RouteModus";

// 🎉 Tabblad Spel: hoe het spel verloopt (tussenstand, duel, spelplezier)
// Alles komt binnen als prop: de stand blijft in RouteEditorShell.tsx.
type Props = {
  route: RouteMetPunten;
  setSpelVenster: Dispatch<SetStateAction<"tussenstand" | "duel" | null>>;
  setTussenstandDuur: Dispatch<SetStateAction<number>>;
  setTussenstandInterval: Dispatch<SetStateAction<number>>;
  slaDuelOp: (velden: { duel_aan?: boolean; duel_punten?: number; }) => Promise<void>;
  slaPlezierInstOp: (nieuw: PlezierInstellingen) => Promise<void>;
  slaPlezierOp: (veld: PlezierVeld, aan: boolean) => Promise<void>;
  slaTussenstandDuurOp: (seconden: number) => Promise<void>;
  slaTussenstandIntervalOp: (minuten: number) => Promise<void>;
  spelVenster: "tussenstand" | "duel" | null;
  tussenstandDuur: number;
  tussenstandInterval: number;
};

export default function SpelTab({ route, setSpelVenster, setTussenstandDuur, setTussenstandInterval, slaDuelOp, slaPlezierInstOp, slaPlezierOp, slaTussenstandDuurOp, slaTussenstandIntervalOp, spelVenster, tussenstandDuur, tussenstandInterval }: Props) {
  return (
    <div className="zijpaneel-inst">
                {/* Spelverloop: elke instelling één regel (naam en stand links, ⚙️ en schakelaar rechts), net als Spelplezier */}
                <div className="plezier-groep">
                  <div className="plezier-groep-titel">⏱️ Spelverloop</div>
                  <div className="plezier-lijst">
                    {/* 🏆 Tussenstand: aan = elke 15 minuten (of wat er stond); ⚙️ = hoe vaak en hoe lang */}
                    <div className={`plezier-rij${tussenstandInterval > 0 ? "" : " plezier-rij--uit"}`}>
                      <div className="plezier-tekst">
                        <strong>🏆 Tussenstand</strong>
                        <span className={`plezier-samenvatting${tussenstandInterval > 0 ? "" : " plezier-samenvatting--uitleg"}`}>
                          {tussenstandInterval > 0 ? `elke ${tussenstandInterval} min · ${tussenstandDuur} s in beeld` : "De spelers zien af en toe de stand van alle teams."}
                        </span>
                      </div>
                      <div className="plezier-knoppen">
                        {<button type="button" className="rl-knop plezier-tandwiel" onClick={() => setSpelVenster("tussenstand")} title="Instellingen tussenstand" aria-label="Instellingen tussenstand">⚙️</button>}
                        <button type="button" className={`rl-knop schakel${tussenstandInterval > 0 ? " schakel--aan" : ""}`} role="switch" aria-checked={tussenstandInterval > 0} aria-label="Tussenstand aan of uit"
                          onClick={() => { const m = tussenstandInterval > 0 ? 0 : 15; setTussenstandInterval(m); slaTussenstandIntervalOp(m); }}>
                          {tussenstandInterval > 0 ? "Aan" : "Uit"}<span className="schakel-bol" aria-hidden />
                        </button>
                      </div>
                    </div>

                    {/* 🔀 Antwoorden husselen: voor de hele route, niet per vraag */}
                    <HusselInstelling routeId={route.id} />

                    {/* ⚔️ Duel: twee teams vlak bij elkaar krijgen dezelfde snelle vraag (migratie 006); ⚙️ = punten */}
                    <div className={`plezier-rij${route.duel_aan ? "" : " plezier-rij--uit"}`} title="Komen twee teams binnen 25 meter van elkaar, dan krijgen ze allebei dezelfde snelle vraag. Wie het eerst goed is, pakt punten van de ander.">
                      <div className="plezier-tekst">
                        <strong>⚔️ Duel</strong>
                        <span className={`plezier-samenvatting${route.duel_aan ? "" : " plezier-samenvatting--uitleg"}`}>
                          {route.duel_aan ? `${route.duel_punten ?? 25} pt per duel` : "Twee teams vlak bij elkaar: snelste goede antwoord pakt punten."}
                        </span>
                      </div>
                      <div className="plezier-knoppen">
                        {<button type="button" className="rl-knop plezier-tandwiel" onClick={() => setSpelVenster("duel")} title="Punten per duel" aria-label="Punten per duel">⚙️</button>}
                        <button type="button" className={`rl-knop schakel${route.duel_aan ? " schakel--aan" : ""}`} role="switch" aria-checked={!!route.duel_aan} aria-label="Duel aan of uit"
                          onClick={() => slaDuelOp({ duel_aan: !route.duel_aan })}>
                          {route.duel_aan ? "Aan" : "Uit"}<span className="schakel-bol" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ⚙️ Tussenstand: hoe vaak en hoe lang in beeld */}
                {spelVenster === "tussenstand" && (
                  <VensterMetKop icoon="🏆" label="Spelverloop" titel="Tussenstand" onSluit={() => setSpelVenster(null)} breedte={420}>
                    <span className="inst-uitleg">De spelers zien af en toe vanzelf de stand van alle teams.</span>
                    <div className="inst-rij">
                      <span className="inst-rij-label">Elke</span>
                      <div className="segment" role="radiogroup" aria-label="Hoe vaak">
                        {[10, 15, 20, 30].map((m) => (
                          <button key={m} type="button" role="radio" aria-checked={tussenstandInterval === m} className={tussenstandInterval === m ? "aan" : ""}
                            onClick={() => { setTussenstandInterval(m); slaTussenstandIntervalOp(m); }}>{m} min</button>
                        ))}
                      </div>
                    </div>
                    <div className="inst-rij">
                      <span className="inst-rij-label">In beeld</span>
                      <div className="segment" role="radiogroup" aria-label="Hoe lang in beeld">
                        {[5, 10, 15, 20].map((sec) => (
                          <button key={sec} type="button" role="radio" aria-checked={tussenstandDuur === sec} className={tussenstandDuur === sec ? "aan" : ""}
                            onClick={() => { setTussenstandDuur(sec); slaTussenstandDuurOp(sec); }}>{sec} s</button>
                        ))}
                      </div>
                    </div>
                    {tussenstandInterval > 0 && ![10, 15, 20, 30].includes(tussenstandInterval) && <span className="inst-uitleg">Nu ingesteld: elke {tussenstandInterval} min.</span>}
                    {tussenstandInterval === 0 && <span className="inst-uitleg">Staat uit: kies hierboven hoe vaak om hem aan te zetten.</span>}
                  </VensterMetKop>
                )}
                {/* ⚙️ Duel: punten per duel */}
                {spelVenster === "duel" && (
                  <VensterMetKop icoon="⚔️" label="Spelverloop" titel="Duel" onSluit={() => setSpelVenster(null)} breedte={420}>
                    <span className="inst-uitleg">Komen twee teams binnen 25 meter van elkaar, dan krijgen ze allebei dezelfde snelle vraag. Wie het eerst goed is, pakt deze punten van de ander.</span>
                    <div className="segment" role="radiogroup" aria-label="Punten per duel">
                      {DUEL_PUNTEN_KEUZES.map((p) => (
                        <button key={p} type="button" role="radio" aria-checked={(route.duel_punten ?? 25) === p} className={(route.duel_punten ?? 25) === p ? "aan" : ""}
                          onClick={() => slaDuelOp({ duel_punten: p })}>{p} pt</button>
                      ))}
                    </div>
                  </VensterMetKop>
                )}

                {/* 🎉 Spelplezier: val, reeks, badges, fotobattle, vliegende schat en rad (migratie 007) */}
                <SpelplezierInstellingen waarden={route} onZet={slaPlezierOp} onInstellingen={slaPlezierInstOp} />

                {/* Speltype: vastgezet bij het aanmaken, alleen ter info */}
                <div className="inst-speltype" title={MODUS_INFO[route.modus].omschrijving}>
                  <ModusTegel modus={route.modus} size={20} />
                  <span>Speltype <strong style={{ color: MODUS_INFO[route.modus].kleur }}>{MODUS_INFO[route.modus].label}</strong> (ligt vast)</span>
                </div>

              </div>
  );
}
