"use client";

import type { RouteMetPunten } from "@/components/admin/RouteEditorShell";
import type { Dispatch, SetStateAction } from "react";
import { STARTITEM_TYPES, MAX_PER_STARTITEM, STARTITEMS_METER_KEUZES } from "@/lib/startitems";
import { ITEM_UITLEG } from "../item-uitleg";
import { ITEMS_NA_FINISH } from "@/lib/item-sessie";
import UitklapPijl from "@/components/shared/UitklapPijl";
import Icoon from "@/components/admin/Icoon";

// 🎁 Tabblad Items: instellingen en de lijst met items
// Alles komt binnen als prop: de stand blijft in RouteEditorShell.tsx.
type Props = {
  api: (url: string, init?: RequestInit) => Promise<Response>;
  bomWaarde: number;
  itemRadius: number;
  itemsMeter: number;
  kiesItemsMeter: (m: number) => Promise<void>;
  meerInstellingen: boolean;
  naFinishTypes: string[];
  pasAlleItemsAan: (radius: number) => Promise<void>;
  plekzooiMinuten: number;
  respawnMinuten: number;
  route: RouteMetPunten;
  setBomWaarde: Dispatch<SetStateAction<number>>;
  setItemRadius: Dispatch<SetStateAction<number>>;
  setMeerInstellingen: Dispatch<SetStateAction<boolean>>;
  setPlekzooiMinuten: Dispatch<SetStateAction<number>>;
  setRespawnMinuten: Dispatch<SetStateAction<number>>;
  setRoute: Dispatch<SetStateAction<RouteMetPunten>>;
  setSpookMinuten: Dispatch<SetStateAction<number>>;
  setSterWaarde: Dispatch<SetStateAction<number>>;
  slaItemDuurOp: (veld: "plekzooi_duur_seconden" | "spook_duur_seconden", minuten: number) => Promise<void>;
  slaItemWaardenOp: (ster: number, bom: number) => Promise<void>;
  slaRespawnMinutenOp: (minuten: number) => Promise<void>;
  spookMinuten: number;
  startitems: Record<string, number>;
  sterWaarde: number;
  wijzigStartitem: (type: string, delta: number) => Promise<void>;
  wisselNaFinish: (type: string) => Promise<void>;
};

