"use client";

import { useState } from "react";
import type { SpeciaalItem } from "@/types/database";

interface ItemInfo {
  emoji: string;
  naam: string;
  beschrijving: (punten?: number) => string;
}

export const ITEM_INFO: Record<string, ItemInfo> = {
  spook:        { emoji: "👻", naam: "Spook",        beschrijving: () => "Laat het volgende punt van een team een tijdje verdwijnen (standaard 10 minuten). Zij zien een groot spook met een aftelklok en kunnen het punt zolang niet halen." },
  bom:          { emoji: "💣", naam: "Bom",          beschrijving: (p) => `Trek ${p !== undefined ? p : "een aantal"} punten af van een team naar keuze.` },
  ster:         { emoji: "⭐", naam: "Ster",         beschrijving: (p) => `Geeft ${p !== undefined ? `${p} ` : ""}bonuspunten aan jouw eigen team.` },
  verdubbeling: { emoji: "🔴", naam: "Verdubbeling", beschrijving: () => "Jouw volgende behaalde vraagpunt levert dubbele punten op (eenmalig)." },
  wissel:       { emoji: "🔄", naam: "Wissel",       beschrijving: () => "Wissel de score van jouw team met die van een ander team. Alleen de vraag is: hoeveel punten heeft dat andere team? 😳" },
  dief:         { emoji: "🦹", naam: "Dief",         beschrijving: () => "Steel de punten van de eerstvolgende correct beantwoorde vraag van een ander team. De dief krijgt de punten; het andere team krijgt 0." },
  radar:        { emoji: "📡", naam: "Radar",        beschrijving: () => "Onthult de exacte GPS-positie van alle andere teams gedurende 2 minuten. De posities worden elke 15 seconden ververst." },
  banaan:       { emoji: "🍌", naam: "Banaan",       beschrijving: () => "Verwissel het eerstvolgende GPS-punt van een doelteam met een ander nog te bezoeken GPS-punt van dat team." },
  plekzooi:     { emoji: "⛔", naam: "Plek zooi",     beschrijving: () => "Onzichtbare val — loop je erover, dan zit je een paar minuten vast: de kaart verdwijnt en er verschijnt een afteltimer. De val blijft liggen voor de andere teams, maar raakt ieder team maar één keer." },
  vraagteken:   { emoji: "❓", naam: "Vraagteken",    beschrijving: () => "Willekeurig effect: 40% dubbele ster voor jezelf · 20% ieder ander team ster of bom (willekeurig per team) · 10% jackpot 5× ster · 10% −200 punten · 20% bom op jezelf." },
};

// Korte speluitleg bovenaan het info-venster, per speltype
const SPELUITLEG: Record<"sequentieel" | "verspreid", string[]> = {
  sequentieel: [
    "Loop de punten op volgorde af. Je ziet steeds alleen het volgende punt; de paarse stippellijn wijst de weg.",
    "Ben je er? Tik linksonder op 📍 en beantwoord de vraag. Het team met de meeste punten wint.",
    "Je start met één banaan in je balk onderin. Pas op voor onzichtbare plek zooi.",
  ],
  verspreid: [
    "Elk team loopt hetzelfde rondje, maar begint ergens anders. Je ziet steeds alleen het volgende punt.",
    "Ben je er? Tik linksonder op 📍 en beantwoord de vraag. Het team met de meeste punten wint.",
    "Loop over items op de kaart om ze op te pakken; ze komen in je balk onderin.",
  ],
};

interface Props {
  onSluit: () => void;
  speciaalItems?: SpeciaalItem[];
  modus: "sequentieel" | "verspreid";
}

export default function SpeciaalItemLegende({ onSluit, speciaalItems, modus }: Props) {
  // Alles standaard ingeklapt; tik op een regel om hem uit te vouwen (één tegelijk)
  const [open, setOpen] = useState<string | null>(null);
  const wissel = (sleutel: string) => setOpen((o) => (o === sleutel ? null : sleutel));

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
    <div onClick={onSluit} style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#0f1c2e",
        color: "#e8f0ff",
        borderRadius: "18px",
        padding: "20px 16px",
        maxWidth: "420px",
        width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,217,255,0.12)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, color: "#00d9ff" }}>
            <span style={{ fontSize: "1.8rem", lineHeight: 1 }}>💡</span> Zo werkt het
          </h2>
          <button
            onClick={onSluit}
            aria-label="Sluiten"
            style={{
              border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)",
              borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
              fontSize: "16px", color: "#e8f0ff", fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Korte speluitleg */}
          <Regel
            icoon={<span style={{ fontSize: "1.7rem", lineHeight: 1 }}>🎯</span>}
            titel="Het spel"
            open={open === "spel"}
            onTik={() => wissel("spel")}
          >
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {SPELUITLEG[modus].map((zin) => <li key={zin}>{zin}</li>)}
            </ul>
          </Regel>

          {items.length > 0 && (
            <div style={{ margin: "10px 2px 0", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b84a8" }}>
              Items
            </div>
          )}
          {items.map((item) => (
            <Regel
              key={item.type}
              // eslint-disable-next-line @next/next/no-img-element
              icoon={<img src={`/items/${item.type}.png`} alt="" style={{ width: 34, height: 34 }} />}
              titel={item.naam}
              open={open === item.type}
              onTik={() => wissel(item.type)}
            >
              {item.beschrijving(item.punten)}
            </Regel>
          ))}
        </div>
      </div>
    </div>
  );
}

// Eén inklapbare regel: icoon + titel, uitleg verschijnt na aantikken
function Regel({ icoon, titel, open, onTik, children }: {
  icoon: React.ReactNode; titel: string; open: boolean; onTik: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: 12,
      background: open ? "rgba(0,217,255,0.08)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${open ? "rgba(0,217,255,0.35)" : "rgba(255,255,255,0.08)"}`,
    }}>
      <button
        onClick={onTik}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "8px 12px", background: "none", border: "none", cursor: "pointer",
          color: "#e8f0ff", textAlign: "left",
        }}>
        <span style={{ width: 36, display: "flex", justifyContent: "center", flexShrink: 0 }}>{icoon}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "0.95rem" }}>{titel}</span>
        <span aria-hidden style={{
          color: "#6b84a8", fontSize: "0.8rem",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s",
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 12px 60px", fontSize: "0.85rem", color: "#b8cce0", lineHeight: 1.5 }}>
          {children}
        </div>
      )}
    </div>
  );
}
