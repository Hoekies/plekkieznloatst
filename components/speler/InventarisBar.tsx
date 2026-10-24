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
  banaan:       { kleur: "#CA8A04", emoji: "🍌", label: "Banaan" },
  vraagteken:   { kleur: "#7C3AED", emoji: "❓", label: "Vraagteken" },
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

  // Zonder eigen balk: de knoppen zweven onderin over de kaart, zodat de kaart de hele hoogte houdt.
  // Tussen de knoppen door blijft de kaart te verschuiven (pointerEvents).
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 800,
      pointerEvents: "none",
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
            className="pr-hud-slot2"
            style={{ pointerEvents: "auto", background: `linear-gradient(180deg, ${stijl.kleur}ee, ${stijl.kleur}88 48%, ${stijl.kleur}cc 50%, ${stijl.kleur} 100%)` }}
          >
            {stijl.emoji}
            {count > 1 && (
              <span className="pr-hud-count">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
