"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const params = useSearchParams();
  const fout = params.get("fout");
  const foutTekst =
    fout === "ongeldig"
      ? "Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord."
      : fout === "leeg"
      ? "Vul je e-mailadres en wachtwoord in."
      : null;

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

        <form action="/api/auth/inloggen" method="post" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

          {foutTekst && (
            <div className="melding melding-fout">
              <span>⚠️</span>
              <span>{foutTekst}</span>
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            style={{ width: "100%", padding: "13px", marginTop: "4px", fontSize: "0.95rem" }}
          >
            Inloggen
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPagina() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
