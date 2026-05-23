"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Fase = "profiel" | "melding" | "intro" | "permissie" | "gereed" | "geweigerd" | "starten";

const ICONEN = ["🦊", "🐸", "🦄", "🐧", "🦁", "🐙", "🐻", "🦋", "🐺", "🦩"];

const INTRO_DUUR = 5000;

export default function IntroScherm() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("profiel");
  const [voortgang, setVoortgang] = useState(0);
  const [fout, setFout] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [groepsnaam, setGroepsnaam] = useState("");
  const [gekozenIcono, setGekozenIcono] = useState("🦊");
  const [profielFout, setProfielFout] = useState("");
  const [profielBezig, setProfielBezig] = useState(false);

  useEffect(() => {
    if (fase !== "intro") return;
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = Math.min((Date.now() - start) / INTRO_DUUR, 1);
      setVoortgang(pct);
      if (pct >= 1) {
        clearInterval(intervalRef.current!);
        setFase("permissie");
        vraagLocatiePermissie();
      }
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fase]);

  async function vraagLocatiePermissie() {
    if (!navigator?.geolocation) {
      setFase("geweigerd");
      return;
    }
    try {
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        })
      );
      setFase("gereed");
    } catch {
      setFase("geweigerd");
    }
  }

  async function startSpel() {
    setFase("starten");
    setFout("");
    try {
      const res = await fetch("/api/speler/sessie", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setFout(data.fout ?? "Starten mislukt. Probeer opnieuw.");
        setFase("gereed");
        return;
      }
      router.push("/speler/kaart");
    } catch {
      setFout("Geen verbinding. Controleer je internet en probeer opnieuw.");
      setFase("gereed");
    }
  }

  async function slaProfielOp() {
    if (!groepsnaam.trim()) return;
    setProfielBezig(true);
    setProfielFout("");
    try {
      const res = await fetch("/api/speler/profiel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_name: groepsnaam.trim(), icon: gekozenIcono }),
      });
      if (!res.ok) {
        const data = await res.json();
        setProfielFout(data.fout ?? "Opslaan mislukt.");
        return;
      }
      setFase("melding");
    } catch {
      setProfielFout("Geen verbinding. Probeer opnieuw.");
    } finally {
      setProfielBezig(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0A1B36", overflow: "hidden",
    }}>
      {/* Kaartafbeelding */}
      <img
        src="/intro-map.svg"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.55,
          pointerEvents: "none",
        }}
      />

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(10,27,54,0.25) 0%, rgba(10,27,54,0.75) 60%, rgba(10,27,54,0.95) 100%)",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 20,
        padding: "40px 28px", textAlign: "center",
        maxWidth: 380, width: "100%",
      }}>
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Plekkie z'n Loatst" style={{ width: "100%", maxWidth: 260, objectFit: "contain" }} />

        {/* Profiel: groepsnaam en icoon kiezen */}
        {fase === "profiel" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
            <div>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", display: "block", marginBottom: 6 }}>
                Groepsnaam
              </label>
              <input
                className="form-input"
                style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}
                placeholder="Bijv. Team Turbo"
                value={groepsnaam}
                onChange={(e) => setGroepsnaam(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>
            <div>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", display: "block", marginBottom: 8 }}>
                Kies een icoon
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {ICONEN.map((icoon) => (
                  <button key={icoon} onClick={() => setGekozenIcono(icoon)}
                    style={{
                      fontSize: "1.8rem", width: 52, height: 52, borderRadius: 12,
                      border: gekozenIcono === icoon ? "2.5px solid #06B6D4" : "2px solid rgba(255,255,255,0.2)",
                      background: gekozenIcono === icoon ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.07)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    {icoon}
                  </button>
                ))}
              </div>
            </div>
            {profielFout && <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: 0 }}>{profielFout}</p>}
            <button
              className="btn btn-cyan"
              style={{ width: "100%", fontSize: "1rem", padding: "14px 0", borderRadius: 14, marginTop: 4 }}
              disabled={!groepsnaam.trim() || profielBezig}
              onClick={slaProfielOp}>
              {profielBezig ? "Opslaan…" : "Doorgaan →"}
            </button>
          </div>
        )}

        {/* Melding: GPS en geluid */}
        {fase === "melding" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
            <div style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 14, padding: "16px 18px",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>📍</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", marginBottom: 3 }}>GPS locatie</div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                    Dit spel gebruikt je GPS-locatie om te bepalen wanneer je een routepunt bereikt.
                    Locatietoegang is vereist om te spelen.
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🔔</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", marginBottom: 3 }}>Geluid</div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                    Bij het bereiken van punten en het beantwoorden van vragen worden geluiden afgespeeld.
                    Zet je volume aan voor de beste ervaring.
                  </div>
                </div>
              </div>
            </div>
            <button
              className="btn btn-cyan"
              style={{ width: "100%", fontSize: "1rem", padding: "14px 0", borderRadius: 14 }}
              onClick={() => setFase("intro")}>
              OK, begrepen →
            </button>
          </div>
        )}

        {/* Intro: aftellen */}
        {fase === "intro" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%" }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.95rem", margin: 0 }}>
              Klaar om op pad te gaan?
            </p>
            <div style={{
              width: "100%", height: 5,
              background: "rgba(255,255,255,0.18)", borderRadius: 99, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", background: "#06B6D4", borderRadius: 99,
                width: `${voortgang * 100}%`,
                transition: "width 0.08s linear",
              }} />
            </div>
          </div>
        )}

        {/* Permissie ophalen */}
        {fase === "permissie" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div className="loading-spinner" style={{ borderTopColor: "#06B6D4" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", margin: 0 }}>
              Locatietoegang controleren…
            </p>
          </div>
        )}

        {/* Gereed om te starten */}
        {fase === "gereed" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%" }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", margin: 0 }}>
              Locatie gevonden. Druk op de knop om te starten.
            </p>
            {fout && (
              <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: 0 }}>{fout}</p>
            )}
            <button
              className="btn btn-cyan"
              style={{ width: "100%", fontSize: "1.05rem", padding: "15px 0", borderRadius: 14 }}
              onClick={startSpel}>
              Start het spel 🚀
            </button>
          </div>
        )}

        {/* Bezig met starten */}
        {fase === "starten" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div className="loading-spinner" style={{ borderTopColor: "#06B6D4" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", margin: 0 }}>
              Spel wordt gestart…
            </p>
          </div>
        )}

        {/* Locatie geweigerd */}
        {fase === "geweigerd" && (
          <div style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 14, padding: "18px 20px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <p style={{ color: "#FCA5A5", fontWeight: 700, margin: 0, fontSize: "0.95rem" }}>
              Locatietoegang geweigerd
            </p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.83rem", margin: 0, lineHeight: 1.55 }}>
              Dit spel kan niet gespeeld worden zonder locatietoegang.
              Sta locatietoegang toe in je browserinstellingen en laad de pagina opnieuw.
            </p>
            <button
              className="btn btn-ghost"
              style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}
              onClick={() => window.location.reload()}>
              Pagina herladen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
