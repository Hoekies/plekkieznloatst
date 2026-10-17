"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Speler } from "@/types/database";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import StatKaart from "@/components/admin/StatKaart";


// heeft_spel: komt mee uit /api/admin/groepen (lopende sessie ja/nee)
type Groep = Speler & { heeft_spel?: boolean };

type BeheerModal = { type: "wachtwoord" | "loginnaam"; id: string; groepNaam: string; icoon: string | null; login: string | null };


export default function GroepenBeheer() {

  const [groepen, setGroepen] = useState<Groep[]>([]);
  const [laden, setLaden] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [modal, setModal] = useState<BeheerModal | null>(null);
  const [uitOpen, setUitOpen] = useState(false);

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

  // Uitgeschakelde spelers staan apart onderaan, standaard ingeklapt
  const actieveSpelers = groepen.filter((g) => !g.is_uitgeschakeld);
  const uitgeschakeld = groepen.filter((g) => g.is_uitgeschakeld);

  const spelerKaart = (g: Groep) => {
    const displayNaam = g.nickname ?? g.login_name ?? "Nieuwe speler";
    const isUit = g.is_uitgeschakeld;
    return (
      <div key={g.id} className="pr-gem-card" style={{ opacity: isUit ? 0.8 : 1 }}>
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
            <span style={{ color: isUit ? "#FCA5A5" : g.active_device_id ? "#4ADE80" : "var(--muted)", fontWeight: isUit || g.active_device_id ? 700 : 400 }}>
              {isUit ? "Uitgeschakeld" : g.active_device_id ? "Actief" : "Niet actief"}
            </span>
          </div>
          {/* Knoppen op één regel, zelfde stijl als het routes-overzicht; niet bij een uitgeschakelde speler */}
          {!isUit && <div className="gb-knoppen">
            <button className="rl-knop" title="Wachtwoord wijzigen"
              onClick={() => setModal({ type: "wachtwoord", id: g.id, groepNaam: displayNaam, icoon: g.icon, login: g.login_name })}>
              🔑 Wachtwoord
            </button>
            <button className="rl-knop" title="Loginnaam wijzigen"
              onClick={() => setModal({ type: "loginnaam", id: g.id, groepNaam: displayNaam, icoon: g.icon, login: g.login_name })}>
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
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Tegels zoals bovenaan het dashboard */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 16 }}>
        <StatKaart label="Spelers" waarde={String(groepen.length)} badgeKlas="pr-badge--purple" badge="👥" />
        <StatKaart label="Ingelogd" waarde={String(groepen.filter((g) => g.active_device_id).length)} badgeKlas="pr-badge--green" badge="📱" />
        <StatKaart label="Aan het spelen" waarde={String(groepen.filter((g) => g.heeft_spel).length)} badgeKlas="pr-badge--orange" badge="⚡" />
        <StatKaart label="Uitgeschakeld" waarde={String(groepen.filter((g) => g.is_uitgeschakeld).length)} badgeKlas="pr-badge--gray" badge="⏸" />
      </div>

      {/* Nieuwe speler links (versturen via WhatsApp staat in het menu) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button className="btn btn-primary actie-knop" onClick={() => setToonFormulier(true)}>
            + <span className="alleen-pc">Nieuwe speler</span><span className="alleen-mobiel">Speler</span>
          </button>
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
          {/* Actieve spelers altijd zichtbaar; uitgeschakelde spelers achter een inklapbare kop */}
          {actieveSpelers.map(spelerKaart)}
          {uitgeschakeld.length > 0 && (
            <>
              <button type="button" className="gb-inklap" onClick={() => setUitOpen((v) => !v)} aria-expanded={uitOpen}>
                <span aria-hidden>{uitOpen ? "▾" : "▸"}</span>
                ⏸ Uitgeschakelde spelers ({uitgeschakeld.length})
              </button>
              {uitOpen && uitgeschakeld.map(spelerKaart)}
            </>
          )}
        </div>
      )}

      {modal && (
        <WijzigVenster
          modal={modal}
          onSluit={() => setModal(null)}
          onKlaar={() => { setModal(null); if (modal.type === "loginnaam") laadGroepen(); }}
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
    // Compact, in de stijl van de spelerkaarten: icoon, twee velden naast elkaar en de knoppen rechts
    <div className="pr-gem-card">
      <form onSubmit={opslaan} className="pr-gem-card-inner nieuwe-speler" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="pr-gem-avatar nieuwe-speler-icoon">👤</div>
        <div className="form-group" style={{ flex: "1 1 180px", margin: 0 }}>
          <label className="form-label">Loginnaam</label>
          <input className="form-input" value={loginNaam} onChange={(e) => setLoginNaam(e.target.value)}
            placeholder="bijv. speler1" required autoFocus title="Dit typt de speler in bij het inloggen; de teamnaam kiest de speler zelf bij de start" />
        </div>
        <div className="form-group" style={{ flex: "1 1 180px", margin: 0 }}>
          <label className="form-label">Wachtwoord</label>
          <input className="form-input" type="password" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
            placeholder="min. 8 tekens" required minLength={8} />
        </div>
        <div className="nieuwe-speler-knoppen" style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="submit" className="rl-knop rl-knop--cyan actie-knop" disabled={laden}>
            {laden ? "Aanmaken…" : "Aanmaken"}
          </button>
          <button type="button" className="rl-knop actie-knop" onClick={onAnnuleer}>Annuleren</button>
        </div>
        {fout && <div className="melding melding-fout" style={{ flexBasis: "100%", margin: 0 }}><span>⚠️</span> {fout}</div>}
      </form>
    </div>
  );
}

