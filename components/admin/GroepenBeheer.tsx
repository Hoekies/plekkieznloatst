"use client";

import { useEffect, useState } from "react";
import type { Speler } from "@/types/database";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import StatKaart from "@/components/admin/StatKaart";
import WhatsAppKnop from "@/components/admin/WhatsAppKnop";


// heeft_spel: komt mee uit /api/admin/groepen (lopende sessie ja/nee)
type Groep = Speler & { heeft_spel?: boolean };

type BeheerModal = { type: "wachtwoord" | "loginnaam"; id: string; groepNaam: string };


export default function GroepenBeheer() {

  const [groepen, setGroepen] = useState<Groep[]>([]);
  const [laden, setLaden] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [modal, setModal] = useState<BeheerModal | null>(null);

  async function laadGroepen() {
    const res = await fetch("/api/admin/groepen");
    if (res.ok) setGroepen(await res.json());
    setLaden(false);
  }

  // Elke 10 s verversen, zodat inloggen en starten van groepen vanzelf zichtbaar worden
  useEffect(() => {
    laadGroepen();
    const timer = setInterval(laadGroepen, 10000);
    return () => clearInterval(timer);
  }, []);

  async function resetApparaat(id: string) {
    const res = await fetch(`/api/admin/groepen/${id}/apparaat`, { method: "PATCH" });
    if (res.ok) setGroepen((prev) => prev.map((g) => g.id === id ? { ...g, active_device_id: null } : g));
  }

  async function logGroepUit(id: string) {
    const res = await fetch(`/api/admin/groepen/${id}/uitloggen`, { method: "PATCH" });
    if (res.ok) setGroepen((prev) => prev.map((g) => g.id === id ? { ...g, active_device_id: null } : g));
  }

  async function stopSpel(id: string, naam: string) {
    const res = await fetch(`/api/admin/groepen/${id}/spel-stoppen`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toonMelding(data.fout ?? "Stoppen mislukt", "fout"); return; }
    toonMelding(data.gestopt === 0 ? `${naam} had geen lopend spel.` : `Spel van ${naam} gestopt`, data.gestopt === 0 ? "info" : "ok");
    setGroepen((prev) => prev.map((g) => g.id === id ? { ...g, heeft_spel: false } : g));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Tegels zoals bovenaan het dashboard */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 16 }}>
        <StatKaart label="Spelers" waarde={String(groepen.length)} badgeKlas="pr-badge--purple" badge="👥" />
        <StatKaart label="Ingelogd" waarde={String(groepen.filter((g) => g.active_device_id).length)} badgeKlas="pr-badge--green" badge="📱" />
        <StatKaart label="Aan het spelen" waarde={String(groepen.filter((g) => g.heeft_spel).length)} badgeKlas="pr-badge--orange" badge="⚡" />
        <StatKaart label="Uitgeschakeld" waarde={String(groepen.filter((g) => g.is_uitgeschakeld).length)} badgeKlas="pr-badge--gray" badge="⏸" />
      </div>

      {/* Nieuwe groep links, versturen via WhatsApp rechts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button className="btn btn-primary actie-knop" onClick={() => setToonFormulier(true)}>
            + <span className="alleen-pc">Nieuwe speler</span><span className="alleen-mobiel">Speler</span>
          </button>
          <span style={{ flex: 1 }} />
          <WhatsAppKnop />
      </div>


      {toonFormulier && (
        <NieuweGroepForm
          onSuccess={() => { setToonFormulier(false); laadGroepen(); }}
          onAnnuleer={() => setToonFormulier(false)}
        />
      )}

      {laden ? (
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Laden…</p>
      ) : groepen.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Nog geen spelers aangemaakt.
          </p>
        </div>
      ) : (
        <div>
          {groepen.map((g) => {
            const displayNaam = g.nickname ?? g.login_name ?? "Nieuwe speler";
            const isUit = g.is_uitgeschakeld;
            return (
              <div key={g.id} className="pr-gem-card" style={{ opacity: isUit ? 0.55 : 1 }}>
               <div className="pr-gem-card-inner gb-kaart">
                {/* Icoon — zelfde formaat als de teamavatars op het dashboard; uitgeschakeld: zo hoog als de tekst */}
                <div className={`pr-gem-avatar${isUit ? " gb-avatar-uit" : ""}`} style={{
                  borderRadius: "50%",
                  background: isUit ? "var(--red-soft)" : "var(--blue-soft)",
                  fontWeight: 700, color: isUit ? "var(--red)" : "var(--blue)",
                }}>
                  {g.icon ?? displayNaam.slice(0, 2).toUpperCase()}
                </div>

                {/* Tekst + knoppen */}
                <div className="gb-tekst" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: g.nickname ? "#fff" : "var(--muted)", fontStyle: g.nickname ? "normal" : "italic" }}>
                    {g.nickname ?? "nog geen teamnaam gekozen"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>
                    {g.login_name && <span>Login: <strong style={{ color: "var(--ink)" }}>{g.login_name}</strong> · </span>}
                    <span style={{ color: isUit ? "var(--red)" : g.active_device_id ? "var(--green)" : "var(--muted)" }}>
                      {isUit ? "Uitgeschakeld" : g.active_device_id ? "Actief" : "Niet actief"}
                    </span>
                  </div>
                  {/* Knoppen op één regel, zelfde stijl als het routes-overzicht; niet bij een uitgeschakelde speler */}
                  {!isUit && <div className="gb-knoppen">
                    <button className="rl-knop" title="Wachtwoord wijzigen"
                      onClick={() => setModal({ type: "wachtwoord", id: g.id, groepNaam: displayNaam })}>
                      🔑 Wachtwoord
                    </button>
                    <button className="rl-knop" title="Loginnaam wijzigen"
                      onClick={() => setModal({ type: "loginnaam", id: g.id, groepNaam: displayNaam })}>
                      ✏️ Loginnaam
                    </button>
                    {g.active_device_id && (
                      <button className="rl-knop" onClick={() => resetApparaat(g.id)}
                        title="Toestel ontkoppelen, zodat de speler elders kan inloggen">
                        🔓 Apparaat
                      </button>
                    )}
                    {/* Alleen tonen als er iets uit te loggen of te stoppen valt */}
                    {g.active_device_id && (
                      <button className="rl-knop rl-knop--rood" onClick={() => logGroepUit(g.id)}
                        title="Uitloggen; het spel blijft staan">
                        🚪 Uitloggen
                      </button>
                    )}
                    {g.heeft_spel && (
                      <BevestigKnop className="rl-knop rl-knop--rood" onBevestig={() => stopSpel(g.id, displayNaam)}
                        title="Spel stoppen: beëindigt het lopende spel van deze speler" vraag="Score en voortgang vervallen." ja="Ja, stoppen">
                        ⏹️ Stop spel
                      </BevestigKnop>
                    )}
                  </div>}
                </div>

                {/* Aan/uit toggle */}
                <div className="gb-schakel"
                  title={isUit ? "Aanzetten" : "Uitzetten"}
                  onClick={async () => {
                    const res = await fetch(`/api/admin/groepen/${g.id}/schakel`, { method: "PATCH" });
                    if (res.ok) setGroepen((prev) => prev.map((x) => x.id === g.id ? { ...x, is_uitgeschakeld: !x.is_uitgeschakeld } : x));
                  }}
                  style={{
                    width: 42, height: 24, borderRadius: 12, flexShrink: 0,
                    background: isUit ? "rgba(255,59,92,0.3)" : "rgba(34,197,94,0.3)",
                    border: `1.5px solid ${isUit ? "var(--red)" : "var(--green)"}`,
                    position: "relative", cursor: "pointer",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute", width: 18, height: 18, borderRadius: "50%",
                    background: isUit ? "var(--red)" : "var(--green)",
                    top: 2, left: isUit ? 2 : 20,
                    transition: "left 0.2s, background 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }} />
                </div>
               </div>
              </div>
            );
          })}
        </div>
      )}

      {modal?.type === "wachtwoord" && (
        <WachtwoordWijzigen
          id={modal.id}
          groepNaam={modal.groepNaam}
          onKlaar={() => setModal(null)}
        />
      )}
      {modal?.type === "loginnaam" && (
        <LoginNaamWijzigen
          id={modal.id}
          groepNaam={modal.groepNaam}
          onKlaar={() => { setModal(null); laadGroepen(); }}
        />
      )}
    </div>
  );
}

