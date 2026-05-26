"use client";

import { useEffect, useState } from "react";
import type { Speler } from "@/types/database";

type BeheerModal = { type: "wachtwoord" | "loginnaam"; id: string; groepNaam: string };

async function deelLink(id: string, groepNaam: string) {
  const res = await fetch(`/api/admin/groepen/${id}/deellink`, { method: "POST" });
  if (!res.ok) { alert("Kon link niet genereren"); return; }
  const { link } = await res.json();
  const tekst = `Hoi! Gebruik deze link om in te loggen bij PointRush:\n${link}`;
  if (navigator.share) {
    await navigator.share({ title: `Inloglink ${groepNaam}`, text: tekst });
  } else {
    await navigator.clipboard.writeText(link);
    alert("Link gekopieerd naar klembord!");
  }
}

export default function GroepenBeheer() {
  const [groepen, setGroepen] = useState<Speler[]>([]);
  const [laden, setLaden] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [modal, setModal] = useState<BeheerModal | null>(null);

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
        <button className="btn btn-primary" onClick={() => setToonFormulier(true)}>
          + Nieuwe groep
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
                  className="btn btn-cyan"
                  style={{ fontSize: "0.75rem", padding: "5px 10px" }}
                  onClick={() => deelLink(g.id, g.group_name)}
                >
                  🔗 Deel link
                </button>
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
