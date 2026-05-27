"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Route, RoutePunt, SpeciaalItem, SpeciaalItemType } from "@/types/database";
import { haversine } from "@/lib/geo";

const LeafletKaart = dynamic(() => import("./LeafletKaart"), { ssr: false, loading: () => <div style={{ flex: 1, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Kaart laden…</div> });

type RouteMetPunten = Route & { route_points: RoutePunt[] };

export default function RouteEditorShell({ route: initRoute }: { route: RouteMetPunten }) {
  const [route, setRoute] = useState(initRoute);
  const [punten, setPunten] = useState<RoutePunt[]>(initRoute.route_points ?? []);
  const [geselecteerd, setGeselecteerd] = useState<RoutePunt | null>(null);
  const [addModus, setAddModus] = useState(false);
  const [addSpeciaalModus, setAddSpeciaalModus] = useState(false);
  const [specialeItems, setSpecialeItems] = useState<SpeciaalItem[]>([]);
  const [geselecteerdSpeciaal, setGeselecteerdSpeciaal] = useState<SpeciaalItem | null>(null);
  const [actieveTab, setActieveTab] = useState<"punten" | "items">("punten");
  const [opslaan, setOpslaan] = useState(false);
  const [naamWijzig, setNaamWijzig] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState(route.name);
  const [fout, setFout] = useState("");
  const [verwachtTeams, setVerwachtTeams] = useState(initRoute.verwacht_aantal_teams ?? 2);
  const [doelAfstandKm, setDoelAfstandKm] = useState(initRoute.doel_afstand_km ?? 0);

  useEffect(() => {
    fetch(`/api/admin/routes/${route.id}/speciaal`).then((r) => r.ok ? r.json() : []).then(setSpecialeItems);
  }, [route.id]);

  async function herlaadPunten() {
    const res = await fetch(`/api/admin/routes/${route.id}/punten`);
    if (res.ok) setPunten(await res.json());
  }

  async function kaartKlik(lat: number, lng: number) {
    if (addSpeciaalModus) {
      const res = await fetch(`/api/admin/routes/${route.id}/speciaal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, type: "ster", name: "Speciaal item", points_effect: 50 }),
      });
      if (res.ok) {
        const nieuw: SpeciaalItem = await res.json();
        setSpecialeItems((p) => [...p, nieuw]);
        setGeselecteerdSpeciaal(nieuw);
        setAddSpeciaalModus(false);
      }
      return;
    }
    const res = await fetch(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, points: 10 }),
    });
    if (res.ok) {
      const nieuw: RoutePunt = await res.json();
      setPunten((p) => [...p, nieuw]);
      setGeselecteerd(nieuw);
      setAddModus(false);
    }
  }

  async function verwijderSpeciaalItem(id: string) {
    if (!confirm("Speciaal item verwijderen?")) return;
    await fetch(`/api/admin/routes/${route.id}/speciaal/${id}`, { method: "DELETE" });
    if (geselecteerdSpeciaal?.id === id) setGeselecteerdSpeciaal(null);
    setSpecialeItems((p) => p.filter((i) => i.id !== id));
  }

  async function slaSpeciaalItemOp(id: string, update: Partial<SpeciaalItem>) {
    const res = await fetch(`/api/admin/routes/${route.id}/speciaal/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      const bijgewerkt: SpeciaalItem = await res.json();
      setSpecialeItems((p) => p.map((i) => i.id === id ? bijgewerkt : i));
      setGeselecteerdSpeciaal(bijgewerkt);
    }
  }

  async function markerVerplaatst(id: string, lat: number, lng: number) {
    await fetch(`/api/admin/routes/${route.id}/punten/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    setPunten((p) => p.map((pt) => pt.id === id ? { ...pt, latitude: lat, longitude: lng } : pt));
  }

  async function verwijderPunt(id: string) {
    if (!confirm("Punt verwijderen?")) return;
    await fetch(`/api/admin/routes/${route.id}/punten/${id}`, { method: "DELETE" });
    if (geselecteerd?.id === id) setGeselecteerd(null);
    await herlaadPunten();
  }

  async function verplaatsVolgorde(id: string, richting: "omhoog" | "omlaag") {
    const idx = punten.findIndex((p) => p.id === id);
    if (richting === "omhoog" && idx === 0) return;
    if (richting === "omlaag" && idx === punten.length - 1) return;
    const nieuw = [...punten];
    const wissel = richting === "omhoog" ? idx - 1 : idx + 1;
    [nieuw[idx], nieuw[wissel]] = [nieuw[wissel], nieuw[idx]];
    setPunten(nieuw);
    await fetch(`/api/admin/routes/${route.id}/punten/volgorde`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volgorde: nieuw.map((p) => p.id) }),
    });
  }

  async function slaRouteNaamOp() {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuweNaam }),
    });
    if (res.ok) { setRoute((r) => ({ ...r, name: nieuweNaam })); setNaamWijzig(false); }
  }

  async function slaVerspreideInstellingenOp(teams: number, afstand: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verwacht_aantal_teams: teams, doel_afstand_km: afstand }),
    });
    if (res.ok) setRoute((r) => ({ ...r, verwacht_aantal_teams: teams, doel_afstand_km: afstand }));
  }

  async function slaPuntOp(update: Partial<RoutePunt>) {
    if (!geselecteerd) return;
    setOpslaan(true); setFout("");
    const res = await fetch(`/api/admin/routes/${route.id}/punten/${geselecteerd.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      const bijgewerkt = await res.json();
      setPunten((p) => p.map((pt) => pt.id === bijgewerkt.id ? bijgewerkt : pt));
      setGeselecteerd(bijgewerkt);
    } else setFout("Opslaan mislukt");
    setOpslaan(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Topbar */}
      <div className="admin-topbar" style={{ gap: 12 }}>
        <a href="/admin/routes" className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "7px 14px", flexShrink: 0 }}>← Routes</a>
        {naamWijzig ? (
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            <input className="form-input" value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} style={{ flex: 1 }} autoFocus />
            <button className="btn btn-primary" onClick={slaRouteNaamOp}>Opslaan</button>
            <button className="btn btn-ghost" onClick={() => setNaamWijzig(false)}>✕</button>
          </div>
        ) : (
          <h1 style={{ flex: 1, cursor: "pointer" }} onClick={() => setNaamWijzig(true)} title="Klik om naam te wijzigen">
            {route.name} <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>✏️</span>
          </h1>
        )}
        <StatusPil status={route.status} isActief={route.is_active} />
        {!route.is_active && (
          <button className="btn btn-ghost" style={{ fontSize: "0.82rem" }}
            onClick={async () => {
              const nieuweStatus = route.status === "gepubliceerd" ? "concept" : "gepubliceerd";
              const res = await fetch(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nieuweStatus }) });
              if (res.ok) setRoute((r) => ({ ...r, status: nieuweStatus }));
            }}>
            {route.status === "gepubliceerd" ? "↩ Concept" : "📢 Publiceer"}
          </button>
        )}
        {!route.is_active && route.status === "gepubliceerd" && (
          <button className="btn btn-cyan" style={{ fontSize: "0.82rem" }}
            onClick={async () => {
              const res = await fetch(`/api/admin/routes/${route.id}/activeren`, { method: "POST" });
              if (res.ok) setRoute((r) => ({ ...r, is_active: true }));
            }}>▶ Activeer</button>
        )}
        {route.is_active && (
          <button className="btn btn-danger" style={{ fontSize: "0.82rem" }}
            onClick={async () => {
              if (!confirm("Route deactiveren en terugzetten naar concept?")) return;
              const res = await fetch(`/api/admin/routes/${route.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: false, status: "concept" }),
              });
              if (res.ok) setRoute((r) => ({ ...r, is_active: false, status: "concept" }));
            }}>⏹ Deactiveer</button>
        )}
      </div>

      {/* Hoofdindeling */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Zijpaneel */}
        <div style={{ width: 300, background: "rgba(8,28,48,0.82)", backdropFilter: "blur(18px)", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Routemodus + afstand */}
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>Modus:</span>
              {(["sequentieel", "verspreid"] as const).map((m) => (
                <button key={m}
                  onClick={async () => {
                    if (route.modus === m) return;
                    const res = await fetch(`/api/admin/routes/${route.id}`, {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ modus: m }),
                    });
                    if (res.ok) setRoute((r) => ({ ...r, modus: m }));
                  }}
                  style={{
                    flex: 1, fontSize: "0.72rem", fontWeight: 600, padding: "4px 6px",
                    borderRadius: 7, border: "1px solid", cursor: "pointer",
                    background: route.modus === m ? "rgba(0,217,255,0.12)" : "transparent",
                    borderColor: route.modus === m ? "rgba(0,217,255,0.35)" : "rgba(255,255,255,0.12)",
                    color: route.modus === m ? "var(--cyan)" : "var(--muted)",
                  }}>
                  {m === "sequentieel" ? "Sequentieel" : "Verspreid (lus)"}
                </button>
              ))}
            </div>

            {route.modus === "verspreid" && (() => {
              const totaalM = punten.length >= 2 ? punten.reduce((som, pt, i) => {
                if (i === 0) return som;
                const v = punten[i - 1];
                return som + haversine(v.latitude, v.longitude, pt.latitude, pt.longitude);
              }, 0) : 0;
              const stapM = doelAfstandKm > 0 && punten.length > 0 ? doelAfstandKm * 1000 / punten.length : null;
              const teWeinigPunten = punten.length < verwachtTeams * 2;

              return (
                <>
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

                  {/* Doelafstand input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)", flexShrink: 0 }}>Doelafstand:</span>
                    <input
                      type="number" min={0} step={0.1} value={doelAfstandKm}
                      onChange={(e) => setDoelAfstandKm(Math.max(0, Number(e.target.value)))}
                      onBlur={() => slaVerspreideInstellingenOp(verwachtTeams, doelAfstandKm)}
                      style={{
                        width: 66, padding: "3px 7px", fontSize: "0.78rem", fontWeight: 700,
                        background: "rgba(0,217,255,0.07)", border: "1px solid rgba(0,217,255,0.25)",
                        borderRadius: 6, color: "var(--cyan)", outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "0.70rem", color: "var(--muted)" }}>km</span>
                  </div>

                  {/* Live preview */}
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {totaalM > 0 && <div>Gemeten: {(totaalM / 1000).toFixed(2)} km</div>}
                    {doelAfstandKm > 0 && <div style={{ color: "var(--cyan)" }}>Teams ≈ {(doelAfstandKm / verwachtTeams).toFixed(2)} km uit elkaar</div>}
                    {stapM !== null && punten.length > 0 && <div>Aanbevolen puntafstand: ≈ {Math.round(stapM)} m</div>}
                    {geselecteerd && doelAfstandKm > 0 && punten.length > 0 && (
                      <div style={{ color: "rgba(0,217,255,0.7)" }}>⬤ Cirkel op kaart = aanbevolen afstand</div>
                    )}
                  </div>

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
              const totaalM = punten.reduce((som, pt, i) => {
                if (i === 0) return som;
                const vorige = punten[i - 1];
                return som + haversine(vorige.latitude, vorige.longitude, pt.latitude, pt.longitude);
              }, 0);
              return <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Totale afstand: {(totaalM / 1000).toFixed(1)} km</span>;
            })()}
          </div>

          {/* Tabbladen */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
            <button
              onClick={() => { setActieveTab("punten"); setAddSpeciaalModus(false); }}
              style={{
                flex: 1, padding: "10px 0", fontSize: "0.82rem", fontWeight: 700,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: actieveTab === "punten" ? "2px solid var(--cyan)" : "2px solid transparent",
                color: actieveTab === "punten" ? "var(--cyan)" : "var(--muted)",
              }}>
              📍 Punten ({punten.length})
            </button>
            <button
              onClick={() => { setActieveTab("items"); setAddModus(false); }}
              style={{
                flex: 1, padding: "10px 0", fontSize: "0.82rem", fontWeight: 700,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: actieveTab === "items" ? "2px solid var(--cyan)" : "2px solid transparent",
                color: actieveTab === "items" ? "var(--cyan)" : "var(--muted)",
              }}>
              ⭐ Items ({specialeItems.length})
            </button>
          </div>

          {/* Toevoegen-knop */}
          <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)" }}>
            {actieveTab === "punten" ? (
              <button
                className={`btn ${addModus ? "btn-cyan" : "btn-primary"}`}
                style={{ width: "100%", fontSize: "0.82rem" }}
                onClick={() => { setAddModus((v) => !v); setAddSpeciaalModus(false); }}>
                {addModus ? "✅ Klik op kaart om punt te plaatsen…" : "📍 Punt toevoegen"}
              </button>
            ) : (
              <button
                className={`btn ${addSpeciaalModus ? "btn-cyan" : "btn-ghost"}`}
                style={{ width: "100%", fontSize: "0.82rem" }}
                onClick={() => { setAddSpeciaalModus((v) => !v); setAddModus(false); }}>
                {addSpeciaalModus ? "✅ Klik op kaart om item te plaatsen…" : "⭐ Item toevoegen"}
              </button>
            )}
          </div>

          {/* Tab-inhoud */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>

            {/* Punten-tab */}
            {actieveTab === "punten" && (
              punten.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Klik op &ldquo;Punt toevoegen&rdquo; en tik op de kaart om een punt te plaatsen.
                </p>
              ) : punten.map((pt, i) => (
                <div key={pt.id}
                  onClick={() => setGeselecteerd(geselecteerd?.id === pt.id ? null : pt)}
                  style={{
                    padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                    background: geselecteerd?.id === pt.id ? "rgba(255,255,255,0.12)" : "transparent",
                    borderLeft: geselecteerd?.id === pt.id ? "3px solid #60A5FA" : "3px solid transparent",
                  }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: pt.type === "eindpunt" ? "var(--gold)" : pt.type === "informatiepunt" ? "var(--cyan)" : "var(--blue)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.72rem", fontWeight: 700,
                  }}>{pt.type === "eindpunt" ? "🏁" : i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>{pt.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {pt.type === "vraagpunt" ? "Vraagpunt" : pt.type === "informatiepunt" ? "Infopunt" : "Eindpunt"} · {pt.radius_meters}m
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omhoog"); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: i === 0 ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▲</button>
                    <button onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omlaag"); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: i === punten.length - 1 ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▼</button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); verwijderPunt(pt.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.85rem", padding: "2px 4px" }}>🗑️</button>
                </div>
              ))
            )}

            {/* Items-tab */}
            {actieveTab === "items" && (
              specialeItems.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Klik op &ldquo;Item toevoegen&rdquo; en tik op de kaart om een item te plaatsen.
                </p>
              ) : specialeItems.map((item) => {
                const emoji = { spook: "👻", bom: "💣", ster: "⭐", verdubbeling: "🔴", wissel: "🔄", dief: "🦹", radar: "📡", banaan: "🍌", plekzooi: "⛔" }[item.type] ?? "?";
                return (
                  <div key={item.id}
                    onClick={() => setGeselecteerdSpeciaal(geselecteerdSpeciaal?.id === item.id ? null : item)}
                    style={{
                      padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      background: geselecteerdSpeciaal?.id === item.id ? "rgba(255,255,255,0.12)" : "transparent",
                      borderLeft: geselecteerdSpeciaal?.id === item.id ? "3px solid #60A5FA" : "3px solid transparent",
                    }}>
                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>{item.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                        {item.type} · {item.radius_meters}m{item.claimed && " · geclaimd"}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); verwijderSpeciaalItem(item.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.85rem", padding: "2px 4px" }}>🗑️</button>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Kaart */}
        <LeafletKaart
          punten={punten}
          addModus={addModus || addSpeciaalModus}
          geselecteerdId={geselecteerd?.id ?? null}
          specialeItems={specialeItems}
          guideCirkel={
            route.modus === "verspreid" && doelAfstandKm > 0 && geselecteerd && punten.length > 0
              ? { lat: geselecteerd.latitude, lng: geselecteerd.longitude, radiusM: doelAfstandKm * 1000 / punten.length }
              : null
          }
          onKlik={kaartKlik}
          onMarkerVerplaatst={markerVerplaatst}
          onMarkerKlik={(id) => setGeselecteerd(punten.find((p) => p.id === id) ?? null)}
        />

        {/* Rechter bewerkdrawer */}
        {(geselecteerd || (geselecteerdSpeciaal && !geselecteerd)) && (
          <div style={{
            position: "absolute",
            right: 0, top: 0, bottom: 0,
            width: 340,
            zIndex: 500,
            background: "rgba(8,28,48,0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255,255,255,0.12)",
            display: "flex", flexDirection: "column",
            overflowY: "auto",
          }}>
            {geselecteerd && (
              <PuntForm
                punt={geselecteerd}
                routeId={route.id}
                opslaan={opslaan}
                fout={fout}
                onOpslaan={slaPuntOp}
                onSluit={() => setGeselecteerd(null)}
              />
            )}
            {geselecteerdSpeciaal && !geselecteerd && (
              <SpeciaalItemForm
                item={geselecteerdSpeciaal}
                onOpslaan={(update) => slaSpeciaalItemOp(geselecteerdSpeciaal.id, update)}
                onSluit={() => setGeselecteerdSpeciaal(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── StatusPil ─────────────────────────────────────────────────────────────────
function StatusPil({ status, isActief }: { status: string; isActief: boolean }) {
  if (isActief) return <span style={{ background: "var(--green-soft)", color: "var(--green)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>✓ Actief</span>;
  if (status === "gepubliceerd") return <span style={{ background: "var(--cyan-soft)", color: "var(--cyan)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>Gepubliceerd</span>;
  return <span style={{ background: "var(--line)", color: "var(--muted)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>Concept</span>;
}

// ── SpeciaalItemForm ──────────────────────────────────────────────────────────
function SpeciaalItemForm({ item, onOpslaan, onSluit }: {
  item: SpeciaalItem;
  onOpslaan: (u: Partial<SpeciaalItem>) => void;
  onSluit: () => void;
}) {
  const [naam, setNaam] = useState(item.name);
  const [type, setType] = useState<SpeciaalItemType>(item.type);
  const [radius, setRadius] = useState(item.radius_meters);
  const [effect, setEffect] = useState(item.points_effect);

  useEffect(() => {
    setNaam(item.name); setType(item.type); setRadius(item.radius_meters); setEffect(item.points_effect);
  }, [item.id]);

  const heeftPunten = type === "ster" || type === "bom";
  const heeftDuur = type === "plekzooi";

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "14px", background: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>Speciaal item bewerken</span>
        <button onClick={onSluit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1rem" }}>✕</button>
      </div>
      <div className="form-group">
        <label className="form-label">Naam</label>
        <input className="form-input" value={naam} onChange={(e) => setNaam(e.target.value)} style={{ fontSize: "0.85rem" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={type} onChange={(e) => setType(e.target.value as SpeciaalItemType)} style={{ fontSize: "0.85rem" }}>
            <option value="ster">⭐ Ster</option>
            <option value="bom">💣 Bom</option>
            <option value="spook">👻 Spook</option>
            <option value="verdubbeling">🔴 Verdubbeling</option>
            <option value="wissel">🔄 Wissel</option>
            <option value="dief">🦹 Dief</option>
            <option value="radar">📡 Radar</option>
            <option value="banaan">🍌 Banaan</option>
            <option value="plekzooi">⛔ Plek zooi</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Radius (m)</label>
          <input className="form-input" type="number" min={1} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
        </div>
      </div>
      {heeftPunten && (
        <div className="form-group">
          <label className="form-label">{type === "bom" ? "Aftrek punten" : "Bonus punten"}</label>
          <input className="form-input" type="number" min={0} value={Math.abs(effect)} onChange={(e) => setEffect(type === "bom" ? -Number(e.target.value) : Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
        </div>
      )}
      {heeftDuur && (
        <div className="form-group">
          <label className="form-label">Blokkeer duur (seconden)</label>
          <input className="form-input" type="number" min={10} value={effect || 120} onChange={(e) => setEffect(Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>bijv. 60 = 1 min · 120 = 2 min · 180 = 3 min</span>
        </div>
      )}
      {type === "plekzooi" && (
        <div style={{ fontSize: "0.72rem", color: "var(--gold)", background: "var(--gold-soft)", padding: "8px 10px", borderRadius: 8 }}>
          ⚠️ Plek zooi is <strong>onzichtbaar</strong> voor spelers — zij zien geen icoontje op de kaart.
        </div>
      )}
      {item.claimed && <div className="melding" style={{ fontSize: "0.78rem", background: "var(--gold-soft)", color: "var(--gold)" }}>✅ Dit item is al geclaimd</div>}
      <button className="btn btn-primary" style={{ width: "100%", fontSize: "0.85rem" }}
        onClick={() => onOpslaan({ name: naam, type, radius_meters: radius, points_effect: effect })}>
        Opslaan
      </button>
    </div>
  );
}

// ── PuntForm ──────────────────────────────────────────────────────────────────
function PuntForm({ punt, routeId, opslaan, fout, onOpslaan, onSluit }: {
  punt: RoutePunt; routeId: string; opslaan: boolean; fout: string;
  onOpslaan: (u: Partial<RoutePunt>) => void; onSluit: () => void;
}) {
  const [naam, setNaam] = useState(punt.name);
  const [beschrijving, setBeschrijving] = useState(punt.description ?? "");
  const [type, setType] = useState(punt.type);
  const [radius, setRadius] = useState(punt.radius_meters);
  const [punten, setPunten] = useState(punt.points);

  useEffect(() => {
    setNaam(punt.name); setBeschrijving(punt.description ?? ""); setType(punt.type);
    setRadius(punt.radius_meters); setPunten(punt.points);
  }, [punt.id]);

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "14px", background: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>Punt bewerken</span>
        <button onClick={onSluit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1rem" }}>✕</button>
      </div>
      <div className="form-group">
        <label className="form-label">Naam</label>
        <input className="form-input" value={naam} onChange={(e) => setNaam(e.target.value)} style={{ fontSize: "0.85rem" }} />
      </div>
      <div className="form-group">
        <label className="form-label">Beschrijving</label>
        <textarea className="form-textarea" value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} style={{ fontSize: "0.85rem", minHeight: 52 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={type} onChange={(e) => setType(e.target.value as RoutePunt["type"])} style={{ fontSize: "0.85rem" }}>
            <option value="vraagpunt">Vraagpunt</option>
            <option value="informatiepunt">Infopunt</option>
            <option value="eindpunt">Eindpunt</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Radius (m)</label>
          <input className="form-input" type="number" min={1} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Punten</label>
        <input className="form-input" type="number" min={0} value={punten} onChange={(e) => setPunten(Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
      </div>
      {fout && <div className="melding melding-fout" style={{ fontSize: "0.78rem" }}>⚠️ {fout}</div>}
      <button className="btn btn-primary" style={{ width: "100%", fontSize: "0.85rem" }} disabled={opslaan}
        onClick={() => onOpslaan({ name: naam, description: beschrijving, type, radius_meters: radius, points: punten })}>
        {opslaan ? "Opslaan…" : "Opslaan"}
      </button>
      {type === "vraagpunt" && (
        <a
          href={`/admin/routes/${routeId}/punten/${punt.id}`}
          className="btn btn-outline"
          style={{ width: "100%", fontSize: "0.85rem", textAlign: "center", textDecoration: "none" }}>
          Vraag bewerken →
        </a>
      )}
    </div>
  );
}
