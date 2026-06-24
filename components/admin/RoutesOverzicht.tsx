"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "@/types/database";

export default function RoutesOverzicht() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [laden, setLaden] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
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
    const res = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuweNaam }),
    });
    if (!res.ok) { setFout("Kon route niet aanmaken"); setBezig(false); return; }
    const route = await res.json();
    router.push(`/admin/routes/${route.id}`);
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
        <form onSubmit={nieuwRoute} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Naam van de route"
            value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} required autoFocus />
          <button className="btn-premium--ghost" type="button" onClick={() => setAanmaken(false)}>Annuleer</button>
          <button className="btn-premium" style={{ width: "auto", padding: "10px 20px" }} type="submit" disabled={bezig}>
            {bezig ? "…" : "Aanmaken"}
          </button>
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
          {routes.map((r) => (
            <div key={r.id} className="pr-gem-card" style={{ marginBottom: 0 }}>
              <div className="pr-gem-card-inner" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                {/* Naam + status */}
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color: "#fff" }}>{r.name}</span>
                  {r.is_active && <span className="pr-gem-chip pr-gem-chip--green">✓ Actief</span>}
                  {r.status === "gepubliceerd" && !r.is_active && <span className="pr-gem-chip pr-gem-chip--cyan">Gepubliceerd</span>}
                  {r.status === "concept" && <span className="pr-gem-chip pr-gem-chip--gray">Concept</span>}
                  {r.modus === "verspreid" && <span className="pr-gem-chip pr-gem-chip--cyan">Verspreid</span>}
                </div>
                {/* Actieknoppen */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button className="btn-premium--ghost" style={{ padding: "8px 16px", fontSize: "0.8rem" }}
                    onClick={() => router.push(`/admin/routes/${r.id}`)}>✏️ Bewerken</button>
                  <button className="btn-premium--ghost" style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                    onClick={() => exporteer(r.id, r.name)} title="Exporteer">📤</button>
                  {!r.is_active && (
                    <button className="btn-premium--ghost" style={{ padding: "8px 16px", fontSize: "0.8rem" }}
                      onClick={() => togglePubliceer(r)}>
                      {r.status === "gepubliceerd" ? "↩ Concept" : "📢 Publiceer"}
                    </button>
                  )}
                  {!r.is_active && r.status === "gepubliceerd" && (
                    <button className="btn-premium--cyan" style={{ padding: "8px 16px", fontSize: "0.8rem" }}
                      onClick={() => activeer(r.id)}>▶ Activeer</button>
                  )}
                  {!r.is_active && (
                    <button className="btn-premium--danger" style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                      onClick={() => verwijder(r.id, r.name)} title="Verwijder">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
