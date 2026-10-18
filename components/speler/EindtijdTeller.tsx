"use client";

import { useEffect, useRef, useState } from "react";
import { speelDong } from "@/lib/sounds";

const WAARSCHUWING_S = 10 * 60;

// Eindtijd van het spel in de statistiekenbalk: telt af, wordt rood in de laatste 10 minuten
// en geeft dan één keer een groot venster. Op 0 roept hij onVoorbij aan (de app gaat naar de finish).
export default function EindtijdTeller({ eindtijd, sessieId, onVoorbij }: { eindtijd: string; sessieId: string; onVoorbij: () => void }) {
  const [nu, setNu] = useState(() => Date.now());
  const [waarschuwing, setWaarschuwing] = useState(false);
  const voorbijRef = useRef(false);

  useEffect(() => { const t = setInterval(() => setNu(Date.now()), 1000); return () => clearInterval(t); }, []);

  const rest = Math.max(0, Math.ceil((new Date(eindtijd).getTime() - nu) / 1000));
  const tijd = new Date(eindtijd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    if (rest === 0) {
      if (!voorbijRef.current) { voorbijRef.current = true; onVoorbij(); }
      return;
    }
    voorbijRef.current = false;
    if (rest > WAARSCHUWING_S) return;
    // Eén keer per eindtijd waarschuwen, ook na herladen niet opnieuw
    const sleutel = `pointrush_eindtijd_${sessieId}_${eindtijd}`;
    try {
      if (localStorage.getItem(sleutel)) return;
      localStorage.setItem(sleutel, "1");
    } catch { /* geen opslag: dan gewoon tonen */ }
    setWaarschuwing(true);
    speelDong();
    navigator.vibrate?.([300, 120, 300]);
  }, [rest, eindtijd, sessieId, onVoorbij]);

  const laatste = rest <= WAARSCHUWING_S;
  const tekst = rest >= 3600
    ? `${Math.floor(rest / 3600)}:${String(Math.floor((rest % 3600) / 60)).padStart(2, "0")}`
    : `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`;

  return (
    <>
      <div className={`pr-hud-gem pr-hud-gem--groot ${laatste ? "pr-hud-gem--rood" : "pr-hud-gem--purple"}`} title={`Het spel stopt om ${tijd}`}>
        <span className="pr-hud-icoon">⏰</span>
        <span className="pr-hud-getal" style={{ fontSize: "1.05rem" }}>{tekst}</span>
      </div>
      {waarschuwing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1700, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="pr-panel" style={{ maxWidth: 360, width: "100%", animation: "pr-effect-pop 0.4s ease" }}>
            <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", paddingTop: 22 }}>
              <div style={{ fontSize: "3.2rem", lineHeight: 1 }}>⏰</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: "var(--pr-gold)" }}>
                Nog {Math.max(1, Math.ceil(rest / 60))} minuten!
              </div>
              <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.45, color: "#fff", fontWeight: 600 }}>
                Om {tijd} stopt het spel. Jullie punten van dat moment tellen.
              </p>
              <button className="btn-premium--compact" style={{ marginTop: 4 }} onClick={() => setWaarschuwing(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
