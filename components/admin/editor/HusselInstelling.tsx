"use client";

import { useEffect, useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// 🔀 Antwoorden husselen, voor de hele route (route-editor → 🎉 Spel): elk team ziet de antwoorden van
// een meerkeuzevraag in een andere volgorde, zodat afkijken niet helpt. Geldt voor alle vragen, ook nieuwe.
// Eén regel met een schakelaar, net als de onderdelen van Spelplezier.
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
    <div className={`plezier-rij${aan ? "" : " plezier-rij--uit"}`}>
      <div className="plezier-tekst">
        <strong>🔀 Antwoorden husselen</strong>
        <span className="plezier-samenvatting plezier-samenvatting--uitleg">Elk team een andere volgorde: afkijken heeft geen zin.</span>
      </div>
      <div className="plezier-knoppen">
        <button type="button" className={`rl-knop schakel${aan ? " schakel--aan" : ""}`} role="switch" aria-checked={!!aan} disabled={aan === null}
          aria-label="Antwoorden husselen aan of uit" onClick={() => zet(!aan)}>{aan ? "Aan" : "Uit"}<span className="schakel-bol" aria-hidden /></button>
      </div>
    </div>
  );
}