// ── Nieuwe groep formulier ────────────────────────────────────────────────────
function NieuweGroepForm({ onSuccess, onAnnuleer }: { onSuccess: () => void; onAnnuleer: () => void }) {
  const [loginNaam, setLoginNaam] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);

    const res = await fetch("/api/admin/groepen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginNaam, wachtwoord }),
    });

    if (!res.ok) {
      const { fout: f } = await res.json();
      setFout(f ?? "Er is een fout opgetreden");
      setLaden(false);
      return;
    }
    onSuccess();
  }

  return (
    <div className="card" style={{ border: "2px solid var(--blue)" }}>
      <h2 style={{ marginBottom: "16px", fontSize: "1rem" }}>Nieuwe speler aanmaken</h2>
      <form onSubmit={opslaan} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
          De teamnaam kiest de speler zelf bij de start van het spel.
        </p>
        <div className="form-group">
          <label className="form-label">Loginnaam (speler typt dit in bij inloggen)</label>
          <input className="form-input" value={loginNaam} onChange={(e) => setLoginNaam(e.target.value)}
            placeholder="bijv. speler1" required />
        </div>
        <div className="form-group">
          <label className="form-label">Wachtwoord (min. 8 tekens)</label>
          <input className="form-input" type="password" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
            placeholder="••••••••" required minLength={8} />
        </div>
        {fout && <div className="melding melding-fout"><span>⚠️</span> {fout}</div>}
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="btn btn-ghost" onClick={onAnnuleer} style={{ flex: 1 }}>Annuleer</button>
          <button type="submit" className="btn btn-primary" disabled={laden} style={{ flex: 1 }}>
            {laden ? "Aanmaken…" : "Aanmaken"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Login naam wijzigen ───────────────────────────────────────────────────────
function LoginNaamWijzigen({ id, groepNaam, onKlaar }: { id: string; groepNaam: string; onKlaar: () => void }) {
  const [loginNaam, setLoginNaam] = useState("");
  const [fout, setFout] = useState("");
  const [ok, setOk] = useState(false);
  const [laden, setLaden] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);
    const res = await fetch(`/api/admin/groepen/${id}/loginnaam`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginNaam }),
    });
    if (!res.ok) {
      const { fout: f } = await res.json();
      setFout(f ?? "Er is een fout opgetreden");
    } else {
      setOk(true);
      setTimeout(onKlaar, 1500);
    }
    setLaden(false);
  }

  return (
    <div className="card" style={{ border: "1px solid var(--blue)" }}>
      <h2 style={{ marginBottom: "12px", fontSize: "1rem" }}>✏️ Loginnaam wijzigen — {groepNaam}</h2>
      {ok ? (
        <div className="melding melding-ok">✅ Loginnaam gewijzigd</div>
      ) : (
        <form onSubmit={opslaan} style={{ display: "flex", gap: "8px" }}>
          <input className="form-input" value={loginNaam} onChange={(e) => setLoginNaam(e.target.value)}
            placeholder="Nieuwe loginnaam" required style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onKlaar}>✕</button>
          <button type="submit" className="btn btn-primary" disabled={laden}>
            {laden ? "…" : "Opslaan"}
          </button>
        </form>
      )}
      {fout && <div className="melding melding-fout" style={{ marginTop: 8 }}><span>⚠️</span> {fout}</div>}
    </div>
  );
}

