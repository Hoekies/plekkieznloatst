// Advies voor het aantal items in een verspreide route, zodat het spel eerlijk blijft.
//
// Uitgangspunten:
// - Afstand: om de ~300 m iets om op te pakken, zodat elk team onderweg regelmatig iets tegenkomt.
// - Teams: het eerste team pakt een item weg. Minimaal 2 per team, zodat ook latere teams kans
//   maken; maximaal 3 per team, anders bepalen items de uitslag meer dan de vragen.
// - Respawn: opgepakte items komen terug, dus er is ~30% minder nodig.
// - Plek zooi telt apart (blijft liggen, wordt niet opgepakt): ~1 per km, nooit meer dan het
//   aantal teams.

export const ITEM_GROEPEN = {
  voordeel: ["ster", "verdubbeling", "radar"],
  aanval: ["bom", "spook", "dief", "banaan", "wissel"],
  vraagteken: ["vraagteken"],
  plekzooi: ["plekzooi"],
} as const;

export type ItemAdvies = {
  oppakbaar: number;   // alle items behalve plek zooi
  voordeel: number;    // ster, verdubbeling, radar
  aanval: number;      // bom, spook, dief, banaan, wissel
  vraagteken: number;
  plekzooi: number;
  tussenafstandM: number; // ongeveer zoveel meter tussen twee oppakbare items
};

export function itemAdvies(lusMeter: number, teams: number, respawn: boolean): ItemAdvies {
  const t = Math.max(2, Math.round(teams));
  let oppakbaar = Math.max(Math.round(lusMeter / 300), 2 * t);
  oppakbaar = Math.min(oppakbaar, 3 * t);
  if (respawn) oppakbaar = Math.max(t, Math.round(oppakbaar * 0.7));

  const vraagteken = oppakbaar >= 8 ? 2 : oppakbaar >= 3 ? 1 : 0;
  const aanval = Math.round(oppakbaar * 0.4);
  const voordeel = Math.max(0, oppakbaar - aanval - vraagteken);
  const plekzooi = Math.min(Math.max(1, Math.round(lusMeter / 1000)), t);

  return {
    oppakbaar, voordeel, aanval, vraagteken, plekzooi,
    tussenafstandM: oppakbaar > 0 ? Math.round(lusMeter / oppakbaar / 10) * 10 : 0,
  };
}
