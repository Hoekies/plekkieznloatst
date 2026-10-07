"use client";

import { useState } from "react";
import type { SpeciaalItem } from "@/types/database";

// Waarden uit de route-instellingen, zodat de uitleg de echte aantallen en tijden noemt
export type RouteWaarden = { ster: number; bom: number; spookSec: number; plekzooiSec: number };

function duur(seconden: number): string {
  if (seconden < 60) return `${seconden} seconden`;
  const min = Math.round((seconden / 60) * 2) / 2; // op halve minuten
  if (min === 1) return "1 minuut";
  return `${String(min).replace(".", ",")} minuten`;
}

interface ItemInfo {
  emoji: string;
  naam: string;
  beschrijving: (w: RouteWaarden) => string;
}

// Eén plek voor alle itemteksten, geschreven vanuit de speler.
// Volgorde = volgorde in de uitleg; plek zooi staat bewust onderaan.
export const ITEM_INFO: Record<string, ItemInfo> = {
  ster:         { emoji: "⭐", naam: "Ster",         beschrijving: (w) => `Je krijgt meteen ${w.ster} punten extra cadeau!` },
  verdubbeling: { emoji: "🔴", naam: "Verdubbeling", beschrijving: () => "Je volgende vraag waarmee je punten verdient, telt dubbel." },
  radar:        { emoji: "📡", naam: "Radar",        beschrijving: () => "Je ziet 2 minuten lang precies waar alle tegenstanders lopen." },
  bom:          { emoji: "💣", naam: "Bom",          beschrijving: (w) => `Gooi hem naar een tegenstander: die verliest ${w.bom} punten.` },
  spook:        { emoji: "👻", naam: "Spook",        beschrijving: (w) => `Stuur een spook naar een tegenstander: hun volgende punt verdwijnt ${duur(w.spookSec)} van de kaart en is zolang niet te halen.` },
  dief:         { emoji: "🦹", naam: "Dief",         beschrijving: () => "Zet een dief op een tegenstander: de punten van hun volgende goede antwoord gaan naar jullie." },
  banaan:       { emoji: "🍌", naam: "Banaan",       beschrijving: () => "Gooi hem naar een tegenstander: hun volgende punt ruilt van plek met het punt daarna. Ze moeten eerst naar dat punt, dan terug, en dan verder." },
  wissel:       { emoji: "🔄", naam: "Wissel",       beschrijving: () => "Ruil jullie score met die van een tegenstander naar keuze. Weet jij hoeveel punten zij hebben? 😳" },
  vraagteken:   { emoji: "❓", naam: "Vraagteken",   beschrijving: (w) => `Een gok! Je krijgt ${w.ster * 2} punten (40%) of zelfs ${w.ster * 5} punten als jackpot (10%). Je kunt ook ${w.ster} punten verliezen (20%) of 200 punten (10%). Of elke tegenstander krijgt er willekeurig ${w.ster} punten bij of af (20%).` },
  plekzooi:     { emoji: "⛔", naam: "Plek zooi",    beschrijving: (w) => `Een onzichtbare val op de kaart. Loop je erover, dan sta je ${duur(w.plekzooiSec)} stil: je kaart verdwijnt en er loopt een afteltimer. Elke val raakt jullie maar één keer.` },
};

// Korte speluitleg bovenaan het info-venster, per speltype
export const SPELUITLEG: Record<"sequentieel" | "verspreid", string[]> = {
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

// Afsluiting van het welkomstscherm op het startpunt
export const START_AFSLUITING = {
  afsluiting: "Veel succes! En onthoud: wie het laatst lacht, heeft waarschijnlijk net een banaan gegooid. 🍌",
  ondertekening: "— René",
};

interface Props {
  onSluit: () => void;
  speciaalItems?: SpeciaalItem[];
  modus: "sequentieel" | "verspreid";
  waarden: RouteWaarden;
}

export default function SpeciaalItemLegende({ onSluit, speciaalItems, modus, waarden }: Props) {
  // Alles standaard ingeklapt; tik op een regel om hem uit te vouwen (één tegelijk)
  const [open, setOpen] = useState<string | null>(null);
  const wissel = (sleutel: string) => setOpen((o) => (o === sleutel ? null : sleutel));

  // Alleen itemtypen die in deze route voorkomen (zonder lijst: alles), in de vaste volgorde
  const inRoute = new Set<string>((speciaalItems ?? []).map((i) => i.type));
  const items = Object.entries(ITEM_INFO)
    .filter(([type]) => !speciaalItems?.length || inRoute.has(type))
    .map(([type, info]) => ({ ...info, type }));

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
              {item.beschrijving(waarden)}
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
        // Tik op de uitleg zelf klapt de regel ook weer in
        <div onClick={onTik} style={{ padding: "0 14px 12px 60px", fontSize: "0.85rem", color: "#b8cce0", lineHeight: 1.5, cursor: "pointer" }}>
          {children}
        </div>
      )}
    </div>
  );
}
