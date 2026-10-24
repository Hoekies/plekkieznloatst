// 🧩 Puzzelwoord: elke goede vraag geeft het team een letter, op een vaste maar per team andere plek.
// Bij de finish raadt het team het woord voor bonuspunten. Het woord zelf gaat nooit naar de telefoon.

// Alleen letters en cijfers, in hoofdletters ("Plekkie z'n" → "PLEKKIEZN")
export function normaliseerPuzzel(woord: string | null | undefined): string {
  return (woord ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Volgorde waarin de letters vrijkomen: per team anders, maar altijd dezelfde (afgeleid van het sessie-id)
// opVolgorde: gewoon van links naar rechts (makkelijker te raden; per route te kiezen)
export function puzzelVolgorde(sessieId: string, lengte: number, opVolgorde = false): number[] {
  if (opVolgorde) return Array.from({ length: lengte }, (_, i) => i);
  const gewicht = (i: number) => {
    let h = 2166136261;
    for (const c of `${sessieId}:${i}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  return Array.from({ length: lengte }, (_, i) => i).sort((a, b) => gewicht(a) - gewicht(b));
}

// Na de finish heeft een team zoveel seconden om het woord af te maken (één poging)
export const RAAD_SECONDEN = 60;

// Hoeveel letters levert een goed antwoord op dit punt op? Standaard 1; de beheerder kan per vraag 0 of 2 kiezen
export function lettersVoor(verdeling: Record<string, number> | null | undefined, puntId: string): number {
  const n = verdeling?.[puntId];
  return n === 0 || n === 2 ? n : 1;
}

export type PuzzelStand = { lengte: number; letters: (string | null)[]; opgelost: boolean; bonus: number; omschrijving: string | null };

// Wat het team mag zien: de letters op de plekken die het al verdiend heeft, de rest leeg
export function puzzelStand(woord: string, sessieId: string, goed: number, opgelost: boolean, bonus: number, omschrijving: string | null = null, opVolgorde = false): PuzzelStand {
  const w = normaliseerPuzzel(woord);
  const open = new Set(opgelost ? w.split("").map((_, i) => i) : puzzelVolgorde(sessieId, w.length, opVolgorde).slice(0, goed));
  return { lengte: w.length, letters: w.split("").map((l, i) => (open.has(i) ? l : null)), opgelost, bonus, omschrijving };
}

// 🧩 Uitleg voor de speler (bij de start en achter het 🧩 boven de kaart), met de punten van deze route
export function puzzelUitleg(p: { letterPunten: number; alleBonus: number; raadBonus: number }): string {
  return `🧩 Puzzelwoord: elke goede vraag geeft een letter (+${p.letterPunten} per letter). Alle letters gevonden: +${p.alleBonus}. ` +
    `Niet alles? Bij de finish heb je ${RAAD_SECONDEN / 60} minuut om het woord af te maken: +${p.raadBonus}.`;
}
