"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "@/types/database";
import { MODUS_INFO, ModusTegel } from "./RouteModus";
import { leesPunten, naamUitBestand, IMPORT_INFO_TEKST, IMPORT_STRAAL_M, type ImportResultaat } from "@/lib/punten-import";
import { afstandTekst } from "@/lib/geo";
import { SJABLONEN } from "@/lib/sjablonen";
import BevestigKnop from "@/components/admin/BevestigKnop";
import LeegScherm from "@/components/admin/LeegScherm";
import SectieKop from "@/components/admin/SectieKop";
import SchuifTekst from "@/components/admin/SchuifTekst";
import { toonMelding } from "@/components/admin/Melding";
import { meldActieveRouteGewijzigd, opActieveRouteGewijzigd } from "@/components/admin/ActieveRouteLabel";
import { foutUitleg, uitlegBijStatus } from "@/lib/fout-uitleg";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import { StartitemsKiezer, NaFinishKiezer } from "@/components/admin/ItemKeuze";
import Venster, { VensterMetKop } from "@/components/shared/Venster";
import { huisLogoUrl } from "@/lib/huisstijl";
import UitklapPijl from "@/components/shared/UitklapPijl";

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
  const [routes, setRoutes] = useState<(Route & { start?: { lat: number; lng: number } | null })[]>([]);
  // 📍 Plaats van elke route (uit het startpunt), onthouden op dit toestel; de kaartdienst wil één vraag per seconde
  const [plaatsen, setPlaatsen] = useState<Record<string, string>>({});
  useEffect(() => {
    let weg = false;
    const sleutel = (s: { lat: number; lng: number }) => `pr_plaats_${s.lat.toFixed(2)}_${s.lng.toFixed(2)}`;
    (async () => {
      const gevonden: Record<string, string> = {};
      const nogOpzoeken: typeof routes = [];
      for (const r of routes) {
        if (!r.start) continue;
        let bekend: string | null = null;
        try { bekend = localStorage.getItem(sleutel(r.start)); } catch { /* geen opslag */ }
        if (bekend) gevonden[r.id] = bekend; else nogOpzoeken.push(r);
      }
      if (!weg) setPlaatsen(gevonden);
      for (let i = 0; i < nogOpzoeken.length && !weg; i++) {
        const r = nogOpzoeken[i];
        if (i > 0) await new Promise((ok) => setTimeout(ok, 1100));
        const res = await fetch(`/api/admin/geocode?lat=${r.start!.lat}&lng=${r.start!.lng}&plaats=1`).catch(() => null);
        const naam = res?.ok ? (await res.json()).naam as string : null;
        if (!naam || weg) continue;
        try { localStorage.setItem(sleutel(r.start!), naam); } catch { /* geen opslag */ }
        setPlaatsen((p) => ({ ...p, [r.id]: naam }));
      }
    })();
    return () => { weg = true; };
  }, [routes]);
  const [laden, setLaden] = useState(true);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [nieuweModus, setNieuweModus] = useState<"sequentieel" | "verspreid">("sequentieel");
  const [aanmaken, setAanmaken] = useState(false);
  // Beginnen met een GPX-bestand (alleen Op volgorde): de punten komen er meteen in
  const [gpx, setGpx] = useState<{ bestand: string; resultaat: ImportResultaat } | null>(null);
  // Met GPX: hele route meteen zichtbaar en zonder vensters langs de punten (beide aan te passen)
  const [gpxHeleRoute, setGpxHeleRoute] = useState(true);
  const [gpxStil, setGpxStil] = useState(true);
  // 📦 Sjabloon: kant-en-klare instellingen voor een soort uitje
  const [sjabloon, setSjabloon] = useState("standaard");
  // Meteen bij het maken te kiezen (later aan te passen in ⚙️ Instellingen)
  const [puzzelAan, setPuzzelAan] = useState(false);
  // null = wat het soort uitje (of het speltype) aangeeft
  const [startitems, setStartitems] = useState<Record<string, number> | null>(null);
  const [naFinish, setNaFinish] = useState<string[]>([]);
  const gpxRef = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [importBezig, setImportBezig] = useState(false);
  const [importFout, setImportFout] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  // Ingedeeld in actief, klaar (database: gepubliceerd) en concept, elk met een kop; binnen een groep op naam
  const rang = (r: Route) => (r.is_active ? 0 : r.status === "gepubliceerd" ? 1 : 2);
  const gesorteerd = [...routes].sort((a, b) => rang(a) - rang(b) || a.name.localeCompare(b.name, "nl"));
  const GROEP_KOP = ["▶ Actief", "✅ Klaar", "✏️ Concept"];
  // 📁 Mappen en 🔍 zoeken (migratie 022): filter op naam en op map ("" = zonder map)
  const [zoek, setZoek] = useState("");
  const [mapFilter, setMapFilter] = useState<string | null>(null);
  const [mapVoor, setMapVoor] = useState<Route | null>(null);
  const [nieuweMap, setNieuweMap] = useState("");
  const mappen = [...new Set(routes.map((r) => r.map).filter((m): m is string => !!m))].sort((a, b) => a.localeCompare(b, "nl"));
  const gefilterd = gesorteerd.filter((r) => (!zoek.trim() || r.name.toLowerCase().includes(zoek.trim().toLowerCase()))
    && (mapFilter === null || (mapFilter === "" ? !r.map : r.map === mapFilter)));
  const aantalIn = (n: number) => gefilterd.filter((r) => rang(r) === n).length;
  async function zetMap(r: Route, map: string | null) {
    const res = await fetch(`/api/admin/routes/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ map }) }).catch(() => null);
    if (!res?.ok) { toonMelding(res ? await foutUitleg(res, "Map opslaan") : uitlegBijStatus(0, "Map opslaan"), "fout"); return; }
    setRoutes((rs) => rs.map((x) => (x.id === r.id ? { ...x, map } : x)));
    setMapVoor(null); setNieuweMap("");
  }

  async function laad() {
    const res = await fetch("/api/admin/routes");
    if (res.ok) setRoutes(await res.json());
    setLaden(false);
  }
  // Ook bijwerken als de route via het menu (Stop route) gestopt wordt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { laad(); return opActieveRouteGewijzigd(laad); }, []);

  // Venster "Nieuwe route": Escape sluit het; dicht = gekozen bestand vergeten
  useEffect(() => {
    if (!aanmaken) { setGpx(null); return; }
  }, [aanmaken]);

  async function kiesGpx(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    e.target.value = "";
    if (bestand) await leesGpxBestand(bestand);
  }
  // GPX of KML: een nieuwe route op volgorde met deze punten (ook via 📥 Bestand openen)
  async function leesGpxBestand(bestand: File) {
    const resultaat = leesPunten(await bestand.text());
    if (!resultaat.punten.length) { setFout("In dit bestand staan geen punten of spoor"); return; }
    setFout("");
    setGpx({ bestand: bestand.name, resultaat });
    setNieuweModus("sequentieel");
    setNieuweNaam((n) => n.trim() ? n : naamUitBestand(bestand.name));
    setAanmaken(true);
  }

  async function nieuwRoute(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true); setFout("");
    const res = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nieuweNaam.trim(), modus: nieuweModus }),
    });
    if (!res.ok) { setFout(await foutUitleg(res, "Route aanmaken")); setBezig(false); return; }
    const route = await res.json();
    // Sjabloon: de instellingen voor dit soort uitje meteen zetten
    const inst: Record<string, unknown> = { ...(SJABLONEN.find((s) => s.sleutel === sjabloon)?.instellingen ?? {}) };
    // Eigen keuzes in dit venster gaan voor het sjabloon
    if (startitems) inst.startitems = startitems;
    if (naFinish.length) inst.items_na_finish_types = naFinish;
    if (Object.keys(inst).length) {
      const r = await fetch(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inst) });
      if (!r.ok) toonMelding(`Route aangemaakt, maar de instellingen van het sjabloon niet: ${await foutUitleg(r, "Opslaan")}`, "fout");
    }
    // 🧩 Puzzelwoord aan: het woord kies je in de editor zodra er vragen zijn (migratie 017)
    if (puzzelAan) {
      const r = await fetch(`/api/admin/routes/${route.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ puzzel_aan: true }) });
      if (!r.ok) toonMelding(`Route aangemaakt, maar het puzzelwoord niet aangezet: ${await foutUitleg(r, "Opslaan")}`, "fout");
    }
    // Met GPX: de punten meteen toevoegen (infopunten, finish aan het eind van een spoor)
    if (gpx) {
      const imp = await fetch(`/api/admin/routes/${route.id}/punten/meerdere`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ punten: gpx.resultaat.punten, beschrijving: gpxStil ? "" : IMPORT_INFO_TEKST, radius_meters: IMPORT_STRAAL_M }),
      });
      if (gpxHeleRoute) {
        const zicht = await fetch(`/api/admin/routes/${route.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alle_punten_zichtbaar: true }),
        });
        if (!zicht.ok) toonMelding(`Hele route zichtbaar lukte niet: ${await foutUitleg(zicht, "Opslaan")}`, "fout");
      }
      if (!imp.ok) toonMelding(`Route aangemaakt, maar de punten uit het bestand lukten niet: ${await foutUitleg(imp, "Importeren")} Probeer het in de editor met 📥 Importeren.`, "fout");
    }
    router.push(`/admin/routes/${route.id}`);
  }

  // Export: de server levert alle gegevens, de browser pakt daarna de afbeeldingen in het bestand in
  const [exportBezig, setExportBezig] = useState<string | null>(null);
  // Eén route met al zijn afbeeldingen (als tekst in het bestand); ontbreekt = afbeeldingen die niet mee konden
  async function routeGegevens(id: string): Promise<{ data: Record<string, unknown>; ontbreekt: number } | null> {
    const res = await fetch(`/api/admin/routes/${id}/export`);
    if (!res.ok) { toonMelding(await foutUitleg(res, "Exporteren"), "fout"); return null; }
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
    return { data, ontbreekt };
  }
  // Bestandsnaam: spel, naam en datum, bijv. PointRush_Op-zn-Loatst_2026-10-16.json
  function download(inhoud: unknown, naam: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(inhoud)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    const schoon = naam.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    a.download = `PointRush_${schoon}_${new Date().toLocaleDateString("sv-SE")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  async function exporteer(id: string, naam: string) {
    setExportBezig(id);
    try {
      const r = await routeGegevens(id);
      if (!r) return;
      download(r.data, naam);
      toonMelding(r.ontbreekt ? `Geëxporteerd, maar ${r.ontbreekt} afbeelding(en) konden niet worden meegenomen` : "Route geëxporteerd, met alle afbeeldingen", r.ontbreekt ? "fout" : "ok");
    } finally {
      setExportBezig(null);
    }
  }
  // 💾 Back-up: alle routes in één bestand (terugzetten gaat met 📥 Bestand openen)
  const [backupStand, setBackupStand] = useState<string | null>(null);
  async function maakBackup() {
    const lijst = [...routes];
    const alle: Record<string, unknown>[] = [];
    let ontbreekt = 0;
    try {
      for (let k = 0; k < lijst.length; k++) {
        setBackupStand(`${k + 1}/${lijst.length}`);
        const r = await routeGegevens(lijst[k].id);
        if (!r) return;
        alle.push(r.data);
        ontbreekt += r.ontbreekt;
      }
      download({ _backup: 1, gemaakt: new Date().toISOString(), routes: alle }, "back-up-alle-routes");
      toonMelding(ontbreekt ? `Back-up gemaakt van ${alle.length} routes; ${ontbreekt} afbeelding(en) konden niet mee` : `Back-up gemaakt van ${alle.length} routes, met alle afbeeldingen`, ontbreekt ? "fout" : "ok");
    } finally {
      setBackupStand(null);
    }
  }

  // Eén route terugzetten: eerst de afbeeldingen (los, zodat geen enkel verzoek te groot wordt), dan de route
  async function zetRouteTerug(json: Record<string, unknown>): Promise<{ id?: string; fout?: string; mislukt: number }> {
    const afbeeldingen = (json.afbeeldingen ?? {}) as Record<string, { type: string; data: string }>;
    let mislukt = 0;
    for (const [sleutel, beeld] of Object.entries(afbeeldingen)) {
      const r = await fetch("/api/admin/routes/import/afbeelding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleutel, type: beeld.type, data: beeld.data }),
      }).catch(() => null);
      if (!r?.ok) mislukt++;
    }
    const zonderBeelden = { ...json };
    delete zonderBeelden.afbeeldingen;
    const res = await fetch("/api/admin/routes/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zonderBeelden),
    });
    const data = await res.json();
    return res.ok ? { id: data.id, mislukt } : { fout: uitlegBijStatus(res.status, "Importeren", data.fout), mislukt };
  }

  // 📥 Bestand openen: herkent zelf wat het is. GPX/KML → nieuwe route met die punten; JSON → route of back-up terugzetten
  async function importeer(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    if (!bestand) return;
    e.target.value = "";
    if (/.(gpx|kml)$/i.test(bestand.name)) { await leesGpxBestand(bestand); return; }
    setImportBezig(true);
    setImportFout("");
    try {
      const json = JSON.parse(await bestand.text());
      // Back-up van alle routes: elke route terugzetten (als nieuwe route, naast wat er al staat)
      if (json._backup && Array.isArray(json.routes)) {
        let gelukt = 0, mislukt = 0;
        for (const route of json.routes as Record<string, unknown>[]) {
          const r = await zetRouteTerug(route);
          if (r.id) gelukt++;
          mislukt += r.mislukt;
        }
        await laad();
        setImportBezig(false);
        toonMelding(`${gelukt} van ${json.routes.length} routes teruggezet${mislukt ? `, ${mislukt} afbeelding(en) niet` : ""}`, gelukt === json.routes.length && !mislukt ? "ok" : "fout");
        return;
      }
      const r = await zetRouteTerug(json);
      if (!r.id) {
        setImportFout(r.fout ?? "Importeren mislukt");
        setImportBezig(false);
        return;
      }
      if (r.mislukt) toonMelding(`Route geïmporteerd, maar ${r.mislukt} afbeelding(en) konden niet worden teruggezet`, "fout");
      router.push(`/admin/routes/${r.id}`);
    } catch {
      setImportFout("Importeren mislukt: dit is geen geldig routebestand. Kies een .json-bestand dat je eerder met 📤 Exporteren of 💾 Back-up hebt gemaakt.");
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
          onClick={() => router.push(`/admin/routes/${r.id}?controle=1`)}>▶ Starten</button>
      );
    }
    return (
      <button type="button" className="rl-knop rl-knop--cyan rl-stap" title="Controleren en starten: is alles in orde, dan kunnen de spelers beginnen"
        onClick={() => router.push(`/admin/routes/${r.id}?controle=1`)}>▶ Starten</button>
    );
  }

  return (
    <div>
      {/* Nieuwe route links, importeren rechts (zoals bij Groepen) */}
      <div className="actie-rij" style={{ marginBottom: 24 }}>
        <button className="btn btn-primary actie-knop" onClick={() => setAanmaken(true)}>
          + <span className="alleen-pc">Nieuwe route</span><span className="alleen-mobiel">Route</span>
        </button>
        <span style={{ flex: 1 }} />
        <button className="rl-knop actie-knop" title="Alle routes met vragen en afbeeldingen in één bestand bewaren (terugzetten met Bestand openen)"
          onClick={maakBackup} disabled={!!backupStand || !routes.length}>
          {backupStand ? `⏳ ${backupStand}` : <>💾 <span className="alleen-pc">Back-up</span></>}
        </button>
        <button className="rl-knop actie-knop" title="Open een bestand: een wandeling (GPX of KML) wordt een nieuwe route; een geëxporteerde route of back-up wordt teruggezet"
          onClick={() => importRef.current?.click()} disabled={importBezig}>
          {importBezig ? "…" : <>📥 <span className="alleen-pc">Bestand openen</span><span className="alleen-mobiel">Openen</span></>}
        </button>
        <input ref={importRef} type="file" accept=".json,.gpx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml" style={{ display: "none" }} onChange={importeer} />
      </div>
      {importFout && <div className="melding melding-fout" style={{ marginBottom: 12 }}>⚠️ {importFout}</div>}

      {aanmaken && (
        <Venster onSluit={() => setAanmaken(false)} breedte={480}>
            <form onSubmit={nieuwRoute} className="pr-gem-panel-inner nieuwe-route">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pr-gem-avatar" style={{ width: 34, height: 34, fontSize: "1.15rem" }}>🗺️</span>
                <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#fff" }}>Nieuwe route</div>
                <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => setAanmaken(false)} title="Sluiten" aria-label="Sluiten">✕</button>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="nieuwe-route-naam">Naam van de route</label>
                <input id="nieuwe-route-naam" className="form-input" placeholder="Bijv. Rondje Berghem"
                  value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} required autoFocus maxLength={80} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <span className="form-label">Speltype <span className="nieuwe-route-bij">· kan later niet meer veranderen</span></span>
                <div className="nieuwe-route-typen" role="radiogroup" aria-label="Speltype">
                  {(["sequentieel", "verspreid"] as const).map((m) => {
                    const info = MODUS_INFO[m];
                    const gekozen = nieuweModus === m;
                    return (
                      <button key={m} type="button" role="radio" aria-checked={gekozen} onClick={() => { setNieuweModus(m); if (m === "verspreid") setGpx(null); }}
                        className={`nieuwe-route-type${gekozen ? " aan" : ""}`}
                        style={gekozen ? { borderColor: `${info.kleur}aa`, background: info.tint } : undefined}>
                        <ModusTegel modus={m} size={30} />
                        <span style={{ minWidth: 0 }}>
                          <span className="nieuwe-route-type-naam" style={gekozen ? { color: info.kleur } : undefined}>{info.label}</span>
                          <span className="nieuwe-route-type-uitleg">{info.kort}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 📦 Sjabloon: instellingen in één keer goed voor het soort uitje */}
              <div className="form-group" style={{ margin: 0 }}>
                <span className="form-label">Soort uitje <span className="nieuwe-route-bij">· instellingen, later aan te passen</span></span>
                <div className="segment" role="radiogroup" aria-label="Soort uitje">
                  {SJABLONEN.map((s) => (
                    <button key={s.sleutel} type="button" role="radio" aria-checked={sjabloon === s.sleutel} className={sjabloon === s.sleutel ? "aan" : ""} onClick={() => setSjabloon(s.sleutel)}>{s.naam}</button>
                  ))}
                </div>
                <span className="nieuwe-route-noot">{SJABLONEN.find((s) => s.sleutel === sjabloon)?.uitleg}</span>
              </div>

              {/* 🧩 Puzzelwoord: nu alleen aan of uit; het woord kies je later, als het aantal vragen bekend is */}
              <div className="form-group" style={{ margin: 0 }}>
                <span className="form-label">🧩 Puzzelwoord <span className="nieuwe-route-bij">· elke goede vraag geeft een letter</span></span>
                <div className="segment" role="radiogroup" aria-label="Puzzelwoord">
                  <button type="button" role="radio" aria-checked={!puzzelAan} className={!puzzelAan ? "aan" : ""} onClick={() => setPuzzelAan(false)}>Nee</button>
                  <button type="button" role="radio" aria-checked={puzzelAan} className={puzzelAan ? "aan" : ""} onClick={() => setPuzzelAan(true)}>Ja</button>
                </div>
                <span className="nieuwe-route-noot">{puzzelAan
                  ? "Het woord kies je later in ⚙️ Instellingen, als je weet hoeveel vragen er zijn (zoveel letters krijgt het woord)."
                  : "De teams verdienen per goede vraag een letter van een geheim woord en raden het bij de finish voor bonuspunten."}</span>
              </div>

              {/* 🎒 Startitems: elk team krijgt ze na de eerste 100 meter */}
              <div className="form-group" style={{ margin: 0 }}>
                <span className="form-label">🎒 Items bij de start <span className="nieuwe-route-bij">· tik = +1</span></span>
                <StartitemsKiezer waarde={startitems ?? ((SJABLONEN.find((s) => s.sleutel === sjabloon)?.instellingen.startitems as Record<string, number> | undefined) ?? (nieuweModus === "sequentieel" ? { banaan: 1 } : {}))}
                  onWijzig={setStartitems} />
                <span className="nieuwe-route-noot">Elk team krijgt deze items gratis in de balk, na de eerste 100 meter.</span>
              </div>

              {/* 🏁 Items na de finish */}
              <div className="form-group" style={{ margin: 0 }}>
                <span className="form-label">🏁 Items na de finish <span className="nieuwe-route-bij">· aan of uit</span></span>
                <NaFinishKiezer waarde={naFinish} onWijzig={setNaFinish} />
                <span className="nieuwe-route-noot">{naFinish.length
                  ? "Teams die al binnen zijn, mogen deze items nog inzetten op teams die onderweg zijn (tot je de uitslag vrijgeeft)."
                  : "Uit: wat een team nog over heeft, vervalt bij de finish. Tik items aan die daarna nog mogen."}</span>
              </div>

              {/* Beginnen met een GPX (alleen Op volgorde): de punten komen er meteen in */}
              <div className="form-group" style={{ margin: 0 }}>
                <span className="form-label">Bestand <span className="nieuwe-route-bij">· GPX of KML, mag ook later</span></span>
                {gpx ? (
                  <div className="nieuwe-route-gpx">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nieuwe-route-gpx-naam" title={gpx.bestand}>📄 {gpx.bestand}</div>
                      <div className="nieuwe-route-gpx-aantal">
                        ✓ {gpx.resultaat.punten.filter((p) => !p.finish).length} punten{gpx.resultaat.punten.some((p) => p.finish) && " + 🏁 finish"}
                        {gpx.resultaat.spoor && <span> · {afstandTekst(gpx.resultaat.spoor.meter)}</span>}
                      </div>
                    </div>
                    <button type="button" className="editor-paneel-sluit venster-sluit-klein" onClick={() => setGpx(null)} title="Bestand weghalen" aria-label="Bestand weghalen">✕</button>
                  </div>
                ) : (
                  <button type="button" className="rl-knop" style={{ justifyContent: "center", height: 38 }} onClick={() => gpxRef.current?.click()}
                    title="Alleen bij Op volgorde: een wandeling uit een app of van een Garmin wordt meteen je route">
                    📂 Bestand inlezen
                  </button>
                )}
                <input ref={gpxRef} type="file" accept=".gpx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml" onChange={kiesGpx} style={{ display: "none" }} />
                {gpx ? (<>
                  <div className="segment" role="radiogroup" aria-label="Wat zien de spelers">
                    <button type="button" role="radio" aria-checked={gpxHeleRoute} className={gpxHeleRoute ? "aan" : ""} onClick={() => setGpxHeleRoute(true)}>🗺️ Hele route zichtbaar</button>
                    <button type="button" role="radio" aria-checked={!gpxHeleRoute} className={!gpxHeleRoute ? "aan" : ""} onClick={() => setGpxHeleRoute(false)}>📍 Alleen volgend punt</button>
                  </div>
                  <div className="segment" role="radiogroup" aria-label="Wat krijgt de speler bij een punt">
                    <button type="button" role="radio" aria-checked={gpxStil} className={gpxStil ? "aan" : ""} onClick={() => setGpxStil(true)}>🚶 Gewoon doorlopen</button>
                    <button type="button" role="radio" aria-checked={!gpxStil} className={!gpxStil ? "aan" : ""} onClick={() => setGpxStil(false)}>ℹ️ Tekst bij elk punt</button>
                  </div>
                  <span className="nieuwe-route-noot">{gpxStil ? "Elk punt telt vanzelf als gepasseerd." : `Bij elk punt: "${IMPORT_INFO_TEKST}"`}</span>
                </>) : null}
              </div>

              {fout && <div className="melding melding-fout" style={{ margin: 0 }}>⚠️ {fout}</div>}

              <button className="rl-knop hoofdknop nieuwe-route-knop" type="submit" disabled={bezig || !nieuweNaam.trim()}>
                {bezig ? "⏳ Aanmaken…" : gpx ? "Aanmaken met deze punten →" : "Aanmaken en beginnen →"}
              </button>
              {!gpx && <div className="nieuwe-route-noot" style={{ textAlign: "center" }}>Daarna helpt de app je stap voor stap.</div>}
              <div className="pc-tip pc-tip--alleen-mobiel" style={{ margin: 0 }}>💻 <strong>Tip:</strong> een route maak je het makkelijkst op een pc of laptop.</div>
            </form>
        </Venster>
      )}

      {/* 🔍 Zoeken en 📁 mappen (alleen als er iets te zoeken of te kiezen valt) */}
      {!laden && (routes.length > 4 || mappen.length > 0) && (
        <div className="rl-filter">
          <input className="form-input rl-zoek" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="🔍 Zoek een route…" aria-label="Zoek een route" />
          {mappen.length > 0 && <>
            <button type="button" className={`rl-knop${mapFilter === null ? " rl-knop--cyan" : ""}`} aria-pressed={mapFilter === null} onClick={() => setMapFilter(null)}>Alle</button>
            {mappen.map((m) => (
              <button key={m} type="button" className={`rl-knop${mapFilter === m ? " rl-knop--cyan" : ""}`} aria-pressed={mapFilter === m} onClick={() => setMapFilter(mapFilter === m ? null : m)}>
                📁 {m} <span className="seizoen-telling">{routes.filter((r) => r.map === m).length}</span>
              </button>
            ))}
            {routes.some((r) => !r.map) && (
              <button type="button" className={`rl-knop${mapFilter === "" ? " rl-knop--cyan" : ""}`} aria-pressed={mapFilter === ""} onClick={() => setMapFilter(mapFilter === "" ? null : "")}>Zonder map</button>
            )}
          </>}
        </div>
      )}

      {/* 📁 Map kiezen voor een route */}
      {mapVoor && (
        <VensterMetKop icoon="📁" label="Map" titel={mapVoor.name} breedte={400} onSluit={() => { setMapVoor(null); setNieuweMap(""); }}>
          {mappen.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {mappen.map((m) => (
                <button key={m} type="button" className={`rl-knop${mapVoor.map === m ? " rl-knop--cyan" : ""}`} onClick={() => zetMap(mapVoor, m)}>📁 {m}</button>
              ))}
            </div>
          )}
          <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); if (nieuweMap.trim()) zetMap(mapVoor, nieuweMap.trim()); }}>
            <input className="form-input" style={{ flex: 1 }} value={nieuweMap} onChange={(e) => setNieuweMap(e.target.value)} placeholder="Nieuwe map, bijv. Bedrijfsuitjes" maxLength={40} />
            <button type="submit" className="rl-knop rl-knop--cyan" disabled={!nieuweMap.trim()}>＋ Maken</button>
          </form>
          {mapVoor.map && <button type="button" className="es-link" style={{ alignSelf: "flex-start" }} onClick={() => zetMap(mapVoor, null)}>Uit de map halen</button>}
        </VensterMetKop>
      )}

      {laden ? (
        <LaadBlokjes aantal={3} hoogte={86} />
      ) : routes.length === 0 ? (
        <LeegScherm icoon="🗺️" knop={{ label: "+ Nieuwe route", onClick: () => setAanmaken(true) }}>
          Nog geen routes. Maak er een, of importeer een route die je eerder hebt geëxporteerd (📥 rechtsboven).
        </LeegScherm>
      ) : gefilterd.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Geen route gevonden{zoek.trim() ? ` voor “${zoek.trim()}”` : ""}.</p>
      ) : (
        <div>
          {gefilterd.map((r, i) => {
            const nieuweGroep = i === 0 || rang(gefilterd[i - 1]) !== rang(r);
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
                    {/* Eigen logo (huisstijl), op de telefoon klein onder de naam */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.huisstijl_logo_pad && <img src={huisLogoUrl(r)!} alt="" className="rl-huislogo" />}
                    {/* Telefoon: spelsoort en datum samen op één regel */}
                    <span className="rl-meta">
                      <span className="rl-modus" style={{ color: info.kleur }}>{info.label}</span>
                      {r.map && <span className="rl-map" title="Map">📁 {r.map}</span>}
                      {plaatsen[r.id] && <span className="rl-plaats" title="Plaats van het startpunt">📍 {plaatsen[r.id]}</span>}
                      {r.bewerkt_op && (
                        <span className="rl-datum" title={new Date(r.bewerkt_op).toLocaleString("nl-NL")}>
                          ✏️ <span className="rl-datum-woord">Aangepast </span>{wanneer(r.bewerkt_op)}
                        </span>
                      )}
                    </span>
                  </span>
                  {/* Computer: het logo groot, rechts in de lege ruimte, vlak voor de knoppen */}
                  {r.huisstijl_logo_pad && (
                    <span className="rl-logovak">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={huisLogoUrl(r)!} alt="" />
                    </span>
                  )}
                  {/* Telefoon: de volgende stap naast de naam (de status staat al in de kop van de groep) */}
                  {/* Telefoon (ingeklapt): de volgende stap en Bewerken naast elkaar, net als opengeklapt */}
                  <span className="rl-kop-stap" onClick={(e) => e.stopPropagation()}>
                    {stapKnop(r)}
                    <button className="rl-knop rl-bewerk" onClick={() => router.push(`/admin/routes/${r.id}`)}>✏️ Bewerken</button>
                  </span>
                  <span className="rl-pijl"><UitklapPijl open={open.has(r.id)} /></span>
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
                  <button className="rl-knop rl-knop--icoon" data-tip="In een map zetten (om je routes te ordenen)" aria-label="Map"
                    onClick={() => setMapVoor(r)}>📁<span className="rl-knop-label">Map</span></button>
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
