"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

export default function LoginPagina() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);

  async function inloggen(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);

    const supabase = createClient();

    // Stap 1: inloggen bij Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    });

    if (error || !data.user) {
      setFout("Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord.");
      setLaden(false);
      return;
    }

    const rol = data.user.user_metadata?.rol;

    // Admin heeft geen device-check nodig
    if (rol === "admin") {
      router.replace("/admin");
      return;
    }

    // Stap 2: device-check voor spelers
    const deviceId = getDeviceId();
    const res = await fetch("/api/auth/device-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });

    if (!res.ok) {
      const { fout: apiFout } = await res.json();
      setFout(apiFout ?? "Er is een fout opgetreden. Probeer het opnieuw.");
      setLaden(false);
      return;
    }

    router.replace("/speler");
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

        <form onSubmit={inloggen} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group">
            <label className="form-label">E-mailadres</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.nl"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Wachtwoord</label>
            <input
              className="form-input"
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
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
            disabled={laden}
            style={{ width: "100%", padding: "13px", marginTop: "4px", fontSize: "0.95rem" }}
          >
            {laden ? "Bezig met inloggen…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
