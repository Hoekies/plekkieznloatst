// 🎉 Spelplezier (migratie 007): de vaste regels, zowel voor de server als de app. Per route aan of uit in de
// route-editor (⚙️ Instellingen → 🎮 Spel); het ⏰ gouden kwartier zet de spelleider tijdens het spel aan.

export type SpelplezierAan = { val: boolean; reeks: boolean; badges: boolean; fotobattle: boolean; schat: boolean; rad: boolean };

// Uit de route ("*": zonder migratie 007 ontbreken de kolommen en staat alles uit)
export function spelplezierAan(route: unknown): SpelplezierAan {
  const r = (route ?? {}) as Record<string, unknown>;
  return {
    val: r.val_aan === true, reeks: r.reeks_aan === true, badges: r.badges_aan === true,
    fotobattle: r.fotobattle_aan === true, schat: r.schat_aan === true, rad: r.rad_aan === true,
  };
}

// ⏰ Gouden kwartier: staat het nu aan?
export const GOUDEN_MIN = 15;
export function goudenNu(route: unknown, nu = Date.now()): boolean {
  const tot = (route as { gouden_tot?: string | null } | null)?.gouden_tot;
  return !!tot && Date.parse(tot) > nu;
}

// 🪤 Val: zo dichtbij gaat hij af, zo lang blijft hij liggen, en zo ver moet hij van een routepunt af
export const VAL_METER = 15;
export const VAL_MIN = 20;
export const VAL_AFSTAND_PUNT = 30;

// 🔥 Reeks: elke zoveel goede antwoorden op rij een bonus-item (alleen items die je zelf helpen)
export const REEKS_LENGTE = 3;
export const REEKS_ITEMS = ["ster", "verdubbeling", "radar"] as const;

// 📦 Vliegende schat: elk blok van 10 minuten een nieuwe plek, binnen 20 m pak je hem
export const SCHAT_MIN = 10;
export const SCHAT_METER = 20;
export const SCHAT_ITEMS = ["ster", "verdubbeling", "radar", "bom", "spook", "banaan"] as const;
export const schatSlot = (nu = Date.now()) => Math.floor(nu / (SCHAT_MIN * 60_000));

// 🎰 Rad van fortuin: acht even grote vakken (eerlijk rad); halverwege de route één keer draaien
export type RadVak = { id: string; label: string; kleur: string; punten?: number; item?: boolean };
export const RAD_VAKKEN: RadVak[] = [
  { id: "p100", label: "+100", kleur: "#FFD93B", punten: 100 },
  { id: "p25", label: "+25", kleur: "#22D3EE", punten: 25 },
  { id: "item", label: "🎁", kleur: "#A78BFA", item: true },
  { id: "min25", label: "−25", kleur: "#F87171", punten: -25 },
  { id: "p50", label: "+50", kleur: "#4ADE80", punten: 50 },
  { id: "niets", label: "😴", kleur: "#94A3B8" },
  { id: "p25b", label: "+25", kleur: "#22D3EE", punten: 25 },
  { id: "item2", label: "🎁", kleur: "#A78BFA", item: true },
];
export const RAD_ITEMS = ["ster", "verdubbeling", "radar", "bom", "spook"] as const;
// Halverwege: zoveel punten van de route afgerond
export const radHalverwege = (afgerond: number, totaal: number) => totaal > 1 && afgerond >= Math.ceil(totaal / 2);

// 🎖️ Badges: per spel elke soort hooguit één keer
export type BadgeSoort = "pionier" | "bliksem" | "onfire" | "taai" | "schat" | "sluw" | "duel" | "geluk" | "gouden";
export const BADGES: Record<BadgeSoort, { emoji: string; naam: string; uitleg: string }> = {
  pionier: { emoji: "🚩", naam: "Pionier", uitleg: "als eerste bij een punt" },
  bliksem: { emoji: "⚡", naam: "Bliksemsnel", uitleg: "goed antwoord binnen 15 seconden" },
  onfire: { emoji: "🔥", naam: "On fire", uitleg: "5 goede antwoorden op rij" },
  taai: { emoji: "🛡️", naam: "Taaie rakkers", uitleg: "3 keer geraakt door een item, en toch door" },
  schat: { emoji: "📦", naam: "Schatzoekers", uitleg: "de vliegende schat gepakt" },
  sluw: { emoji: "🪤", naam: "Sluw", uitleg: "een team in jullie val laten lopen" },
  duel: { emoji: "⚔️", naam: "Duelkampioen", uitleg: "een duel gewonnen" },
  geluk: { emoji: "🍀", naam: "Geluksvogels", uitleg: "de hoofdprijs van het rad" },
  gouden: { emoji: "⏰", naam: "Goudzoekers", uitleg: "goed antwoord in het gouden kwartier" },
};
export const BLIKSEM_SEC = 15;
export const ONFIRE_REEKS = 5;
export const TAAI_GERAAKT = 3;
export const isBadge = (s: string): s is BadgeSoort => s in BADGES;
