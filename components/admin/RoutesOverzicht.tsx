"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "@/types/database";

export default function RoutesOverzicht() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [laden, setLaden] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [nieuweModus, setNieuweModus] = useState<"sequentieel" | "verspreid" | "mist">("sequentieel");
  const [nieuwAantalTeams, setNieuwAantalTeams] = useState(2);
  const [nieuwePlaats, setNieuwePlaats] = useState("");
  const [aanmaken, setAanmaken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [importBezig, setImportBezig] = useState(false);
  const [importFout, setImportFout] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  async function laad() {
    const res = await fetch("/api/admin/routes");
    if (res.ok) setRoutes(await res.json());
    setLaden(false);
  }
  useEffect(() => { laad(); }, []);

  async function nieuwRoute(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true); setFout("");

    let plaats: { lat: number; lng: number } | null = null;
    if (nieuwePlaats.trim()) {
      const geoRes = await fetch(`/api/admin/geocode?q=${encodeURIComponent(nieuwePlaats.trim())}`);
      const geoData = await geoRes.json();
      if (!geoRes.ok) { setFout(geoData.fout ?? "Plaats niet gevonden"); setBezig(false); return; }
      plaats = { lat: geoData.lat, lng: geoData.lng };
    }

    const res = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuweNaam, modus: nieuweModus, verwacht_aantal_teams: nieuwAantalTeams }),
    });
    if (!res.ok) { setFout("Kon route niet aanmaken"); setBezig(false); return; }
    const route = await res.json();
    const query = plaats ? `?lat=${plaats.lat}&lng=${plaats.lng}` : "";
    router.push(`/admin/routes/${route.id}${query}`);
  }

  async function exporteer(id: string, naam: string) {
    const res = await fetch(`/api/admin/routes/${id}/export`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${naam.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importeer(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (!bestand) return;
    e.target.value = "";
    setImportBezig(true);
    setImportFout("");
    try {
      const tekst = await bestand.text();
      const json = JSON.parse(tekst);
      const res = await fetch("/api/admin/routes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportFout(data.fout ?? "Import mislukt");
        setImportBezig(false);
        return;
      }
      router.push(`/admin/routes/${data.id}`);
    } catch {
      setImportFout("Ongeldig JSON-bestand");
      setImportBezig(false);
    }
  }

  async function verwijder(id: string, naam: string) {
    if (!confirm(`Route "${naam}" verwijderen? Dit verwijdert ook alle punten en vragen.`)) return;
    await fetch(`/api/admin/routes/${id}`, { method: "DELETE" });
    laad();
  }

  async function activeer(id: string) {
    await fetch(`/api/admin/routes/${id}/activeren`, { method: "POST" });
    laad();
  }

  async function togglePubliceer(route: Route) {
    const nieuweStatus = route.status === "gepubliceerd" ? "concept" : "gepubliceerd";
    await fetch(`/api/admin/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nieuweStatus }),
    });
    laad();
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 22 }}>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", fontWeight: 600, flex: 1, minWidth: 80 }}>
          {routes.length} route{routes.length !== 1 ? "s" : ""}
        </p>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button className="btn-premium--ghost" onClick={() => importRef.current?.click()} disabled={importBezig}>
            {importBezig ? "Importeren…" : "📥 Importeer"}
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importeer} />
          <button className="btn-premium" style={{ width: "auto", padding: "11px 22px", fontSize: "0.88rem" }} onClick={() => setAanmaken(true)}>
            + NIEUWE ROUTE
          </button>
        </div>
      </div>
      {importFout && <div className="melding melding-fout" style={{ marginBottom: 12 }}>⚠️ {importFout}</div>}

      {aanmaken && (
        <form onSubmit={nieuwRoute} className="card" style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Naam van de route</label>
            <input className="form-input" placeholder="Bijv. Voorjaarsrit"
              value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} required autoFocus />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Routemodus</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["sequentieel", "verspreid", "mist"] as const).map((m) => (
                  <button key={m} type="button"
                    onClick={() => setNieuweModus(m)}
                    style={{
                      flex: 1, fontSize: "0.78rem", fontWeight: 600, padding: "8px 10px",
                      borderRadius: 7, border: "1px solid", cursor: "pointer",
                      background: nieuweModus === m ? "rgba(0,217,255,0.12)" : "transparent",
                      borderColor: nieuweModus === m ? "rgba(0,217,255,0.35)" : "rgba(255,255,255,0.12)",
                      color: nieuweModus === m ? "var(--cyan)" : "var(--muted)",
                    }}>
                    {m === "sequentieel" ? "Sequentieel" : m === "verspreid" ? "Verspreid" : "Mist"}
                  </button>
                ))}
              </div>
            </div>
            {nieuweModus !== "mist" && (
              <div className="form-group" style={{ width: 90 }}>
                <label className="form-label">Teams</label>
                <input className="form-input" type="number" min={2} value={nieuwAantalTeams}
                  onChange={(e) => setNieuwAantalTeams(Math.max(2, Number(e.target.value)))} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Plaatsnaam (optioneel)</label>
            <input className="form-input" placeholder="Bijv. Berghem — kaart start daar i.p.v. Amsterdam"
              value={nieuwePlaats} onChange={(e) => setNieuwePlaats(e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn-premium--ghost" type="button" onClick={() => setAanmaken(false)}>Annuleer</button>
            <button className="btn-premium" style={{ width: "auto", padding: "10px 20px" }} type="submit" disabled={bezig}>
              {bezig ? "…" : "Aanmaken"}
            </button>
          </div>
        </form>
      )}
      {fout && <div className="melding melding-fout" style={{ marginBottom: 12 }}>⚠️ {fout}</div>}

      {laden ? (
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Laden…</p>
      ) : routes.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nog geen routes. Maak een nieuwe route aan.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {routes.map((r) => {
            const modusInfo = {
              sequentieel: { label: "Sequentieel", kleur: "#93C5FD" },
              verspreid: { label: "Verspreid", kleur: "#67E8F9" },
              mist: { label: "Mist", kleur: "#FDBA74" },
            }[r.modus];
            const knopStijl = { padding: "8px 16px", fontSize: "0.8rem", whiteSpace: "nowrap" as const };

            return (
              <div key={r.id} className="pr-gem-card" style={{ marginBottom: 0 }}>
                <div className="pr-gem-card-inner" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                  {/* Naam + type links, status rechts */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 700, color: modusInfo.kleur, flexShrink: 0 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: modusInfo.kleur }} />
                        {modusInfo.label}
                      </span>
                    </div>
                    {r.is_active ? (
                      <span className="pr-gem-chip pr-gem-chip--green" style={{ flexShrink: 0 }}>✓ Actief</span>
                    ) : r.status === "gepubliceerd" ? (
                      <span className="pr-gem-chip pr-gem-chip--cyan" style={{ flexShrink: 0 }}>Gepubliceerd</span>
                    ) : (
                      <span className="pr-gem-chip pr-gem-chip--gray" style={{ flexShrink: 0 }}>Concept</span>
                    )}
                  </div>

                  {/* Actieknoppen */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button className="btn-premium--ghost" style={knopStijl}
                      onClick={() => router.push(`/admin/routes/${r.id}`)}>✏️ Bewerken</button>
                    <button className="btn-premium--ghost" style={knopStijl}
                      onClick={() => exporteer(r.id, r.name)}>📤 Exporteren</button>
                    {!r.is_active && (
                      <button className="btn-premium--ghost" style={knopStijl}
                        onClick={() => togglePubliceer(r)}>
                        {r.status === "gepubliceerd" ? "↩ Naar concept" : "📢 Publiceren"}
                      </button>
                    )}
                    {!r.is_active && r.status === "gepubliceerd" && (
                      <button className="btn-premium--cyan" style={knopStijl}
                        onClick={() => activeer(r.id)}>▶ Activeren</button>
                    )}
                    {!r.is_active && (
                      <button className="btn-premium--danger" style={{ ...knopStijl, marginLeft: "auto" }}
                        onClick={() => verwijder(r.id, r.name)}>🗑️ Verwijderen</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
