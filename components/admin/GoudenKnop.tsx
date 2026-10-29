"use client";

import { useEffect, useState } from "react";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// ⏰ Gouden kwartier (migratie 007): de spelleider zet met één knop dubbele punten aan voor alle teams (duur en
// ×2/×3 per route in 🎉 Spelplezier → ⏰, migratie 008).
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
    const tot = typeof d.gouden_tot === "string" ? new Date(d.gouden_tot).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : null;
    toonMelding(aan ? `⏰ Gouden kwartier loopt${tot ? ` tot ${tot}` : ""}` : "Gouden kwartier gestopt", "ok");
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
      vraag="Een tijd lang telt elke goede vraag extra, bij alle teams (duur en ×2 of ×3 stel je in bij de route: 🎉 Spelplezier → ⏰). Ze zien het bovenin hun scherm en op de beamer."
      className="rl-knop actie-knop" title="Gouden kwartier: een tijd lang extra punten">
      ⏰ Gouden kwartier
    </BevestigKnop>
  );
}
