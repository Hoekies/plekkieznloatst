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

  useEffect(() => {
    const audio = new Audio("/pointrush-pulse.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    const poging = audio.play();
    if (poging !== undefined) {
      poging.catch(() => {
        const speel = () => { audio.play().catch(() => {}); };
        document.addEventListener("click", speel, { once: true });
      });
    }
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--game-gradient)",
      padding: "24px",
    }}>
      {/* Glass card */}
      <div className="glass-card" style={{
        padding: "40px 36px",
        width: "100%",
        maxWidth: "400px",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="PointRush"
          style={{ width: "67%", display: "block", margin: "0 auto 20px" }}
        />

        <form action="/api/auth/inloggen" method="post" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="naam" style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
              Naam
            </label>
            <input
              id="naam"
              name="naam"
              className="glass-input"
              type="text"
              placeholder="bijv. groep1"
              required
              autoComplete="username"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="wachtwoord" style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
              Wachtwoord
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="wachtwoord"
                name="wachtwoord"
                className="glass-input"
                type={toonWachtwoord ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: "44px" }}
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
          </div>

          {foutTekst && (
            <div style={{
              background: "rgba(239, 68, 68, 0.18)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: "0.85rem",
              color: "#FCA5A5",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}>
              <span>⚠️</span>
              <span>{foutTekst}</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <button type="submit" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", marginTop: "6px" }}>
            <img src="/help/inloggen.png" alt="Inloggen" style={{ width: "50%", borderRadius: 8, display: "block", margin: "0 auto" }} />
          </button>
        </form>
      </div>

      <footer style={{ marginTop: 24, color: "rgba(255,255,255,0.25)", fontSize: "0.72rem" }}>
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
