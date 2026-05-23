"use client";

import { useState } from "react";

type Fase = "idle" | "bevestig-stop" | "bevestig-reset" | "bezig" | "klaar-stop" | "klaar-reset";

export default function SidebarActies() {
  const [fase, setFase] = useState<Fase>("idle");

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

  if (fase === "bevestig-stop") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Route stoppen?</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="sidebar-actie-knop sidebar-actie-knop--gevaar" onClick={stopRoute}>Ja</button>
          <button className="sidebar-actie-knop" onClick={() => setFase("idle")}>Nee</button>
        </div>
      </div>
    );
  }

  if (fase === "bevestig-reset") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Spel resetten?</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="sidebar-actie-knop sidebar-actie-knop--gevaar" onClick={resetSpel}>Ja</button>
          <button className="sidebar-actie-knop" onClick={() => setFase("idle")}>Nee</button>
        </div>
      </div>
    );
  }

  if (fase === "bezig") {
    return <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Bezig…</div>;
  }

  if (fase === "klaar-stop") {
    return <div style={{ fontSize: "0.75rem", color: "var(--green, #22c55e)" }}>✓ Route gestopt</div>;
  }

  if (fase === "klaar-reset") {
    return <div style={{ fontSize: "0.75rem", color: "var(--green, #22c55e)" }}>✓ Spel gereset</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button className="sidebar-actie-knop" onClick={() => setFase("bevestig-stop")}>
        ⏹ Stop route
      </button>
      <button className="sidebar-actie-knop sidebar-actie-knop--gevaar" onClick={() => setFase("bevestig-reset")}>
        🗑️ Reset spel
      </button>
    </div>
  );
}
