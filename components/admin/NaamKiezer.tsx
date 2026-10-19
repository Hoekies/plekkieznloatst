"use client";

import { useState } from "react";

// Naamveld met knop 💡: toont de woorden uit de vraagzin; klik er één aan en dat wordt de naam.
export default function NaamKiezer({ naam, onNaam, woorden, hoogte = 40, startOpen = false, autoFocus = false }: {
  naam: string;
  onNaam: (naam: string) => void;
  woorden: string[];
  hoogte?: number;
  startOpen?: boolean;   // de voorstellen meteen tonen (bijv. in het naamvenster bij opslaan)
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="form-input" spellCheck lang="nl" value={naam} onChange={(e) => onNaam(e.target.value)} style={{ flex: 1, minWidth: 0 }}
          autoFocus={autoFocus} onFocus={autoFocus ? (e) => e.currentTarget.select() : undefined} />
        {woorden.length > 0 && (
          <button type="button" className={`rl-knop rl-knop--icoon${open ? " rl-knop--cyan" : ""}`} onClick={() => setOpen((v) => !v)}
            title="Kies een woord uit de vraag als naam" aria-label="Naam kiezen uit de vraag" aria-expanded={open}
            style={{ height: hoogte, width: hoogte }}>💡</button>
        )}
      </div>
      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {woorden.map((w) => (
            <button key={w} type="button" onClick={() => { onNaam(w); setOpen(false); }}
              style={{
                padding: "4px 10px", borderRadius: 99, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                border: `1px solid ${w === naam ? "var(--cyan)" : "rgba(255,217,59,0.45)"}`,
                background: w === naam ? "rgba(0,217,255,0.18)" : "rgba(255,217,59,0.1)", color: w === naam ? "#A5F3FC" : "#FFE680",
              }}>
              {w}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