// ── Wachtwoord wijzigen ───────────────────────────────────────────────────────
function WachtwoordWijzigen({ id, groepNaam, onKlaar }: { id: string; groepNaam: string; onKlaar: () => void }) {
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const [ok, setOk] = useState(false);
  const [laden, setLaden] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);

    const res = await fetch(`/api/admin/groepen/${id}/wachtwoord`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wachtwoord }),
    });

    if (!res.ok) {
      const { fout: f } = await res.json();
      setFout(f ?? "Er is een fout opgetreden");
    } else {
      setOk(true);
      setTimeout(onKlaar, 1500);
    }
    setLaden(false);
  }

  return (
    <div className="card" style={{ border: "1px solid var(--gold)" }}>
      <h2 style={{ marginBottom: "12px", fontSize: "1rem" }}>
        🔑 Wachtwoord wijzigen — {groepNaam}
      </h2>
      {ok ? (
        <div className="melding melding-ok">✅ Wachtwoord gewijzigd</div>
      ) : (
        <form onSubmit={opslaan} style={{ display: "flex", gap: "8px" }}>
          <input className="form-input" type="password" value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            placeholder="Nieuw wachtwoord (min. 8 tekens)" required minLength={8}
            style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onKlaar}>✕</button>
          <button type="submit" className="btn btn-primary" disabled={laden}>
            {laden ? "…" : "Opslaan"}
          </button>
        </form>
      )}
      {fout && <div className="melding melding-fout" style={{ marginTop: 8 }}><span>⚠️</span> {fout}</div>}
    </div>
  );
}
