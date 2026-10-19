"use client";

import { useEffect, useState } from "react";
import BevestigKnop from "@/components/admin/BevestigKnop";
import SectieKop from "@/components/admin/SectieKop";
import { toonMelding } from "@/components/admin/Melding";
import { InlogKlaar } from "@/components/admin/InlogUitdelen";
import { WijzigVenster, type BeheerModal } from "@/components/admin/GroepenBeheer";
import { maakWachtwoord } from "@/lib/wachtwoord";
import { foutUitleg } from "@/lib/fout-uitleg";

type Helper = { id: string; naam: string; laatst_ingelogd: string | null };

// Helpers van de spelleider: zij loggen in met een naam en wachtwoord en kunnen dan
// meekijken, foto's keuren en punten vrijgeven. Geen routes, spelers of reset.
// Zelfde opbouw als de spelers: knop "+ Nieuwe helper", formulier, en kaarten met knoppen.
export default function HelpersBeheer() {
  const [helpers, setHelpers] = useState<Helper[] | null>(null);
  const [formulier, setFormulier] = useState(false);
  const [modal, setModal] = useState<BeheerModal | null>(null);

  async function laad() {
    const res = await fetch("/api/admin/helpers");
    if (res.ok) setHelpers((await res.json()).helpers);
  }
  useEffect(() => { laad(); }, []);

  async function verwijder(h: Helper) {
    const res = await fetch("/api/admin/helpers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id }) });
    if (!res.ok) toonMelding(await foutUitleg(res, "Verwijderen"), "fout");
    else toonMelding(`${h.naam} is verwijderd`, "ok");
    laad();
  }

  return (
    <div className="helpers-blok" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
      {/* Kop met de knop ernaast; korte uitleg eronder */}
      <div>
        <SectieKop titel="🦺 Helpers">
          <button className="btn btn-primary actie-knop" onClick={() => setFormulier(true)}>
            + <span className="alleen-pc">Nieuwe helper</span><span className="alleen-mobiel">Helper</span>
          </button>
        </SectieKop>
        <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: -6 }}>
          Kijken mee, keuren foto&apos;s en geven punten vrij.
        </div>
      </div>

      {formulier && <NieuweHelperForm onSuccess={laad} onSluit={() => setFormulier(false)} />}

      {helpers === null ? (
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Laden…</p>
      ) : helpers.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>Nog geen helpers.</p>
      ) : (
        <div>
          {helpers.map((h) => (
            <div key={h.id} className="pr-gem-card">
              <div className="pr-gem-card-inner gb-kaart">
                <div className="pr-gem-avatar" style={{ borderRadius: "50%", background: "var(--blue-soft)" }}>🦺</div>
                <div className="gb-tekst" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>{h.naam}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>
                    <span>Login: <strong style={{ color: "var(--ink)" }}>{h.naam}</strong> · </span>
                    <span style={{ color: h.laatst_ingelogd ? "#4ADE80" : "var(--muted)", fontWeight: h.laatst_ingelogd ? 700 : 400 }}>
                      {h.laatst_ingelogd ? `Ingelogd ${new Date(h.laatst_ingelogd).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Nog niet ingelogd"}
                    </span>
                  </div>
                </div>
                <div className="gb-schakel gb-rechts">
                  <div className="gb-iconen">
                  <button type="button" className="rl-knop rl-knop--icoon rl-knop--cyan gb-icoon" aria-label="Inloggegevens versturen"
                    title="Inloggegevens versturen: nieuw wachtwoord en het kaartje via WhatsApp"
                    onClick={() => setModal({ id: h.id, groepNaam: h.naam, icoon: "🦺", login: h.naam, helper: true })}>🔑</button>
                  <BevestigKnop venster icoon="🗑️" titel={`${h.naam} verwijderen?`} vraag="" ja="Ja, verwijderen"
                    onBevestig={() => verwijder(h)} className="rl-knop rl-knop--icoon rl-knop--rood gb-verwijder"
                    tip="Helper verwijderen: kan daarna niet meer inloggen">🗑️</BevestigKnop>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <WijzigVenster modal={modal} onSluit={() => setModal(null)} />}
    </div>
  );
}

// Zelfde formulier als "+ Nieuwe speler": naam en een voorgesteld wachtwoord
function NieuweHelperForm({ onSuccess, onSluit }: { onSuccess: () => void; onSluit: () => void }) {
  const [naam, setNaam] = useState("");
  const [wachtwoord, setWachtwoord] = useState(() => maakWachtwoord());
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);
  const [klaar, setKlaar] = useState<{ login: string; wachtwoord: string } | null>(null);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout(""); setLaden(true);
    const res = await fetch("/api/admin/helpers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naam: naam.trim(), wachtwoord }),
    });
    const data = await res.json().catch(() => ({}));
    setLaden(false);
    if (!res.ok) { setFout(data.fout ?? "Er is een fout opgetreden"); return; }
    setKlaar({ login: data.naam, wachtwoord: data.wachtwoord });
    onSuccess();
  }

  if (klaar) {
    return (
      <div className="pr-gem-panel" style={{ maxWidth: 560 }}>
        <div className="pr-gem-panel-inner helper-inlog">
          <button type="button" className="editor-paneel-sluit venster-sluit" onClick={onSluit} aria-label="Sluiten">✕</button>
          <div className="pr-gem-label">✅ Helper aangemaakt</div>
          <InlogKlaar inlog={{ ...klaar, helper: true }} />
        </div>
      </div>
    );
  }

  return (
    <div className="pr-gem-card">
      <form onSubmit={opslaan} className="pr-gem-card-inner nieuwe-speler" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="pr-gem-avatar nieuwe-speler-icoon">🦺</div>
        <div className="form-group" style={{ flex: "1 1 180px", margin: 0 }}>
          <label className="form-label">Naam</label>
          <input className="form-input" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={30}
            placeholder="bijv. Anouk" required autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
            title="Hiermee logt de helper in; letters en cijfers, anders dan de loginnamen van de spelers" />
        </div>
        <div className="form-group" style={{ flex: "1 1 180px", margin: 0 }}>
          <label className="form-label">Wachtwoord</label>
          <div className="ww-veld">
            <input className="form-input" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
              placeholder="min. 8 tekens" required minLength={8} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            <button type="button" className="rl-knop rl-knop--icoon" onClick={() => setWachtwoord(maakWachtwoord())} title="Ander voorstel">🎲</button>
          </div>
        </div>
        <div className="nieuwe-speler-knoppen" style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="submit" className="rl-knop rl-knop--cyan actie-knop" disabled={laden}>{laden ? "Aanmaken…" : "Aanmaken"}</button>
          <button type="button" className="rl-knop actie-knop" onClick={onSluit}>Annuleren</button>
        </div>
        {fout && <div className="melding melding-fout" style={{ flexBasis: "100%", margin: 0 }}><span>⚠️</span> {fout}</div>}
      </form>
    </div>
  );
}
