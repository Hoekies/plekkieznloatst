"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Fase = "intro" | "permissie" | "gereed" | "geweigerd" | "starten";

const INTRO_DUUR = 5000;

export default function IntroScherm() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("intro");
  const [voortgang, setVoortgang] = useState(0);
  const [fout, setFout] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
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
  }, []);

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
        {/* Titel */}
        <div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            Plekkie
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#06B6D4", letterSpacing: "0.5px" }}>
            z&apos;n Loatst
          </div>
        </div>

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
