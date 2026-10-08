"use client";

import { useState } from "react";

type Fase = "idle" | "bevestig-stop" | "bevestig-reset" | "bezig" | "klaar-stop" | "klaar-reset";

export default function SidebarActies() {
  const [fase, setFase] = useState<Fase>("idle");
  // De tussenstand-knop toont zijn eigen status in de knop zelf
  const [tussenstandFase, setTussenstandFase] = useState<"idle" | "bezig" | "klaar">("idle");

  async function stopRoute() {
    setFase("bezig");
    await fetch("/api/admin/routes/stoppen", { method: "POST" });
    setFase("klaar-stop");
    setTimeout(() => setFase("idle"), 2500);
  }

  async function resetSpel() {
    setFase("bezig");
    await fetch("/api/admin/reset", { method: "POST" });
    setFase("klaar-reset");
    setTimeout(() => setFase("idle"), 2500);
  }

  async function toonTussenstand() {
    setTussenstandFase("bezig");
    await fetch("/api/admin/tussenstand/tonen", { method: "POST" });
    setTussenstandFase("klaar");
    setTimeout(() => setTussenstandFase("idle"), 2500);
  }

  // Alle knoppen gebruiken dezelfde box als de menu-items (admin-nav-link)
  const lijst = { display: "flex", flexDirection: "column" as const, gap: "clamp(3px, 0.7vh, 6px)" };
  const vraag = { fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", margin: "2px 0" };

  if (fase === "bevestig-stop") {
    return (
      <div style={lijst}>
        <div style={vraag}>Route stoppen?</div>
        <button className="admin-nav-link admin-nav-link--rood" onClick={stopRoute}>
          <span aria-hidden>⏹️</span> Ja, stop
        </button>
        <button className="admin-nav-link" onClick={() => setFase("idle")}>
          <span aria-hidden>↩️</span> Annuleer
        </button>
      </div>
    );
  }

  if (fase === "bevestig-reset") {
    return (
      <div style={lijst}>
        <div style={vraag}>Alles wissen?</div>
        <button className="admin-nav-link admin-nav-link--rood" onClick={resetSpel}>
          <span aria-hidden>🗑️</span> Ja, reset
        </button>
        <button className="admin-nav-link" onClick={() => setFase("idle")}>
          <span aria-hidden>↩️</span> Annuleer
        </button>
      </div>
    );
  }

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

  return (
    <div style={lijst}>
      <button
        className={`admin-nav-link ${tussenstandFase === "klaar" ? "admin-nav-link--groen" : "admin-nav-link--goud"}`}
        onClick={toonTussenstand}
        disabled={tussenstandFase !== "idle"}>
        <span aria-hidden>{tussenstandFase === "bezig" ? "⏳" : tussenstandFase === "klaar" ? "✅" : "🏆"}</span>
        {tussenstandFase === "bezig" ? "Bezig…" : tussenstandFase === "klaar" ? "Getoond" : "Tussenstand"}
      </button>
      <button className="admin-nav-link admin-nav-link--rood" onClick={() => setFase("bevestig-stop")}>
        <span aria-hidden>🛑</span> Stop route
      </button>
      <button className="admin-nav-link admin-nav-link--rood" onClick={() => setFase("bevestig-reset")}>
        <span aria-hidden>🗑️</span> Reset spel
      </button>
    </div>
  );
}
