"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";

// Inloggegevens per team: meerdere spelers in één keer aanmaken, of voor bestaande spelers nieuwe
// wachtwoorden maken. Daarna per team via WhatsApp versturen, alles kopiëren of kaartjes afdrukken.
export type Inlog = { login: string; wachtwoord: string; naam?: string | null };

const SITE = "https://plekkieznloatst.vercel.app";
export const KAARTJES_KEY = "pointrush_inlogkaartjes";

function waTekst(i: Inlog) {
  return `Hoi! Log in op PointRush 🎯\n${SITE}\n\nLoginnaam: *${i.login}*\nWachtwoord: *${i.wachtwoord}*\n\nVeel plezier! René`;
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
  function kaartjes() {
    try { localStorage.setItem(KAARTJES_KEY, JSON.stringify(inlogs)); } catch { /* geen opslag */ }
    window.open("/admin/kaartjes", "_blank");
  }
  return (
    <>
      <div className="melding-knoppen">
        <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800 }} onClick={kaartjes}>🖨️ Kaartjes</button>
        <button type="button" className="rl-knop" style={{ height: 44 }} onClick={kopieer}>📋 Kopiëren</button>
      </div>
      <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Bewaar of verstuur ze nu: de wachtwoorden zijn later niet meer te zien.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {inlogs.map((i) => (
          <div key={i.login} className="inlog-regel">
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong>{i.login}</strong>{i.naam ? <span style={{ color: "var(--muted)" }}> · {i.naam}</span> : null}
              <span className="inlog-ww">{i.wachtwoord}</span>
            </span>
            <a className="rl-knop inlog-wa" href={`https://wa.me/?text=${encodeURIComponent(waTekst(i))}`} target="_blank" rel="noopener noreferrer" title="Versturen via WhatsApp">
              WhatsApp
            </a>
          </div>
        ))}
      </div>
    </>
  );
}

// "👥 Meerdere" — spelers in één keer aanmaken
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
    if (!res.ok) { toonMelding(data.fout ?? "Aanmaken mislukt", "fout"); if (data.gemaakt?.length) setGemaakt(data.gemaakt); return; }
    setGemaakt(data.gemaakt);
    onKlaar();
  }
  const sluit = () => { setOpen(false); setGemaakt(null); };

  return (
    <>
      <button type="button" className="rl-knop actie-knop" onClick={() => setOpen(true)} title="Meerdere spelers in één keer aanmaken">
        👥 <span className="alleen-pc">Meerdere</span>
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
              <button type="submit" className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800 }} disabled={bezig || !voorvoegsel}>
                {bezig ? "Aanmaken…" : `+ ${aantal} spelers aanmaken`}
              </button>
            </form>
          )}
        </Venster>
      )}
    </>
  );
}

// "🔑 Uitdelen" — voor bestaande spelers nieuwe wachtwoorden maken en uitdelen
export function InloggegevensUitdelenKnop({ spelers }: { spelers: { id: string; login_name: string | null; nickname: string | null; is_uitgeschakeld?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const [gekozen, setGekozen] = useState<Set<string>>(new Set());
  const [resultaat, setResultaat] = useState<Inlog[] | null>(null);
  const actief = spelers.filter((s) => !s.is_uitgeschakeld);

  function openen() {
    setGekozen(new Set(actief.map((s) => s.id)));
    setResultaat(null);
    setOpen(true);
  }
  function wissel(id: string) {
    setGekozen((g) => { const n = new Set(g); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  async function maakWachtwoorden() {
    const res = await fetch("/api/admin/groepen/wachtwoorden", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...gekozen] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toonMelding(data.fout ?? "Mislukt", "fout"); return; }
    setResultaat((data.spelers as { login: string; naam: string | null; wachtwoord: string }[]).map((s) => ({ login: s.login, naam: s.naam, wachtwoord: s.wachtwoord })));
  }

  return (
    <>
      <button type="button" className="rl-knop actie-knop" onClick={openen} title="Inloggegevens per team versturen of afdrukken">
        🔑 <span className="alleen-pc">Inloggegevens uitdelen</span><span className="alleen-mobiel">Uitdelen</span>
      </button>
      {open && (
        <Venster label="Inloggegevens" titel={resultaat ? "Klaar om uit te delen" : "Voor welke spelers?"} onSluit={() => setOpen(false)}>
          {resultaat ? <InlogLijst inlogs={resultaat} /> : (
            <>
              <div style={{ fontSize: "0.82rem", color: "var(--text)" }}>
                Wachtwoorden zijn niet terug te lezen. Daarom krijgen de gekozen spelers een <strong>nieuw, makkelijk wachtwoord</strong>. Wie al is ingelogd, blijft ingelogd.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {actief.map((s) => (
                  <button key={s.id} type="button" className={`uitdeel-keuze${gekozen.has(s.id) ? " uitdeel-keuze--aan" : ""}`} onClick={() => wissel(s.id)}>
                    <span aria-hidden>{gekozen.has(s.id) ? "✅" : "⬜"}</span>
                    <strong>{s.login_name}</strong>{s.nickname ? <span style={{ color: "var(--muted)" }}> · {s.nickname}</span> : null}
                  </button>
                ))}
              </div>
              <BevestigKnop venster gevaarlijk={false} icoon="🔑" titel={`${gekozen.size} nieuwe wachtwoorden maken?`} vraag="" ja="Ja, maken"
                onBevestig={maakWachtwoorden} disabled={!gekozen.size}
                className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800, width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center" }}>
                🔑 Nieuwe wachtwoorden maken ({gekozen.size})
              </BevestigKnop>
            </>
          )}
        </Venster>
      )}
    </>
  );
}
