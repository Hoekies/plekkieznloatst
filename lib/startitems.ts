// Items die een beheerder als startitem kan geven (plek zooi is een val, geen item voor de balk)
export const STARTITEM_TYPES = ["banaan", "bom", "spook", "dief", "wissel", "vraagteken", "verdubbeling", "radar", "ster"] as const;
export const MAX_PER_STARTITEM = 5;

// Ingestelde startitems van een route; zonder instelling: Sequentieel één banaan, anders niets
export function startitemsVan(route: { modus: string; startitems?: Record<string, number> | null }): Record<string, number> {
  if (route.startitems && typeof route.startitems === "object") return route.startitems;
  return route.modus === "sequentieel" ? { banaan: 1 } : {};
}

// Alleen bekende types met een geheel aantal 0–5
export function schoonStartitems(invoer: unknown): Record<string, number> | null {
  if (!invoer || typeof invoer !== "object") return null;
  const uit: Record<string, number> = {};
  for (const type of STARTITEM_TYPES) {
    const n = Number((invoer as Record<string, unknown>)[type]);
    if (Number.isInteger(n) && n > 0) uit[type] = Math.min(n, MAX_PER_STARTITEM);
  }
  return uit;
}
