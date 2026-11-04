"use client";

import type { Route, RoutePunt } from "@/types/database";
import type { RouteMetPunten } from "@/components/admin/RouteEditorShell";
import type { Dispatch, SetStateAction } from "react";
import Icoon from "@/components/admin/Icoon";
import { lettersVoor, normaliseerPuzzel } from "@/lib/puzzel";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { BonusLijst } from "@/components/admin/BonusKnop";

// ❓ Tabblad Vragen: alle vragen, spiekbriefje, puzzelwoord en bonusvragen
// Alles komt binnen als prop: de stand blijft in RouteEditorShell.tsx.
type Props = {
  alleVragenPunten: RoutePunt[];
  kaartNummer: (p: RoutePunt) => string;
  openVraag: (punt: RoutePunt) => Promise<void>;
  punten: RoutePunt[];
  puzzelLetters: number;
  route: RouteMetPunten;
  setAlleVragenOpen: Dispatch<SetStateAction<boolean>>;
  setPuzzelOpen: Dispatch<SetStateAction<boolean>>;
  setVraagPuntenStd: Dispatch<SetStateAction<number>>;
  slaPuzzelOp: (velden: Partial<Route>) => Promise<void>;
  vraagpunten: RoutePunt[];
  vraagPuntenStd: number;
  vraagPuntIds: Set<string>;
  zetAlleVraagPunten: () => Promise<void>;
};

export default function VragenTab({ alleVragenPunten, kaartNummer, openVraag, punten, puzzelLetters, route, setAlleVragenOpen, setPuzzelOpen, setVraagPuntenStd, slaPuzzelOp, vraagPuntIds, vraagPuntenStd, vraagpunten, zetAlleVraagPunten }: Props) {
  return (
    <div className="zijpaneel-inst">
                <button type="button" className="rl-knop rl-knop--cyan zp-grote-knop" disabled={!alleVragenPunten.length} onClick={() => setAlleVragenOpen(true)}
                  title="Alle vragen achter elkaar invullen, ook de startvraag en de finishopdracht">
                  📝 Alle vragen <span className="editor-telling">{alleVragenPunten.filter((p) => vraagPuntIds.has(p.id)).length}/{alleVragenPunten.length}</span>
                </button>
                {/* 📄 Spiekbriefje: alle punten met vraag en goed antwoord, om af te drukken (nieuw tabblad) */}
                {punten.length > 0 && (
                  <a className="rl-knop zp-grote-knop" href={`/admin/routes/${route.id}/spiekbriefje`} target="_blank" rel="noopener noreferrer"
                    title="Alle punten met de vraag en het goede antwoord, om mee te nemen op de dag zelf (alleen voor jou)">
                    <Icoon naam="klembord" /> Spiekbriefje afdrukken
                  </a>
                )}
                {/* 🧩 Puzzelwoord: bovenaan, in één oogopslag aan of uit en of het aantal letters klopt; tik = instellingen */}
                {(() => {
                  const teVerdienen = vraagpunten.reduce((n, p) => n + lettersVoor(route.puzzel_verdeling, p.id), 0);
                  const verschil = puzzelLetters - teVerdienen;
                  return (
                    <button type="button" className={`puzzel-chip${puzzelLetters ? "" : " puzzel-chip--uit"}`}
                      onClick={() => setPuzzelOpen(true)} title="Puzzelwoord instellen">
                      <span aria-hidden>🧩</span>
                      {!route.puzzel_aan ? <span>Puzzelwoord uit</span>
                        : !puzzelLetters ? <span>Puzzelwoord aan, nog geen woord</span>
                        : <>
                            <strong className="puzzel-chip-woord">{normaliseerPuzzel(route.puzzelwoord)}</strong>
                            <span className={`puzzel-chip-stand${verschil === 0 ? " puzzel-chip-stand--goed" : ""}`}>
                              {verschil === 0 ? `✓ ${puzzelLetters} letters` : verschil > 0 ? `⚠️ ${verschil} te kort` : `⚠️ ${-verschil} te veel`}
                            </span>
                          </>}
                    </button>
                  );
                })()}
                {alleVragenPunten.length === 0 ? (
                  <p className="zp-leeg">Nog geen vraagpunten. Zet eerst punten op de kaart met <em>Punten</em>.</p>
                ) : (
                  <div className="zp-vragen">
                    {alleVragenPunten.map((p) => {
                      const i = punten.findIndex((x) => x.id === p.id);
                      const label = p.type === "eindpunt" && i === punten.length - 1 ? "🏁" : route.modus === "verspreid" && punten.length >= 3 && i === 0 ? "🏠" : kaartNummer(p);
                      const heeft = vraagPuntIds.has(p.id);
                      return (
                        <button key={p.id} type="button" className={`zp-vraag${heeft ? "" : " zp-vraag--leeg"}`} onClick={() => openVraag(p)}
                          title={heeft ? "Vraag ingevuld: tik om te bewerken" : "Nog geen vraag: tik om hem in te vullen"}>
                          <span className="zp-vraag-nr">{label}</span>
                          <span className="zp-vraag-naam">{p.name || "naamloos punt"}</span>
                          <span aria-hidden>{heeft ? "✓" : "⚠️"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                    <div className="form-group">
                      <label className="form-label">❓ Punten per vraag</label>
                      <span className="inst-uitleg">Wat een nieuwe vraag krijgt.</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input className="form-input" type="number" min={0} value={vraagPuntenStd}
                          onChange={(e) => setVraagPuntenStd(Math.max(0, Number(e.target.value)))}
                          onBlur={() => slaPuzzelOp({ vraag_punten: vraagPuntenStd })} style={{ width: 100 }} />
                        <BevestigKnop venster gevaarlijk={false} icoon="❓" titel={`Alle ${vraagpunten.length} vragen op ${vraagPuntenStd} punten zetten?`} vraag=""
                          uitleg="Eigen punten per antwoord blijven staan." ja="Ja, toepassen" disabled={!vraagPuntIds.size}
                          onBevestig={zetAlleVraagPunten} className="rl-knop">Op alle vragen toepassen</BevestigKnop>
                      </div>
                    </div>
                {/* ⚡ Bonusvragen van deze route (ook als hij nog niet actief is); op volgorde van het spel */}
                <div className="form-group">
                  <label className="form-label">⚡ Bonusvragen</label>
                  <BonusLijst routeId={route.id} inEditor />
                </div>

              </div>
  );
}
