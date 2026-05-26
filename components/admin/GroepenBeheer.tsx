"use client";

import { useEffect, useState } from "react";
import type { Speler } from "@/types/database";

const TEMPLATE_KEY = "pointrush_deel_template";
const TEMPLATE_DEFAULT = "Hoi! Log in op PointRush via deze link 🎯\nhttps://plekkieznloatst.vercel.app";

type BeheerModal = { type: "wachtwoord" | "loginnaam"; id: string; groepNaam: string };

function deelViaWhatsApp() {
  const template = localStorage.getItem(TEMPLATE_KEY) ?? TEMPLATE_DEFAULT;
  window.open(`https://wa.me/?text=${encodeURIComponent(template)}`, "_blank");
}

export default function GroepenBeheer() {
  const [groepen, setGroepen] = useState<Speler[]>([]);
  const [laden, setLaden] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [modal, setModal] = useState<BeheerModal | null>(null);
  const [toonTemplate, setToonTemplate] = useState(false);
  const [template, setTemplate] = useState(TEMPLATE_DEFAULT);

  useEffect(() => {
    setTemplate(localStorage.getItem(TEMPLATE_KEY) ?? TEMPLATE_DEFAULT);
  }, []);

  async function laadGroepen() {
    const res = await fetch("/api/admin/groepen");
    if (res.ok) setGroepen(await res.json());
    setLaden(false);
  }

  useEffect(() => { laadGroepen(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "640px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          {groepen.length} groep{groepen.length !== 1 ? "en" : ""}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: "0.8rem" }}
            onClick={() => setToonTemplate((v) => !v)}
          >
            ✏️ Berichttekst
          </button>
          <button
            onClick={() => deelViaWhatsApp()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: "#25D366", color: "#fff",
              fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.535 5.856L.057 23.571a.75.75 0 0 0 .937.899l5.878-1.545A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.705 9.705 0 0 1-4.95-1.355l-.355-.212-3.668.965.977-3.576-.231-.367A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
            Verstuur
          </button>
          <button className="btn btn-primary" onClick={() => setToonFormulier(true)}>
            + Nieuwe groep
          </button>
        </div>
      </div>

      {toonTemplate && (
        <div className="card" style={{ border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 8 }}>
            Standaard WhatsApp-berichttekst — wordt meegestuurd bij elke inloglink. De persoonlijke inloglink wordt er automatisch onder gezet.
          </p>
          <textarea
            className="form-textarea"
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              localStorage.setItem(TEMPLATE_KEY, e.target.value);
            }}
            rows={4}
            style={{ width: "100%", fontSize: "0.875rem", marginBottom: 8 }}
          />
          <button
            className="btn btn-ghost"
            style={{ fontSize: "0.8rem" }}
            onClick={() => {
              setTemplate(TEMPLATE_DEFAULT);
              localStorage.setItem(TEMPLATE_KEY, TEMPLATE_DEFAULT);
            }}
          >
            Herstel standaard
          </button>
        </div>
      )}

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
            Nog geen groepen aangemaakt.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {groepen.map((g) => (
            <div key={g.id} className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "var(--blue-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: g.icon ? "1.5rem" : "0.85rem",
                fontWeight: 700, color: "var(--blue)", flexShrink: 0,
              }}>
                {g.icon ?? g.group_name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{g.group_name}</div>
                {g.login_name && (
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 1 }}>
                    Login: <span style={{ fontWeight: 600, color: "var(--ink)" }}>{g.login_name}</span>
                  </div>
                )}
                {g.nickname && (
                  <div style={{ fontSize: "0.75rem", color: "var(--blue)", fontWeight: 600, marginTop: 1 }}>
                    Alias: {g.nickname}
                  </div>
                )}
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
                  {g.active_device_id ? "📱 Actief op apparaat" : "Niet actief"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: "0.75rem", padding: "5px 10px" }}
                  onClick={() => setModal({ type: "wachtwoord", id: g.id, groepNaam: g.group_name })}
                >
                  🔑 Wachtwoord
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: "0.75rem", padding: "5px 10px" }}
                  onClick={() => setModal({ type: "loginnaam", id: g.id, groepNaam: g.group_name })}
                >
                  ✏️ Loginnaam
                </button>
              </div>
            </div>
          ))}
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
  const [groepNaam, setGroepNaam] = useState("");
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
      body: JSON.stringify({ groepNaam, loginNaam, wachtwoord }),
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
      <h2 style={{ marginBottom: "16px", fontSize: "1rem" }}>Nieuwe groep aanmaken</h2>
      <form onSubmit={opslaan} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="form-group">
          <label className="form-label">Groepsnaam</label>
          <input className="form-input" value={groepNaam} onChange={(e) => setGroepNaam(e.target.value)}
            placeholder="bijv. Groep 1" required />
        </div>
        <div className="form-group">
          <label className="form-label">Loginnaam (speler typt dit in bij inloggen)</label>
          <input className="form-input" value={loginNaam} onChange={(e) => setLoginNaam(e.target.value)}
            placeholder="bijv. groep1" required />
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
