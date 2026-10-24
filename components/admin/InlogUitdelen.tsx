"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import KaartjeVersturen, { type Inlog } from "@/components/admin/InlogKaartje";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import { VensterMetKop } from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";

// Inloggegevens per team: meerdere spelers in één keer aanmaken en daarna per team het kaartje
// via WhatsApp versturen (met de link erbij). Eén speler: 📲 Versturen op de spelerskaart.
export { type Inlog } from "@/components/admin/InlogKaartje";

export const KAARTJES_KEY = "pointrush_inlogkaartjes";

// Inlogkaartjes openen (nieuw tabblad) om af te drukken
export function openKaartjes(inlogs: Inlog[]) {
  try { localStorage.setItem(KAARTJES_KEY, JSON.stringify(inlogs)); } catch { /* geen opslag */ }
  window.open("/admin/kaartjes", "_blank");
}

// Net aangemaakt of nieuw wachtwoord: het kaartje, met daaronder WhatsApp
export function InlogKlaar({ inlog }: { inlog: Inlog }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <KaartjeVersturen inlog={inlog} />
      <div style={{ fontSize: "0.74rem", color: "var(--muted)", textAlign: "center" }}>Verstuur het nu: het wachtwoord is later niet meer te zien.</div>
    </div>
  );
}


// De lijst met inloggegevens, met versturen, kopiëren en afdrukken
function InlogLijst({ inlogs }: { inlogs: Inlog[] }) {
  function kopieer() {
    const tekst = inlogs.map((i) => `${i.login}  ·  ${i.wachtwoord}`).join("\n");
    navigator.clipboard?.writeText(tekst).then(() => toonMelding("Gekopieerd", "ok")).catch(() => toonMelding("Kopiëren lukte niet", "fout"));
  }
  function kaartjes() { openKaartjes(inlogs); }
  return (
    <>
      <div className="melding-knoppen">
        <button type="button" className="rl-knop" style={{ height: 40 }} onClick={kaartjes}><Icoon naam="printen" /> Afdrukken</button>
        <button type="button" className="rl-knop" style={{ height: 40 }} onClick={kopieer}><Icoon naam="klembord" /> Kopiëren</button>
      </div>
      <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Verstuur ze nu: de wachtwoorden zijn later niet meer te zien.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {inlogs.map((i) => <KaartjeVersturen key={i.login} inlog={i} />)}
      </div>
    </>
  );
}

// "👫 Meerdere" — spelers in één keer aanmaken
export function MeerdereSpelersKnop({ onKlaar }: { onKlaar: () => void }) {
  const [open, setOpen] = useState(false);
  const [aantal, setAantal] = useState(4);
  const [voorvoegsel, setVoorvoegsel] = useState("speler");
  const [bezig, setBezig] = useState(false);
  const [gemaakt, setGemaakt] = useState<Inlog[] | null>(null);

  async function maak(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const res = await fetch("/api/admin/groepen/meerdere", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aantal, voorvoegsel }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Aanmaken", data.fout), "fout"); if (data.gemaakt?.length) setGemaakt(data.gemaakt); return; }
    setGemaakt(data.gemaakt);
    onKlaar();
  }
  const sluit = () => { setOpen(false); setGemaakt(null); };

  return (
    <>
      <button type="button" className="rl-knop actie-knop" onClick={() => setOpen(true)} title="Meerdere spelers in één keer aanmaken">
        <Icoon naam="spelers" /> Meerdere
      </button>
      {open && (
        <VensterMetKop breedte={520} maxHoogte={92} label="Spelers aanmaken" titel={gemaakt ? `${gemaakt.length} spelers aangemaakt` : "Meerdere spelers"} onSluit={sluit}>
          {gemaakt ? <InlogLijst inlogs={gemaakt} /> : (
            <form onSubmit={maak} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="form-group" style={{ margin: 0, width: 110 }}>
                  <label className="form-label">Aantal</label>
                  <input className="form-input" type="number" min={1} max={30} value={aantal} onChange={(e) => setAantal(Math.max(1, Math.min(30, Number(e.target.value))))} />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label className="form-label">Loginnaam begint met</label>
                  <input className="form-input" value={voorvoegsel} onChange={(e) => setVoorvoegsel(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                </div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                Bijv. <strong style={{ color: "var(--ink)" }}>{voorvoegsel || "speler"}1</strong>, <strong style={{ color: "var(--ink)" }}>{voorvoegsel || "speler"}2</strong>, … (bezette nummers worden overgeslagen), elk met een makkelijk wachtwoord.
              </div>
              <button type="submit" className="rl-knop hoofdknop" style={{ height: 44 }} disabled={bezig || !voorvoegsel}>
                {bezig ? "Aanmaken…" : <><Icoon naam="plus" />{` ${aantal} spelers aanmaken`}</>}
              </button>
            </form>
          )}
        </VensterMetKop>
      )}
    </>
  );
}
