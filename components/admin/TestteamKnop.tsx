"use client";

import { useCallback, useEffect, useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import BevestigKnop from "@/components/admin/BevestigKnop";
import QrInlogVenster from "@/components/admin/QrInlogVenster";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import Icoon from "@/components/admin/Icoon";

// 🧪 Testteam (migratie 005): in je eentje een rondje lopen. Het testteam heeft een testtegenstander die vanzelf
// af en toe een item op je gooit; met de knoppen hier gooit hij er meteen een. Een test telt niet mee in de
// statistiek, de stand of het rapport, en ↺ Test opnieuw wist alleen de test.

const GOOI: [string, string, string][] = [["bom", "💣", "Bom"], ["spook", "👻", "Spook"], ["banaan", "🍌", "Banaan"], ["dief", "🦹", "Dief"], ["wissel", "🔄", "Wissel"]];
type Stand = { migratieKlaar: boolean; team: { id: string; login_name: string } | null; tegenstander: boolean; speelt: boolean };

export default function TestteamKnop({ onGewijzigd }: { onGewijzigd: () => void }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState(false);
  const [stand, setStand] = useState<Stand | null>(null);
  const [bezig, setBezig] = useState(false);

  const laad = useCallback(async () => {
    const res = await fetch("/api/admin/testteam").catch(() => null);
    if (res?.ok) setStand(await res.json());
  }, []);
  useEffect(() => { if (open) { laad(); const t = setInterval(laad, 5000); return () => clearInterval(t); } }, [open, laad]);

  async function actie(body: object, gelukt: string) {
    setBezig(true);
    const res = await fetch("/api/admin/testteam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Testteam", d.fout), "fout"); return; }
    toonMelding(gelukt, "ok");
    await laad();
    onGewijzigd();
  }

  return (
    <>
      <button type="button" className="rl-knop actie-knop" onClick={() => setOpen(true)} title="Testteam: in je eentje een rondje lopen">
        <Icoon naam="testen" /> Testteam
      </button>
      {open && (
        <VensterMetKop icoon="🧪" label="Testteam" titel="Zelf een rondje testen" onSluit={() => setOpen(false)} breedte={480} maxHoogte={92}>
          {!stand ? <div className="inst-uitleg">Laden…</div> : !stand.migratieKlaar ? (
            <div className="inst-uitleg" style={{ color: "#FCA5A5" }}>⚠️ Draai eerst migratie 005 (<code>supabase/migrations/005_testteam.sql</code>) in Supabase.</div>
          ) : !stand.team ? (
            <div className="test-blok">
              <p className="inst-uitleg">Maak een testteam (loginnaam <strong>test</strong>) met een testtegenstander. Telt nergens mee, en echte teams zien het niet.</p>
              <button type="button" className="rl-knop rl-knop--cyan" disabled={bezig} onClick={() => actie({ actie: "maak" }, "Testteam aangemaakt")}>
                <Icoon naam="plus" /> Testteam aanmaken
              </button>
            </div>
          ) : (
            <div className="test-blok">
              <div className="test-stap">
                <strong>1. Inloggen</strong>
                <span>Scan de QR met je telefoon: je bent ingelogd als het testteam.</span>
                <button type="button" className="rl-knop" onClick={() => setQr(true)}><Icoon naam="qr" /> QR</button>
              </div>
              <div className="test-stap">
                <strong>2. Laat de testtegenstander gooien</strong>
                <span>{stand.speelt ? "Vanzelf elke paar minuten, of nu met een knop:" : "Kan zodra het testteam een rondje speelt."}</span>
                <div className="test-gooi">
                  {GOOI.map(([type, emoji, naam]) => (
                    <button key={type} type="button" className="rl-knop" disabled={!stand.speelt || bezig} title={`${naam} op het testteam`}
                      onClick={() => actie({ actie: "gooi", type }, `${emoji} ${naam} gegooid op het testteam`)}>{emoji}</button>
                  ))}
                  <button type="button" className="rl-knop" disabled={!stand.speelt || bezig} title="Willekeurig item"
                    onClick={() => actie({ actie: "gooi" }, "🎲 Willekeurig item gegooid op het testteam")}>🎲</button>
                </div>
              </div>
              <div className="test-stap">
                <strong>3. Opnieuw beginnen</strong>
                <span>Wist alleen de test; echte teams blijven staan.</span>
                <BevestigKnop venster icoon="↺" titel="Test opnieuw?" vraag="Het testrondje (antwoorden, plekken, items) wordt gewist. Echte teams blijven staan."
                  ja="Ja, opnieuw" onBevestig={() => actie({ actie: "opnieuw" }, "Test gewist: je kunt opnieuw beginnen")} className="rl-knop rl-knop--rood" disabled={bezig}>
                  <Icoon naam="herhalen" /> Test opnieuw
                </BevestigKnop>
              </div>
            </div>
          )}
        </VensterMetKop>
      )}
      {qr && stand?.team && (
        <QrInlogVenster spelerId={stand.team.id} naam="Testteam" icoon="🧪" anderApparaat={false} onSluit={() => setQr(false)} />
      )}
    </>
  );
}
