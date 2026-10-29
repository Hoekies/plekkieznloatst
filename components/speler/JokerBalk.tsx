"use client";

import { useEffect, useState } from "react";
import type { SpelerPuntVoortgang } from "@/types/database";

// 🃏 Jokers bij een vraag (spelplezier deel 2, per route aan of uit): 50/50 bij meerkeuze, en overslaan.
// Overslaan vraagt eerst een tweede tik ("zeker?").
export default function JokerBalk({ puntId, meerkeuze, onWeg, onOver }: {
  puntId: string;
  meerkeuze: boolean;
  onWeg: (ids: string[]) => void;
  onOver: (voortgang: SpelerPuntVoortgang) => void;
}) {
  const [stand, setStand] = useState<{ aan: boolean; vijftig: number; over: number } | null>(null);
  const [bezig, setBezig] = useState(false);
  const [zeker, setZeker] = useState(false);
  const [gebruikt5050, setGebruikt5050] = useState(false);
  const [fout, setFout] = useState("");

  useEffect(() => {
    fetch("/api/speler/joker", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStand(d)).catch(() => undefined);
  }, []);
  if (!stand?.aan || (stand.vijftig === 0 && stand.over === 0)) return null;

  async function gebruik(soort: "5050" | "over") {
    setBezig(true); setFout("");
    const res = await fetch("/api/speler/joker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soort, route_point_id: puntId }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { setFout(d.fout ?? "Geen verbinding, probeer het opnieuw"); return; }
    if (soort === "5050") { setGebruikt5050(true); setStand((s) => s && { ...s, vijftig: s.vijftig - 1 }); onWeg(d.weg ?? []); }
    else onOver(d.voortgang);
  }

  return (
    <div className="joker-balk">
      {meerkeuze && stand.vijftig > 0 && !gebruikt5050 && (
        <button type="button" className="joker-knop" disabled={bezig} onClick={() => gebruik("5050")}>🃏 50/50 <small>nog {stand.vijftig}</small></button>
      )}
      {stand.over > 0 && (
        <button type="button" className={`joker-knop${zeker ? " joker-knop--zeker" : ""}`} disabled={bezig}
          onClick={() => (zeker ? gebruik("over") : setZeker(true))}>
          {zeker ? "Zeker? Tik nog eens" : <>⏭️ Overslaan <small>nog {stand.over}</small></>}
        </button>
      )}
      {fout && <span className="joker-fout">{fout}</span>}
    </div>
  );
}
