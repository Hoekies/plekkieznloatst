"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "@/types/database";
import { MODUS_INFO, ModusTegel } from "./RouteModus";

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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu sluiten bij klik ernaast of Escape
  useEffect(() => {
    if (!menuOpen) return;
    function klik(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    }
    function toets(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(null); }
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", toets);
    return () => { document.removeEventListener("mousedown", klik); document.removeEventListener("keydown", toets); };
  }, [menuOpen]);

  // Actief bovenaan, dan gepubliceerd, dan concepten
  const rang = (r: Route) => (r.is_active ? 0 : r.status === "gepubliceerd" ? 1 : 2);
  const gesorteerd = [...routes].sort((a, b) => rang(a) - rang(b));

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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: 600, flex: 1, minWidth: 80, margin: 0 }}>
          {routes.length} route{routes.length !== 1 ? "s" : ""}
        </p>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="rl-knop" onClick={() => importRef.current?.click()} disabled={importBezig}>
            {importBezig ? "Importeren…" : "Importeren"}
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importeer} />
          <button className="rl-knop rl-knop--cyan" onClick={() => setAanmaken(true)}>+ Nieuwe route</button>
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

          <div className="form-group">
            <label className="form-label">Speltype</label>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Kan na aanmaken niet meer gewijzigd worden.</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              {(["sequentieel", "verspreid", "mist"] as const).map((m) => {
                const info = MODUS_INFO[m];
                const gekozen = nieuweModus === m;
                return (
                  <button key={m} type="button"
                    onClick={() => setNieuweModus(m)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                      padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${gekozen ? `${info.kleur}88` : "rgba(255,255,255,0.12)"}`,
                      background: gekozen ? info.tint : "transparent",
                    }}>
                    <ModusTegel modus={m} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: gekozen ? info.kleur : "var(--ink)" }}>{info.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{info.omschrijving}</div>
                    </div>
                    {gekozen && <span style={{ color: info.kleur, fontWeight: 700, flexShrink: 0 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {nieuweModus !== "mist" && (
            <div className="form-group" style={{ width: 90 }}>
              <label className="form-label">Teams</label>
              <input className="form-input" type="number" min={2} value={nieuwAantalTeams}
                onChange={(e) => setNieuwAantalTeams(Math.max(2, Number(e.target.value)))} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Plaatsnaam (optioneel)</label>
            <input className="form-input" placeholder="Bijv. Berghem — kaart start daar i.p.v. Amsterdam"
              value={nieuwePlaats} onChange={(e) => setNieuwePlaats(e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="rl-knop" type="button" onClick={() => setAanmaken(false)}>Annuleer</button>
            <button className="rl-knop rl-knop--cyan" type="submit" disabled={bezig}>
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
        <div className="rl-lijst">
          {gesorteerd.map((r) => {
            const info = MODUS_INFO[r.modus];
            const status = r.is_active
              ? { tekst: "Actief", kleur: "#4ADE80" }
              : r.status === "gepubliceerd"
                ? { tekst: "Gepubliceerd", kleur: "#67E8F9" }
                : { tekst: "Concept", kleur: "#94A3B8" };

            return (
              <div key={r.id} className={`rl-rij${r.is_active ? " rl-rij--actief" : ""}`}>
                <ModusTegel modus={r.modus} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div className="rl-naam">{r.name}</div>
                  <div className="rl-sub">
                    <span style={{ color: info.kleur, fontWeight: 600 }}>{info.label}</span>
                    <span aria-hidden>·</span>
                    <span className="rl-status" style={{ color: status.kleur }}>{status.tekst}</span>
                  </div>
                </div>

                <div className="rl-acties">
                  {/* Alleen de volgende logische stap als knop: publiceren → activeren */}
                  {!r.is_active && r.status !== "gepubliceerd" && (
                    <button className="rl-knop" onClick={() => togglePubliceer(r)}>Publiceren</button>
                  )}
                  {!r.is_active && r.status === "gepubliceerd" && (
                    <button className="rl-knop rl-knop--cyan" onClick={() => activeer(r.id)}>▶ Activeren</button>
                  )}
                  <button className="rl-knop" onClick={() => router.push(`/admin/routes/${r.id}`)}>Bewerken</button>
                  <div className="rl-menu-wrap" ref={menuOpen === r.id ? menuRef : undefined}>
                    <button className="rl-knop rl-knop--icoon" aria-label="Meer acties" title="Meer acties"
                      onClick={() => setMenuOpen((m) => (m === r.id ? null : r.id))}>⋯</button>
                    {menuOpen === r.id && (
                      <div className="rl-menu" role="menu">
                        <button onClick={() => { setMenuOpen(null); exporteer(r.id, r.name); }}>📤 Exporteren</button>
                        {!r.is_active && r.status === "gepubliceerd" && (
                          <button onClick={() => { setMenuOpen(null); togglePubliceer(r); }}>↩ Terug naar concept</button>
                        )}
                        {!r.is_active && (
                          <>
                            <hr />
                            <button className="rl-menu-gevaar" onClick={() => { setMenuOpen(null); verwijder(r.id, r.name); }}>🗑️ Verwijderen</button>
                          </>
                        )}
                      </div>
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
