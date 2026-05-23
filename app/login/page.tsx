"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const fout = params.get("fout");
  const foutTekst =
    fout === "ongeldig"
      ? "Ongeldige naam of wachtwoord. Probeer het opnieuw."
      : fout === "leeg"
      ? "Vul je naam en wachtwoord in."
      : null;

  const [toonWachtwoord, setToonWachtwoord] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #0A1B36 0%, #1E3A8A 100%)",
      padding: "24px",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "var(--radius-xl)",
        padding: "40px 36px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "var(--shadow-lg)",
      }}>
        {/* Logo vullend */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Plekkie z'n Loatst"
          style={{ width: "100%", display: "block", marginBottom: "32px" }}
        />

        <form action="/api/auth/inloggen" method="post" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="naam" style={{ color: "rgba(255,255,255,0.6)" }}>Naam</label>
            <input
              id="naam"
              name="naam"
              className="form-input"
              type="text"
              placeholder="bijv. groep1"
              required
              autoComplete="username"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wachtwoord" style={{ color: "rgba(255,255,255,0.6)" }}>Wachtwoord</label>
            <div style={{ position: "relative" }}>
              <input
                id="wachtwoord"
                name="wachtwoord"
                className="form-input"
                type={toonWachtwoord ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setToonWachtwoord((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.5)", fontSize: "1.1rem", lineHeight: 1, padding: 0,
                }}
                aria-label={toonWachtwoord ? "Verberg wachtwoord" : "Toon wachtwoord"}
              >
                {toonWachtwoord ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {foutTekst && (
            <div className="melding melding-fout">
              <span>⚠️</span>
              <span>{foutTekst}</span>
            </div>
          )}

          <button
            className="btn btn-cyan"
            type="submit"
            style={{ width: "100%", padding: "13px", marginTop: "4px", fontSize: "0.95rem" }}
          >
            Inloggen
          </button>
        </form>
      </div>

      <footer style={{ marginTop: 24, color: "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>
        Hoekies 2026
      </footer>
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
