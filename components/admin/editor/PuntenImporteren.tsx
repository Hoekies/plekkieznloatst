"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";
import { leesPunten, coordsUitLink, IMPORT_INFO_TEKST, IMPORT_START_NAAM, type ImportPunt, type ImportResultaat } from "@/lib/punten-import";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import { afstandTekst } from "@/lib/geo";
import { useSluitMetEsc } from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";

// "📥 Importeren" (alleen bij een route op volgorde): punten uit een GPX/KML-bestand, of een lijst
// met coördinaten en Google Maps-links. Twee stappen: kiezen, dan controleren en toevoegen.
// Ze worden infopunten met één tekst, vóór de finish, met de standaard straal van de route.
// Een GPX-spoor krijgt een 🏁 finish aan het eind, tenzij de route al een finish heeft.
// Is de route nog leeg (leeg), dan wordt het eerste punt de 🚩 start met een welkomsttekst.
export default function PuntenImporteren({ routeId, straal, heeftFinish, leeg, onKlaar }: {
  routeId: string; straal: number; heeftFinish: boolean; leeg: boolean; onKlaar: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [plakken, setPlakken] = useState(false);
  const [tekst, setTekst] = useState("");
  const [bestandsnaam, setBestandsnaam] = useState<string | null>(null);
  const [gevonden, setGevonden] = useState<ImportPunt[]>([]);
  const [nietHerkend, setNietHerkend] = useState<string[]>([]);
  const [spoor, setSpoor] = useState<ImportResultaat["spoor"]>(undefined);
  // De route had al een finish: die van het spoor is weggelaten
  const [finishWeg, setFinishWeg] = useState(false);
  const [infoTekst, setInfoTekst] = useState(IMPORT_INFO_TEKST);
  // Stil = de speler loopt gewoon langs de punten, zonder venster
  const [stil, setStil] = useState(true);
  const [bezig, setBezig] = useState<"lezen" | "opslaan" | null>(null);

  const controleren = gevonden.length > 0 || nietHerkend.length > 0;
  const gewoon = gevonden.filter((p) => !p.finish).length;
  const metFinish = gevonden.some((p) => p.finish);

  useSluitMetEsc(() => setOpen(false), open);

  function opnieuw() {
    setGevonden([]); setNietHerkend([]); setSpoor(undefined); setFinishWeg(false); setBestandsnaam(null);
  }

  async function lees(invoer: string) {
    setBezig("lezen");
    const r = leesPunten(invoer);
    const fout = [...r.nietHerkend];
    const extra: ImportPunt[] = [];
    // Korte links van de Google Maps-app: de server pakt ze uit
    for (const kort of r.korteLinks) {
      const res = await fetch(`/api/admin/maps-link?url=${encodeURIComponent(kort)}`).catch(() => null);
      const lang = res?.ok ? (await res.json()).url as string : null;
      const c = lang ? coordsUitLink(lang) : null;
      if (c) extra.push(c); else fout.push(kort);
    }
    const alle = [...r.punten, ...extra];
    setFinishWeg(heeftFinish && alle.some((p) => p.finish));
    setGevonden(heeftFinish ? alle.filter((p) => !p.finish) : alle);
    setNietHerkend(fout);
    setSpoor(r.spoor);
    setBezig(null);
    if (!alle.length && !fout.length) toonMelding("Geen punten gevonden in dit bestand", "fout");
  }

  async function bestand(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const inhoud = await f.text();
    setTekst("");
    setBestandsnaam(f.name);
    lees(inhoud);
  }

  async function toevoegen() {
    setBezig("opslaan");
    const res = await fetch(`/api/admin/routes/${routeId}/punten/meerdere`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ punten: gevonden, beschrijving: stil ? "" : infoTekst, radius_meters: straal }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(null);
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Importeren", data.fout), "fout"); return; }
    toonMelding(`${data.aantal} punten toegevoegd`, "ok");
    setOpen(false); setTekst(""); setPlakken(false); setInfoTekst(IMPORT_INFO_TEKST); setStil(true); opnieuw();
    onKlaar();
  }

  // Samenvatting bovenaan de controle: wat er gevonden is en waar de finish komt
  const herkomst = spoor
    ? `Spoor van ${afstandTekst(spoor.meter)}${metFinish ? spoor.rondje ? " · eindigt bij de start, dus de finish ligt op de startplek" : " · de finish ligt aan het eind van het spoor" : ""}`
    : "Op de volgorde van het bestand";

  return (
    <>
      <button type="button" className="rl-knop" onClick={() => setOpen(true)}
        title="Punten importeren (GPX, KML, lijst of Google Maps-links)" aria-label="Punten importeren">
        <Icoon naam="downloaden" /><span className="alleen-pc"> Importeren</span>
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2600, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 520, maxHeight: "88vh", display: "flex" }}>
            <div className="pr-gem-panel-inner import-venster">
              <div className="import-kop">
                <span className="import-titel">📥 Punten importeren</span>
                <span className="import-stap">{controleren ? "2. Controleren" : "1. Kiezen"}</span>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
              </div>

              {!controleren && (<>
                <p className="import-uitleg">Zet de punten van een wandeling in deze route, in de volgorde van het bestand.</p>
                <label className="rl-knop rl-knop--cyan import-groot">
                  {bezig === "lezen" ? "⏳ Lezen…" : "📂 GPX- of KML-bestand kiezen"}
                  <input type="file" accept=".gpx,.kml,.txt,.csv,application/gpx+xml,application/vnd.google-earth.kml+xml" onChange={bestand} style={{ display: "none" }} />
                </label>
                <div className="import-noot">GPX uit een wandel-app of van een Garmin, KML uit Google My Maps.</div>
                {!plakken ? (
                  <button type="button" className="rl-knop" onClick={() => setPlakken(true)}><Icoon naam="klembord" /> Of plak een lijst met coördinaten of Google Maps-links</button>
                ) : (<>
                  <textarea className="form-input" rows={5} value={tekst} onChange={(e) => setTekst(e.target.value)} autoFocus
                    placeholder={"Eén punt per regel, bijvoorbeeld:\n52.2215, 6.8937 Kerk\nhttps://maps.app.goo.gl/…"}
                    style={{ fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical" }} />
                  <button type="button" className="rl-knop rl-knop--cyan" disabled={!tekst.trim() || bezig !== null} onClick={() => { setBestandsnaam(null); lees(tekst); }}>
                    {bezig === "lezen" ? <><Icoon naam="laden" />{" Lezen…"}</> : <><Icoon naam="inbeeld" />{" Lezen"}</>}
                  </button>
                </>)}
              </>)}

              {controleren && (<>
                {/* Wat er gevonden is */}
                <div className="import-samenvatting">
                  {bestandsnaam && <div className="import-bestand" title={bestandsnaam}>📄 {bestandsnaam}</div>}
                  <div className="import-aantal">
                    {gevonden.length ? <>✓ {gewoon} punt{gewoon === 1 ? "" : "en"}{metFinish && <> + 🏁 finish</>}</> : "Geen punten gevonden"}
                  </div>
                  {gevonden.length > 0 && <div className="import-noot">{herkomst}</div>}
                  {finishWeg && <div className="import-noot" style={{ color: "#FFE680" }}>🏁 De route heeft al een finish; die blijft staan.</div>}
                </div>

                {/* Wat het worden */}
                {gewoon > 0 && (
                  <div className="import-blok">
                    <span className="import-label">Wat krijgt de speler bij een punt?</span>
                    <div className="segment" role="radiogroup" aria-label="Wat krijgt de speler bij een punt">
                      <button type="button" role="radio" aria-checked={stil} className={stil ? "aan" : ""} onClick={() => setStil(true)}><Icoon naam="lopen" /> Niets, gewoon doorlopen</button>
                      <button type="button" role="radio" aria-checked={!stil} className={!stil ? "aan" : ""} onClick={() => setStil(false)}><Icoon naam="info" /> Een tekst</button>
                    </div>
                    {!stil && <input className="form-input" value={infoTekst} onChange={(e) => setInfoTekst(e.target.value)} maxLength={500} aria-label="Tekst voor de spelers" />}
                    <div className="import-noot">{stil ? "De speler volgt de route; elk punt telt vanzelf als gepasseerd." : "Bij elk punt opent een venster met deze tekst."} Straal {straal} m. Per punt kun je later een tekst of een vraag toevoegen.</div>
                  </div>
                )}

                {/* De punten zelf */}
                {gevonden.length > 0 && <div className="import-label">Punten <span style={{ fontWeight: 400, color: "var(--muted)" }}>(✕ = weglaten)</span></div>}
                <div className="import-lijst">
                  {gevonden.map((p, i) => (
                    <div key={i} className="import-regel" title={`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}>
                      <span className={`import-nr${p.finish ? " import-nr--finish" : leeg && i === 0 ? " import-nr--start" : ""}`}>{p.finish ? "🏁" : leeg && i === 0 ? "🚩" : leeg ? i : i + 1}</span>
                      <span className="import-naam">{p.finish ? "Finish" : leeg && i === 0 ? p.naam || IMPORT_START_NAAM : p.naam || `Punt ${leeg ? i : i + 1}`}</span>
                      <button type="button" className="editor-paneel-sluit" aria-label="Weglaten" onClick={() => setGevonden((g) => g.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  {nietHerkend.map((r, i) => (
                    <div key={`f${i}`} className="import-regel" style={{ color: "#FCA5A5" }}>
                      <span className="import-naam">⚠️ Niet herkend: {r}</span>
                    </div>
                  ))}
                </div>

                <div className="import-voet">
                  <button type="button" className="rl-knop" onClick={opnieuw} disabled={bezig !== null}>← Ander bestand</button>
                  <button type="button" className="rl-knop hoofdknop" style={{ flex: 1 }} disabled={!gevonden.length || bezig !== null} onClick={toevoegen}>
                    {bezig === "opslaan" ? <><Icoon naam="laden" />{" Toevoegen…"}</> : <><Icoon naam="plus" />{` ${gevonden.length} punt${gevonden.length === 1 ? "" : "en"} toevoegen`}</>}
                  </button>
                </div>
              </>)}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
