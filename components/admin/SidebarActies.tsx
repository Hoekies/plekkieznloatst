"use client";

import { useState } from "react";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { wisKlaarzetten } from "@/components/admin/Klaarzetten";
import { meldActieveRouteGewijzigd } from "@/components/admin/ActieveRouteLabel";

type Fase = "idle" | "bezig" | "klaar-stop" | "klaar-reset";

export default function SidebarActies() {
  const [fase, setFase] = useState<Fase>("idle");

  async function stopRoute() {
    setFase("bezig");
    await fetch("/api/admin/routes/stoppen", { method: "POST" });
    meldActieveRouteGewijzigd();
    setFase("klaar-stop");
    setTimeout(() => setFase("idle"), 2500);
  }

  async function resetSpel() {
    setFase("bezig");
    const res = await fetch("/api/admin/reset", { method: "POST" });
    if (res.ok) wisKlaarzetten();
    setFase("klaar-reset");
    setTimeout(() => setFase("idle"), 2500);
  }

  // Alle knoppen gebruiken dezelfde box als de menu-items (admin-nav-link)
  const lijst = { display: "flex", flexDirection: "column" as const, gap: "clamp(3px, 0.7vh, 6px)" };

  if (fase !== "idle") {
    const tekst = fase === "bezig" ? "Bezig…" : fase === "klaar-stop" ? "Gestopt" : "Gereset";
    return (
      <div style={lijst}>
        <button className={`admin-nav-link${fase === "bezig" ? "" : " admin-nav-link--groen"}`} disabled>
          <span aria-hidden>{fase === "bezig" ? "⏳" : "✅"}</span> {tekst}
        </button>
      </div>
    );
  }

  // Bevestigen in hetzelfde venster als elders: icoon, titel, actie links en Annuleren rechts
  return (
    <div style={lijst}>
      <BevestigKnop venster icoon="🛑" titel="Route stoppen?" vraag="" ja="Ja, stop de route" onBevestig={stopRoute}
        className="admin-nav-link admin-nav-link--rood">
        <span aria-hidden>🛑</span> Stop route
      </BevestigKnop>
      <BevestigKnop venster icoon="💣" titel="Spel resetten?" vraag="" ja="Ja, reset het spel" onBevestig={resetSpel}
        className="admin-nav-link admin-nav-link--rood">
        <span aria-hidden>💣</span> Reset spel
      </BevestigKnop>
    </div>
  );
}
