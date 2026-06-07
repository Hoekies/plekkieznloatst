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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Route stoppen?</div>
        <button className="sidebar-actie-knop sidebar-actie-knop--gevaar sidebar-actie-knop--groot" onClick={stopRoute}>
          Ja, stop route
        </button>
        <button className="sidebar-actie-knop sidebar-actie-knop--groot" onClick={() => setFase("idle")}>
          Annuleer
        </button>
      </div>
    );
  }

  if (fase === "bevestig-reset") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Alles wissen?</div>
        <button className="sidebar-actie-knop sidebar-actie-knop--gevaar sidebar-actie-knop--groot" onClick={resetSpel}>
          Ja, reset spel
        </button>
        <button className="sidebar-actie-knop sidebar-actie-knop--groot" onClick={() => setFase("idle")}>
          Annuleer
        </button>
      </div>
    );
  }

  if (fase === "bezig") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
        <div className="spinner" style={{ borderTopColor: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)", width: 16, height: 16 }} />
        Bezig…
      </div>
    );
  }

  if (fase === "klaar-stop") {
    return <div style={{ fontSize: "0.82rem", color: "var(--green, #22c55e)", fontWeight: 600 }}>✓ Route gestopt</div>;
  }

  if (fase === "klaar-reset") {
    return <div style={{ fontSize: "0.82rem", color: "var(--green, #22c55e)", fontWeight: 600 }}>✓ Spel gereset</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button className="sidebar-actie-knop sidebar-actie-knop--groot" style={{ display: "flex", justifyContent: "flex-end" }} onClick={() => setFase("bevestig-stop")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/help/stop route.png" alt="Stop route" style={{ height: 24, width: "auto", borderRadius: 6, display: "block" }} />
      </button>
      <button className="sidebar-actie-knop sidebar-actie-knop--gevaar sidebar-actie-knop--groot" style={{ display: "flex", justifyContent: "flex-end" }} onClick={() => setFase("bevestig-reset")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/help/reset spel.png" alt="Reset spel" style={{ height: 24, width: "auto", borderRadius: 6, display: "block" }} />
      </button>
    </div>
  );
}
