"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "@/types/database";
import { MODUS_INFO, ModusTegel } from "./RouteModus";
import BevestigKnop from "@/components/admin/BevestigKnop";
import LeegScherm from "@/components/admin/LeegScherm";
import SectieKop from "@/components/admin/SectieKop";
import SchuifTekst from "@/components/admin/SchuifTekst";
import { toonMelding } from "@/components/admin/Melding";
import { meldActieveRouteGewijzigd, opActieveRouteGewijzigd } from "@/components/admin/ActieveRouteLabel";
import { foutUitleg, uitlegBijStatus } from "@/lib/fout-uitleg";

// "vandaag 14:32", "gisteren 09:10", "3 dagen geleden" of "12 okt 2026"
function wanneer(iso: string): string {
  const d = new Date(iso);
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const dagen = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  if (dagen <= 0) return `vandaag ${tijd}`;
  if (dagen === 1) return `gisteren ${tijd}`;
  if (dagen < 7) return `${dagen} dagen geleden`;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

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
  // Ingedeeld in actief, klaar (database: gepubliceerd) en concept, elk met een kop; binnen een groep op naam
  const rang = (r: Route) => (r.is_active ? 0 : r.status === "gepubliceerd" ? 1 : 2);
  const gesorteerd = [...routes].sort((a, b) => rang(a) - rang(b) || a.name.localeCompare(b.name, "nl"));
  const GROEP_KOP = ["▶ Actief", "✅ Klaar", "✏️ Concept"];
  const aantalIn = (n: number) => gesorteerd.filter((r) => rang(r) === n).length;

  async function laad() {
    const res = await fetch("/api/admin/routes");
    if (res.ok) setRoutes(await res.json());
    setLaden(false);
  }
  // Ook bijwerken als de route via het menu (Stop route) gestopt wordt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { laad(); return opActieveRouteGewijzigd(laad); }, []);

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
    if (!res.ok) { setFout(await foutUitleg(res, "Route aanmaken")); setBezig(false); return; }
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
      if (!res.ok) { toonMelding(await foutUitleg(res, "Exporteren"), "fout"); return; }
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
        setImportFout(uitlegBijStatus(res.status, "Importeren", data.fout));
        setImportBezig(false);
        return;
      }
      if (mislukt) toonMelding(`Route geïmporteerd, maar ${mislukt} afbeelding(en) konden niet worden teruggezet`, "fout");
      router.push(`/admin/routes/${data.id}`);
    } catch {
      setImportFout("Importeren mislukt: dit is geen geldig routebestand. Kies een .json-bestand dat je eerder met 📤 Exporteren hebt gemaakt.");
      setImportBezig(false);
    }
  }

  async function verwijder(id: string, naam: string) {
    const res = await fetch(`/api/admin/routes/${id}`, { method: "DELETE" });
    toonMelding(res.ok ? `Route "${naam}" verwijderd` : await foutUitleg(res, "Verwijderen"), res.ok ? "ok" : "fout");
    laad();
  }

  // Kopie als basis voor een nieuwe route: alle instellingen, punten, vragen en items
  const [kopieBezig, setKopieBezig] = useState<string | null>(null);
  // Telefoon: routekaarten starten ingeklapt; tik op naam of icoon om de knoppen te tonen
  const [open, setOpen] = useState<Set<string>>(new Set());
  const wisselOpen = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  async function kopieer(id: string, naam: string) {
    setKopieBezig(id);
    const res = await fetch(`/api/admin/routes/${id}/kopie`, { method: "POST" });
    setKopieBezig(null);
    if (!res.ok) { toonMelding(await foutUitleg(res, "Kopiëren"), "fout"); return; }
    toonMelding(`Kopie van "${naam}" gemaakt`, "ok");
    laad();
  }

  async function deactiveer() {
    const res = await fetch("/api/admin/routes/stoppen", { method: "POST" });
    if (!res.ok) toonMelding(await foutUitleg(res, "Deactiveren"), "fout");
    meldActieveRouteGewijzigd();
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

  // De volgende stap voor een route, als één duidelijke knop:
  // concept → ✅ Klaarzetten (eerst de controle), klaar → ▶ Activeren (ook via de controle), actief → ⏹ Deactiveren
  function stapKnop(r: Route) {
    if (r.is_active) {
      return (
        <BevestigKnop venster icoon="⏹️" titel={`"${r.name}" deactiveren?`} vraag="" knopTekst="Ja, deactiveren"
          uitleg="Lopende spellen stoppen. De route blijft Klaar, dus je kunt hem later opnieuw activeren."
          onBevestig={deactiveer} className="rl-knop rl-knop--rood rl-stap">⏹ Deactiveren</BevestigKnop>
      );
    }
    if (r.status === "gepubliceerd") {
      return (
        <button type="button" className="rl-knop rl-knop--cyan rl-stap" title="Laatste controle, daarna kunnen de spelers beginnen"
          onClick={() => router.push(`/admin/routes/${r.id}?controle=1`)}>▶ Activeren</button>
      );
    }
    return (
      <button type="button" className="rl-knop rl-stap" title="Eerst controleren; is alles in orde, dan zet je de route klaar"
        onClick={() => router.push(`/admin/routes/${r.id}?controle=1`)}>✅ Klaarzetten</button>
    );
  }

  return (
    <div>
      {/* Nieuwe route links, importeren rechts (zoals bij Groepen) */}
      <div className="actie-rij" style={{ marginBottom: 22 }}>
        <button className="btn btn-primary actie-knop" onClick={() => setAanmaken(true)}>
          + <span className="alleen-pc">Nieuwe route</span><span className="alleen-mobiel">Route</span>
        </button>
        <span style={{ flex: 1 }} />
        <button className="rl-knop actie-knop" title="Een eerder geëxporteerde route (bestand) toevoegen"
          onClick={() => importRef.current?.click()} disabled={importBezig}>
          {importBezig ? "…" : <>📥 <span className="alleen-pc">Route importeren</span><span className="alleen-mobiel">Importeren</span></>}
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
            <label className="form-label" title="Hoeveel teams spelen er tegelijk? Later aan te passen.">Teams</label>
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
        <LeegScherm icoon="🗺️" knop={{ label: "+ Nieuwe route", onClick: () => setAanmaken(true) }}>
          Nog geen routes. Maak er een, of importeer een route die je eerder hebt geëxporteerd (📥 rechtsboven).
        </LeegScherm>
      ) : (
        <div>
          {gesorteerd.map((r, i) => {
            const nieuweGroep = i === 0 || rang(gesorteerd[i - 1]) !== rang(r);
            const info = MODUS_INFO[r.modus];

            return (
              <Fragment key={r.id}>
              {nieuweGroep && (
                <div style={{ marginTop: i === 0 ? 0 : 22 }}>
                  <SectieKop titel={rang(r) === 0 ? GROEP_KOP[0] : `${GROEP_KOP[rang(r)]} (${aantalIn(rang(r))})`} />
                </div>
              )}
              <div className={`pr-gem-card rl-kaart${open.has(r.id) ? " rl-kaart--open" : ""}`} style={r.is_active ? { boxShadow: "0 0 0 2px #22c55e, 0 0 16px rgba(34,197,94,0.45)" } : undefined}>
               <div className="pr-gem-card-inner" style={{ flexWrap: "wrap" }}>
                {/* Kop: op de telefoon de knop om de kaart open en dicht te klappen */}
                <div className="rl-kop" role="button" tabIndex={0} onClick={() => wisselOpen(r.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") wisselOpen(r.id); }} aria-expanded={open.has(r.id)}>
                  <ModusTegel modus={r.modus} size={56} />
                  <span className="rl-titel">
                    <SchuifTekst tekst={r.name} style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }} />
                    {/* Telefoon: spelsoort en datum samen op één regel */}
                    <span className="rl-meta">
                      <span className="rl-modus" style={{ color: info.kleur }}>{info.label}</span>
                      {r.bewerkt_op && (
                        <span className="rl-datum" title={new Date(r.bewerkt_op).toLocaleString("nl-NL")}>
                          ✏️ <span className="rl-datum-woord">Aangepast </span>{wanneer(r.bewerkt_op)}
                        </span>
                      )}
                    </span>
                  </span>
                  {/* Telefoon: de volgende stap naast de naam (de status staat al in de kop van de groep) */}
                  <span className="rl-kop-stap" onClick={(e) => e.stopPropagation()}>{stapKnop(r)}</span>
                  <span className="rl-pijl" aria-hidden>{open.has(r.id) ? "▾" : "▸"}</span>
                </div>
                <div className="rl-acties rl-acties--vast">
                  {/* Telefoon: eerst de knoppen met tekst over de hele breedte, daaronder de iconen */}
                  <div className="rl-tekstknoppen">
                  {/* Plek 1: de volgende stap: klaarzetten → activeren → deactiveren (computer) */}
                  <span className="rl-stap-plek">{stapKnop(r)}</span>
                  <button className="rl-knop rl-bewerk" onClick={() => router.push(`/admin/routes/${r.id}`)}>✏️ Bewerken</button>
                  </div>
                  {/* Icoonknoppen, altijd in dezelfde volgorde */}
                  <div className="rl-icoonknoppen">
                  <button className="rl-knop rl-knop--icoon" data-tip="Voorproefje: één A4 om te delen, zonder antwoorden" aria-label="Voorproefje"
                    onClick={() => router.push(`/admin/routes/${r.id}/voorproefje`)}>📄<span className="rl-knop-label">Voorproefje</span></button>
                  <BevestigKnop venster gevaarlijk={false} icoon="📋" titel="Route kopiëren?"
                    vraag="" uitleg="Met alle instellingen, punten, vragen en items. De kopie staat op Concept."
                    ja="Ja, kopiëren" onBevestig={() => kopieer(r.id, r.name)}
                    className="rl-knop rl-knop--icoon" tip="Kopie maken (met punten, vragen en items)" disabled={kopieBezig === r.id}>
                    {kopieBezig === r.id ? "…" : "📋"}<span className="rl-knop-label">Kopiëren</span>
                  </BevestigKnop>
                  <button className="rl-knop rl-knop--icoon" data-tip="Exporteren: opslaan als bestand (met afbeeldingen)" aria-label="Exporteren"
                    disabled={exportBezig === r.id} onClick={() => exporteer(r.id, r.name)}>{exportBezig === r.id ? "…" : "📤"}<span className="rl-knop-label">Exporteren</span></button>
                  {!r.is_active && r.status === "gepubliceerd" ? (
                    <button className="rl-knop rl-knop--icoon" data-tip="Terug naar concept (weer bewerken voordat je activeert)" aria-label="Terug naar concept"
                      onClick={() => togglePubliceer(r)}>↩️<span className="rl-knop-label">Concept</span></button>
                  ) : <span className="rl-knop rl-knop--icoon rl-leeg" aria-hidden />}
                  {!r.is_active ? (
                    <BevestigKnop venster icoon="🗑️" titel={`„${r.name}” verwijderen?`}
                      vraag="" uitleg="Met alle punten, vragen en items. Dit kan niet ongedaan worden gemaakt; exporteer hem eerst (📤) als je hem wilt bewaren."
                      ja="Ja, verwijderen" onBevestig={() => verwijder(r.id, r.name)}
                      className="rl-knop rl-knop--icoon rl-knop--rood" tip="Route verwijderen">🗑️<span className="rl-knop-label">Verwijderen</span></BevestigKnop>
                  ) : <span className="rl-knop rl-knop--icoon rl-leeg" aria-hidden />}
                  </div>
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
