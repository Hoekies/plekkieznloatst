"use client";

import { useState, useTransition } from "react";

export default function LoginPagina() {
  const [fout, setFout] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await fetch("/api/auth/inloggen", { method: "POST", body: formData });
      const data = await res.json();
      if (data.fout) { setFout(data.fout); return; }
      if (data.redirect) window.location.href = data.redirect;
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #0A1B36 0%, #1E3A8A 100%)",
      padding: "24px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "var(--radius-xl)",
        padding: "40px 36px",
        width: "100%",
        maxWidth: "380px",
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📍</div>
          <h1 style={{ fontSize: "1.4rem" }}>Plekkie z&apos;n Loatst</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Log in om verder te gaan
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mailadres</label>
            <input
              id="email"
              name="email"
              className="form-input"
              type="email"
              placeholder="naam@voorbeeld.nl"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wachtwoord">Wachtwoord</label>
            <input
              id="wachtwoord"
              name="wachtwoord"
              className="form-input"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {fout && (
            <div className="melding melding-fout">
              <span>⚠️</span>
              <span>{fout}</span>
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending}
            style={{ width: "100%", padding: "13px", marginTop: "4px", fontSize: "0.95rem" }}
          >
            {pending ? "Bezig met inloggen…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
