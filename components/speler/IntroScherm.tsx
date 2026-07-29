"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Fase = "profiel" | "melding" | "intro" | "permissie" | "gereed" | "geweigerd" | "starten";

const ICONEN = [
  "🦊", "🐸", "🐧", "🦁", "🐙", "🐝",
  "🦄", "🦓", "🐑", "🦙",
  "🤡", "👽", "🤖", "🍕", "🦸",
];

const INTRO_DUUR = 5000;

export default function IntroScherm() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("profiel");
  const [voortgang, setVoortgang] = useState(0);
  const [fout, setFout] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [groepsnaam, setGroepsnaam] = useState("");
  const [gekozenIcono, setGekozenIcono] = useState<string | null>(null);
  const [gebruikteIconen, setGebruikteIconen] = useState<string[]>([]);
  const [profielFout, setProfielFout] = useState("");
  const [profielBezig, setProfielBezig] = useState(false);

  // Haal reeds gebruikte iconen op en kies meteen een willekeurig vrij icoon
  useEffect(() => {
    let actief = true;
    (async () => {
      try {
        const res = await fetch("/api/speler/iconen");
        const data = res.ok ? await res.json() : { gebruikt: [] };
        if (!actief) return;
        const gebruikt: string[] = data.gebruikt ?? [];
        setGebruikteIconen(gebruikt);
        const beschikbaar = ICONEN.filter((i) => !gebruikt.includes(i));
        const pool = beschikbaar.length > 0 ? beschikbaar : ICONEN;
        setGekozenIcono(pool[Math.floor(Math.random() * pool.length)]);
      } catch {
        if (actief) setGekozenIcono(ICONEN[Math.floor(Math.random() * ICONEN.length)]);
      }
    })();
    return () => { actief = false; };
  }, []);

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
      // /speler bepaalt zelf, op basis van de modus van de route, of dit naar
      // /speler/kaart of /speler/mist moet doorsturen.
      router.push("/speler");
    } catch {
      setFout("Geen verbinding. Controleer je internet en probeer opnieuw.");
      setFase("gereed");
    }
  }

  async function slaProfielOp() {
    if (!groepsnaam.trim() || !gekozenIcono) return;
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
        if (res.status === 409) {
          setGebruikteIconen((prev) => [...prev, gekozenIcono]);
        }
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
    <div className="pr-stage" style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflowY: "auto",
    }}>
      {/* Kaartafbeelding */}
      <img
        src="/intro-map.svg"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.82) 100%)",
        pointerEvents: "none",
      }} />

      {/* Zwevende sparkles + orbs */}
      <div className="pr-sparkle" style={{ width: 6, height: 6, top: "10%", left: "14%" }} />
      <div className="pr-sparkle" style={{ width: 4, height: 4, top: "20%", left: "80%", animationDelay: "1.2s" }} />
      <div className="pr-sparkle" style={{ width: 8, height: 8, top: "65%", left: "8%", animationDelay: "2s" }} />
      <span className="pr-orb" style={{ top: "8%", right: "10%", animationDelay: "0.5s" }}>⭐</span>
      <span className="pr-orb" style={{ top: "72%", left: "6%", animationDelay: "1.4s" }}>👻</span>

      {/* Content */}
      <div style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 0,
        padding: "16px 28px",
        textAlign: "center",
        maxWidth: 380, width: "100%",
      }}>
        {/* Logo */}
        <div className="pr-logo-glow" style={{ width: 200, height: 200 }} />
        <div className="pr-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PointRush" style={{
            width: "clamp(110px, 36vw, 170px)", objectFit: "contain", display: "block",
            filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 24px rgba(255,217,59,0.2))",
          }} />
        </div>

        {/* Profiel: groepsnaam en icoon kiezen */}
        {fase === "profiel" && (
          <div className="pr-panel">
            <div className="pr-panel-inner" style={{ paddingTop: 24 }}>
              <label className="pr-field-label2">Groepsnaam</label>
              <input
                className="pr-field-input2"
                placeholder="Bijv. Team Turbo"
                value={groepsnaam}
                onChange={(e) => setGroepsnaam(e.target.value)}
                maxLength={30}
              />

              <label className="pr-field-label2" style={{ marginTop: 4 }}>Kies een icoon</label>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
                {ICONEN.map((icoon) => {
                  const inGebruik = gebruikteIconen.includes(icoon) && icoon !== gekozenIcono;
                  const geselecteerd = gekozenIcono === icoon;
                  return (
                    <button
                      key={icoon}
                      disabled={inGebruik}
                      onClick={() => setGekozenIcono(icoon)}
                      title={inGebruik ? "Al gekozen door een ander team" : undefined}
                      className={`pr-icon-chip${geselecteerd ? " pr-icon-chip--selected" : ""}${inGebruik ? " pr-icon-chip--disabled" : ""}`}
                    >
                      {icoon}
                    </button>
                  );
                })}
              </div>

              {profielFout && <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: "0 0 14px" }}>{profielFout}</p>}
              <button
                className="btn-premium"
                disabled={!groepsnaam.trim() || !gekozenIcono || profielBezig}
                onClick={slaProfielOp}>
                {profielBezig ? "Opslaan…" : "DOORGAAN →"}
              </button>
            </div>
          </div>
        )}

        {/* Melding: GPS en geluid */}
        {fase === "melding" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
            <div className="pr-panel">
              <div className="pr-panel-inner" style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>📍</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff", fontSize: "0.95rem", marginBottom: 3 }}>GPS locatie</div>
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
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff", fontSize: "0.95rem", marginBottom: 3 }}>Geluid</div>
                    <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                      Bij het bereiken van punten en het beantwoorden van vragen worden geluiden afgespeeld.
                      Zet je volume aan voor de beste ervaring.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button className="btn-premium" onClick={() => setFase("intro")}>
              OK, BEGREPEN →
            </button>
          </div>
        )}

        {/* Intro: aftellen */}
        {fase === "intro" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", marginTop: 24 }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.95rem", margin: 0 }}>
              Klaar om te kapen? 🗺️
            </p>
            <div style={{
              width: "100%", height: 8,
              background: "rgba(255,255,255,0.18)", borderRadius: 99, overflow: "hidden",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                height: "100%", background: "linear-gradient(90deg, var(--pr-gold), var(--pr-orange))", borderRadius: 99,
                width: `${voortgang * 100}%`,
                transition: "width 0.08s linear",
              }} />
            </div>
          </div>
        )}

        {/* Permissie ophalen */}
        {fase === "permissie" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 24 }}>
            <div className="loading-spinner" style={{ borderTopColor: "var(--pr-gold)" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", margin: 0 }}>
              Locatietoegang controleren…
            </p>
          </div>
        )}

        {/* Gereed om te starten */}
        {fase === "gereed" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", marginTop: 24 }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", margin: 0 }}>
              Locatie gevonden. Druk op de knop om te starten.
            </p>
            {fout && (
              <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: 0 }}>{fout}</p>
            )}
            <button className="btn-premium" onClick={startSpel}>
              GA OP PAD 🚀
            </button>
          </div>
        )}

        {/* Bezig met starten */}
        {fase === "starten" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 24 }}>
            <div className="loading-spinner" style={{ borderTopColor: "var(--pr-gold)" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", margin: 0 }}>
              Spel wordt gestart…
            </p>
          </div>
        )}

        {/* Locatie geweigerd */}
        {fase === "geweigerd" && (
          <div className="pr-panel">
            <div className="pr-panel-inner" style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ color: "#FCA5A5", fontFamily: "var(--font-display)", fontWeight: 700, margin: 0, fontSize: "0.95rem" }}>
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
          </div>
        )}
      </div>
    </div>
  );
}
