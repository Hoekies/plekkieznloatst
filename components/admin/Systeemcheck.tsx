"use client";

import { useEffect, useState } from "react";
import type { Check } from "@/app/api/admin/systeem/route";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import UitklapPijl from "@/components/shared/UitklapPijl";
import Icoon from "@/components/admin/Icoon";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { zetVolledigeCheck } from "@/components/admin/SysteemTeller";

type Fout = { id: string; created_at: string; rol: string | null; wie: string | null; pad: string | null; bericht: string; details: string | null; browser: string | null };

// 🐞 Foutmeldingen uit de app: het foutscherm, serverfouten en geweigerde antwoorden. Open als er iets staat.
function FoutLogboek() {
  const [fouten, setFouten] = useState<Fout[] | null>(null);
  const [laadFout, setLaadFout] = useState<string | null>(null);
  const [lijstOpen, setLijstOpen] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  async function laad() {
    const res = await fetch("/api/admin/fouten").catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setLaadFout(d.fout ?? "Foutmeldingen laden lukte niet"); setFouten([]); return; }
    setLaadFout(null);
    setFouten(d.fouten);
    setLijstOpen((d.fouten ?? []).length > 0);
  }
  useEffect(() => { laad(); }, []);
  async function wis() {
    const res = await fetch("/api/admin/fouten", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toonMelding("Wissen lukte niet: controleer je internet en probeer het opnieuw", "fout"); return; }
    setFouten([]);
    setLijstOpen(false);
    toonMelding("Foutmeldingen gewist", "ok");
  }
  if (!fouten) return null;
  const tijd = (t: string) => new Date(t).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="systeem-onderdeel">
      <button type="button" className="systeem-onderdeel-kop systeem-onderdeel-kop--knop" onClick={() => setLijstOpen((o) => !o)} aria-expanded={lijstOpen}>
        <UitklapPijl open={lijstOpen} />
        <span className="systeem-onderdeel-naam">🐞 Foutmeldingen</span>
        <span className={fouten.length ? "systeem-telling systeem-telling--mis" : "systeem-telling"}>{fouten.length} {fouten.length ? <Icoon naam="waarschuwing" /> : <Icoon naam="goed" />}</span>
      </button>
      {laadFout && <div className="systeem-regel systeem-regel--mis">{laadFout}</div>}
      {lijstOpen && (
        <>
          {fouten.length === 0 && <div className="systeem-leeg">Geen foutmeldingen: het foutscherm, serverfouten en geweigerde antwoorden komen hier te staan.</div>}
          {fouten.map((f) => (
            <button key={f.id} type="button" className="systeem-regel systeem-fout" onClick={() => setOpen(open === f.id ? null : f.id)}>
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <span style={{ display: "block", fontWeight: 700, overflowWrap: "anywhere" }}>{f.bericht}</span>
                <span style={{ display: "block", fontSize: "0.74rem", color: "var(--muted)" }}>
                  {tijd(f.created_at)} · {f.wie ?? f.rol ?? "?"}{f.pad ? ` · ${f.pad}` : ""}
                </span>
                {open === f.id && (f.details || f.browser) && <pre className="systeem-fout-details">{[f.details, f.browser].filter(Boolean).join("\n\n")}</pre>}
              </span>
            </button>
          ))}
          {fouten.length > 0 && (
            <div>
              <BevestigKnop venster icoon="🗑️" titel="Foutmeldingen wissen?" vraag="" uitleg="De hele lijst gaat weg. Dit kan niet ongedaan worden gemaakt." ja="Ja, wissen" onBevestig={wis} className="rl-knop rl-knop--rood">
                <Icoon naam="wissen" /> Wissen
              </BevestigKnop>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 🧹 Oude gegevens: gaat ook vanzelf als je het dashboard opent (lib/oude-gegevens.ts)
function Onderhoud() {
  async function ruimOp() {
    const res = await fetch("/api/admin/fouten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opruimen: true }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    toonMelding(res?.ok ? `${d.plekken} oude GPS-plekken opgeruimd` : d.fout ?? "Opruimen lukte niet", res?.ok ? "ok" : "fout");
  }
  return (
    <div className="systeem-onderdeel">
      <div className="systeem-onderdeel-kop systeem-onderhoud">
        <span className="systeem-onderdeel-naam">🧹 Oude gegevens
          <span className="systeem-onderhoud-uitleg">Gelopen routes en foutmeldingen ouder dan 30 dagen. Gaat ook vanzelf als je het dashboard opent.</span>
        </span>
        <BevestigKnop venster icoon="🧹" titel="Oude gegevens opruimen?" vraag="" uitleg="Gelopen routes en foutmeldingen ouder dan 30 dagen gaan weg, ook bij Terugkijken van oude spellen. Dit kan niet ongedaan worden gemaakt." ja="Ja, opruimen" onBevestig={ruimOp} className="rl-knop">
          <Icoon naam="opruimen" /> Nu opruimen
        </BevestigKnop>
      </div>
    </div>
  );
}

// Is de beveiligingsregel van de site (CSP) niet te streng? Echt proberen in deze browser: daar ging het eerder mis
// terwijl de rest van de check groen was (geen geluid en geen weer in productie).
async function browserChecks(): Promise<Check[]> {
  const geblokkeerd: string[] = [];
  const luister = (e: SecurityPolicyViolationEvent) => geblokkeerd.push(e.blockedURI);
  document.addEventListener("securitypolicyviolation", luister);
  const weer = "https://api.open-meteo.com/v1/forecast?latitude=52&longitude=5&hourly=temperature_2m&forecast_days=1";
  const kaart = "https://tiles.openfreemap.org/styles/liberty";
  const geluid = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vraag-geluid/systeemcheck.mp3`;
  await Promise.all([fetch(weer).catch(() => null), fetch(kaart).catch(() => null)]);
  const audio = new Audio();
  audio.src = geluid;
  audio.load();
  await new Promise((r) => setTimeout(r, 500));
  document.removeEventListener("securitypolicyviolation", luister);
  const mag = (url: string) => !geblokkeerd.some((b) => url.startsWith(b));
  const regel = (naam: string, url: string): Check => {
    const ok = mag(url);
    return { groep: "Deze browser", naam, ok, uitleg: ok ? undefined : "Geblokkeerd door de beveiligingsregel van de site (CSP in next.config): dit adres moet daar nog bij." };
  };
  return [regel("🌦️ Weer mag laden", weer), regel("🗺️ Kaart mag laden", kaart), regel("🔊 Geluid bij een vraag mag spelen", geluid)];
}

// Overzicht van de systeemcheck: per onderdeel ✅ of ❌, en bij ❌ wat je moet doen
export default function Systeemcheck() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [gemeten, setGemeten] = useState<{ om: number; ms: number } | null>(null);
  // Welke onderdelen zijn opengeklapt (de groene details)
  const [open, setOpen] = useState<Set<string>>(new Set());
  const wissel = (g: string) => setOpen((o) => { const n = new Set(o); if (n.has(g)) n.delete(g); else n.add(g); return n; });

  // De vorige uitslag blijft staan tot de nieuwe binnen is
  async function controleer() {
    setBezig(true); setFout(null);
    const begin = Date.now();
    const [res, browser] = await Promise.all([fetch("/api/admin/systeem").catch(() => null), browserChecks()]);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { setFout(data.fout ?? "Controleren lukte niet: controleer je internet en probeer het opnieuw"); return; }
    const alles: Check[] = [...data.checks, ...browser];
    setChecks(alles);
    setGemeten({ om: Date.now(), ms: Date.now() - begin });
    zetVolledigeCheck(alles);
  }
  useEffect(() => { controleer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (!checks && fout) return <div className="melding melding-fout">⚠️ {fout}</div>;
  if (!checks) return <LaadBlokjes aantal={4} hoogte={52} />;

  const mis = checks.filter((c) => !c.ok && !c.tijdelijk);
  const groepen = [...new Set(checks.map((c) => c.groep))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1000 }}>
      <div className="pr-gem-panel">
        <div className="pr-gem-panel-inner" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.8rem" }} aria-hidden>{mis.length ? "⚠️" : "✅"}</span>
          <span style={{ flex: 1, minWidth: 200 }}>
            <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff" }}>
              {mis.length ? `${mis.length} ${mis.length === 1 ? "ding" : "dingen"} om te regelen` : "Alles in orde"}
            </span>
            {gemeten && <span className="systeem-gemeten">Gecontroleerd om {new Date(gemeten.om).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} · {(gemeten.ms / 1000).toFixed(1).replace(".", ",")} s</span>}
            {fout && <span className="systeem-gemeten" style={{ color: "#FCA5A5" }}>{fout}. Dit is de vorige uitslag.</span>}
          </span>
          <button type="button" className="rl-knop" onClick={controleer} disabled={bezig}><Icoon naam={bezig ? "laden" : "vernieuwen"} /> {bezig ? "Bezig…" : "Opnieuw controleren"}</button>
        </div>
      </div>
      {/* Eén blok, één regel per onderdeel: wat ontbreekt staat er altijd onder (met de oplossing),
          de rest klap je open met de pijl */}
      <div className="pr-gem-panel"><div className="pr-gem-panel-inner systeem-lijst">
        <FoutLogboek />
        {groepen.map((g) => {
          const inGroep = checks.filter((c) => c.groep === g);
          const meetellend = inGroep.filter((c) => !c.info);
          const foutIn = inGroep.filter((c) => !c.ok && !c.tijdelijk);
          const tijdelijk = inGroep.filter((c) => c.tijdelijk);
          const goed = meetellend.filter((c) => c.ok).length;
          const isOpen = open.has(g);
          return (
            <div key={g} className="systeem-onderdeel">
              <button type="button" className="systeem-onderdeel-kop systeem-onderdeel-kop--knop" onClick={() => wissel(g)} aria-expanded={isOpen}>
                <UitklapPijl open={isOpen} />
                <span className="systeem-onderdeel-naam">{g}</span>
                <span className={foutIn.length ? "systeem-telling systeem-telling--mis" : tijdelijk.length ? "systeem-telling systeem-telling--let" : "systeem-telling"}>
                  {meetellend.length ? <>{goed}/{meetellend.length} {foutIn.length ? <Icoon naam="waarschuwing" /> : tijdelijk.length ? <span title="Even niet bereikbaar">⏳</span> : <Icoon naam="goed" />}</> : "ter info"}
                </span>
              </button>
              {foutIn.map((c) => (
                <div key={c.naam} className="systeem-regel systeem-regel--mis">
                  <span aria-hidden>❌</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700 }}>{c.naam}</span>
                    {c.uitleg && <span style={{ display: "block", fontSize: "0.78rem", color: "#FDE68A", overflowWrap: "anywhere" }}>{c.uitleg}</span>}
                  </span>
                </div>
              ))}
              {isOpen && (
                <div className="systeem-raster">
                  {inGroep.filter((c) => c.ok).map((c) => <span key={c.naam} className={`systeem-vakje${c.info ? " systeem-vakje--info" : ""}`}>{c.info ? "ℹ️" : "✓"} {c.naam}</span>)}
                  {tijdelijk.map((c) => <span key={c.naam} className="systeem-vakje systeem-vakje--let">⏳ {c.naam}: even niet bereikbaar, ligt niet aan de app</span>)}
                </div>
              )}
            </div>
          );
        })}
        <Onderhoud />
      </div></div>
    </div>
  );
}
