"use client";

import { useEffect, useState } from "react";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import { GOUDEN_MIN } from "@/lib/spelplezier";

// ⏰ Gouden kwartier (migratie 007): de spelleider zet met één knop 15 minuten dubbele punten aan voor alle teams.
// Loopt het, dan staat de resterende tijd op de knop en stop je het met een tik.
export default function GoudenKnop({ gouden, onGewijzigd }: { gouden: string | null; onGewijzigd: () => void }) {
  const [nu, setNu] = useState(() => Date.now());
  const tot = gouden ? Date.parse(gouden) : 0;
  useEffect(() => {
    if (!tot) return;
    const t = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tot]);
  const rest = tot ? Math.max(0, Math.ceil((tot - nu) / 1000)) : 0;

  async function zet(aan: boolean) {
    const res = await fetch("/api/admin/gouden", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aan }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Gouden kwartier", d.fout), "fout"); return; }
    toonMelding(aan ? `⏰ Gouden kwartier: ${GOUDEN_MIN} minuten dubbele punten` : "Gouden kwartier gestopt", "ok");
    onGewijzigd();
  }

  if (rest > 0) {
    return (
      <button type="button" className="rl-knop rl-knop--goud actie-knop" onClick={() => zet(false)} title="Gouden kwartier loopt: tik om te stoppen">
        ⏰ {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")} · Stop
      </button>
    );
  }
  return (
    <BevestigKnop venster gevaarlijk={false} icoon="⏰" titel="Gouden kwartier starten?" ja="Ja, starten" onBevestig={() => zet(true)}
      vraag={`${GOUDEN_MIN} minuten lang telt elke goede vraag dubbel, bij alle teams. Ze zien het bovenin hun scherm en op de beamer.`}
      className="rl-knop actie-knop" title="Gouden kwartier: 15 minuten dubbele punten">
      ⏰ Gouden kwartier
    </BevestigKnop>
  );
}
