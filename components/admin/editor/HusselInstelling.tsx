"use client";

import { useEffect, useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// 🔀 Antwoorden husselen, voor de hele route (route-instellingen → 🎮 Spel): elk team ziet de antwoorden van
// een meerkeuzevraag in een andere volgorde, zodat afkijken niet helpt. Geldt voor alle vragen, ook nieuwe.
export default function HusselInstelling({ routeId }: { routeId: string }) {
  const [aan, setAan] = useState<boolean | null>(null);
  useEffect(() => {
    fetch(`/api/admin/routes/${routeId}/husselen`).then((r) => (r.ok ? r.json() : null)).then((d) => setAan(d ? !!d.aan : false)).catch(() => setAan(false));
  }, [routeId]);

  async function zet(nieuw: boolean) {
    const oud = aan;
    setAan(nieuw);
    const res = await fetch(`/api/admin/routes/${routeId}/husselen`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aan: nieuw }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setAan(oud); toonMelding(uitlegBijStatus(res?.status ?? 0, "Husselen opslaan", data.fout), "fout"); return; }
    toonMelding(nieuw ? "Antwoorden husselen staat aan voor alle vragen" : "Antwoorden husselen staat uit", "ok");
  }

  return (
    <div className="form-group">
      <label className="form-label">🔀 Antwoorden husselen</label>
      <span className="inst-uitleg">Elk team een andere volgorde: afkijken heeft geen zin.</span>
      <div className="segment" role="radiogroup" aria-label="Antwoorden husselen" style={{ width: 150 }}>
        <button type="button" role="radio" aria-checked={aan === false} className={aan === false ? "aan" : ""} disabled={aan === null} onClick={() => zet(false)}>Uit</button>
        <button type="button" role="radio" aria-checked={aan === true} className={aan === true ? "aan" : ""} disabled={aan === null} onClick={() => zet(true)}>Aan</button>
      </div>
    </div>
  );
}
