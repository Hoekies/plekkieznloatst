"use client";

import { useState } from "react";
import Venster, { VensterKop } from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";

// alsIcoon = 📢-knop in de bovenbalk; anders als regel in het menu.
// Met team: bericht aan alleen dat team (knop op de spelerskaart van het dashboard).
// groot = brede knop met tekst (in het contactvenster)
export default function BroadcastKnop({ alsIcoon = false, team, groot = false }: { alsIcoon?: boolean; team?: { id: string; naam: string }; groot?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tekst, setTekst] = useState("");
  const [fase, setFase] = useState<"idle" | "bezig" | "verzonden">("idle");

  async function verstuur() {
    if (!tekst.trim()) return;
    setFase("bezig");
    try {
      await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(team ? { bericht: tekst, player_id: team.id } : { bericht: tekst }),
      });
      setTekst("");
      setFase("verzonden");
      setTimeout(() => { setFase("idle"); setOpen(false); }, 2000);
    } catch {
      setFase("idle");
    }
  }

  return (
    <>
      {team ? (
        groot ? (
          <button type="button" className="rl-knop rl-knop--cyan" onClick={() => setOpen(true)}><Icoon naam="bericht" /> Bericht in de app</button>
        ) : (
          <button type="button" className="rl-knop sk-icoonknop" onClick={() => setOpen(true)} title={`Bericht aan ${team.naam}`} aria-label={`Bericht aan ${team.naam}`}>
            <Icoon naam="bericht" /><span className="alleen-pc"> Bericht</span>
          </button>
        )
      ) : alsIcoon ? (
        <button className="btn btn-outline header-knop info-knop" onClick={() => setOpen(true)}
          data-tip="Bericht sturen aan alle spelers (B)" data-tip-pos="onder" aria-label="Bericht sturen" data-sneltoets="b">
          <Icoon naam="bericht" />
        </button>
      ) : (
        <button className="admin-nav-link" onClick={() => setOpen(true)}>
          <Icoon naam="bericht" /> Bericht sturen
        </button>
      )}

      {open && (
        // Zelfde venster-stijl als de andere vensters (WhatsApp, bevestigen)
        <Venster onSluit={() => fase !== "bezig" && setOpen(false)} breedte={460}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
              <VensterKop label={<>📢 {team ? `Aan ${team.naam}` : "Aan alle spelers"}</>} titel="📢 Bericht sturen" onSluit={() => setOpen(false)} />
              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{team ? `Het bericht verschijnt meteen bij ${team.naam} in beeld, niet bij de andere teams.` : "Het bericht verschijnt meteen bij alle spelers in beeld."}</div>
              <textarea
                className="form-textarea"
                spellCheck
                lang="nl"
                placeholder="Bijv. Over 5 minuten pauze bij de vijver!"
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                maxLength={150}
                disabled={fase !== "idle"}
                rows={3}
                style={{ width: "100%", minHeight: 90 }}
                autoFocus
              />
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "right", marginTop: -6 }}>{tekst.length}/150</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, padding: "0 20px", fontWeight: 800 }}
                  disabled={!tekst.trim() || fase !== "idle"} onClick={verstuur}>
                  {fase === "bezig" ? "Versturen…" : fase === "verzonden" ? "✓ Verzonden!" : "Versturen"}
                </button>
              </div>
            </div>
        </Venster>
      )}
    </>
  );
}
