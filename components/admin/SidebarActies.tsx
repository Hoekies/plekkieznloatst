"use client";

import { useState } from "react";

type Fase = "idle" | "bevestig-stop" | "bevestig-reset" | "bezig" | "klaar-stop" | "klaar-reset" | "klaar-tussenstand";

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

  async function toonTussenstand() {
    setFase("bezig");
    await fetch("/api/admin/tussenstand/tonen", { method: "POST" });
    setFase("klaar-tussenstand");
    setTimeout(() => setFase("idle"), 2500);
  }

  if (fase === "bevestig-stop") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
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

  if (fase === "klaar-tussenstand") {
    return <div style={{ fontSize: "0.82rem", color: "var(--green, #22c55e)", fontWeight: 600 }}>✓ Tussenstand getoond</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <button className="admin-nav-link" style={{ cursor: "pointer", width: "100%", background: "transparent", border: "1px solid transparent" }} onClick={toonTussenstand}>
        <span aria-hidden>🏆</span> Toon tussenstand nu
      </button>
      <button className="admin-nav-link" style={{ cursor: "pointer", width: "100%", background: "transparent", border: "1px solid transparent" }} onClick={() => setFase("bevestig-stop")}>
        <span aria-hidden>🛑</span> Stop route
      </button>
      <button className="admin-nav-link" style={{ cursor: "pointer", width: "100%", background: "transparent", border: "1px solid transparent" }} onClick={() => setFase("bevestig-reset")}>
        <span aria-hidden>🗑️</span> Reset spel
      </button>
    </div>
  );
}
