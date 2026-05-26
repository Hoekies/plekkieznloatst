"use client";

interface Props {
  onSluit: () => void;
}

const ITEMS = [
  { emoji: "👻", naam: "Spook",        beschrijving: "Verbergt het huidige doel van een team voor 10 minuten. Het punt kan tijdelijk niet gehaald worden." },
  { emoji: "💣", naam: "Bom",          beschrijving: "Trekt een aantal punten af van een team naar keuze." },
  { emoji: "⭐", naam: "Ster",         beschrijving: "Geeft direct bonuspunten aan jouw eigen team." },
  { emoji: "🔴", naam: "Verdubbeling", beschrijving: "Jouw volgende behaalde vraagpunt levert dubbele punten op (eenmalig)." },
  { emoji: "🔄", naam: "Wissel",       beschrijving: "Wisselt de score van jouw team met die van een ander team." },
  { emoji: "🦹", naam: "Dief",         beschrijving: "Steelt de punten van de eerstvolgende correct beantwoorde vraag van het doelteam. De dief krijgt de punten; het doelteam krijgt 0." },
  { emoji: "📡", naam: "Radar",        beschrijving: "Onthult de exacte GPS-positie van alle andere teams gedurende 2 minuten." },
  { emoji: "🍌", naam: "Banaan",       beschrijving: "Verwisselt het eerstvolgende punt van een doelteam met een ander nog te bezoeken punt." },
];

export default function SpeciaalItemLegende({ onSluit }: Props) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "#0f1c2e",
        color: "#e8f0ff",
        borderRadius: "18px",
        padding: "24px",
        maxWidth: "420px",
        width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#00d9ff" }}>Speciale items</h2>
          <button
            onClick={onSluit}
            style={{
              border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)",
              borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
              fontSize: "16px", color: "#e8f0ff", fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6b84a8" }}>
          Speciale items verschijnen als icoontjes op de kaart. De eerste groep die het item bereikt pakt het op!
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ITEMS.map((item) => (
            <div
              key={item.naam}
              style={{
                display: "flex", alignItems: "flex-start", gap: "14px",
                padding: "12px", borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: "30px", lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
              <div>
                <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: "14px", color: "#e8f0ff" }}>{item.naam}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#6b84a8", lineHeight: "1.5" }}>{item.beschrijving}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
