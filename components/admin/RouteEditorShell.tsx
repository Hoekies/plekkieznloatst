"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [actieveTab, setActieveTab] = useState<"punten" | "items" | "instellingen">("punten");
  const [opslaan, setOpslaan] = useState(false);
  const [naamWijzig, setNaamWijzig] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState(route.name);
  const [fout, setFout] = useState("");
  const [verwachtTeams, setVerwachtTeams] = useState(initRoute.verwacht_aantal_teams ?? 2);
  const [doelAfstandKm, setDoelAfstandKm] = useState(initRoute.doel_afstand_km ?? 0);
  const [sterWaarde, setSterWaarde] = useState(initRoute.ster_waarde ?? 50);
  const [bomWaarde, setBomWaarde] = useState(initRoute.bom_waarde ?? 30);
  const [respawnMinuten, setRespawnMinuten] = useState(initRoute.respawn_minuten ?? 15);
  const [plekzooiDuur, setPlekzooiDuur] = useState(initRoute.plekzooi_duur_seconden ?? 120);
  const [aantalPunten, setAantalPunten] = useState(6);
  const [centrumPunt, setCentrumPunt] = useState<{ lat: number; lng: number } | null>(null);
  const [centrumModus, setCentrumModus] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/routes/${route.id}/speciaal`).then((r) => r.ok ? r.json() : []).then(setSpecialeItems);
  }, [route.id]);

  useEffect(() => {
    if (centrumPunt || punten.length === 0) return;
    const avgLat = punten.reduce((s, p) => s + p.latitude, 0) / punten.length;
    const avgLng = punten.reduce((s, p) => s + p.longitude, 0) / punten.length;
    setCentrumPunt({ lat: avgLat, lng: avgLng });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bereken de startpunten per team voor verspreid-modus
  const teamStartPunten = useMemo(() => {
    if (route.modus !== "verspreid" || punten.length < 4 || verwachtTeams < 2) return [];
    const middenpunten = punten.slice(1, -1);
    if (middenpunten.length < 2) return [];
    const cumulatief = [0];
    for (let i = 1; i < middenpunten.length; i++) {
      cumulatief.push(
        cumulatief[i - 1] +
        haversine(middenpunten[i - 1].latitude, middenpunten[i - 1].longitude, middenpunten[i].latitude, middenpunten[i].longitude)
      );
    }
    const totalM = cumulatief[cumulatief.length - 1];
    if (totalM === 0) return [];
    return Array.from({ length: verwachtTeams }, (_, k) => {
      const targetM = (totalM / verwachtTeams) * k;
      let offset = 0, minDelta = Infinity;
      cumulatief.forEach((d, i) => {
        const delta = Math.abs(d - targetM);
        if (delta < minDelta) { minDelta = delta; offset = i; }
      });
      return { lat: middenpunten[offset].latitude, lng: middenpunten[offset].longitude, teamIndex: k + 1 };
    });
  }, [route.modus, punten, verwachtTeams]);

  function puntenOpCirkel(lat: number, lng: number, radiusM: number, n: number) {
    const R = 6371000;
    return Array.from({ length: n }, (_, i) => {
      const hoek = (2 * Math.PI / n) * i - Math.PI / 2;
      const dLat = (radiusM * Math.cos(hoek)) / R * (180 / Math.PI);
      const dLng = (radiusM * Math.sin(hoek)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
      return { lat: lat + dLat, lng: lng + dLng };
    });
  }

  const ghostPunten = useMemo(() => {
    if (route.modus !== "verspreid" || doelAfstandKm <= 0 || !centrumPunt) return [];
    const radiusM = (doelAfstandKm * 1000) / (2 * Math.PI);
    return puntenOpCirkel(centrumPunt.lat, centrumPunt.lng, radiusM, aantalPunten);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.modus, doelAfstandKm, centrumPunt, aantalPunten]);

  async function herlaadPunten() {
    const res = await fetch(`/api/admin/routes/${route.id}/punten`);
    if (res.ok) setPunten(await res.json());
  }

  async function genereerPuntenInCirkel() {
    if (!centrumPunt || doelAfstandKm <= 0) return;
    if (punten.length > 0 && !confirm(`Dit verwijdert ${punten.length} bestaand(e) punt(en). Doorgaan?`)) return;
    const radiusM = (doelAfstandKm * 1000) / (2 * Math.PI);
    const coords = puntenOpCirkel(centrumPunt.lat, centrumPunt.lng, radiusM, aantalPunten);
    for (const pt of punten) {
      await fetch(`/api/admin/routes/${route.id}/punten/${pt.id}`, { method: "DELETE" });
    }
    setPunten([]);
    setGeselecteerd(null);
    const nieuwePunten: RoutePunt[] = [];

    // Hub start op middelpunt
    const resStart = await fetch(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: centrumPunt.lat, longitude: centrumPunt.lng, type: "informatiepunt", name: "Hub", points: 0 }),
    });
    if (resStart.ok) nieuwePunten.push(await resStart.json());

    // Circulaire vraagpunten
    for (const coord of coords) {
      const res = await fetch(`/api/admin/routes/${route.id}/punten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coord.lat, longitude: coord.lng, points: 10 }),
      });
      if (res.ok) nieuwePunten.push(await res.json());
    }

    // Hub eind op middelpunt
    const resEind = await fetch(`/api/admin/routes/${route.id}/punten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: centrumPunt.lat, longitude: centrumPunt.lng, type: "eindpunt", name: "Hub", points: 0 }),
    });
    if (resEind.ok) nieuwePunten.push(await resEind.json());

    setPunten(nieuwePunten);
  }

  async function kaartKlik(lat: number, lng: number) {
    if (centrumModus) {
      setCentrumPunt({ lat, lng });
      setCentrumModus(false);
      return;
    }
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
      setGeselecteerdSpeciaal(null);
    }
  }

  async function specialItemVerplaatst(id: string, lat: number, lng: number) {
    await slaSpeciaalItemOp(id, { latitude: lat, longitude: lng });
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

  async function slaItemWaardenOp(ster: number, bom: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ster_waarde: ster, bom_waarde: bom }),
    });
    if (res.ok) setRoute((r) => ({ ...r, ster_waarde: ster, bom_waarde: bom }));
  }

  async function slaRespawnMinutenOp(minuten: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respawn_minuten: minuten }),
    });
    if (res.ok) setRoute((r) => ({ ...r, respawn_minuten: minuten }));
  }

  async function slaPlekzooiDuurOp(seconden: number) {
    const res = await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plekzooi_duur_seconden: seconden }),
    });
    if (res.ok) setRoute((r) => ({ ...r, plekzooi_duur_seconden: seconden }));
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
      <div className="admin-topbar" style={{ flexDirection: "column", alignItems: "stretch", gap: 0, padding: "10px 16px" }}>
        {/* Rij 1: navigatie + naam + status + acties */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/admin/routes" className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "6px 12px", flexShrink: 0 }}>← Routes</a>
          {naamWijzig ? (
            <div style={{ display: "flex", gap: 6, flex: 1 }}>
              <input className="form-input" value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} style={{ flex: 1 }} autoFocus />
              <button className="btn btn-primary" onClick={slaRouteNaamOp}>Opslaan</button>
              <button className="btn btn-ghost" onClick={() => setNaamWijzig(false)}>✕</button>
            </div>
          ) : (
            <h1 style={{ flex: 1, cursor: "pointer", fontSize: "1.1rem" }} onClick={() => setNaamWijzig(true)} title="Klik om naam te wijzigen">
              {route.name} <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>✏️</span>
            </h1>
          )}
          <StatusPil status={route.status} isActief={route.is_active} />
          {!route.is_active && (
            <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={async () => {
                const nieuweStatus = route.status === "gepubliceerd" ? "concept" : "gepubliceerd";
                const res = await fetch(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nieuweStatus }) });
                if (res.ok) setRoute((r) => ({ ...r, status: nieuweStatus }));
              }}>
              {route.status === "gepubliceerd" ? "↩ Concept" : "📢 Publiceer"}
            </button>
          )}
          {!route.is_active && route.status === "gepubliceerd" && (
            <button className="btn btn-cyan" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={async () => {
                const res = await fetch(`/api/admin/routes/${route.id}/activeren`, { method: "POST" });
                if (res.ok) setRoute((r) => ({ ...r, is_active: true }));
              }}>▶ Activeer</button>
          )}
          {route.is_active && (
            <button className="btn btn-danger" style={{ fontSize: "0.78rem", padding: "5px 10px" }}
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
      </div>

      {/* Hoofdindeling */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Zijpaneel */}
        <div style={{ width: 300, background: "rgba(8,28,48,0.82)", backdropFilter: "blur(18px)", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Verspreid-instellingen / afstand */}
          {(route.modus === "verspreid" || punten.length >= 2) && <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
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
                  {doelAfstandKm > 0 && (
                    <button
                      className={`btn ${centrumModus ? "btn-cyan" : centrumPunt ? "btn-ghost" : "btn-primary"}`}
                      style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                      onClick={() => { setCentrumModus((v) => !v); }}>
                      {centrumModus ? "✅ Klik op kaart voor middelpunt…" : centrumPunt ? "📍 Verplaats middelpunt" : "📍 Kies middelpunt op kaart"}
                    </button>
                  )}

                  {/* Genereer knop */}
                  {centrumPunt && doelAfstandKm > 0 && (
                    <>
                      <button
                        className="btn btn-cyan"
                        style={{ width: "100%", fontSize: "0.78rem", padding: "6px 10px" }}
                        onClick={genereerPuntenInCirkel}>
                        🔄 Genereer punten in cirkel
                      </button>
                    </>
                  )}

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
          </div>}

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
            <button
              onClick={() => { setActieveTab("instellingen"); setAddModus(false); setAddSpeciaalModus(false); }}
              style={{
                flex: 1, padding: "10px 0", fontSize: "0.82rem", fontWeight: 700,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: actieveTab === "instellingen" ? "2px solid var(--cyan)" : "2px solid transparent",
                color: actieveTab === "instellingen" ? "var(--cyan)" : "var(--muted)",
              }}>
              ⚙️ Instellingen
            </button>
          </div>

          {/* Toevoegen-knop */}
          {actieveTab !== "instellingen" && (
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
          )}

          {/* Tab-inhoud */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>

            {/* Punten-tab */}
            {actieveTab === "punten" && (
              punten.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Klik op &ldquo;Punt toevoegen&rdquo; en tik op de kaart om een punt te plaatsen.
                </p>
              ) : punten.map((pt, i) => {
                const isVerspreid = route.modus === "verspreid" && punten.length >= 3;
                const isHubStart = isVerspreid && i === 0;
                const isHubEind = isVerspreid && i === punten.length - 1;
                const isHub = isHubStart || isHubEind;
                const badge = isHubStart ? "🏠" : pt.type === "eindpunt" ? "🏁" : (isVerspreid ? i : i + 1);
                const badgeBg = isHubStart ? "var(--green)" : pt.type === "eindpunt" ? "var(--gold)" : pt.type === "informatiepunt" ? "var(--cyan)" : "var(--blue)";
                const typeLabel = isHubStart ? "Start hub" : isHubEind ? "Finish hub" : pt.type === "vraagpunt" ? "Vraagpunt" : pt.type === "informatiepunt" ? "Infopunt" : "Eindpunt";
                return (
                  <div key={pt.id}
                    onClick={() => setGeselecteerd(geselecteerd?.id === pt.id ? null : pt)}
                    style={{
                      padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      background: geselecteerd?.id === pt.id ? "rgba(255,255,255,0.12)" : "transparent",
                      borderLeft: geselecteerd?.id === pt.id ? "3px solid #60A5FA" : "3px solid transparent",
                    }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: badgeBg,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.72rem", fontWeight: 700,
                    }}>{badge}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>{pt.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                        {typeLabel} · {pt.radius_meters}m
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omhoog"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: (i === 0 || isHub) ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); verplaatsVolgorde(pt.id, "omlaag"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: (i === punten.length - 1 || isHub) ? "var(--line)" : "var(--muted)", padding: "1px 3px" }}>▼</button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); verwijderPunt(pt.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.85rem", padding: "2px 4px" }}>🗑️</button>
                  </div>
                );
              })
            )}

            {/* Items-tab */}
            {actieveTab === "items" && (
              specialeItems.length === 0 ? (
                <p style={{ padding: "16px 14px", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Klik op &ldquo;Item toevoegen&rdquo; en tik op de kaart om een item te plaatsen.
                </p>
              ) : specialeItems.map((item) => {
                const emoji = { spook: "👻", bom: "💣", ster: "⭐", verdubbeling: "🔴", wissel: "🔄", dief: "🦹", radar: "📡", banaan: "🍌", plekzooi: "⛔", vraagteken: "❓" }[item.type] ?? "?";
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

            {/* Instellingen-tab */}
            {actieveTab === "instellingen" && (
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Modus */}
                <div className="form-group">
                  <label className="form-label">Routemodus</label>
                  <div style={{ display: "flex", gap: 8 }}>
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
                          flex: 1, fontSize: "0.78rem", fontWeight: 600, padding: "8px 10px",
                          borderRadius: 7, border: "1px solid", cursor: "pointer",
                          background: route.modus === m ? "rgba(0,217,255,0.12)" : "transparent",
                          borderColor: route.modus === m ? "rgba(0,217,255,0.35)" : "rgba(255,255,255,0.12)",
                          color: route.modus === m ? "var(--cyan)" : "var(--muted)",
                        }}>
                        {m === "sequentieel" ? "Sequentieel" : "Verspreid (lus)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item-waarden */}
                <div className="form-group">
                  <label className="form-label">⭐ Item-waarden</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Ster</span>
                      <input
                        className="form-input" type="number" min={1} value={sterWaarde}
                        onChange={(e) => setSterWaarde(Math.max(1, Number(e.target.value)))}
                        onBlur={() => slaItemWaardenOp(sterWaarde, bomWaarde)}
                        style={{ color: "var(--gold)", fontWeight: 700 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Bom</span>
                      <input
                        className="form-input" type="number" min={1} value={bomWaarde}
                        onChange={(e) => setBomWaarde(Math.max(1, Number(e.target.value)))}
                        onBlur={() => slaItemWaardenOp(sterWaarde, bomWaarde)}
                        style={{ color: "var(--red)", fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Plekzooi */}
                <div className="form-group">
                  <label className="form-label">⛔ Plekzooi — standaard blokkeerduur (seconden)</label>
                  <input
                    className="form-input" type="number" min={10} value={plekzooiDuur}
                    onChange={(e) => setPlekzooiDuur(Math.max(10, Number(e.target.value)))}
                    onBlur={() => slaPlekzooiDuurOp(plekzooiDuur)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>60 = 1 min · 120 = 2 min · 180 = 3 min</span>
                </div>

                {/* Respawn */}
                {route.modus === "verspreid" && (
                  <div className="form-group">
                    <label className="form-label">🔄 Respawn (verspreid-modus)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                        onClick={async () => {
                          const nieuw = !route.item_respawn;
                          const res = await fetch(`/api/admin/routes/${route.id}`, {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ item_respawn: nieuw }),
                          });
                          if (res.ok) setRoute((r) => ({ ...r, item_respawn: nieuw }));
                        }}>
                        <span style={{ fontSize: "0.78rem", color: route.item_respawn ? "var(--green)" : "var(--muted)", flexShrink: 0, userSelect: "none" }}>
                          {route.item_respawn ? "Aan" : "Uit"}
                        </span>
                        <div style={{
                          width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                          background: route.item_respawn ? "var(--green)" : "rgba(255,255,255,0.15)",
                          transition: "background 0.2s",
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", top: 3, left: route.item_respawn ? 19 : 3,
                            width: 14, height: 14, borderRadius: "50%",
                            background: "#fff",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                          }} />
                        </div>
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
            )}
          </div>

        </div>

        {/* Kaart */}
        <LeafletKaart
          punten={punten}
          addModus={addModus || addSpeciaalModus || centrumModus}
          geselecteerdId={geselecteerd?.id ?? null}
          specialeItems={specialeItems}
          guideCirkel={
            route.modus === "verspreid" && doelAfstandKm > 0 && geselecteerd && punten.length > 0
              ? { lat: geselecteerd.latitude, lng: geselecteerd.longitude, radiusM: doelAfstandKm * 1000 / punten.length }
              : null
          }
          teamStartPunten={teamStartPunten}
          centrumPunt={route.modus === "verspreid" && doelAfstandKm > 0 ? centrumPunt : null}
          ghostPunten={ghostPunten}
          ghostRadiusM={doelAfstandKm > 0 ? (doelAfstandKm * 1000) / (2 * Math.PI) : 0}
          onCentrumVerplaatst={(lat, lng) => setCentrumPunt({ lat, lng })}
          onKlik={kaartKlik}
          onMarkerVerplaatst={markerVerplaatst}
          onMarkerKlik={(id) => setGeselecteerd(punten.find((p) => p.id === id) ?? null)}
          onSpeciaalItemVerplaatst={specialItemVerplaatst}
          onSpeciaalItemKlik={(id) => { setGeselecteerdSpeciaal(specialeItems.find((i) => i.id === id) ?? null); setGeselecteerd(null); }}
          geselecteerdSpeciaalId={geselecteerdSpeciaal?.id ?? null}
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
                onVerwijder={() => { verwijderSpeciaalItem(geselecteerdSpeciaal.id); setGeselecteerdSpeciaal(null); }}
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
function SpeciaalItemForm({ item, onOpslaan, onVerwijder, onSluit }: {
  item: SpeciaalItem;
  onOpslaan: (u: Partial<SpeciaalItem>) => void;
  onVerwijder: () => void;
  onSluit: () => void;
}) {
  const [naam, setNaam] = useState(item.name);
  const [type, setType] = useState<SpeciaalItemType>(item.type);
  const [radius, setRadius] = useState(item.radius_meters);
  const [effect, setEffect] = useState(item.points_effect);

  useEffect(() => {
    setNaam(item.name); setType(item.type); setRadius(item.radius_meters); setEffect(item.points_effect);
  // Alleen resetten bij wisselen van item, niet bij elke prop-update (anders vecht dit met lokale invoer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const heeftDuur = type === "plekzooi";

  return (
    <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>Speciaal item bewerken</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={onVerwijder}
            title="Verwijderen"
            style={{ background: "var(--red-soft)", border: "1px solid var(--red)", borderRadius: 6, cursor: "pointer", color: "var(--red)", fontSize: "0.85rem", padding: "3px 8px", lineHeight: 1 }}>
            🗑️
          </button>
          <button onClick={onSluit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1rem", lineHeight: 1 }}>✕</button>
        </div>
      </div>

      {/* Naam */}
      <div className="form-group">
        <label className="form-label">Naam</label>
        <input className="form-input" value={naam} onChange={(e) => setNaam(e.target.value)} style={{ fontSize: "0.85rem" }} />
      </div>

      {/* Type + Radius op één regel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8, alignItems: "end" }}>
        <div className="form-group" style={{ margin: 0 }}>
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
            <option value="vraagteken">❓ Vraagteken</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Radius (m)</label>
          <input className="form-input" type="number" min={1} value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ fontSize: "0.85rem", width: "100%", boxSizing: "border-box" }} />
        </div>
      </div>

      {heeftDuur && (
        <div className="form-group">
          <label className="form-label">Blokkeer duur (seconden)</label>
          <input className="form-input" type="number" min={10} value={effect || 120} onChange={(e) => setEffect(Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>60 = 1 min · 120 = 2 min · 180 = 3 min</span>
        </div>
      )}
      {type === "plekzooi" && (
        <div style={{ fontSize: "0.72rem", color: "var(--gold)", background: "var(--gold-soft)", padding: "8px 10px", borderRadius: 8 }}>
          ⚠️ Plek zooi is <strong>onzichtbaar</strong> voor spelers.
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
  // Alleen resetten bij wisselen van punt, niet bij elke prop-update (anders vecht dit met lokale invoer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <a
        href={`/admin/routes/${routeId}/punten/${punt.id}`}
        className="btn btn-outline"
        style={{ width: "100%", fontSize: "0.85rem", textAlign: "center", textDecoration: "none" }}>
        Vraag bewerken →
      </a>
    </div>
  );
}
