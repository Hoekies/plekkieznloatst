"use client";

import { useEffect, useState } from "react";
import type { Check } from "@/app/api/admin/systeem/route";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import UitklapPijl from "@/components/shared/UitklapPijl";

type Fout = { id: string; created_at: string; rol: string | null; wie: string | null; pad: string | null; bericht: string; details: string | null; browser: string | null };

// 🐞 Fouten die spelers en beheerders in de app zagen (foutscherm), en oude gegevens opruimen
function FoutLogboek() {
  const [fouten, setFouten] = useState<Fout[] | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  async function laad() {
    const res = await fetch("/api/admin/fouten").catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setMelding(d.fout ?? "Foutlogboek laden lukte niet"); setFouten([]); return; }
    setFouten(d.fouten);
  }
  useEffect(() => { laad(); }, []);
  async function wis() {
    const res = await fetch("/api/admin/fouten", { method: "DELETE" }).catch(() => null);
    if (res?.ok) { setFouten([]); setMelding("Logboek gewist"); }
  }
  async function ruimOp() {
    setMelding("⏳ Opruimen…");
    const res = await fetch("/api/admin/fouten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opruimen: true }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setMelding(res?.ok ? `🧹 ${d.plekken} oude GPS-plekken opgeruimd` : d.fout ?? "Opruimen lukte niet");
    laad();
  }
  if (!fouten) return null;
  const tijd = (t: string) => new Date(t).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="systeem-onderdeel">
      <div className="systeem-onderdeel-kop">
        <span className="systeem-onderdeel-naam">🐞 Foutmeldingen</span>
        <span className="systeem-acties">
          {melding && <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{melding}</span>}
          {fouten.length > 0 && <button type="button" className="es-link" onClick={wis}>🗑️ Wissen</button>}
          <button type="button" className="es-link" onClick={ruimOp} title="GPS-plekken en fouten ouder dan 30 dagen verwijderen (gebeurt ook elke nacht vanzelf)">🧹 Oude gegevens opruimen</button>
        </span>
        <span className={fouten.length ? "systeem-telling systeem-telling--mis" : "systeem-telling"}>{fouten.length ? `${fouten.length} ⚠️` : "geen ✅"}</span>
      </div>
      {fouten.map((f) => (
        <button key={f.id} type="button" className="systeem-regel systeem-fout" onClick={() => setOpen(open === f.id ? null : f.id)}>
          <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <span style={{ display: "block", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: open === f.id ? "normal" : "nowrap" }}>{f.bericht}</span>
            <span style={{ display: "block", fontSize: "0.74rem", color: "var(--muted)" }}>
              {tijd(f.created_at)} · {f.wie ?? f.rol ?? "?"}{f.pad ? ` · ${f.pad}` : ""}
            </span>
            {open === f.id && (f.details || f.browser) && <pre className="systeem-fout-details">{[f.details, f.browser].filter(Boolean).join("\n\n")}</pre>}
          </span>
        </button>
      ))}
    </div>
  );
}

// Overzicht van de systeemcheck: per onderdeel ✅ of ❌, en bij ❌ wat je moet doen
export default function Systeemcheck() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  // Welke onderdelen zijn opengeklapt (de groene details)
  const [open, setOpen] = useState<Set<string>>(new Set());
  const wissel = (g: string) => setOpen((o) => { const n = new Set(o); if (n.has(g)) n.delete(g); else n.add(g); return n; });

  async function controleer() {
    setChecks(null); setFout(null);
    const res = await fetch("/api/admin/systeem").catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setFout(data.fout ?? "Controleren lukte niet"); return; }
    setChecks(data.checks);
  }
  useEffect(() => { controleer(); }, []);

  if (fout) return <div className="melding melding-fout">⚠️ {fout}</div>;
  if (!checks) return <LaadBlokjes aantal={4} hoogte={52} />;

  const mis = checks.filter((c) => !c.ok);
  const groepen = [...new Set(checks.map((c) => c.groep))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1000 }}>
      <div className="pr-gem-panel">
        <div className="pr-gem-panel-inner" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.8rem" }}>{mis.length ? "⚠️" : "✅"}</span>
          <span style={{ flex: 1, minWidth: 200, fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff" }}>
            {mis.length ? `${mis.length} ${mis.length === 1 ? "ding" : "dingen"} om te regelen` : "Alles in orde"}
          </span>
          <button type="button" className="rl-knop" onClick={controleer}>🔄 Opnieuw controleren</button>
        </div>
      </div>
      {/* Eén blok, één regel per onderdeel: wat ontbreekt staat er altijd rood onder (met de oplossing),
          de rest (groen) klap je open met de pijl */}
      <div className="pr-gem-panel"><div className="pr-gem-panel-inner systeem-lijst">
        <FoutLogboek />
        {groepen.map((g) => {
          const inGroep = checks.filter((c) => c.groep === g);
          const fout = inGroep.filter((c) => !c.ok);
          const isOpen = open.has(g);
          return (
            <div key={g} className="systeem-onderdeel">
              <button type="button" className="systeem-onderdeel-kop systeem-onderdeel-kop--knop" onClick={() => wissel(g)} aria-expanded={isOpen}>
                <span className="systeem-onderdeel-naam">{g}</span>
                <span className={fout.length ? "systeem-telling systeem-telling--mis" : "systeem-telling"}>{inGroep.length - fout.length}/{inGroep.length} {fout.length ? "⚠️" : "✅"}</span>
                <UitklapPijl open={isOpen} />
              </button>
              {fout.map((c) => (
                <div key={c.naam} className="systeem-regel systeem-regel--mis">
                  <span aria-hidden>❌</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700 }}>{c.naam}</span>
                    {c.uitleg && <span style={{ display: "block", fontSize: "0.78rem", color: "#FDE68A" }}>{c.uitleg}</span>}
                  </span>
                </div>
              ))}
              {isOpen && (
                <div className="systeem-raster">
                  {inGroep.filter((c) => c.ok).map((c) => <span key={c.naam} className="systeem-vakje" title={c.naam}>✓ {c.naam}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div></div>
    </div>
  );
}