export default function ItemsTab({ api, bomWaarde, itemRadius, itemsMeter, kiesItemsMeter, meerInstellingen, naFinishTypes, pasAlleItemsAan, plekzooiMinuten, respawnMinuten, route, setBomWaarde, setItemRadius, setMeerInstellingen, setPlekzooiMinuten, setRespawnMinuten, setRoute, setSpookMinuten, setSterWaarde, slaItemDuurOp, slaItemWaardenOp, slaRespawnMinutenOp, spookMinuten, startitems, sterWaarde, wijzigStartitem, wisselNaFinish }: Props) {
  return (
    <div className="zijpaneel-inst">
                {/* Startitems */}
                {(
                  <div className="form-group">
                    <label className="form-label">🎒 Startitems — gratis bij de start</label>
                    {/* Alle soorten op één rij: de vakjes krimpen mee met de breedte */}
                    <div style={{ display: "flex", flexWrap: "nowrap", gap: 6, padding: "6px 8px 6px 0" }}>
                      {STARTITEM_TYPES.map((type) => {
                        const n = startitems[type] ?? 0;
                        return (
                          // Tik = er één bij; het rode − haalt er één af
                          <div key={type} style={{ position: "relative", flex: "1 1 0", minWidth: 0, maxWidth: 40 }}>
                            <button type="button" onClick={() => wijzigStartitem(type, 1)} disabled={n >= MAX_PER_STARTITEM}
                              title={`${ITEM_UITLEG[type] ?? type} Tik = +1 (max ${MAX_PER_STARTITEM}).`}
                              style={{
                                width: "100%", aspectRatio: "1", borderRadius: 8, cursor: n >= MAX_PER_STARTITEM ? "default" : "pointer", padding: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: `1px solid ${n > 0 ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.12)"}`,
                                background: n > 0 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                              }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/items/${type}.webp`} alt={type} style={{ width: "65%", height: "65%", objectFit: "contain", opacity: n > 0 ? 1 : 0.35, filter: n > 0 ? "none" : "grayscale(1)" }} />
                            </button>
                            {n > 0 && (
                              <>
                                <span style={{
                                  position: "absolute", top: -6, right: -6, minWidth: 17, height: 17, borderRadius: 9, padding: "0 4px",
                                  background: "var(--green)", color: "#06240f", fontSize: "0.7rem", fontWeight: 800,
                                  display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
                                }}>{n}</span>
                                <button type="button" onClick={() => wijzigStartitem(type, -1)} title="Eén minder"
                                  style={{
                                    position: "absolute", bottom: -6, right: -6, width: 17, height: 17, borderRadius: 9, padding: 0,
                                    border: "none", background: "#ef4444", color: "#fff", fontSize: "0.8rem", fontWeight: 800, lineHeight: 1,
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>−</button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Na hoeveel meter lopen: 0 = meteen bij het begin */}
                    <div className="segment" role="radiogroup" aria-label="Startitems na hoeveel meter" style={{ marginTop: 4 }}>
                      {STARTITEMS_METER_KEUZES.map((m) => (
                        <button key={m} type="button" role="radio" aria-checked={itemsMeter === m} className={itemsMeter === m ? "aan" : ""}
                          onClick={() => kiesItemsMeter(m)}>{m === 0 ? "Meteen" : `${m} m`}</button>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      Tik op een item voor +1. Elk team krijgt dit {itemsMeter === 0 ? "meteen bij het begin" : `na ${itemsMeter} meter lopen`} in de balk.
                    </span>
                  </div>
                )}

                {/* Items na de finish */}
                {(
                  <div className="form-group inst-geavanceerd">
                    <label className="form-label">🎁 Items inzetten na de finish</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ITEMS_NA_FINISH.map((type) => {
                        const aan = naFinishTypes.includes(type);
                        return (
                          <button key={type} type="button" onClick={() => wisselNaFinish(type)}
                            title={`${ITEM_UITLEG[type] ?? type}${aan ? " (mag na de finish)" : ""}`}
                            style={{
                              width: 40, height: 40, borderRadius: 8, cursor: "pointer", padding: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: `1px solid ${aan ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.12)"}`,
                              background: aan ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                            }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/items/${type}.webp`} alt={type} style={{ width: 26, height: 26, opacity: aan ? 1 : 0.35, filter: aan ? "none" : "grayscale(1)" }} />
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {naFinishTypes.length
                        ? "Groen = mag na de finish nog, tot de uitslag vrij is. Een gefinisht team inzetten én raken (bom, wissel); de rest vervalt bij de finish."
                        : "Tik items aan die na de finish nog mogen. Nu vervalt alles bij de finish."}
                    </span>
                  </div>
                )}

                <button type="button" className="es-link" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setMeerInstellingen((m) => !m)} aria-expanded={meerInstellingen}>
                  <UitklapPijl open={meerInstellingen} /> {meerInstellingen ? "Minder instellingen" : <><Icoon naam="instellingen" />{" Meer instellingen"}</>}
                </button>
                {meerInstellingen && <>
                    <div className="form-group inst-geavanceerd">
                      <label className="form-label">📏 Radius van de items (m)</label>
                      <input className="form-input" type="number" min={3} value={itemRadius}
                        onChange={(e) => setItemRadius(Math.max(3, Number(e.target.value)))}
                        onBlur={() => pasAlleItemsAan(itemRadius)} style={{ width: 120 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Hoe dichtbij een team moet komen. Geldt voor alle items.</span>
                    </div>
                </>}
                {/* Item-waarden (sequentieel heeft geen sterren of bommen) */}
                {meerInstellingen && route.modus === "verspreid" && (
                  <div className="form-group inst-geavanceerd">
                    <label className="form-label">⭐ Item-waarden</label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Ster</span>
                        <input
                          className="form-input" type="number" min={1} value={sterWaarde}
                          onChange={(e) => setSterWaarde(Math.max(1, Number(e.target.value)))}
                          onBlur={() => slaItemWaardenOp(sterWaarde, bomWaarde)}
                          style={{ width: "100%", boxSizing: "border-box", color: "var(--gold)", fontWeight: 700 }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Bom</span>
                        <input
                          className="form-input" type="number" min={1} value={bomWaarde}
                          onChange={(e) => setBomWaarde(Math.max(1, Number(e.target.value)))}
                          onBlur={() => slaItemWaardenOp(sterWaarde, bomWaarde)}
                          style={{ width: "100%", boxSizing: "border-box", color: "var(--red)", fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Duur van spook en plekzooi */}
                {meerInstellingen && (
                  <div className="form-group inst-geavanceerd">
                    <label className="form-label">⏱️ Duur van effecten (minuten)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {route.modus === "verspreid" && <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>👻 Spook</span>
                        <input
                          className="form-input" type="number" min={0.5} step={0.5} value={spookMinuten}
                          onChange={(e) => setSpookMinuten(Math.max(0.5, Number(e.target.value)))}
                          onBlur={() => slaItemDuurOp("spook_duur_seconden", spookMinuten)}
                          style={{ width: "100%", boxSizing: "border-box", fontWeight: 700 }}
                        />
                      </div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>⛔ Plekzooi</span>
                        <input
                          className="form-input" type="number" min={0.5} step={0.5} value={plekzooiMinuten}
                          onChange={(e) => setPlekzooiMinuten(Math.max(0.5, Number(e.target.value)))}
                          onBlur={() => slaItemDuurOp("plekzooi_duur_seconden", plekzooiMinuten)}
                          style={{ width: "100%", boxSizing: "border-box", fontWeight: 700 }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {route.modus === "verspreid" && "Spook: punt onzichtbaar · "}Plek zooi: team staat stil
                    </span>
                  </div>
                )}

                {/* Respawn */}
                {meerInstellingen && route.modus === "verspreid" && (
                  <div className="form-group inst-geavanceerd">
                    <label className="form-label">🔄 Respawn (bij een Rondje)</label>
                    <span className="inst-uitleg">Een opgepakt item komt na een tijdje terug op dezelfde plek.</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="segment" role="radiogroup" aria-label="Respawn" style={{ width: 150 }}>
                        {([false, true] as const).map((aan) => (
                          <button key={String(aan)} type="button" role="radio" aria-checked={!!route.item_respawn === aan} className={!!route.item_respawn === aan ? "aan" : ""}
                            onClick={async () => {
                              if (!!route.item_respawn === aan) return;
                              const res = await api(`/api/admin/routes/${route.id}`, {
                                method: "PATCH", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ item_respawn: aan }),
                              });
                              if (res.ok) setRoute((r) => ({ ...r, item_respawn: aan }));
                            }}>{aan ? "Aan" : "Uit"}</button>
                        ))}
                      </div>
                      {route.item_respawn && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="number" min={1} value={respawnMinuten}
                            onChange={(e) => setRespawnMinuten(Math.max(1, Number(e.target.value)))}
                            onBlur={() => slaRespawnMinutenOp(respawnMinuten)}
                            style={{
                              width: 56, fontSize: "0.78rem", padding: "5px 8px", borderRadius: 6,
                              border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)",
                              color: "var(--green)", textAlign: "center",
                            }}
                          />
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>min</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
  );
}
