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
  schaduw:      { kleur: "#334155", emoji: "🥷", label: "Schaduw" },
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
  // Veel soorten (tot 9): de knoppen worden kleiner zodat ze altijd allemaal op het scherm passen
  // (vroeger liepen ze links en rechts buiten beeld en waren die niet meer aan te tikken)
  const gat = slots.length > 5 ? 6 : 10;
  const maat = `min(54px, calc((100vw - 24px - ${(slots.length - 1) * gat}px) / ${slots.length}))`;

  // Smalle balk onderaan in de achtergrondkleur van de app (--bg): in Safari loopt hij naadloos over in de
  // onderbalk van de browser, die iOS in dezelfde kleur kleurt. De knoppen staan half op de balk, half
  // op de kaart, zodat de kaart zo veel mogelijk ruimte houdt.
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 800,
      height: "calc(27px + env(safe-area-inset-bottom, 0px))",
      background: "var(--bg)",
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 12,
        right: 12,
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: gat,
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
            // Dichte knop: de itemkleur als vaste ondergrond met glans erover (vroeger halfdoorzichtig, de kaart scheen erdoor)
            style={{
              width: maat, height: maat, fontSize: `calc(${maat} * 0.5)`, flexShrink: 0,
              background: `linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.1) 48%, rgba(0,0,0,0.14) 50%, rgba(0,0,0,0.04) 100%), ${stijl.kleur}`,
            }}
          >
            {stijl.emoji}
            {count > 1 && (
              <span className="pr-hud-count">{count}</span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}
