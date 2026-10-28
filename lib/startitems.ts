// Items die een beheerder als startitem kan geven. Niet: plek zooi (een val), vraagteken
// (wordt meteen gespeeld) en ster (punten worden meteen bijgeschreven): die komen nooit in de balk
export const STARTITEM_TYPES = ["banaan", "bom", "spook", "dief", "wissel", "verdubbeling", "radar"] as const;
export const MAX_PER_STARTITEM = 5;

// 🎒 Na hoeveel meter lopen een team de startitems krijgt; 0 = meteen bij het begin. Staat in dezelfde
// instelling als de items (routes.startitems, sleutel "_meter"), zodat er geen aparte kolom nodig is.
export const STARTITEMS_METER_KEUZES = [0, 25, 50, 100, 200] as const;
export const STARTITEMS_METER_STANDAARD = 100;
export function startitemsMeter(route: { startitems?: Record<string, number> | null }): number {
  const m = Number((route.startitems as Record<string, unknown> | null | undefined)?._meter);
  return Number.isInteger(m) && m >= 0 && m <= 1000 ? m : STARTITEMS_METER_STANDAARD;
}

// Ingestelde startitems van een route (alleen de items, zonder de meters); zonder instelling: Sequentieel één
// banaan, anders niets
export function startitemsVan(route: { modus: string; startitems?: Record<string, number> | null }): Record<string, number> {
  if (route.startitems && typeof route.startitems === "object") {
    const { _meter: _, ...items } = schoonStartitems(route.startitems) ?? {};
    void _;
    return items;
  }
  return route.modus === "sequentieel" ? { banaan: 1 } : {};
}

// Alleen bekende types met een geheel aantal 0–5, plus de meters (_meter, 0–1000) als die is ingesteld
export function schoonStartitems(invoer: unknown): Record<string, number> | null {
  if (!invoer || typeof invoer !== "object") return null;
  const uit: Record<string, number> = {};
  for (const type of STARTITEM_TYPES) {
    const n = Number((invoer as Record<string, unknown>)[type]);
    if (Number.isInteger(n) && n > 0) uit[type] = Math.min(n, MAX_PER_STARTITEM);
  }
  const m = Number((invoer as Record<string, unknown>)._meter);
  if (Number.isInteger(m) && m >= 0 && m <= 1000) uit._meter = m;
  return uit;
}
