"use client";

import { useEffect, useState } from "react";
import { geluidAan, zetGeluid } from "@/lib/sounds";
import UitklapPijl from "@/components/shared/UitklapPijl";

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

// Eén plek voor alle itemteksten, geschreven vanuit de speler: kort en in gewone woorden.
// Volgorde = volgorde in de uitleg; plek zooi staat bewust onderaan.
export const ITEM_INFO: Record<string, ItemInfo> = {
  ster:         { emoji: "⭐", naam: "Ster",         beschrijving: (w) => `Meteen ${w.ster} punten erbij!` },
  verdubbeling: { emoji: "🔴", naam: "Verdubbeling", beschrijving: () => "Je volgende goede antwoord telt dubbel." },
  radar:        { emoji: "📡", naam: "Radar",        beschrijving: () => "2 minuten lang zie je waar de andere teams lopen." },
  bom:          { emoji: "💣", naam: "Bom",          beschrijving: (w) => `Gooi hem naar een ander team: zij verliezen ${w.bom} punten.` },
  spook:        { emoji: "👻", naam: "Spook",        beschrijving: (w) => `Stuur hem naar een ander team: hun volgende punt is ${duur(w.spookSec)} weg van de kaart.` },
  dief:         { emoji: "🦹", naam: "Dief",         beschrijving: () => "Stuur hem naar een ander team: je pikt de punten van een goed antwoord van hen in." },
  banaan:       { emoji: "🍌", naam: "Banaan",       beschrijving: () => "Gooi hem naar een ander team: hun volgende twee punten wisselen van plek. Zij lopen dus om." },
  wissel:       { emoji: "🔄", naam: "Wissel",       beschrijving: () => "Jullie ruilen je score met een ander team. Weet jij wie meer punten heeft? 😳" },
  vraagteken:   { emoji: "❓", naam: "Vraagteken",   beschrijving: (w) => `Werkt meteen als je hem pakt. Een gok: je kunt ${w.ster * 2} of zelfs ${w.ster * 5} punten winnen, maar ook punten kwijtraken.` },
  plekzooi:     { emoji: "⛔", naam: "Plek zooi",    beschrijving: (w) => `Een onzichtbare val. Loop je erin, dan sta je ${duur(w.plekzooiSec)} stil.` },
};

// Naam en emoji van een itemtype (onbekend: het type zelf)
export const itemNaam = (type: string) => ITEM_INFO[type]?.naam ?? type;
export const itemEmoji = (type: string) => ITEM_INFO[type]?.emoji ?? "❓";

// Korte speluitleg bovenaan het info-venster, per speltype
export const SPELUITLEG: Record<"sequentieel" | "verspreid", string[]> = {
  // Kort en in gewone woorden: lopen → vraag → volgend punt, en wat je met items doet
  sequentieel: [
    "📍 Loop naar het blauwe punt op de kaart.",
    "❓ Ben je er? Dan krijg je een vraag. Goed antwoord = punten.",
    "➡️ Daarna zie je het volgende punt. Het team met de meeste punten wint.",
    "🎒 Items staan onderin: tik erop om ze te gebruiken. Pas op voor onzichtbare vallen!",
  ],
  verspreid: [
    "📍 Loop naar het blauwe punt op de kaart.",
    "❓ Ben je er? Dan krijg je een vraag. Goed antwoord = punten.",
    "➡️ Daarna zie je het volgende punt. Het team met de meeste punten wint.",
    "🎁 Loop over een item op de kaart om het te pakken. Het komt onderin: tik erop om het te gebruiken.",
  ],
};

// Afsluiting van het welkomstscherm op het startpunt
export const START_AFSLUITING = {
  afsluiting: "Veel succes! En onthoud: wie het laatst lacht, heeft waarschijnlijk net een banaan gegooid. 🍌",
  ondertekening: "— René",
};

interface Props {
  onSluit: () => void;
  // Itemtypen die in deze route voorkomen; zonder lijst: alle items
  itemTypen?: string[];
  modus: "sequentieel" | "verspreid";
  waarden: RouteWaarden;
  // Scherm aan laten (alleen als de browser het kan)
  schermAan?: { aan: boolean; kan: boolean; wissel: () => void };
  // Extra uitleg bij "Het spel" voor deze route (bijv. het puzzelwoord)
  extraUitleg?: string[];
}

