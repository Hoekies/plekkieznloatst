"use client";

import type { SpeciaalItem } from "@/types/database";

interface ItemInfo {
  emoji: string;
  naam: string;
  beschrijving: (punten?: number) => string;
}

const ITEM_INFO: Record<string, ItemInfo> = {
  spook:        { emoji: "👻", naam: "Spook",        beschrijving: () => "Verberg het te halen GPS-punt van een team 10 minuten. Het punt kan tijdelijk niet gehaald worden." },
  bom:          { emoji: "💣", naam: "Bom",          beschrijving: (p) => `Trek ${p !== undefined ? p : "een aantal"} punten af van een team naar keuze.` },
  ster:         { emoji: "⭐", naam: "Ster",         beschrijving: (p) => `Geeft ${p !== undefined ? p : "bonus"}punten aan jouw eigen team.` },
  verdubbeling: { emoji: "🔴", naam: "Verdubbeling", beschrijving: () => "Jouw volgende behaalde vraagpunt levert dubbele punten op (eenmalig)." },
  wissel:       { emoji: "🔄", naam: "Wissel",       beschrijving: () => "Wissel de score van jouw team met die van een ander team. Alleen de vraag is: hoeveel punten heeft dat andere team? 😳" },
  dief:         { emoji: "🦹", naam: "Dief",         beschrijving: () => "Steel de punten van de eerstvolgende correct beantwoorde vraag van een ander team. De dief krijgt de punten; het andere team krijgt 0." },
  radar:        { emoji: "📡", naam: "Radar",        beschrijving: () => "Onthult de exacte GPS-positie van alle andere teams gedurende 2 minuten. De posities worden elke 15 seconden ververst." },
  banaan:       { emoji: "🍌", naam: "Banaan",       beschrijving: () => "Verwissel het eerstvolgende GPS-punt van een doelteam met een ander nog te bezoeken GPS-punt van dat team." },
};

interface Props {
  onSluit: () => void;
  speciaalItems?: SpeciaalItem[];
}

export default function SpeciaalItemLegende({ onSluit, speciaalItems }: Props) {
  // Bepaal welke types zichtbaar zijn + hun puntenwaarde
  const zichtbaarMap = new Map<string, number | undefined>();
  if (speciaalItems && speciaalItems.length > 0) {
    for (const item of speciaalItems) {
      if (!zichtbaarMap.has(item.type)) {
        zichtbaarMap.set(item.type, Math.abs(item.points_effect) || undefined);
      }
    }
  } else {
    // Geen filter: toon alles zonder puntwaarde
    Object.keys(ITEM_INFO).forEach((k) => zichtbaarMap.set(k, undefined));
  }

  const items = [...zichtbaarMap.entries()]
    .map(([type, punten]) => ({ ...ITEM_INFO[type], type, punten }))
    .filter((i) => i.emoji);

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
          {items.map((item) => (
            <div
              key={item.type}
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
                <p style={{ margin: 0, fontSize: "12px", color: "#6b84a8", lineHeight: "1.5" }}>
                  {item.beschrijving(item.punten)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
