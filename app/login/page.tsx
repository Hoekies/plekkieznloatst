"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const fout = params.get("fout");
  const foutTekst =
    fout === "ongeldig"
      ? "Ongeldige naam of wachtwoord. Probeer het opnieuw."
      : fout === "leeg"
      ? "Vul je naam en wachtwoord in."
      : fout === "uitgeschakeld"
      ? "Deze groep is uitgeschakeld. Neem contact op met de spelleider."
      : null;

  const [toonWachtwoord, setToonWachtwoord] = useState(false);


  return (
    <div className="pr-stage" style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
    }}>
      {/* Zwevende sparkles */}
      <div className="pr-sparkle" style={{ width: 6, height: 6, top: "12%", left: "18%" }} />
      <div className="pr-sparkle" style={{ width: 4, height: 4, top: "22%", left: "75%", animationDelay: "1.2s" }} />
      <div className="pr-sparkle" style={{ width: 8, height: 8, top: "68%", left: "12%", animationDelay: "2s" }} />
      <div className="pr-sparkle" style={{ width: 5, height: 5, top: "75%", left: "82%", animationDelay: "0.6s" }} />

      {/* Zwevende decor-icoontjes */}
      <span className="pr-orb" style={{ top: "10%", left: "8%", animationDelay: "0.3s" }}>👻</span>
      <span className="pr-orb" style={{ top: "14%", right: "8%", animationDelay: "1.1s" }}>⭐</span>
      <span className="pr-orb" style={{ top: "78%", left: "9%", animationDelay: "0.8s" }}>💣</span>
      <span className="pr-orb" style={{ top: "80%", right: "10%", animationDelay: "1.6s" }}>🍌</span>

      <div className="pr-logo-glow" />
      <div className="pr-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="PointRush"
          style={{ width: 230, display: "block", filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.55)) drop-shadow(0 0 30px rgba(255,217,59,0.25))" }}
        />
      </div>

      <div className="pr-panel">
        <div className="pr-panel-inner">
          <form action="/api/auth/inloggen" method="post" style={{ display: "flex", flexDirection: "column" }}>

            <label htmlFor="naam" className="pr-field-label2">
              Naam
            </label>
            <input
              id="naam"
              name="naam"
              className="pr-field-input2"
              type="text"
              placeholder="bijv. groep1"
              required
              autoComplete="username"
            />

            <label htmlFor="wachtwoord" className="pr-field-label2">
              Wachtwoord
            </label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                id="wachtwoord"
                name="wachtwoord"
                className="pr-field-input2"
                type={toonWachtwoord ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: "44px", marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={() => setToonWachtwoord((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.45)", fontSize: "1.1rem", lineHeight: 1, padding: 0,
                }}
                aria-label={toonWachtwoord ? "Verberg wachtwoord" : "Toon wachtwoord"}
              >
                {toonWachtwoord ? "🙈" : "👁️"}
              </button>
            </div>

            {foutTekst && (
              <div style={{
                background: "rgba(239, 68, 68, 0.18)",
                border: "1.5px solid rgba(239, 68, 68, 0.4)",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: "0.82rem",
                color: "#FCA5A5",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                marginBottom: 14,
              }}>
                <span>⚠️</span>
                <span>{foutTekst}</span>
              </div>
            )}

            <button type="submit" className="btn-premium">
              INLOGGEN →
            </button>
          </form>
        </div>
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
