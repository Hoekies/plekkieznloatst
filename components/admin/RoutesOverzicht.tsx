"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "@/types/database";
import { MODUS_INFO, ModusTegel } from "./RouteModus";
import BevestigKnop from "@/components/admin/BevestigKnop";
import StatKaart from "@/components/admin/StatKaart";
import SectieKop from "@/components/admin/SectieKop";
import { toonMelding } from "@/components/admin/Melding";

export default function RoutesOverzicht() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [laden, setLaden] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [nieuweModus, setNieuweModus] = useState<"sequentieel" | "verspreid">("sequentieel");
  const [nieuwAantalTeams, setNieuwAantalTeams] = useState(2);
  const [nieuwePlaats, setNieuwePlaats] = useState("");
  const [aanmaken, setAanmaken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [importBezig, setImportBezig] = useState(false);
  const [importFout, setImportFout] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  // Ingedeeld in actief, gepubliceerd en concept (elk met een kop), binnen een groep op naam
  const rang = (r: Route) => (r.is_active ? 0 : r.status === "gepubliceerd" ? 1 : 2);
  const gesorteerd = [...routes].sort((a, b) => rang(a) - rang(b) || a.name.localeCompare(b.name, "nl"));
  const GROEP_KOP = ["● Actief", "📢 Gepubliceerd", "✏️ Concept"];
  const aantalIn = (n: number) => gesorteerd.filter((r) => rang(r) === n).length;

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

  // Export: de server levert alle gegevens, de browser pakt daarna de afbeeldingen in het bestand in
  const [exportBezig, setExportBezig] = useState<string | null>(null);
  async function exporteer(id: string, naam: string) {
    setExportBezig(id);
    try {
      const res = await fetch(`/api/admin/routes/${id}/export`);
      if (!res.ok) { toonMelding("Exporteren mislukt", "fout"); return; }
      const data = await res.json();
      const afbeeldingen: Record<string, { type: string; data: string }> = {};
      let ontbreekt = 0;
      for (const sleutel of (data.afbeeldingen_lijst ?? []) as string[]) {
        try {
          const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${sleutel}`);
          if (!r.ok) { ontbreekt++; continue; }
          const blob = await r.blob();
          const base64 = await new Promise<string>((klaar) => {
            const lezer = new FileReader();
            lezer.onload = () => klaar(String(lezer.result).split(",")[1] ?? "");
            lezer.readAsDataURL(blob);
          });
          afbeeldingen[sleutel] = { type: blob.type || "image/jpeg", data: base64 };
        } catch { ontbreekt++; }
      }
      delete data.afbeeldingen_lijst;
      data.afbeeldingen = afbeeldingen;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      // Bestandsnaam: spel, route en datum, bijv. PointRush_Op-zn-Loatst_2026-10-16.json
      const route = naam.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      const datum = new Date().toLocaleDateString("sv-SE");  // JJJJ-MM-DD
      a.download = `PointRush_${route}_${datum}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toonMelding(ontbreekt ? `Geëxporteerd, maar ${ontbreekt} afbeelding(en) konden niet worden meegenomen` : "Route geëxporteerd, met alle afbeeldingen", ontbreekt ? "fout" : "ok");
    } finally {
      setExportBezig(null);
    }
  }

  async function importeer(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (!bestand) return;
    e.target.value = "";
    setImportBezig(true);
    setImportFout("");
    try {
      const json = JSON.parse(await bestand.text());
      // Eerst de afbeeldingen terugzetten (los, zodat geen enkel verzoek te groot wordt)
      const afbeeldingen = (json.afbeeldingen ?? {}) as Record<string, { type: string; data: string }>;
      let mislukt = 0;
      for (const [sleutel, beeld] of Object.entries(afbeeldingen)) {
        const r = await fetch("/api/admin/routes/import/afbeelding", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sleutel, type: beeld.type, data: beeld.data }),
        }).catch(() => null);
        if (!r?.ok) mislukt++;
      }
      delete json.afbeeldingen;
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
      if (mislukt) toonMelding(`Route geïmporteerd, maar ${mislukt} afbeelding(en) konden niet worden teruggezet`, "fout");
      router.push(`/admin/routes/${data.id}`);
    } catch {
      setImportFout("Ongeldig JSON-bestand");
      setImportBezig(false);
    }
  }

  async function verwijder(id: string, naam: string) {
    const res = await fetch(`/api/admin/routes/${id}`, { method: "DELETE" });
    toonMelding(res.ok ? `Route "${naam}" verwijderd` : "Verwijderen mislukt", res.ok ? "ok" : "fout");
    laad();
  }

  // Kopie als basis voor een nieuwe route: alle instellingen, punten, vragen en items
  const [kopieBezig, setKopieBezig] = useState<string | null>(null);
  async function kopieer(id: string, naam: string) {
    setKopieBezig(id);
    const res = await fetch(`/api/admin/routes/${id}/kopie`, { method: "POST" });
    setKopieBezig(null);
    if (!res.ok) { toonMelding("Kopiëren mislukt", "fout"); return; }
    toonMelding(`Kopie van "${naam}" gemaakt`, "ok");
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
    <div>
      {/* Tegels zoals bovenaan het dashboard */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 32 }}>
        <StatKaart label="Actieve route" waarde={routes.find((r) => r.is_active)?.name ?? "—"} badgeKlas="pr-badge--orange" badge="🗺️" />
        <StatKaart label="Routes" waarde={String(routes.length)} badgeKlas="pr-badge--purple" badge="📚" />
        <StatKaart label="Gepubliceerd" waarde={String(routes.filter((r) => r.status === "gepubliceerd").length)} badgeKlas="pr-badge--green" badge="📢" />
        <StatKaart label="Concept" waarde={String(routes.filter((r) => r.status !== "gepubliceerd" && !r.is_active).length)} badgeKlas="pr-badge--gray" badge="✏️" />
      </div>

      {/* Nieuwe route links, importeren rechts (zoals bij Groepen) */}
      <div className="actie-rij">
        <button className="btn btn-primary actie-knop" onClick={() => setAanmaken(true)}>
          + <span className="alleen-pc">Nieuwe route</span><span className="alleen-mobiel">Route</span>
        </button>
        <span style={{ flex: 1 }} />
        <button className="rl-knop actie-knop" title="Een eerder geëxporteerde route (bestand) toevoegen"
          onClick={() => importRef.current?.click()} disabled={importBezig}>
          {importBezig ? "…" : <>📂 <span className="alleen-pc">Route importeren</span><span className="alleen-mobiel">Importeren</span></>}
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importeer} />
      </div>
      {importFout && <div className="melding melding-fout" style={{ marginBottom: 12 }}>⚠️ {importFout}</div>}

      {aanmaken && (
        <form onSubmit={nieuwRoute} className="card" style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="pc-tip">💻 <strong>Tip:</strong> een route maak je het makkelijkst op een pc of laptop. Op een groot scherm zie je de kaart, de puntenlijst en de instellingen tegelijk.</div>
          <div className="form-group">
            <label className="form-label">Naam van de route</label>
            <input className="form-input" placeholder="Bijv. Voorjaarsrit"
              value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Speltype</label>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Kan na aanmaken niet meer gewijzigd worden.</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              {(["sequentieel", "verspreid"] as const).map((m) => {
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

          <div className="form-group" style={{ width: 90 }}>
            <label className="form-label">Teams</label>
            <input className="form-input" type="number" min={2} value={nieuwAantalTeams}
              onChange={(e) => setNieuwAantalTeams(Math.max(2, Number(e.target.value)))} />
          </div>

          <div className="form-group">
            <label className="form-label">Plaatsnaam (optioneel)</label>
            <input className="form-input" placeholder="Bijv. Berghem — kaart start daar i.p.v. Amsterdam"
              value={nieuwePlaats} onChange={(e) => setNieuwePlaats(e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="rl-knop rl-knop--cyan" type="submit" disabled={bezig}>
              {bezig ? "…" : "Aanmaken"}
            </button>
            <button className="rl-knop" type="button" onClick={() => setAanmaken(false)}>Annuleren</button>
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
        <div>
          {gesorteerd.map((r, i) => {
            const nieuweGroep = i === 0 || rang(gesorteerd[i - 1]) !== rang(r);
            const info = MODUS_INFO[r.modus];
            const status = r.is_active
              ? { tekst: "● Actief", cls: "pr-gem-chip--green" }
              : r.status === "gepubliceerd"
                ? { tekst: "Gepubliceerd", cls: "pr-gem-chip--cyan" }
                : { tekst: "Concept", cls: "pr-gem-chip--gray" };

            return (
              <Fragment key={r.id}>
              {nieuweGroep && (
                <div style={{ marginTop: i === 0 ? 0 : 22 }}>
                  <SectieKop titel={rang(r) === 0 ? GROEP_KOP[0] : `${GROEP_KOP[rang(r)]} (${aantalIn(rang(r))})`} />
                </div>
              )}
              <div className="pr-gem-card" style={r.is_active ? { boxShadow: "0 0 0 2px #22c55e, 0 0 16px rgba(34,197,94,0.45)" } : undefined}>
               <div className="pr-gem-card-inner" style={{ flexWrap: "wrap" }}>
                <ModusTegel modus={r.modus} size={56} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>{r.name}</div>
                  <div style={{ fontSize: "0.78rem", color: info.kleur, fontWeight: 600, marginTop: 2 }}>{info.label}</div>
                </div>
                <div className="rl-acties rl-acties--vast">
                  <span className={`pr-gem-chip rl-status ${status.cls}`}>{status.tekst}</span>
                  {/* Plek 1: de volgende logische stap (publiceren → activeren), bij de actieve route leeg */}
                  {!r.is_active && r.status !== "gepubliceerd" ? (
                    <button className="rl-knop rl-stap" onClick={() => togglePubliceer(r)}>Publiceren</button>
                  ) : !r.is_active && r.status === "gepubliceerd" ? (
                    <button className="rl-knop rl-knop--cyan rl-stap" onClick={() => router.push(`/admin/routes/${r.id}?controle=1`)}
                      title="Eerst controleren of de route klaar is om te spelen">▶ Activeren</button>
                  ) : <span className="rl-knop rl-stap rl-leeg" aria-hidden />}
                  <button className="rl-knop rl-bewerk" onClick={() => router.push(`/admin/routes/${r.id}`)}>Bewerken</button>
                  {/* Icoonknoppen, altijd in dezelfde volgorde */}
                  <button className="rl-knop rl-knop--icoon" data-tip="Voorproefje: één A4 om te delen, zonder antwoorden" aria-label="Voorproefje"
                    onClick={() => router.push(`/admin/routes/${r.id}/voorproefje`)}>👀</button>
                  <BevestigKnop venster gevaarlijk={false} icoon="⧉" titel="Route kopiëren?"
                    vraag={`Er komt een nieuwe route „${r.name} (kopie)” bij, met alle instellingen, punten, vragen en items. De kopie staat op concept.`}
                    ja="Ja, kopiëren" onBevestig={() => kopieer(r.id, r.name)}
                    className="rl-knop rl-knop--icoon" tip="Kopie maken (met punten, vragen en items)" disabled={kopieBezig === r.id}>
                    {kopieBezig === r.id ? "…" : "⧉"}
                  </BevestigKnop>
                  <button className="rl-knop rl-knop--icoon" data-tip="Exporteren: opslaan als bestand (met afbeeldingen)" aria-label="Exporteren"
                    disabled={exportBezig === r.id} onClick={() => exporteer(r.id, r.name)}>{exportBezig === r.id ? "…" : "💾"}</button>
                  {!r.is_active && r.status === "gepubliceerd" ? (
                    <button className="rl-knop rl-knop--icoon" data-tip="Terug naar concept" aria-label="Terug naar concept"
                      onClick={() => togglePubliceer(r)}>↩</button>
                  ) : <span className="rl-knop rl-knop--icoon rl-leeg" aria-hidden />}
                  {!r.is_active ? (
                    <BevestigKnop venster icoon="🗑️" titel="Route verwijderen?"
                      vraag={`„${r.name}” wordt verwijderd, met alle punten, vragen en items. Dit kan niet ongedaan worden gemaakt. Wil je hem bewaren? Exporteer hem dan eerst (💾).`}
                      ja="Ja, verwijderen" onBevestig={() => verwijder(r.id, r.name)}
                      className="rl-knop rl-knop--icoon rl-knop--rood" tip="Route verwijderen">🗑️</BevestigKnop>
                  ) : <span className="rl-knop rl-knop--icoon rl-leeg" aria-hidden />}
                </div>
               </div>
              </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
