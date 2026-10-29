"use client";

import { useEffect, useState } from "react";

// 🧑‍⚖️ Bezwaar tegen een fout gerekend antwoord (spelplezier deel 2, per route aan of uit). Staat onder de feedback;
// eerst een tik op de knop, dan eventueel een korte toelichting en versturen. De spelleider beslist.
export default function BezwaarKnop({ puntId }: { puntId: string }) {
  const [stand, setStand] = useState<{ aan: boolean; over: number; status: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  useEffect(() => {
    fetch(`/api/speler/bezwaar?punt=${puntId}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStand(d)).catch(() => undefined);
  }, [puntId]);
  if (!stand?.aan) return null;
  if (stand.status) {
    return <div className="bezwaar-stand">🧑‍⚖️ {stand.status === "open" ? "Bezwaar ingediend: de spelleider beslist" : stand.status === "toegekend" ? "Bezwaar toegekend!" : "Bezwaar afgewezen"}</div>;
  }
  if (stand.over <= 0) return null;

  async function stuur() {
    setBezig(true); setFout("");
    const res = await fetch("/api/speler/bezwaar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ route_point_id: puntId, toelichting: tekst }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { setFout(d.fout ?? "Geen verbinding, probeer het opnieuw"); return; }
    setStand((s) => s && { ...s, status: "open" });
  }

  if (!open) {
    return <button type="button" className="bezwaar-knop" onClick={() => setOpen(true)}>🧑‍⚖️ Bezwaar maken <small>nog {stand.over}</small></button>;
  }
  return (
    <div className="bezwaar-blok">
      <textarea className="form-input" rows={2} maxLength={200} value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Waarom is jullie antwoord toch goed? (mag leeg)" />
      <div className="bezwaar-knoppen">
        <button type="button" className="item-later" onClick={() => setOpen(false)}>Toch niet</button>
        <button type="button" className="btn-premium--compact" disabled={bezig} onClick={stuur}>{bezig ? "Versturen…" : "BEZWAAR VERSTUREN"}</button>
      </div>
      {fout && <span className="joker-fout">{fout}</span>}
    </div>
  );
}
