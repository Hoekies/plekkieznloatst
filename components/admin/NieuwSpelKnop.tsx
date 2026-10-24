"use client";

import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { wisKlaarzetten } from "@/components/admin/Klaarzetten";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// 🧹 Nieuw spel voorbereiden (vroeger "Reset spel" in het menu): alle gespeelde spellen, antwoorden, foto's en
// opgepakte items weg; routes, vragen en spelers blijven. Staat waar je hem nodig hebt: na het afronden,
// en op de pc in de bovenbalk van het dashboard (kort = "💣 Reset spel").
export default function NieuwSpelKnop({ onKlaar, className = "rl-knop actie-knop", kort = false }: { onKlaar?: () => void; className?: string; kort?: boolean }) {
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
      {kort ? "💣 Reset spel" : "🧹 Nieuw spel voorbereiden"}
    </BevestigKnop>
  );
}