// ── Loginnaam of wachtwoord wijzigen: venster midden in beeld, met de speler erin ──
function WijzigVenster({ modal, onSluit, onKlaar }: { modal: BeheerModal; onSluit: () => void; onKlaar: () => void }) {
  const isWachtwoord = modal.type === "wachtwoord";
  const [waarde, setWaarde] = useState("");
  const [fout, setFout] = useState("");
  const [ok, setOk] = useState(false);
  const [laden, setLaden] = useState(false);

  // Sluiten met Esc
  useEffect(() => {
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit]);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);
    const res = await fetch(`/api/admin/groepen/${modal.id}/${modal.type}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isWachtwoord ? { wachtwoord: waarde } : { loginNaam: waarde }),
    });
    if (!res.ok) {
      const { fout: f } = await res.json().catch(() => ({}));
      setFout(f ?? "Er is een fout opgetreden");
    } else {
      setOk(true);
      setTimeout(onKlaar, 1200);
    }
    setLaden(false);
  }

  return createPortal(
    <div onClick={onSluit} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 420 }}>
        <form onSubmit={opslaan} className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="pr-gem-label">{isWachtwoord ? "🔑 Wachtwoord wijzigen" : "✏️ Loginnaam wijzigen"}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>Voor welke speler?</div>
            </div>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten">✕</button>
          </div>

          {/* De speler waar het om gaat */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="pr-gem-avatar" style={{ width: 44, height: 44, fontSize: "1.6rem" }}>{modal.icoon ?? "👤"}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff" }}>{modal.groepNaam}</div>
              {modal.login && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Login: <strong style={{ color: "var(--ink)" }}>{modal.login}</strong></div>}
            </div>
          </div>

          {ok ? (
            <div className="melding melding-ok">✅ {isWachtwoord ? "Wachtwoord" : "Loginnaam"} gewijzigd</div>
          ) : (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{isWachtwoord ? "Nieuw wachtwoord" : "Nieuwe loginnaam"}</label>
                <input className="form-input" type={isWachtwoord ? "password" : "text"} value={waarde} onChange={(e) => setWaarde(e.target.value)}
                  placeholder={isWachtwoord ? "min. 8 tekens" : modal.login ?? ""} required minLength={isWachtwoord ? 8 : undefined} autoFocus />
              </div>
              {fout && <div className="melding melding-fout" style={{ margin: 0 }}><span>⚠️</span> {fout}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="submit" className="rl-knop rl-knop--cyan" style={{ height: 44, padding: "0 20px", fontWeight: 800 }} disabled={laden}>
                  {laden ? "Opslaan…" : "Opslaan"}
                </button>
                <button type="button" className="rl-knop" style={{ height: 44, padding: "0 18px" }} onClick={onSluit}>Annuleren</button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}
