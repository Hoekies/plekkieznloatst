"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";
import KaartjeVersturen, { type Inlog } from "@/components/admin/InlogKaartje";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// Inloggegevens per team: meerdere spelers in één keer aanmaken en daarna per team het kaartje
// via WhatsApp versturen (met de link erbij). Eén speler: 📲 Versturen op de spelerskaart.
export { type Inlog, waTekst } from "@/components/admin/InlogKaartje";

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

function Venster({ titel, label, onSluit, children }: { titel: string; label: string; onSluit: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit]);
  return createPortal(
    <div onClick={onSluit} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 520, maxHeight: "92vh" }}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(92vh - 6px)", overflowY: "auto", padding: "18px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="pr-gem-label">{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>{titel}</div>
            </div>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} aria-label="Sluiten">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
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
        <button type="button" className="rl-knop" style={{ height: 40 }} onClick={kaartjes}>🖨️ Afdrukken</button>
        <button type="button" className="rl-knop" style={{ height: 40 }} onClick={kopieer}>📋 Kopiëren</button>
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
        👫 Meerdere
      </button>
      {open && (
        <Venster label="Spelers aanmaken" titel={gemaakt ? `${gemaakt.length} spelers aangemaakt` : "Meerdere spelers"} onSluit={sluit}>
          {gemaakt ? <InlogLijst inlogs={gemaakt} /> : (
            <form onSubmit={maak} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10 }}>
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
                {bezig ? "Aanmaken…" : `+ ${aantal} spelers aanmaken`}
              </button>
            </form>
          )}
        </Venster>
      )}
    </>
  );
}