export default function SpeciaalItemLegende({ onSluit, itemTypen, modus, waarden, schermAan, extraUitleg = [] }: Props) {
  // Alles standaard ingeklapt; tik op een regel om hem uit te vouwen (één tegelijk)
  const [open, setOpen] = useState<string | null>(null);
  const wissel = (sleutel: string) => setOpen((o) => (o === sleutel ? null : sleutel));
  const [geluid, setGeluid] = useState(true);
  useEffect(() => { setGeluid(geluidAan()); }, []);

  // Alleen itemtypen die in deze route voorkomen (zonder lijst: alles), in de vaste volgorde.
  // Een route zonder items toont dus ook geen kopje "Items".
  const inRoute = new Set<string>(itemTypen ?? []);
  const items = Object.entries(ITEM_INFO)
    .filter(([type]) => !itemTypen || inRoute.has(type))
    .map(([type, info]) => ({ ...info, type }));

  return (
    <div onClick={onSluit} style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      // Niet onder de statusbalk of de thuisbalk van de iPhone
      padding: "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#2a1566",
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
          {/* 🔊 Geluid aan of uit (bijv. in een kerk of museum); trillen blijft werken */}
          <button type="button" onClick={() => { const nieuw = !geluid; zetGeluid(nieuw); setGeluid(nieuw); }} role="switch" aria-checked={geluid}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              background: geluid ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${geluid ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.08)"}`, color: "#e8f0ff" }}>
            <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{geluid ? "🔊" : "🔇"}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 700 }}>Geluid</span>
              <span style={{ display: "block", fontSize: "0.76rem", color: "var(--muted)" }}>Uit in een stille omgeving; trillen blijft werken.</span>
            </span>
            <span className={`schakel-bol${geluid ? " schakel-bol--aan" : ""}`} aria-hidden />
          </button>

          {/* Scherm aan laten: telefoon valt niet in slaap, geluid en trillen werken altijd */}
          {schermAan?.kan && (
            <button type="button" onClick={schermAan.wissel} role="switch" aria-checked={schermAan.aan}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                background: schermAan.aan ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${schermAan.aan ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.08)"}`, color: "#e8f0ff" }}>
              <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>🔆</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700 }}>Scherm aan laten</span>
                <span style={{ display: "block", fontSize: "0.76rem", color: "var(--muted)" }}>Je telefoon valt niet in slaap: geluid en trillen werken altijd. Kost wat meer batterij.</span>
              </span>
              <span className={`schakel-bol${schermAan.aan ? " schakel-bol--aan" : ""}`} aria-hidden />
            </button>
          )}

          {/* Korte speluitleg */}
          <Regel
            icoon={<span style={{ fontSize: "1.7rem", lineHeight: 1 }}>🎯</span>}
            titel="Het spel"
            open={open === "spel"}
            onTik={() => wissel("spel")}
          >
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {[...SPELUITLEG[modus], ...extraUitleg].map((zin) => <li key={zin}>{zin}</li>)}
            </ul>
          </Regel>

          {/* Wat de rondjes en tekens op de kaart betekenen */}
          <Regel
            icoon={<span style={{ fontSize: "1.7rem", lineHeight: 1 }}>🗺️</span>}
            titel="Op de kaart"
            open={open === "kaart"}
            onTik={() => wissel("kaart")}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {LEGENDA.map(([teken, uitleg]) => (
                <div key={uitleg} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 28, display: "inline-flex", justifyContent: "center", flexShrink: 0 }}>{teken}</span>
                  <span>{uitleg}</span>
                </div>
              ))}
            </div>
          </Regel>

          {items.length > 0 && (
            <div style={{ margin: "10px 2px 0", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
              Items
            </div>
          )}
          {items.map((item) => (
            <Regel
              key={item.type}
              // eslint-disable-next-line @next/next/no-img-element
              icoon={<img src={`/items/${item.type}.webp`} alt="" style={{ width: 34, height: 34 }} />}
              titel={item.naam}
              open={open === item.type}
              onTik={() => wissel(item.type)}
            >
              {item.beschrijving(waarden)}
            </Regel>
          ))}

          {/* Uitloggen: hier en met een bevestiging, zodat niemand het per ongeluk tijdens het spel doet */}
          <form action="/api/auth/uitloggen" method="post" style={{ marginTop: 14, textAlign: "center" }}
            onSubmit={(e) => { if (!confirm("Uitloggen? Je spel loopt door; log daarna opnieuw in om verder te spelen.")) e.preventDefault(); }}>
            <button type="submit" style={{ background: "none", border: "1px solid rgba(248,113,113,0.5)", borderRadius: 10, padding: "8px 16px", color: "#FCA5A5", fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
              🚪 Uitloggen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Legenda van de kaart: zelfde rondjes en kleuren als op de spelerskaart
const rondje = (kleur: string, teken: string, puls = false) => (
  <span style={{ width: 24, height: 24, borderRadius: "50%", background: kleur, border: "2px solid #fff", color: "#fff", fontSize: 11, fontWeight: 800,
    display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: puls ? "0 0 0 3px rgba(30,64,175,0.45)" : "none" }}>{teken}</span>
);
const LEGENDA: [React.ReactNode, string][] = [
  [rondje("#1E40AF", "?", true), "Hier moet je heen: je krijgt een vraag"],
  [rondje("#1E40AF", "i", true), "Hier moet je heen: je leest iets"],
  [rondje("#1E40AF", "•", true), "Hier moet je heen: alleen even langslopen"],
  [rondje("#F59E0B", "!"), "Je bent er: beantwoord de vraag"],
  [rondje("#16A34A", "✓"), "Klaar: dit punt heb je gehad"],
  [rondje("#7C3AED", "?"), "Een punt dat later komt"],
  [<span key="b" style={{ width: 12, height: 12, borderRadius: "50%", background: "#7C3AED", border: "2px solid #fff", display: "inline-block" }} />, "Hier loop je langs, je hoeft niets te doen"],
  [<span key="f" style={{ fontSize: 18 }}>🏁</span>, "De finish"],
  [<span key="t" style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", border: "3px solid #F97316", display: "inline-block" }} />, "Een ander team"],
];

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
        <UitklapPijl open={open} />
        <span style={{ width: 36, display: "flex", justifyContent: "center", flexShrink: 0 }}>{icoon}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "0.95rem" }}>{titel}</span>
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
