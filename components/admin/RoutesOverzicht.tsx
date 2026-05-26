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
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", flex: 1, minWidth: 80 }}>
          {routes.length} route{routes.length !== 1 ? "s" : ""}
        </p>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ fontSize: "0.82rem" }}
            onClick={() => importRef.current?.click()} disabled={importBezig}>
            {importBezig ? "Importeren…" : "📥 Importeer"}
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importeer} />
          <button className="btn btn-primary" onClick={() => setAanmaken(true)}>+ Nieuwe route</button>
        </div>
      </div>
      {importFout && <div className="melding melding-fout" style={{ marginBottom: 12 }}>⚠️ {importFout}</div>}

      {aanmaken && (
        <form onSubmit={nieuwRoute} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Naam van de route"
            value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} required autoFocus />
          <button className="btn btn-ghost" type="button" onClick={() => setAanmaken(false)}>Annuleer</button>
          <button className="btn btn-primary" type="submit" disabled={bezig}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {routes.map((r) => (
            <div key={r.id} className="card" style={{
              borderLeft: r.is_active ? "4px solid var(--green)" : r.status === "gepubliceerd" ? "4px solid var(--cyan)" : "4px solid var(--line)",
              padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {/* Naam + status */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", wordBreak: "break-word" }}>{r.name}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                    {r.is_active && <StatusBadge kleur="green" label="✓ Actief" />}
                    {r.status === "gepubliceerd" && !r.is_active && <StatusBadge kleur="cyan" label="Gepubliceerd" />}
                    {r.status === "concept" && <StatusBadge kleur="muted" label="Concept" />}
                    {r.modus === "verspreid" && <StatusBadge kleur="cyan" label="Verspreid" />}
                  </div>
                </div>
              </div>
              {/* Actieknoppen */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button className="btn btn-ghost" style={{ fontSize: "0.82rem", padding: "7px 14px" }}
                  onClick={() => router.push(`/admin/routes/${r.id}`)}>✏️ Bewerken</button>
                <button className="btn btn-ghost" style={{ fontSize: "0.82rem", padding: "7px 12px" }}
                  onClick={() => exporteer(r.id, r.name)} title="Exporteer">📤</button>
                {!r.is_active && (
                  <button className="btn btn-ghost" style={{ fontSize: "0.82rem", padding: "7px 14px" }}
                    onClick={() => togglePubliceer(r)}>
                    {r.status === "gepubliceerd" ? "↩ Concept" : "📢 Publiceer"}
                  </button>
                )}
                {!r.is_active && r.status === "gepubliceerd" && (
                  <button className="btn btn-cyan" style={{ fontSize: "0.82rem", padding: "7px 14px" }}
                    onClick={() => activeer(r.id)}>▶ Activeer</button>
                )}
                {!r.is_active && (
                  <button className="btn btn-danger" style={{ fontSize: "0.82rem", padding: "7px 12px" }}
                    onClick={() => verwijder(r.id, r.name)} title="Verwijder">🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ kleur, label }: { kleur: string; label: string }) {
  const kleuren: Record<string, string> = {
    green: "color:var(--green);background:var(--green-soft)",
    cyan: "color:var(--cyan);background:var(--cyan-soft)",
    muted: "color:var(--muted);background:var(--line)",
  };
  return (
    <span style={{
      ...(Object.fromEntries(kleuren[kleur].split(";").map((s) => s.split(":")))),
      padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 600,
    }}>{label}</span>
  );
}
