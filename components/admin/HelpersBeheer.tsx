"use client";

import { useEffect, useState } from "react";
import BevestigKnop from "@/components/admin/BevestigKnop";
import SectieKop from "@/components/admin/SectieKop";
import { toonMelding } from "@/components/admin/Melding";

type Helper = { id: string; naam: string; laatst_ingelogd: string | null };

const SITE = "https://plekkieznloatst.vercel.app";

// Helpers van de spelleider: zij loggen in met een naam en wachtwoord en kunnen dan
// meekijken, foto's keuren en punten vrijgeven. Geen routes, spelers of reset.
export default function HelpersBeheer() {
  const [helpers, setHelpers] = useState<Helper[] | null>(null);
  const [naam, setNaam] = useState("");
  const [bezig, setBezig] = useState(false);
  const [nieuw, setNieuw] = useState<{ naam: string; wachtwoord: string } | null>(null);

  async function laad() {
    const res = await fetch("/api/admin/helpers");
    if (res.ok) setHelpers((await res.json()).helpers);
  }
  useEffect(() => { laad(); }, []);

  async function post(body: object) {
    setBezig(true);
    const res = await fetch("/api/admin/helpers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) { toonMelding(data.fout ?? "Mislukt", "fout"); return; }
    setNieuw({ naam: data.naam, wachtwoord: data.wachtwoord });
    setNaam("");
    laad();
  }

  async function verwijder(h: Helper) {
    const res = await fetch("/api/admin/helpers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id }) });
    if (!res.ok) toonMelding((await res.json().catch(() => ({}))).fout ?? "Verwijderen mislukt", "fout");
    else toonMelding(`${h.naam} kan niet meer inloggen`, "ok");
    if (nieuw?.naam === h.naam) setNieuw(null);
    laad();
  }

  const whatsapp = nieuw
    ? `https://wa.me/?text=${encodeURIComponent(`Hoi! Je bent helper bij PointRush 🎯\n${SITE}\n\nNaam: *${nieuw.naam}*\nWachtwoord: *${nieuw.wachtwoord}*\n\nJe kunt foto's keuren en punten vrijgeven. Bedankt! René`)}`
    : "";

  return (
    <div style={{ marginTop: 28 }}>
      <SectieKop titel="🧑‍💼 Helpers" />
      <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 10 }}>
        Kunnen meekijken, foto&apos;s keuren en punten vrijgeven. Geen routes, spelers of reset.
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (naam.trim()) post({ naam: naam.trim() }); }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input className="form-input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam, bijv. Anouk"
          maxLength={30} style={{ flex: "1 1 180px", maxWidth: 280 }} />
        <button type="submit" className="rl-knop rl-knop--cyan actie-knop" disabled={bezig || !naam.trim()}>+ Helper</button>
      </form>

      {nieuw && (
        <div className="pr-gem-card" style={{ marginBottom: 12 }}>
          <div className="pr-gem-card-inner" style={{ flexWrap: "wrap", gap: 10 }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#fff" }}>{nieuw.naam} · <span className="inlog-ww">{nieuw.wachtwoord}</span></div>
              <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Verstuur dit nu: het wachtwoord is later niet meer te zien.</div>
            </div>
            <a className="rl-knop rl-knop--groen" href={whatsapp} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>💬 WhatsApp</a>
            <button type="button" className="editor-paneel-sluit" onClick={() => setNieuw(null)} aria-label="Sluiten">✕</button>
          </div>
        </div>
      )}

      {helpers === null ? (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Laden…</p>
      ) : helpers.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nog geen helpers.</p>
      ) : helpers.map((h) => (
        <div key={h.id} className="pr-gem-card">
          <div className="pr-gem-card-inner" style={{ flexWrap: "wrap", gap: 10 }}>
            <div className="pr-gem-avatar">🧑‍💼</div>
            <div style={{ flex: "1 1 140px", minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff" }}>{h.naam}</div>
              <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                {h.laatst_ingelogd ? `Laatst ingelogd ${new Date(h.laatst_ingelogd).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}` : "Nog niet ingelogd"}
              </div>
            </div>
            <div className="speler-knoppen" style={{ marginTop: 0 }}>
              <BevestigKnop venster gevaarlijk={false} icoon="🔑" titel={`Nieuw wachtwoord voor ${h.naam}?`} vraag="" ja="Ja, nieuw wachtwoord"
                onBevestig={() => post({ id: h.id })} className="rl-knop">🔑 Wachtwoord</BevestigKnop>
              <BevestigKnop venster icoon="🗑️" titel={`${h.naam} verwijderen?`} vraag="" ja="Ja, verwijderen"
                onBevestig={() => verwijder(h)} className="rl-knop rl-knop--rood">🗑️ Verwijderen</BevestigKnop>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
