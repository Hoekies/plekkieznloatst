"use client";

import { useEffect, useState } from "react";
import type { Check } from "@/app/api/admin/systeem/route";
import LaadBlokjes from "@/components/shared/LaadBlokjes";

// Overzicht van de systeemcheck: per onderdeel ✅ of ❌, en bij ❌ wat je moet doen
export default function Systeemcheck() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <div className="pr-gem-panel">
        <div className="pr-gem-panel-inner" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.8rem" }}>{mis.length ? "⚠️" : "✅"}</span>
          <span style={{ flex: 1, minWidth: 200, fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff" }}>
            {mis.length ? `${mis.length} ${mis.length === 1 ? "ding" : "dingen"} om te regelen` : "Alles in orde"}
          </span>
          <button type="button" className="rl-knop" onClick={controleer}>🔄 Opnieuw controleren</button>
        </div>
      </div>
      {groepen.map((g) => (
        <div key={g} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="pr-gem-label">{g}</div>
          {checks.filter((c) => c.groep === g).map((c) => (
            <div key={c.naam} className={`systeem-regel${c.ok ? "" : " systeem-regel--mis"}`}>
              <span aria-hidden>{c.ok ? "✅" : "❌"}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700 }}>{c.naam}</span>
                {!c.ok && c.uitleg && <span style={{ display: "block", fontSize: "0.78rem", color: "#FDE68A" }}>{c.uitleg}</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
