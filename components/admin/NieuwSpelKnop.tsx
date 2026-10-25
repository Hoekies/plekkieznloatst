"use client";

import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { wisKlaarzetten } from "@/components/admin/Klaarzetten";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import Icoon from "@/components/admin/Icoon";

// 🧹 Nieuw spel voorbereiden (vroeger "Reset spel"): alle gespeelde spellen, antwoorden, foto's en opgepakte
// items weg; routes, vragen en spelers blijven. Staat op één plek: stap 1 van 🧹 Opruimen (Spelleider).
export default function NieuwSpelKnop({ onKlaar, className = "rl-knop actie-knop" }: { onKlaar?: () => void; className?: string }) {
  async function reset() {
    const res = await fetch("/api/admin/reset", { method: "POST" }).catch(() => null);
    if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Opruimen"), "fout"); return; }
    wisKlaarzetten();
    toonMelding("Alles opgeruimd: klaar voor een nieuw spel", "ok");
    onKlaar?.();
  }
  return (
    <BevestigKnop venster icoon="🧹" titel="Nieuw spel voorbereiden?" vraag=""
      uitleg="Alle gespeelde spellen, antwoorden, foto's, gelopen routes en opgepakte items gaan weg, ook van gefinishte teams; gedeelde kaart-links werken niet meer. Routes, vragen en spelers blijven. Maak eerst het rapport en het fotoalbum als je die wilt bewaren. Dit kan niet ongedaan worden gemaakt."
      ja="Ja, alles opruimen" onBevestig={reset} className={className}>
      <Icoon naam="opruimen" /> Opruimen
    </BevestigKnop>
  );
}
