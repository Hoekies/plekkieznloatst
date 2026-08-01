import { MIST_CEL_OPPERVLAK_M2 } from "@/lib/geo";

// Eén bron voor alle badge-definities, gebruikt door zowel de API-routes als de UI.
// Emoji zijn bewust breed ondersteund gekozen: 🌫️ valt op Windows terug op een leeg blokje.

export interface PlaatsTier {
  code: string;
  ha: number;
  emoji: string;
  titel: string;
}

// Drempels in hectares, gekalibreerd op ~15-20 ha per uur wandelen.
export const PLAATS_TIERS: PlaatsTier[] = [
  { code: "plaats_1ha", ha: 1, emoji: "👣", titel: "Bezoeker" },
  { code: "plaats_5ha", ha: 5, emoji: "🗺️", titel: "Verkenner" },
  { code: "plaats_15ha", ha: 15, emoji: "🧭", titel: "Ontdekker" },
  { code: "plaats_40ha", ha: 40, emoji: "👑", titel: "Meester" },
];

export interface AlgemeneBadge {
  code: string;
  emoji: string;
  titel: string;
  uitleg: string;
}

export const ALGEMENE_BADGES: AlgemeneBadge[] = [
  { code: "eerste_mist", emoji: "☁️", titel: "Eerste stappen", uitleg: "Je eerste mist weggespeeld" },
  { code: "grensganger", emoji: "🏘️", titel: "Grensganger", uitleg: "Mist weggespeeld in 2 plaatsen" },
  { code: "sterrenjager", emoji: "⭐", titel: "Sterrenjager", uitleg: "5 sterren verdiend" },
  { code: "volhouder", emoji: "🚶", titel: "Volhouder", uitleg: "Een uur onderweg" },
];

export const STERRENJAGER_DREMPEL = 5;
export const VOLHOUDER_MINUTEN = 60;

export function cellenNaarHectare(cellen: number): number {
  return (cellen * MIST_CEL_OPPERVLAK_M2) / 10000;
}

export function tierOpCode(code: string): PlaatsTier | undefined {
  return PLAATS_TIERS.find((t) => t.code === code);
}

export function algemeneBadgeOpCode(code: string): AlgemeneBadge | undefined {
  return ALGEMENE_BADGES.find((b) => b.code === code);
}

// Volledige weergavetekst voor een behaalde badge; plaats-badges krijgen "van <plaats>".
// `plaats` is een lege string bij algemene badges (zie 022_mist_badges.sql).
export function badgeWeergave(code: string, plaats: string): { emoji: string; titel: string; uitleg: string } | null {
  const tier = tierOpCode(code);
  if (tier) {
    return {
      emoji: tier.emoji,
      titel: plaats ? `${tier.titel} van ${plaats}` : tier.titel,
      uitleg: `${tier.ha} hectare vrijgespeeld`,
    };
  }
  const algemeen = algemeneBadgeOpCode(code);
  if (algemeen) return { emoji: algemeen.emoji, titel: algemeen.titel, uitleg: algemeen.uitleg };
  return null;
}
