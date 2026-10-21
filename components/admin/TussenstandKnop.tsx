"use client";

import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// 🏆 de tussenstand nu bij alle spelers in beeld laten verschijnen (na bevestiging).
// Staat bij de spelleider op het dashboard, naast Pauze en Eindtijd.
export default function TussenstandKnop() {
  async function toon() {
    const res = await fetch("/api/admin/tussenstand/tonen", { method: "POST" }).catch(() => null);
    toonMelding(res?.ok ? "De tussenstand verschijnt nu bij alle spelers" : uitlegBijStatus(res?.status ?? 0, "Tussenstand tonen"), res?.ok ? "ok" : "fout");
  }
  return (
    <BevestigKnop venster gevaarlijk={false} icoon="🏆" titel="Tussenstand tonen?"
      vraag="Alle spelers krijgen de tussenstand een paar seconden in beeld, midden in hun spel."
      ja="Ja, toon de stand" onBevestig={toon} className="rl-knop actie-knop">
      🏆<span className="alleen-pc"> Tussenstand</span><span className="alleen-mobiel"> Stand</span>
    </BevestigKnop>
  );
}
