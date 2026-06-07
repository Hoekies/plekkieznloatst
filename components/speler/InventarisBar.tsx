"use client";

import type { SpeciaalItem } from "@/types/database";

interface Props {
  inventaris: SpeciaalItem[];
  onGebruik: (item: SpeciaalItem) => void;
}

const ITEM_STIJL: Record<string, { kleur: string; emoji: string; label: string }> = {
  spook:        { kleur: "#7C3AED", emoji: "👻", label: "Spook" },
  bom:          { kleur: "#DC2626", emoji: "💣", label: "Bom" },
  ster:         { kleur: "#D97706", emoji: "⭐", label: "Ster" },
  verdubbeling: { kleur: "#B91C1C", emoji: "🔴", label: "Verdubbeling" },
  wissel:       { kleur: "#1D4ED8", emoji: "🔄", label: "Wissel" },
  dief:         { kleur: "#7C2D12", emoji: "🦹", label: "Dief" },
  radar:        { kleur: "#0369A1", emoji: "📡", label: "Radar" },
};

export default function InventarisBar({ inventaris, onGebruik }: Props) {
  if (inventaris.length === 0) return null;

  // Groepeer per type; bewaar per type de items in volgorde (eerste = meest recent gepakt)
  const groepen = new Map<string, SpeciaalItem[]>();
  for (const item of inventaris) {
    if (!groepen.has(item.type)) groepen.set(item.type, []);
    groepen.get(item.type)!.push(item);
  }

  const slots = [...groepen.entries()];

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 800,
      background: "rgba(10, 20, 40, 0.82)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.12)",
      padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    }}>
      {slots.map(([type, items]) => {
        const stijl = ITEM_STIJL[type] ?? { kleur: "#555", emoji: "?", label: type };
        const count = items.length;

        return (
          <button
            key={type}
            onClick={() => onGebruik(items[0])}
            title={`${stijl.label} gebruiken`}
            style={{
              position: "relative",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: stijl.kleur,
              border: "2.5px solid rgba(255,255,255,0.85)",
              boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              cursor: "pointer",
              flexShrink: 0,
              padding: 0,
              transition: "transform 0.12s, box-shadow 0.12s",
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)"; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)"; }}
            onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {stijl.emoji}
            {count > 1 && (
              <span style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                color: stijl.kleur,
                fontSize: 11,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${stijl.kleur}`,
                lineHeight: 1,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
