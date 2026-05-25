"use client";

interface Props {
  onSluit: () => void;
}

const ITEMS = [
  { emoji: "👻", naam: "Spook",       beschrijving: "Verbergt het huidige doel van een team voor 10 minuten. Het punt kan tijdelijk niet gehaald worden." },
  { emoji: "💣", naam: "Bom",         beschrijving: "Trekt een aantal punten af van een team naar keuze." },
  { emoji: "⭐", naam: "Ster",        beschrijving: "Geeft direct bonuspunten aan jouw eigen team." },
  { emoji: "🔴", naam: "Verdubbeling", beschrijving: "Jouw volgende behaalde vraagpunt levert dubbele punten op (eenmalig)." },
  { emoji: "🔄", naam: "Wissel",      beschrijving: "Wisselt de score van jouw team met die van een ander team." },
  { emoji: "🦹", naam: "Dief",        beschrijving: "Steelt de punten van de eerstvolgende correct beantwoorde vraag van het doelteam. De dief krijgt de punten; het doelteam krijgt 0." },
  { emoji: "📡", naam: "Radar",       beschrijving: "Onthult de exacte GPS-positie van alle andere teams gedurende 2 minuten." },
];

export default function SpeciaalItemLegende({ onSluit }: Props) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "24px",
        maxWidth: "420px",
        width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Speciale items</h2>
          <button
            onClick={onSluit}
            style={{
              border: "none", background: "#f3f4f6", borderRadius: "8px",
              padding: "6px 12px", cursor: "pointer", fontSize: "16px",
              color: "#374151", fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6B7280" }}>
          Speciale items verschijnen als icoontjes op de kaart. De eerste groep die het item bereikt pakt het op!
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {ITEMS.map((item) => (
            <div
              key={item.naam}
              style={{
                display: "flex", alignItems: "flex-start", gap: "14px",
                padding: "12px", borderRadius: "10px", background: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <span style={{ fontSize: "32px", lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px" }}>{item.naam}</p>
                <p style={{ margin: 0, fontSize: "13px", color: "#4B5563", lineHeight: "1.4" }}>{item.beschrijving}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
